import test from 'node:test';
import assert from 'node:assert/strict';
import { demoGarden } from '../src/model.ts';
import { objectPreviewTranslation } from '../src/mapPreview.ts';

const prepared = () => {
  const garden=demoGarden();
  const placed=garden.objects.filter(item=>item.position);
  assert.ok(placed.length>=2,'demo has at least two placed objects');
  const first=placed[0],second=placed[1];
  return {garden,first,second};
};

test('P031 a null preview produces no displacement',()=>{
  const {garden}=prepared();
  assert.deepEqual(objectPreviewTranslation(garden,null),{dx:0,dy:0,companions:[]});
});
test('P031 single-object drag previews do not mutate the saved garden',()=>{
  const {garden,first}=prepared();
  const original=structuredClone(garden);
  const result=objectPreviewTranslation(garden,{id:first.id,point:{x:first.position.x+2.5,y:first.position.y-1.25},together:false});
  assert.equal(result.dx,2.5);
  assert.equal(result.dy,-1.25);
  assert.deepEqual(result.companions,[]);
  assert.deepEqual(garden,original);
});
test('P031 explicit multi-select companions remain confined to the provided IDs',()=>{
  const {garden,first,second}=prepared();
  const result=objectPreviewTranslation(garden,{id:first.id,point:first.position,together:false,many:[first.id,second.id]});
  assert.deepEqual(result.companions,[first.id,second.id]);
});
test('P031 group preview moves members of the anchor group only',()=>{
  const {garden,first,second}=prepared();
  first.groupId='G-001';second.groupId='G-001';
  const group=objectPreviewTranslation(garden,{id:first.id,point:first.position,together:true});
  assert.ok(group.companions.includes(first.id));
  assert.ok(group.companions.includes(second.id));
  const nonGroup=objectPreviewTranslation(garden,{id:first.id,point:first.position,together:false});
  assert.equal(nonGroup.companions.length,0);
});
test('P031 absent and unplaced preview anchors have safe zero offsets',()=>{
  const {garden}=prepared();
  const result=objectPreviewTranslation(garden,{id:'MISSING',point:{x:20,y:20},together:true});
  assert.equal(result.dx,0);
  assert.equal(result.dy,0);
  assert.deepEqual(result.companions,[]);
});
