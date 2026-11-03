import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fencePostPoints, fencePostSize } from '../src/mapLineArt.ts';
import { lineRenderWidths } from '../src/lineDimensions.ts';
import { demoGarden, addLine, isGarden } from '../src/model.ts';

const read = file => readFile(new URL(file, import.meta.url), 'utf8');
const p = (x,y) => ({x,y});

test('P038 fence posts follow segments and preserve endpoints',()=>{
  assert.deepEqual(fencePostPoints([p(0,0),p(3,0)]),[p(0,0),p(1.5,0),p(3,0)]);
  assert.deepEqual(fencePostPoints([p(0,0),p(3,0),p(3,3)]),[p(0,0),p(1.5,0),p(3,0),p(3,1.5),p(3,3)]);
  assert.deepEqual(fencePostPoints([p(0,0),p(0,0),p(3,0)]),[p(0,0),p(1.5,0),p(3,0)]);
  assert.deepEqual(fencePostPoints([p(1,1),p(1,1)]),[]);
  assert.deepEqual(fencePostPoints([]),[]);
});

test('P038 decoration is capped, finite and immutable',()=>{
  const points=[p(0,0),p(500,0)],before=structuredClone(points),posts=fencePostPoints(points);
  assert.equal(posts.length,32);
  assert.deepEqual(posts[0],p(0,0));
  assert.deepEqual(posts.at(-1),p(500,0));
  assert.deepEqual(points,before);
  assert.deepEqual(fencePostPoints(points,0),[]);
  assert.deepEqual(fencePostPoints(points,1,1),[]);
  assert.deepEqual(fencePostPoints([p(0,0),p(Number.NaN,5)]),[]);
});

test('P038 5cm fences and paths keep true proportional render widths',()=>{
  assert.deepEqual(lineRenderWidths(0.05,20),{interior:1,outline:2});
  assert.equal(fencePostSize(0.05,20),0);
  assert.equal(fencePostSize(0.19,20),0);
  assert.ok(fencePostSize(0.2,20)<=0.2*20);
  assert.equal(fencePostSize(1,20),6);
});

test('P038 new art remains presentation-only with existing edit targets',async()=>{
  const [scene,art,sprites,baseSprites,catalog]=await Promise.all([
    read('../src/components/MapScene.tsx'),read('../src/components/MapLineArt.tsx'),
    read('../src/VariantSprites.tsx'),read('../src/Sprite.tsx'),read('../src/catalog.ts')
  ]);
  assert.match(scene,/<MapLineArt key=\{line.id\}/);
  assert.match(scene,/Math\.max\(20,Math\.max\(line.widthM\*ppu,30\/zoom\)\)/);
  for(const marker of ['data-feature-id','data-feature-node','data-feature-edge','data-corner','data-edge']){
    assert.ok(scene.includes(marker),'Missing edit marker: '+marker);
  }
  assert.match(art,/pointerEvents="none"/);
  assert.match(art,/lineRenderWidths\(line.widthM, pixelsPerMetre\)/);
  assert.match(art,/line.widthM >= 0.6/);
  assert.match(art,/fencePostPoints\(points\)/);
  assert.doesNotMatch(art,/onPointer|onClick|applyGarden|setState|indexedDB|localStorage/);
  assert.match(sprites,/GARDEN_DETAILS/);
  for(const preset of ['bed-raised','bed-herb','house-shed','house-greenhouse','rock-boulder',
    'rock-stones','pond-small','pond-lily','furniture-bench','furniture-table','furniture-planter']){
    assert.ok(sprites.includes("'"+preset+"':["),'Missing hardscape details: '+preset);
    assert.ok(catalog.includes("id:'"+preset+"'"),'Preset renamed: '+preset);
  }
  assert.match(baseSprites,/kind === 'bed'/);
  assert.match(baseSprites,/kind === 'house'/);
});

test('P038 decoration leaves all saved garden records unchanged',()=>{
  const garden=addLine(demoGarden(),'scale',[p(2,2),p(3,2)],'fence',0.05);
  assert.ok(garden&&isGarden(garden));
  const copy=structuredClone(garden);
  assert.ok(fencePostPoints(garden.layout.lines.at(-1).points).length>=2);
  assert.deepEqual(garden,copy);
  assert.equal(garden.layout.lines.at(-1).widthM,0.05);
  assert.equal(garden.version,6);
});
