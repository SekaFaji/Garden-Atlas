import test from 'node:test';
import assert from 'node:assert/strict';
import {
  addBoundaryCorner, addRegion, addLine, nextLineId, clampPoint, demoGarden, emptyGarden, isGarden,
  moveBoundaryCorner, movePlaced, nextGroupId, nextObjectId, parseGarden, polygonArea,
  removeBoundaryCorner, removeGroup, resizeGarden, setBoundary, simplifyStroke, validPolygon
} from '../src/model.ts';
import { closestEdge, formatArea } from '../src/geometry.ts';
import { addProject, deleteProject, importGarden, importLibrary, loadLibrary, loadLibraryRecovery, newLibrary, parseLibrary, saveLibrary, updateActiveGarden } from '../src/storage.ts';

const makeV1=()=>({version:1,name:'Old personal garden',objects:[
  {id:'TREE-123',kind:'tree',name:'Pine',species:'Unknown',group:'Back trees',notes:'Keep this',diameterM:3,placements:{scale:{x:1,y:2},illustration:{x:8,y:9}}},
  {id:'TREE-124',kind:'tree',name:'Pine 2',species:'',group:'back trees',notes:'',diameterM:4,placements:{scale:{x:4,y:5}}}
]});
const v2=()=>{const old=parseGarden(makeV1());return {version:2,name:old.name,objects:old.objects,groups:old.groups};};
const v3=()=>{const old=parseGarden(makeV1());return {version:3,name:old.name,objects:old.objects,groups:old.groups,layouts:{scale:{boundary:old.layouts.scale.boundary,ground:'gravel'},illustration:{boundary:old.layouts.illustration.boundary,ground:'grass'}}};};
function mockStorage(){const map=new Map();globalThis.localStorage={getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,v),removeItem:k=>map.delete(k)};return map;}

