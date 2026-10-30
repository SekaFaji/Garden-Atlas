import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { mapObjectVisualSize } from '../src/mapObjectGeometry.ts';
import { WORLD } from '../src/model.ts';

test('P026 drawing preserves rectangular width and length independently', () => {
  const s = mapObjectVisualSize({widthM:2.5,lengthM:5},'scale',1);
  assert.equal(s.width,2.5*WORLD.pixelsPerUnit);
  assert.equal(s.length,5*WORLD.pixelsPerUnit);
  assert.ok(s.length>s.width);
});

test('P026 illustration size and hit targets match P025 behavior', () => {
  const a=mapObjectVisualSize({widthM:3,lengthM:4},'illustration',2);
  assert.equal(a.width,3*WORLD.pixelsPerUnit*1.08);
  assert.equal(a.length,4*WORLD.pixelsPerUnit*1.08);
  assert.ok(a.hitWidth>=a.width);
  assert.ok(a.hitLength>=a.length);
  const small=mapObjectVisualSize({widthM:0,lengthM:0},'scale',.1);
  assert.equal(small.width,.5*WORLD.pixelsPerUnit);
  assert.equal(small.length,.5*WORLD.pixelsPerUnit);
  assert.equal(small.hitWidth,48/.1);
  assert.equal(small.hitLength,48/.1);
});

test('P026 catalog and object renderer isolate visual state from App and storage', async () => {
  const base=new URL('../src/components/',import.meta.url);
  const files=await Promise.all(['ObjectCatalog.tsx','MapObject.tsx','ObjectIcon.tsx'].map(x=>readFile(new URL(x,base),'utf8')));
  const [catalog,object,icon]=files;
  assert.match(catalog,/const \[search, setSearch\] = useState/);
  assert.match(catalog,/findPresets\(search, filter\)/);
  assert.match(object,/data-object=\{item\.id\}/);
  assert.match(object,/data-resize=\{item\.id\}/);
  assert.match(icon,/<Sprite kind=\{kind\}/);
  for(const src of files) {
    assert.doesNotMatch(src,/from ['"]\.\.\/App['"]/);
    assert.doesNotMatch(src,/createBrowserWriter|updateActiveGarden|queueBrowserSave/);
  }
});
