import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { selectionZoomPaint, narrowLineGuide } from '../src/mapZoomVisuals.ts';
import { lineRenderWidths } from '../src/lineDimensions.ts';
import { demoGarden, addLine, isGarden } from '../src/model.ts';

const read = path => readFile(new URL(path, import.meta.url), 'utf8');
const p = (x,y) => ({x,y});

test('P039 selection borders stay readable in physical pixels at normal zoom',()=>{
  for(const zoom of [0.2,0.5,1,2,6]){
    const paint=selectionZoomPaint(zoom);
    assert.ok(paint.strokeWidth*zoom >= 1.5);
    assert.ok(paint.strokeWidth*zoom <= 3.2);
    assert.ok(paint.offset > 0);
    assert.ok(paint.labelScale > 0);
    for(const dash of [paint.focusedDash,paint.groupDash,paint.multipleDash])
      assert.equal(dash.split(' ').length,2);
  }
  assert.equal(selectionZoomPaint(0.2).showLabel,false);
  assert.equal(selectionZoomPaint(0.45).showLabel,true);
  assert.equal(selectionZoomPaint(1).showLabel,true);
  assert.equal(selectionZoomPaint(6).labelScale,1/6);
});

test('P039 overview zoom guards remain finite even at camera minimum',()=>{
  for(const zoom of [0,0.06,NaN,Infinity,-10]){
    const paint=selectionZoomPaint(zoom);
    assert.ok(Number.isFinite(paint.offset));
    assert.ok(Number.isFinite(paint.strokeWidth));
    assert.ok(paint.strokeWidth>0);
    assert.ok(Number.isFinite(paint.labelScale));
  }
});

test('P039 narrow line guide only appears when the real stroke projects under 1.25px',()=>{
  assert.ok(narrowLineGuide(0.05,20,0.5));
  assert.equal(narrowLineGuide(0.05,20,2),null);
  assert.equal(narrowLineGuide(0.25,20,1),null);
  assert.ok(narrowLineGuide(0.25,20,0.1));
  assert.equal(narrowLineGuide(0,20,0.2),null);
  assert.equal(narrowLineGuide(-1,20,0.2),null);
  assert.equal(narrowLineGuide(Infinity,20,0.2),null);
  const aid=narrowLineGuide(0.05,20,0.25);
  assert.ok(aid && aid.strokeWidth*0.25===1.25);
  assert.deepEqual(lineRenderWidths(0.05,20),{interior:1,outline:2});
});

test('P039 map visual elements are separate from gesture hit areas and storage',async()=>{
  const [scene,object,line,css]=await Promise.all([
    read('../src/components/MapScene.tsx'),read('../src/components/MapObject.tsx'),
    read('../src/components/MapLineArt.tsx'),read('../src/styles.css')
  ]);
  assert.match(scene,/pixelsPerMetre=\{ppu\} zoom=\{zoom\}/);
  assert.match(scene,/data-feature-node/);
  assert.match(scene,/data-feature-edge/);
  assert.match(object,/selectionZoomPaint\(zoom\)/);
  assert.match(object,/data-selection=\{marker\}/);
  assert.match(object,/data-resize=\{item.id\}/);
  assert.match(object,/hitWidth \/ 2/);
  assert.match(object,/data-object-label="focused"/);
  assert.match(line,/data-visual-aid="narrow-line"/);
  assert.match(line,/pointerEvents="none"/);
  assert.match(css,/\.line-width-presets button\{min-height:44px\}/);
  for(const source of [object,line])assert.doesNotMatch(source,/indexedDB|localStorage|applyGarden|setGarden/);
});

test('P039 paint changes never change path or object dimensions in version-6 data',()=>{
  const garden=addLine(demoGarden(),'scale',[p(2,2),p(3,2)],'path',0.05);
  assert.ok(garden && isGarden(garden));
  const copy=structuredClone(garden);
  selectionZoomPaint(0.16);
  narrowLineGuide(garden.layout.lines.at(-1).widthM,20,0.16);
  assert.deepEqual(garden,copy);
  assert.equal(garden.layout.lines.at(-1).widthM,0.05);
});
