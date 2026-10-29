import test from 'node:test';
import assert from 'node:assert/strict';
import {isDrawingTool, minimumDrawingPoints, drawingHint, drawingToolName} from '../src/drawingUX.ts';

test('P021 shows start-of-drawing guidance for existing draw modes',()=>{
  for(const name of ['path','fence','outline-draw','terrain']){
    assert.ok(isDrawingTool(name));
    assert.match(drawingHint(name,0),/Tap the map/);
    assert.equal(drawingToolName(name),name==='outline-draw'?'BORDER':name.toUpperCase());
  }
  for(const name of ['select','pan','feature-edit','tree','freehand'])assert.equal(isDrawingTool(name),false);
});
test('P021 finish requirements match path and polygon model constraints',()=>{
  assert.equal(minimumDrawingPoints('path'),2);
  assert.equal(minimumDrawingPoints('fence'),2);
  assert.equal(minimumDrawingPoints('outline-draw'),3);
  assert.equal(minimumDrawingPoints('terrain'),3);
  assert.match(drawingHint('terrain',1),/2 more points/);
  assert.match(drawingHint('path',1),/1 more point/);
  assert.match(drawingHint('terrain',3),/Finish this shape/);
});