test('demo and new empty garden are valid and distinct',()=>{
  assert.ok(isGarden(demoGarden()));assert.equal(demoGarden().version,5);
  assert.equal(emptyGarden().objects.length,0);assert.ok(isGarden(emptyGarden()));
});
test('migrate P001 without altering IDs, notes, both placements and distinct groups',()=>{
  const g=parseGarden(makeV1());assert.ok(g);assert.equal(g.version,5);assert.equal(g.objects[0].id,'TREE-123');
  assert.equal(g.objects[0].notes,'Keep this');assert.deepEqual(g.objects[0].placements,makeV1().objects[0].placements);
  assert.equal(g.objects[0].groupId,g.objects[1].groupId);assert.equal(g.groups.length,1);
});
test('migrate P002 with intact groups and specimen records',()=>{
  const v=v2(),g=parseGarden(v);assert.ok(g);assert.deepEqual(g.groups,v.groups);assert.deepEqual(g.objects,v.objects);
});
test('migrate P003 preserving independent outlines and ground styles',()=>{
  const v=v3(),g=parseGarden(v);assert.ok(g);assert.equal(g.layouts.scale.ground,'gravel');
  assert.deepEqual(g.layouts.scale.boundary,v.layouts.scale.boundary);assert.equal(g.layouts.scale.regions.length,0);
  assert.deepEqual(g.objects,v.objects);
});
test('invalid and unsupported projects are rejected safely',()=>{
  const g=demoGarden();assert.equal(parseGarden({version:8}),null);
  assert.equal(isGarden({...g,objects:[...g.objects,g.objects[0]]}),false);
  assert.equal(isGarden({...g,objects:[{...g.objects[0],groupId:'missing'}]}),false);
  assert.equal(isGarden({...g,groups:[g.groups[0],g.groups[0]]}),false);
  assert.equal(isGarden({...g,width:NaN}),false);
  assert.equal(isGarden({...g,objects:[{...g.objects[0],diameterM:Infinity}]}),false);
});
test('move group preserves spacing and only modifies active map',()=>{
  const g=parseGarden(makeV1()),m=movePlaced(g,'TREE-123','scale',{x:3,y:6},true);
  assert.deepEqual(m.objects[0].placements.scale,{x:3,y:6});
  assert.deepEqual(m.objects[1].placements.scale,{x:6,y:9});
  assert.deepEqual(m.objects[0].placements.illustration,g.objects[0].placements.illustration);
});
test('moving group clamps uniformly to property workspace edges',()=>{
  const g=parseGarden(makeV1()),m=movePlaced(g,'TREE-123','scale',{x:39,y:26},true);
  assert.deepEqual(m.objects[0].placements.scale,{x:37,y:23});
  assert.deepEqual(m.objects[1].placements.scale,{x:40,y:26});
});
test('single move does not affect group members',()=>{
  const g=parseGarden(makeV1()),m=movePlaced(g,'TREE-123','scale',{x:10,y:10},false);
  assert.deepEqual(m.objects[1].placements.scale,g.objects[1].placements.scale);
});
test('first placement of unplaced object is independent of group',()=>{
  const g=parseGarden(makeV1()),m=movePlaced(g,'TREE-124','illustration',{x:7,y:7},true);
  assert.deepEqual(m.objects[0].placements.illustration,g.objects[0].placements.illustration);
});
test('group deletion preserves every plant',()=>{
  const g=demoGarden(),r=removeGroup(g,'GROUP-001');assert.equal(r.objects.length,g.objects.length);
  assert.equal(r.objects[0].groupId,null);assert.equal(r.groups.length,g.groups.length-1);
  assert.equal(nextGroupId(r),'GROUP-001');assert.equal(nextObjectId(g,'tree'),'TREE-003');
});
test('boundary creation supports irregular plots and independent layouts',()=>{
  const g=emptyGarden(),pts=[{x:2,y:2},{x:25,y:4},{x:30,y:12},{x:18,y:22},{x:3,y:18}];
  const next=setBoundary(g,'scale',pts);assert.ok(next);assert.deepEqual(next.layouts.scale.boundary,pts);
  assert.deepEqual(next.layouts.illustration.boundary,g.layouts.illustration.boundary);
  const inserted=addBoundaryCorner(next,'scale',0,{x:14,y:3});assert.ok(inserted);assert.equal(inserted.layouts.scale.boundary.length,6);
  const removed=removeBoundaryCorner(inserted,'scale',1);assert.deepEqual(removed.layouts.scale.boundary,pts);
});
test('crossing boundary edits are rejected without mutation',()=>{
  const g=emptyGarden(),old=g.layouts.scale.boundary;
  const failed=setBoundary(g,'scale',[{x:1,y:1},{x:20,y:20},{x:1,y:20},{x:20,y:1}]);assert.equal(failed,null);
  assert.equal(moveBoundaryCorner(g,'scale',0,{x:39,y:25}),null);
  assert.deepEqual(g.layouts.scale.boundary,old);
  assert.equal(validPolygon([{x:0,y:0},{x:2,y:0},{x:1,y:1}],g),true);
});
test('terrain regions can coexist without altering main plot or other mode',()=>{
  const g=emptyGarden(),pts=[{x:3,y:3},{x:8,y:3},{x:8,y:7},{x:3,y:7}];
  const r=addRegion(g,'illustration',pts,'water');assert.ok(r);assert.equal(r.layouts.illustration.regions[0].ground,'water');
  assert.equal(r.layouts.scale.regions.length,0);assert.deepEqual(r.layouts.illustration.boundary,g.layouts.illustration.boundary);
  assert.equal(addRegion(g,'scale',[{x:1,y:1},{x:20,y:20},{x:1,y:20},{x:20,y:1}],'soil'),null);
});
test('world can grow to 200 × 100 with proportionally rescaled positions',()=>{
  const g=demoGarden(),r=resizeGarden(g,200,100);assert.ok(r);assert.equal(r.width,200);assert.equal(r.height,100);
  assert.deepEqual(r.objects[0].placements.scale,{x:145,y:26.92308});
  assert.equal(r.objects[0].id,g.objects[0].id);assert.equal(g.width,40);
  assert.deepEqual(r.objects[0].placements.illustration,{x:155,y:30.76923});
});
test('invalid dimensions are rejected without touching original',()=>{
  const g=demoGarden();assert.equal(resizeGarden(g,1,10),null);assert.equal(resizeGarden(g,600,600),null);
  assert.deepEqual(clampPoint({x:-1,y:999},g),{x:0,y:26});
});
test('freehand simplification preserves endpoints and important bends',()=>{
  const points=[{x:0,y:0},{x:1,y:.05},{x:2,y:0},{x:3,y:3},{x:4,y:3}];
  const simplified=simplifyStroke(points,.2);assert.deepEqual(simplified[0],points[0]);
  assert.deepEqual(simplified.at(-1),points.at(-1));assert.ok(simplified.length<points.length);
});
test('closest-edge calculation works anywhere around a polygon',()=>{
  const rect=[{x:1,y:1},{x:4,y:1},{x:4,y:3},{x:1,y:3}];
  const c=closestEdge(rect,{x:2,y:.5});assert.equal(c.index,0);assert.equal(c.point.y,1);
  assert.equal(formatArea(25000),'2.50 ha');assert.equal(polygonArea(rect),6);
});
test('multi-garden project library supports creation, selection and safe deletion',()=>{
  const l=newLibrary(),next=addProject(l,emptyGarden());assert.ok(next);assert.equal(next.projects.length,2);
  assert.notEqual(next.activeId,l.activeId);assert.equal(parseLibrary(next).activeId,next.activeId);
  assert.equal(deleteProject(l,l.activeId),null);
  const deleted=deleteProject(next,next.activeId);assert.equal(deleted.projects.length,1);
  assert.equal(deleted.projects[0].id,l.activeId);
});
test('project update preserves unrelated gardens',()=>{
  const l=newLibrary(),next=addProject(l,emptyGarden());const edited={...next.projects[1].garden,name:'My trees'};
  const updated=updateActiveGarden(next,edited);assert.equal(updated.projects[0].garden.name,l.projects[0].garden.name);
  assert.equal(updated.projects[1].garden.name,'My trees');
});
test('saved library restores and recovery survives corrupt primary',()=>{
  const store=mockStorage(),l=newLibrary();assert.equal(saveLibrary(l),true);
  assert.equal(loadLibrary().activeId,l.activeId);
  const next=addProject(l,emptyGarden());store.set('garden-atlas:library:checkpoint','0');assert.equal(saveLibrary(next),true);
  assert.ok(loadLibraryRecovery());store.set('garden-atlas:library:v1','{broken json');
  assert.equal(loadLibrary().projects.length,1);delete globalThis.localStorage;
});
test('first launch imports P003 locally without overwriting its original key',()=>{
  const store=mockStorage(),old=v3();store.set('garden-atlas:p003:v3',JSON.stringify(old));
  const l=loadLibrary();assert.equal(l.projects[0].garden.version,5);
  assert.deepEqual(l.projects[0].garden.objects[0].placements,old.objects[0].placements);
  assert.equal(store.get('garden-atlas:p003:v3'),JSON.stringify(old));delete globalThis.localStorage;
});
test('importGarden migrates legacy JSON while invalid library files are rejected',()=>{
  assert.equal(importGarden(JSON.stringify(makeV1())).version,5);
  assert.equal(importGarden('{bad'),null);assert.equal(importLibrary('{bad'),null);
  assert.equal(importLibrary(JSON.stringify(newLibrary())).version,1);
});

