import test from 'node:test';
import assert from 'node:assert/strict';
import { demoGarden, isGarden, objectDimensions, parseGarden } from '../src/model.ts';
import { parseDimensionDraft } from '../src/dimensions.ts';
import { resizeObjectAxes } from '../src/featureEdit.ts';
test('P016 dimension entry accepts zero, decimals and French decimal comma; rejects invalid final input',()=>{
 for(const [draft,n] of [['0',0],['0.5',.5],['2,75',2.75],['  9  ',9],['.25',.25]]) assert.equal(parseDimensionDraft(draft),n);
 for(const draft of ['',' ','-1','101','Infinity','abc','1..2','1,2,3'])assert.equal(parseDimensionDraft(draft),null);
});
test('P016 old saved objects default both axes to their original diameter',()=>{
 const old=demoGarden();const restored=parseGarden(JSON.parse(JSON.stringify(old)));
 assert.ok(restored);
 const item=restored.objects[0];assert.deepEqual(objectDimensions(item),{widthM:item.diameterM,lengthM:item.diameterM});
 assert.equal(item.widthM,undefined);assert.equal(item.lengthM,undefined);
});
test('P016 independently edits width/length with zero allowed and preserves inventory, ID, notes, coordinates',()=>{
 const g=demoGarden(),id=g.objects[0].id;
 const next=resizeObjectAxes(g,id,{widthM:0,lengthM:11.75});
 assert.ok(next&&isGarden(next));assert.deepEqual(objectDimensions(next.objects[0]),{widthM:0,lengthM:11.75});
 assert.equal(next.objects[0].id,id);assert.equal(next.objects[0].diameterM,g.objects[0].diameterM);
 assert.deepEqual(next.objects[0].position,g.objects[0].position);
 assert.deepEqual(next.objects.slice(1),g.objects.slice(1));
 assert.ok(parseGarden(JSON.parse(JSON.stringify(next))));
 assert.equal(resizeObjectAxes(next,id,{widthM:3.1,lengthM:11.75})?.objects[0].lengthM,11.75);
});
test('P016 rejects negative and non-finite dimensions without changing the garden',()=>{
 const g=demoGarden(),id=g.objects[0].id;
 for(const value of [-.1,100.1,NaN,Infinity])assert.equal(resizeObjectAxes(g,id,{widthM:value,lengthM:3}),null);
 assert.equal(resizeObjectAxes(g,'missing',{widthM:2,lengthM:2}),null);
 assert.equal(isGarden({...g,objects:[{...g.objects[0],lengthM:-1},...g.objects.slice(1)]}),false);
});
