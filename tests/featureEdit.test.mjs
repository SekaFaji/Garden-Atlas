import test from 'node:test';
import assert from 'node:assert/strict';
import { demoGarden, addLine, addRegion } from '../src/model.ts';
import { editFeaturePoint, resizeObjectDiameter } from '../src/featureEdit.ts';

function example() {
  const base=demoGarden();
  const withLine=addLine(base,'scale',[{x:4,y:4},{x:10,y:8},{x:16,y:10}],'path',1.5);
  assert.ok(withLine);
  const withRegion=addRegion(withLine,'scale',[{x:2,y:2},{x:8,y:2},{x:8,y:8},{x:2,y:8}],'soil');
  assert.ok(withRegion);
  return withRegion;
}
test('path vertices are movable, insertable and removable, leaving other features alone',()=>{
  const g=example(),sel={kind:'line',id:g.layout.lines[0].id};
  const moved=editFeaturePoint(g,sel,1,'move',{x:11,y:9});
  assert.deepEqual(moved?.layout.lines[0].points[1],{x:11,y:9});
  const inserted=editFeaturePoint(moved,sel,0,'insert',{x:7,y:6});
  assert.equal(inserted?.layout.lines[0].points.length,4);
  const removed=editFeaturePoint(inserted,sel,1,'remove');
  assert.equal(removed?.layout.lines[0].points.length,3);
  assert.deepEqual(g.layout.lines[0].points[1],{x:10,y:8});
  assert.deepEqual(removed?.layout.regions,g.layout.regions);
});
test('terrain edits reject self-intersections and collapsed polygons',()=>{
  const g=example(),sel={kind:'region',id:g.layout.regions[0].id};
  assert.equal(editFeaturePoint(g,sel,1,'move',{x:2,y:8}),null);
  assert.equal(editFeaturePoint(g,sel,0,'insert',{x:8,y:8}),null);
  assert.equal(editFeaturePoint(g,sel,4,'remove'),null);
  const updated=editFeaturePoint(g,sel,1,'move',{x:9,y:2});
  assert.equal(updated?.layout.regions[0].points[1].x,9);
  assert.deepEqual(g.layout.regions[0].points[1],{x:8,y:2});
});
test('paths cannot lose minimum two points or collapse; invalid selection is safe',()=>{
  const g=example(),sel={kind:'line',id:g.layout.lines[0].id};
  const smaller=editFeaturePoint(g,sel,0,'remove');
  assert.ok(smaller);
  assert.equal(editFeaturePoint(smaller,sel,0,'remove'),null);
  assert.equal(editFeaturePoint(g,sel,0,'move',{x:10,y:8}),null);
  assert.equal(editFeaturePoint(g,{kind:'line',id:'not-found'},0,'remove'),null);
  assert.equal(editFeaturePoint(g,sel,50,'remove'),null);
});
test('object resize limits and both shared views',()=>{
  const g=demoGarden(),id=g.objects[0].id;
  const bigger=resizeObjectDiameter(g,id,6.5);
  assert.equal(bigger?.objects[0].diameterM,6.5);
  assert.equal(g.objects[0].diameterM,5.4);
  assert.equal(bigger?.layout.boundary,g.layout.boundary);
  assert.equal(resizeObjectDiameter(g,id,101),null);
  assert.equal(resizeObjectDiameter(g,'unknown',2),null);
});