test('map camera fit and anchor-point zoom works on narrow mobile viewports',async()=>{
  const {fitCamera, zoomCamera, panCamera, pinchCamera}=await import('../src/camera.ts');
  const viewport={width:340,height:540},world={width:80,height:100};
  const initial=fitCamera(world,viewport);
  assert.ok(initial.z<.5);
  const p={x:40,y:50};
  const fit=fitCamera(world,viewport,[{x:5,y:5},{x:60,y:65}]);
  assert.ok(fit.z>initial.z);
  const beforeWorld={x:initial.cx+(80-170)/(20*initial.z),y:initial.cy+(180-270)/(20*initial.z)};
  const next=zoomCamera(initial,viewport,1.8,80,180);
  const afterWorld={x:next.cx+(80-170)/(20*next.z),y:next.cy+(180-270)/(20*next.z)};
  assert.ok(Math.abs(beforeWorld.x-afterWorld.x)<1e-9);
  assert.ok(Math.abs(beforeWorld.y-afterWorld.y)<1e-9);
  const pan=panCamera(next,40,0);assert.ok(pan.cx<next.cx);
  const pinch=pinchCamera(initial,viewport,{x:170,y:270},{x:190,y:290},2);
  assert.equal(pinch.z,initial.z*2);
  assert.ok(pinch.cx<initial.cx);assert.ok(pinch.cy<initial.cy);
  assert.ok(p.x>0);
});

