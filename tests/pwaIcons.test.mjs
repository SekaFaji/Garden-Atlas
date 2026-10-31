import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {inflateSync} from 'node:zlib';

// Verify the PNG *payload*, not merely its filename or IHDR dimensions.
// Previous release icons had believable headers but broken IDAT data.
function crc32(bytes){
  let crc=0xffffffff;
  for(const byte of bytes){
    crc^=byte;
    for(let b=0;b<8;b++)crc=(crc>>>1)^(crc&1?0xedb88320:0);
  }
  return (crc^0xffffffff)>>>0;
}
function validatePng(buffer,expectedSize){
  assert.deepEqual(buffer.subarray(0,8),Buffer.from([137,80,78,71,13,10,26,10]));
  let offset=8,header,ended=false;
  const streams=[];
  while(offset<buffer.length){
    assert.ok(offset+12<=buffer.length,'complete PNG chunk header');
    const size=buffer.readUInt32BE(offset);
    assert.ok(size<=buffer.length-offset-12,'chunk fits file bounds');
    const type=buffer.toString('ascii',offset+4,offset+8);
    const content=buffer.subarray(offset+8,offset+8+size);
    const calculated=crc32(buffer.subarray(offset+4,offset+8+size));
    assert.equal(buffer.readUInt32BE(offset+8+size),calculated,`${type} CRC is valid`);
    if(type==='IHDR'){
      assert.equal(header,undefined,'only one image header');
      header={width:content.readUInt32BE(0),height:content.readUInt32BE(4),depth:content[8],color:content[9],interlace:content[12]};
    }
    if(type==='IDAT')streams.push(content);
    offset+=size+12;
    if(type==='IEND'){ended=true;break;}
  }
  assert.equal(ended,true,'complete PNG end chunk');
  assert.equal(offset,buffer.length,'no trailing data');
  assert.deepEqual([header.width,header.height],[expectedSize,expectedSize]);
  assert.ok(header.color===3 ? [1,2,4,8].includes(header.depth) : header.depth===8,'supported PNG bit depth');
  assert.ok([2,3,6].includes(header.color),'RGB, palette or RGBA PNG');
  assert.equal(header.interlace,0,'noninterlaced PNG');
  assert.ok(streams.length,'PNG has compressed pixels');
  const bytesPerPixel=header.color===2?3:header.color===6?4:1;
  const raw=inflateSync(Buffer.concat(streams));
  const rowLength=1+Math.ceil(expectedSize*bytesPerPixel*header.depth/8);
  assert.equal(raw.length,rowLength*expectedSize,'IDAT pixels decode in full');
  for(let row=0;row<expectedSize;row++)assert.ok(raw[row*rowLength]<=4,'valid PNG row filter');
}

test('P027 manifest references fully decodable install icons in both required sizes',async()=>{
  const manifest=JSON.parse(await readFile(new URL('../public/manifest.webmanifest',import.meta.url)));
  assert.equal(manifest.start_url,'/Garden-Atlas/');
  assert.equal(manifest.scope,'/Garden-Atlas/');
  assert.equal(manifest.display,'standalone');
  for(const size of [192,512]){
    const icon=manifest.icons.find(icon=>icon.sizes===`${size}x${size}`&&icon.type==='image/png');
    assert.ok(icon,`manifest advertises ${size}px PNG`);
    assert.ok(icon.purpose?.includes('any'),`icon ${size}px supports standard installation`);
    assert.ok(icon.purpose?.includes('maskable'),`icon ${size}px supports Android masking`);
    assert.ok(!icon.src.startsWith('/') && !icon.src.includes('..'),'relative icon path scoped to manifest');
    const data=await readFile(new URL(`../public/${icon.src}`,import.meta.url));
    validatePng(data,size);
  }
});


test('P028 installation manifest and icons use fresh URLs without changing app identity',async()=>{
  const html=await readFile(new URL('../index.html',import.meta.url),'utf8');
  assert.match(html,/rel="manifest" href="%BASE_URL%manifest-v2\.webmanifest"/);
  const previous=JSON.parse(await readFile(new URL('../public/manifest.webmanifest',import.meta.url)));
  const active=JSON.parse(await readFile(new URL('../public/manifest-v2.webmanifest',import.meta.url)));
  for(const field of ['id','scope','start_url','display'])assert.equal(active[field],previous[field]);
  for(const size of [192,512]){
    const icon=active.icons.find(icon=>icon.sizes===`${size}x${size}`);
    assert.ok(icon);
    assert.equal(icon.src,`icons/atlas-${size}-v2.png`);
    assert.ok(!previous.icons.some(old=>old.src===icon.src),'new icon URL avoids stale cached image');
    validatePng(await readFile(new URL(`../public/${icon.src}`,import.meta.url)),size);
  }
});
