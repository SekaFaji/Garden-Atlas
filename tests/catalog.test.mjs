import test from 'node:test';
import assert from 'node:assert/strict';
import { PRESETS, defaultPreset, findPresets, getPreset } from '../src/catalog.ts';
import { KINDS, changeObjectPreset, createPresetObject, demoGarden, emptyGarden, isGarden, parseGarden, nextObjectId, movePlaced } from '../src/model.ts';

const pos = {x:10,y:10};
test('P011 catalog has unique presets with a valid default for every kind', () => {
  const seen=new Set();
  for(const preset of PRESETS){
    assert.equal(seen.has(preset.id),false,`duplicate ${preset.id}`);
    seen.add(preset.id);
    assert.equal(getPreset(preset.id),preset);
    assert.ok(KINDS.some(x=>x.kind===preset.kind));
    assert.ok(preset.diameterM>=0.5&&preset.diameterM<=100);
  }
  assert.ok(PRESETS.length>=20);
  for(const k of KINDS)assert.equal(defaultPreset(k.kind).kind,k.kind);
});

test('filtering is case-insensitive and scoped by kind', () => {
  assert.equal(findPresets('PINE').some(p=>p.id==='tree-pine'),true);
  assert.ok(findPresets('', 'rock').every(p=>p.kind==='rock'));
  assert.equal(findPresets('something-unknown').length,0);
});

test('placing a preset creates editable shared record and stable ID', () => {
  const empty=emptyGarden();
  const one=createPresetObject(empty,'tree-apple',pos);
  assert.ok(one);
  assert.equal(one.objects[0].id,'TREE-001');
  assert.equal(one.objects[0].presetId,'tree-apple');
  assert.equal(one.objects[0].name,'Fruit tree');
  assert.deepEqual(one.objects[0].position,pos);
  assert.equal(isGarden(one),true);
  assert.equal(empty.objects.length,0);
  const two=createPresetObject(one,'rock-boulder',{x:15,y:15});
  assert.equal(two.objects[1].id,'ROCK-001');
  assert.equal(nextObjectId(two,'rock'),'ROCK-002');
  assert.equal(isGarden(two),true);
  assert.deepEqual(parseGarden(JSON.parse(JSON.stringify(two))),two);
});

test('changing appearance retains identity, notes, location, size and groups', () => {
  const g=demoGarden(),item=g.objects[0];
  const next=changeObjectPreset(g,item.id,'tree-pine');
  assert.ok(next);
  assert.equal(next.objects[0].presetId,'tree-pine');
  assert.equal(next.objects[0].id,item.id);
  assert.equal(next.objects[0].name,item.name);
  assert.equal(next.objects[0].groupId,item.groupId);
  assert.equal(next.objects[0].diameterM,item.diameterM);
  assert.deepEqual(next.objects[0].position,item.position);
  const moved=movePlaced(next,item.id,'illustration',{x:10,y:8},false);
  assert.equal(moved.objects[0].presetId,'tree-pine');
  assert.equal(changeObjectPreset(g,item.id,'pond-small'),null);
  assert.equal(changeObjectPreset(g,'missing','tree-oak'),null);
});

test('bad presets and incorrect kind/variant pairs are rejected safely', () => {
  const g=demoGarden();
  assert.equal(createPresetObject(g,'not-real',pos),null);
  assert.equal(isGarden({...g,objects:[{...g.objects[0],presetId:'pond-small'}]}),false);
  assert.equal(isGarden({...g,objects:[{...g.objects[0],presetId:'javascript:bad'}]}),false);
  assert.equal(isGarden(g),true);
  assert.equal(parseGarden(JSON.parse(JSON.stringify(g))).objects[0].presetId,undefined);
});