test('P004 garden backup upgrades to v5 and retains plots, terrain, groups and species',()=>{
  const original=demoGarden(),region=addRegion(original,'scale',[{x:3,y:3},{x:7,y:3},{x:7,y:8},{x:3,y:8}],'soil');
  const old={...region,version:4,layouts:{scale:{...region.layouts.scale,lines:undefined},illustration:{...region.layouts.illustration,lines:undefined}}};
  const converted=parseGarden(old);assert.ok(converted);assert.equal(converted.version,5);
  assert.deepEqual(converted.groups,old.groups);assert.deepEqual(converted.objects,old.objects);
  assert.deepEqual(converted.layouts.scale.regions,old.layouts.scale.regions);
  assert.equal(converted.layouts.scale.lines.length,0);
});
test('path and fence geometry survive saving and do not affect other layout',()=>{
  const g=emptyGarden(),path=[{x:2,y:5},{x:8,y:5},{x:14,y:11}];
  const withPath=addLine(g,'scale',path,'path',2.5);assert.ok(withPath);
  const withFence=addLine(withPath,'scale',[{x:1,y:1},{x:1,y:12}],'fence',.4);assert.ok(withFence);
  assert.equal(withFence.layouts.scale.lines.length,2);
  assert.equal(withFence.layouts.illustration.lines.length,0);
  assert.equal(nextLineId(withFence,'scale'),'LINE-003');
  assert.ok(isGarden(withFence));
  assert.deepEqual(parseGarden(JSON.parse(JSON.stringify(withFence))),withFence);
});
test('invalid paths are rejected and cannot corrupt the garden',()=>{
  const g=emptyGarden();
  assert.equal(addLine(g,'scale',[{x:1,y:1}],'path',1),null);
  assert.equal(addLine(g,'scale',[{x:1,y:1},{x:1,y:1}],'fence',1),null);
  assert.equal(addLine(g,'scale',[{x:1,y:1},{x:600,y:10}],'fence',1),null);
  assert.equal(addLine(g,'scale',[{x:1,y:1},{x:12,y:10}],'path',13),null);
  assert.equal(isGarden({...g,layouts:{...g.layouts,scale:{...g.layouts.scale,lines:[{id:'X',kind:'invalid',name:'A',widthM:1,points:[{x:1,y:1},{x:2,y:2}]}]}}}),false);
});
test('library of saved P004 projects migrates without discarding unrelated gardens',()=>{
  const current=newLibrary(),extended=addProject(current,emptyGarden());
  const old={...extended,projects:extended.projects.map(p=>({...p,garden:{...p.garden,version:4,layouts:{scale:{...p.garden.layouts.scale,lines:undefined},illustration:{...p.garden.layouts.illustration,lines:undefined}}}}))};
  const loaded=parseLibrary(old);assert.ok(loaded);assert.equal(loaded.projects.length,2);
  assert.equal(loaded.projects[1].garden.version,5);assert.equal(loaded.activeId,old.activeId);
});
