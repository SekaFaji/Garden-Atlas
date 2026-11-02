import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { addLine, demoGarden, isGarden } from '../src/model.ts';
import { parseMetricDraft } from '../src/metricDraft.ts';
import { MIN_LINE_WIDTH_M, MAX_LINE_WIDTH_M, MIN_LINE_LENGTH_M, LINE_WIDTH_PRESETS_M, lineRenderWidths } from '../src/lineDimensions.ts';

const read = path => readFile(new URL(path, import.meta.url),'utf8');
const point=(x,y)=>({x,y});

test('P037 new and existing paths/fences support 5 cm widths and short segments',()=>{
  const start=demoGarden();
  for(const kind of ['path','fence']){
    const next=addLine(start,'scale',[point(2,2),point(2.1,2)],kind,MIN_LINE_WIDTH_M);
    assert.ok(next,kind+' at 5cm');
    assert.equal(next.layout.lines[0].widthM,0.05);
    assert.ok(isGarden(next));
    assert.equal(addLine(start,'scale',[point(2,2),point(3,2)],kind,0.049),null);
    assert.equal(addLine(start,'scale',[point(2,2),point(3,2)],kind,MAX_LINE_WIDTH_M+0.01),null);
  }
  assert.equal(MIN_LINE_LENGTH_M,0.05);
  assert.equal(addLine(start,'illustration',[point(2,2),point(2.01,2)],'path',0.1),null);
});

test('P037 fractional measurements and preset widths remain exact',()=>{
  assert.equal(parseMetricDraft('0.05',MIN_LINE_WIDTH_M,MAX_LINE_WIDTH_M),0.05);
  assert.equal(parseMetricDraft('0,15',MIN_LINE_WIDTH_M,MAX_LINE_WIDTH_M),0.15);
  assert.equal(parseMetricDraft('.5',MIN_LINE_WIDTH_M,MAX_LINE_WIDTH_M),0.5);
  assert.equal(parseMetricDraft('0.04',MIN_LINE_WIDTH_M,MAX_LINE_WIDTH_M),null);
  assert.deepEqual([...LINE_WIDTH_PRESETS_M],[0.1,0.25,0.5,1,2]);
});

test('P037 thin line artwork is proportional, normal line artwork unchanged',()=>{
  assert.deepEqual(lineRenderWidths(0.05,20),{interior:1,outline:2});
  assert.deepEqual(lineRenderWidths(0.25,20),{interior:5,outline:9});
  assert.deepEqual(lineRenderWidths(1,20),{interior:20,outline:24});
});

test('P037 both width controls and renderer use shared limits',async()=>{
  const [model,toolbar,layers,map,scene]=await Promise.all([
    read('../src/model.ts'),read('../src/components/MapEditingToolbar.tsx'),
    read('../src/components/GardenLayersPanel.tsx'),read('../src/MapView.tsx'),
    read('../src/components/MapScene.tsx')
  ]);
  assert.match(model,/widthM<MIN_LINE_WIDTH_M/);
  assert.match(toolbar,/min=\{MIN_LINE_WIDTH_M\}/);
  assert.match(layers,/min=\{MIN_LINE_WIDTH_M\}/);
  assert.match(toolbar,/LINE_WIDTH_PRESETS_M\.map/);
  assert.match(scene,/lineRenderWidths\(line.widthM,ppu\)\.interior/);
  assert.match(map,/const clean=\(tool==='path'\|\|tool==='fence'\)\?draft/);
  assert.match(scene,/Math\.max\(20,Math\.max\(line.widthM\*ppu,30\/zoom\)\)/);
});

test('P037 existing plant preset geometry stays linked and decorative details are authored',async()=>{
  const [sprite,variants,catalog]=await Promise.all([
    read('../src/Sprite.tsx'),read('../src/VariantSprites.tsx'),read('../src/catalog.ts')
  ]);
  assert.match(variants,/PLANT_DETAILS/);
  assert.match(variants,/tree-apple/);
  assert.match(variants,/flower-sunflower/);
  assert.match(sprite,/shapeRendering="crispEdges"/);
  assert.match(catalog,/tree-oak/);
  assert.match(catalog,/shrub-round/);
  assert.match(catalog,/flower-wild/);
});
