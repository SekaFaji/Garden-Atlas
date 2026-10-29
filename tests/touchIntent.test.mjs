import test from 'node:test';
import assert from 'node:assert/strict';
import {dragThresholdPx,intentionalDrag,deliberateTap} from '../src/touchIntent.ts';

test('P018 touch jitter under 11 screen pixels is not a drag',()=>{
  const down={x:100,y:200};
  assert.equal(dragThresholdPx('touch'),11);
  assert.equal(intentionalDrag(down,{x:106,y:207},'touch'),false);
  assert.equal(deliberateTap(down,{x:106,y:207},'touch'),true);
});
test('P018 a deliberate finger movement starts one drag',()=>{
  const down={x:100,y:200};
  assert.equal(intentionalDrag(down,{x:112,y:200},'touch'),true);
  assert.equal(deliberateTap(down,{x:112,y:200},'touch'),false);
});
test('P018 mouse and pen have their own thresholds',()=>{
  const down={x:0,y:0};
  assert.equal(dragThresholdPx('mouse'),4);
  assert.equal(dragThresholdPx('pen'),6);
  assert.equal(intentionalDrag(down,{x:5,y:0},'mouse'),true);
  assert.equal(intentionalDrag(down,{x:5,y:0},'pen'),false);
});
test('P018 panning an edge never becomes a vertex-insertion tap',()=>{
  const down={x:50,y:50};
  assert.equal(deliberateTap(down,{x:50,y:50},'touch',true),false);
  assert.equal(deliberateTap(down,{x:51,y:51},'touch',false),true);
});
test('P018 screen-pixel intent is independent of map zoom and world dimensions',()=>{
  const down={x:90,y:140};
  for(const zoom of [0.08,0.5,1,5,12]){
    void zoom;
    assert.equal(intentionalDrag(down,{x:100,y:140},'touch'),false);
    assert.equal(intentionalDrag(down,{x:102,y:140},'touch'),true);
  }
});
