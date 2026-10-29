import test from 'node:test';
import assert from 'node:assert/strict';
import {
  demoGarden, emptyGarden, isGarden, parseGarden, movePlaced, setBoundary,
  addBoundaryCorner, removeBoundaryCorner, addRegion, addLine, nextLineId,
  nextObjectId, nextGroupId, removeGroup, resizeGarden, clampPoint, validPolygon,
  polygonArea, previewLinkedSource, chooseLinkedSource, simplifyStroke, resizeWorkspace, addSurroundings,
} from '../src/model.ts';
import { demoGarden as oldDemo } from '../src/legacy.ts';
import { newLibrary, parseLibrary, saveLibrary, loadLibrary, addProject, deleteProject, updateActiveGarden, importGarden, loadLibraryRecovery } from '../src/storage.ts';
import { closestEdge, formatArea } from '../src/geometry.ts';
const p=(x,y)=>({x,y});
function storage(){const data=new Map();globalThis.localStorage={getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v)};return data;}
function oldDivergent(){
 const g=oldDemo();
 return {...g,layouts:{...g.layouts,scale:{...g.layouts.scale,ground:'soil'},illustration:{...g.layouts.illustration,ground:'gravel'}},objects:g.objects.map((o,i)=>i===0?{...o,placements:{scale:p(2,3),illustration:p(29,19)}}:o)};
}
test('P007 demo has one shared layout and shared object positions',()=>{
 const g=demoGarden();assert.equal(g.version,6);assert.equal(isGarden(g),true);
 assert.equal(g.objects.length,6);assert.equal(g.objects[0].position.x,29);
 assert.equal('layouts' in g,false);assert.equal('placements' in g.objects[0],false);
 assert.equal(g.linkMigration,undefined);
});
test('old views are safely archived and require an explicit choice',()=>{
 const old=oldDivergent(),g=parseGarden(old);assert.ok(g);
 assert.equal(g.version,6);assert.equal(g.linkMigration.confirmed,false);
 assert.deepEqual(g.linkMigration.original,old);
 assert.equal(g.layout.ground,'soil');assert.deepEqual(g.objects[0].position,p(2,3));
 const preview=previewLinkedSource(g,'illustration');
 assert.equal(preview.linkMigration.confirmed,false);assert.equal(preview.layout.ground,'gravel');
 assert.deepEqual(preview.objects[0].position,p(29,19));
 assert.deepEqual(preview.linkMigration.original,old);
 const chosen=chooseLinkedSource(preview,'illustration');assert.equal(chosen.linkMigration.confirmed,true);
 assert.equal(chosen.layout.ground,'gravel');assert.deepEqual(chosen.linkMigration.original,old);
 assert.deepEqual(chooseLinkedSource(chosen,'scale'),chosen);
});
test('once linked, moving an object changes the shared coordinate in both views',()=>{
 const g=demoGarden(),next=movePlaced(g,'TREE-001','illustration',p(12,16),false);
 assert.deepEqual(next.objects[0].position,p(12,16));
 assert.deepEqual(g.objects[0].position,p(29,7));assert.ok(isGarden(next));
 assert.deepEqual(movePlaced(next,'TREE-001','scale',p(10,12),false).objects[0].position,p(10,12));
});
test('group move retains spacing and the source is not mutated',()=>{
 const g=demoGarden(),groupId=g.objects[0].groupId;
 const shifted={...g,objects:g.objects.map((o,i)=>i===1?{...o,groupId,position:p(32,10)}:o)};
 const moved=movePlaced(shifted,'TREE-001','scale',p(38,25),true);
 assert.deepEqual(moved.objects[0].position,p(37,23));
 assert.deepEqual(moved.objects[1].position,p(40,26));
 assert.deepEqual(shifted.objects[0].position,p(29,7));
});
test('first placement of unplaced object respects existing group',()=>{
 const g=demoGarden();const x={...g,objects:g.objects.map((o,i)=>i===0?{...o,position:undefined}:o)};
 const updated=movePlaced(x,'TREE-001','scale',p(5,6),true);
 assert.deepEqual(updated.objects[0].position,p(5,6));assert.deepEqual(updated.objects[1].position,x.objects[1].position);
});
test('linked outlines edited in either mode share one geometry',()=>{
 const g=emptyGarden(),points=[p(2,2),p(30,3),p(26,19),p(7,24)];
 const edited=setBoundary(g,'illustration',points);assert.ok(edited);assert.deepEqual(edited.layout.boundary,points);
 const inserted=addBoundaryCorner(edited,'scale',0,p(15,2.5));assert.ok(inserted);assert.equal(inserted.layout.boundary.length,5);
 assert.deepEqual(removeBoundaryCorner(inserted,'scale',1).layout.boundary,points);
 assert.deepEqual(g.layout.boundary,emptyGarden().layout.boundary);
});
test('terrain and path inserted in either mode share one layer',()=>{
 const g=emptyGarden(),rect=[p(2,2),p(6,2),p(6,8),p(2,8)];
 const region=addRegion(g,'illustration',rect,'water');assert.ok(region);assert.equal(region.layout.regions.length,1);
 const withPath=addLine(region,'scale',[p(1,1),p(12,10)],'path',1.5);assert.ok(withPath);
 assert.equal(withPath.layout.lines.length,1);assert.equal(nextLineId(withPath,'illustration'),'LINE-002');
 const withFence=addLine(withPath,'illustration',[p(4,2),p(4,12)],'fence',.3);assert.ok(withFence);
 assert.equal(withFence.layout.lines.length,2);assert.ok(isGarden(withFence));
});
test('invalid geometry cannot replace valid shared layout',()=>{
 const g=emptyGarden();assert.equal(setBoundary(g,'scale',[p(1,1),p(20,20),p(1,20),p(20,1)]),null);
 assert.equal(addRegion(g,'scale',[p(1,1),p(1,1),p(4,4)],'soil'),null);
 assert.equal(addLine(g,'scale',[p(1,1),p(1,1)],'path',1),null);
 assert.equal(addLine(g,'scale',[p(1,1),p(900,1)],'fence',1),null);
 assert.equal(addLine(g,'scale',[p(1,1),p(2,2)],'fence',15),null);
 assert.equal(isGarden({...g,objects:[{...demoGarden().objects[0],diameterM:Infinity}]}),false);
 assert.equal(isGarden({...g,layout:{...g.layout,lines:[{id:'x',name:'a',kind:'bad',widthM:1,points:[p(1,1),p(2,2)]}]}}),false);
});
test('workspace resize changes shared positions and shared polygon once',()=>{
 const g=demoGarden(),next=resizeGarden(g,200,100);assert.ok(next);
 assert.deepEqual(next.objects[0].position,p(145,26.92308));
 assert.equal(next.layout.boundary[0].x,5);assert.equal(next.width,200);assert.equal(g.width,40);
 assert.equal(resizeGarden(g,600,600),null);assert.deepEqual(clampPoint(p(-1,999),g),p(0,26));
});
test('legacy P001, P002, P003, P004 and P005/006 migrate using tested legacy parser',()=>{
 const v1={version:1,name:'old',objects:[{id:'TREE-123',kind:'tree',name:'Pine',species:'',notes:'important',group:'Back',diameterM:2,placements:{scale:p(1,2),illustration:p(6,7)}}]};
 const one=parseGarden(v1);assert.ok(one);assert.equal(one.objects[0].id,'TREE-123');assert.equal(one.objects[0].notes,'important');assert.equal(one.linkMigration.original.groups[0].name,'Back');
 const old=oldDivergent();for(const ver of [2,3,4,5]){
  let legacy;
  if(ver===5)legacy=old;
  if(ver===4)legacy={...old,version:4,layouts:{scale:{...old.layouts.scale,lines:undefined},illustration:{...old.layouts.illustration,lines:undefined}}};
  if(ver===3)legacy={version:3,name:old.name,groups:old.groups,objects:old.objects,layouts:{scale:{boundary:old.layouts.scale.boundary,ground:'grass'},illustration:{boundary:old.layouts.illustration.boundary,ground:'gravel'}}};
  if(ver===2)legacy={version:2,name:old.name,groups:old.groups,objects:old.objects};
  const migrated=parseGarden(legacy);assert.ok(migrated,`could not migrate v${ver}`);
  assert.equal(migrated.linkMigration.confirmed,false);assert.equal(migrated.objects.length,6);
 }
 assert.equal(parseGarden({version:99}),null);
});
test('linked JSON backups round-trip with full old source archive',()=>{
 const chosen=chooseLinkedSource(parseGarden(oldDivergent()),'illustration');
 const loaded=parseGarden(JSON.parse(JSON.stringify(chosen)));
 assert.deepEqual(loaded,chosen);
 assert.deepEqual(loaded.linkMigration.original.objects[0].placements.scale,p(2,3));
 assert.deepEqual(loaded.linkMigration.original.objects[0].placements.illustration,p(29,19));
});
test('migration archive corruption is rejected, not silently discarded',()=>{
 const g=parseGarden(oldDivergent());
 assert.equal(isGarden({...g,linkMigration:{...g.linkMigration,original:{bad:true}}}),false);
 assert.equal(isGarden({...g,linkMigration:{...g.linkMigration,source:'wrong'}}),false);
});
test('groups preserve objects and identifiers',()=>{
 const g=demoGarden(),next=removeGroup(g,'GROUP-001');assert.equal(next.objects.length,g.objects.length);
 assert.equal(next.objects[0].groupId,null);assert.equal(nextGroupId(next),'GROUP-001');assert.equal(nextObjectId(g,'tree'),'TREE-003');
});
test('model geometry helpers retain behavior',()=>{
 const pts=[p(0,0),p(1,.05),p(2,0),p(3,3),p(4,3)],s=simplifyStroke(pts,.2);
 assert.deepEqual(s[0],pts[0]);assert.deepEqual(s.at(-1),pts.at(-1));assert.ok(s.length<pts.length);
 const rect=[p(1,1),p(4,1),p(4,3),p(1,3)];assert.equal(polygonArea(rect),6);
 assert.equal(closestEdge(rect,p(2,.5)).index,0);assert.equal(formatArea(25000),'2.50 ha');
 assert.equal(validPolygon([p(0,0),p(2,0),p(1,1)],emptyGarden()),true);
});
test('multi-garden library creation, switching and deletion still work',()=>{
 const l=newLibrary(),next=addProject(l,emptyGarden());assert.ok(next);assert.equal(next.projects.length,2);
 assert.equal(deleteProject(l,l.activeId),null);assert.equal(deleteProject(next,next.activeId).projects.length,1);
 assert.equal(updateActiveGarden(next,{...next.projects[1].garden,name:'New'}).projects[0].garden.name,l.projects[0].garden.name);
});
test('saved library and recovery preserve linked projects',()=>{
 const store=storage(),l=newLibrary();assert.equal(saveLibrary(l),true);assert.equal(loadLibrary().activeId,l.activeId);
 const more=addProject(l,emptyGarden());store.set('garden-atlas:library:checkpoint','0');assert.equal(saveLibrary(more),true);
 assert.equal(loadLibraryRecovery().projects.length,1);store.set('garden-atlas:library:v1','{bad');assert.equal(loadLibrary().projects.length,1);
 delete globalThis.localStorage;
});
test('P006 library automatically migrates every garden without losing archived layouts',()=>{
 const original=oldDivergent();const current=newLibrary(),other=addProject(current,emptyGarden());
 const legacy={...other,projects:other.projects.map(p=>({...p,garden:original}))};
 const upgraded=parseLibrary(legacy);assert.ok(upgraded);
 assert.equal(upgraded.projects.length,2);assert.equal(upgraded.projects[0].garden.version,6);
 assert.equal(upgraded.projects[1].garden.linkMigration.confirmed,false);
 assert.deepEqual(upgraded.projects[1].garden.linkMigration.original,original);
 assert.equal(upgraded.activeId,legacy.activeId);
});
test('P006 local browser data survives migration without changing original save',()=>{
 const store=storage();const l=newLibrary(),old=oldDivergent();
 l.projects[0].garden=old;const raw=JSON.stringify(l);
 store.set('garden-atlas:library:v1',raw);
 const updated=loadLibrary();assert.equal(updated.projects[0].garden.version,6);
 assert.equal(store.get('garden-atlas:library:v1'),raw);delete globalThis.localStorage;
});
test('invalid JSON and invalid libraries are rejected',()=>{
 assert.equal(importGarden('{bad'),null);
 assert.equal(parseLibrary({version:1,activeId:'x',projects:[]}),null);
});
test('fit, zoom, pan and pinch camera behaviors remain valid',async()=>{
 const {fitCamera,zoomCamera,panCamera,pinchCamera}=await import('../src/camera.ts');
 const viewport={width:340,height:540},world={width:80,height:100};
 const initial=fitCamera(world,viewport),z=zoomCamera(initial,viewport,1.8,80,180);
 assert.ok(initial.z<.5);assert.ok(z.z>initial.z);
 assert.ok(panCamera(z,40,0).cx<z.cx);
 assert.equal(pinchCamera(initial,viewport,p(170,270),p(190,290),2).z,initial.z*2);
});
test('undo history groups consecutive text edits, but never distinct operations',async()=>{
 const {isSameEditBurst}=await import('../src/history.ts');
 assert.equal(isSameEditBurst(null,'obj:notes',1200),false);
 assert.equal(isSameEditBurst({key:'obj:notes',time:1000},'obj:notes',1500),true);
 assert.equal(isSameEditBurst({key:'obj:notes',time:1000},'obj:name',1500),false);
 assert.equal(isSameEditBurst({key:'obj:notes',time:1000},'obj:notes',2500),false);
 assert.equal(isSameEditBurst({key:'obj:notes',time:1000},undefined,1200),false);
});

test('P008 workspace resizing preserves measured geometry, objects, terrain and paths',()=>{
 const g=addLine(addRegion(demoGarden(),'scale',[p(2,2),p(5,2),p(5,5),p(2,5)],'soil'),'scale',[p(6,6),p(12,6)],'path',1);
 assert.ok(g);
 const changed=resizeWorkspace(g,120,80);assert.ok(changed);assert.equal(changed.width,120);assert.equal(changed.height,80);
 assert.deepEqual(changed.objects,g.objects);assert.deepEqual(changed.layout,g.layout);
 assert.equal(isGarden(changed),true);assert.equal(g.width,40);
 assert.equal(resizeWorkspace(g,25,20),null); // would clip land and plants
 assert.equal(resizeWorkspace(g,2000,300),null);
 assert.equal(resizeWorkspace(g,9,30),null);
});
test('P008 refuses shrinking if any object, region or path would be clipped',()=>{
 const base=emptyGarden();
 const inner={...base,layout:{...base.layout,boundary:[p(2,2),p(12,2),p(12,12),p(2,12)]}};
 assert.ok(resizeWorkspace(inner,20,20));
 const withObject={...inner,objects:[{...demoGarden().objects[0],position:p(35,5)}]};
 assert.equal(resizeWorkspace(withObject,20,20),null);
 const withRegion=addRegion(inner,'scale',[p(25,2),p(30,2),p(30,8),p(25,8)],'stone');
 assert.ok(withRegion);assert.equal(resizeWorkspace(withRegion,20,20),null);
 const withLine=addLine(inner,'scale',[p(19,2),p(28,7)],'fence',.5);
 assert.ok(withLine);assert.equal(resizeWorkspace(withLine,20,20),null);
});
test('P008 surrounding margins retain precise distances and all shared map geometry',()=>{
 const first=addLine(demoGarden(),'illustration',[p(2,2),p(20,20)],'path',1.2);
 assert.ok(first);
 const large=addSurroundings(first,10);assert.ok(large);
 assert.equal(large.width,60);assert.equal(large.height,46);
 assert.deepEqual(large.objects[0].position,p(39,17));
 assert.deepEqual(large.layout.boundary[0],p(11,11));
 assert.deepEqual(large.layout.lines[0].points,[p(12,12),p(30,30)]);
 assert.equal(polygonArea(large.layout.boundary),polygonArea(first.layout.boundary));
 assert.ok(isGarden(large));assert.equal(addSurroundings(first,500),null);
 const restored=resizeWorkspace(large,70,50);assert.ok(restored);
 assert.equal(polygonArea(restored.layout.boundary),polygonArea(first.layout.boundary));
});

test('P009 selected objects move together while unselected objects stay unchanged',async()=>{
 const {moveSelection}=await import('../src/model.ts');
 const g=demoGarden();
 const before=g.objects.map(o=>structuredClone(o));
 const ids=[g.objects[0].id,g.objects[1].id];
 const moved=moveSelection(g,ids,ids[0],p(30,9));
 assert.deepEqual(moved.objects[0].position,p(30,9));
 assert.deepEqual(moved.objects[1].position,p(10,9));
 assert.deepEqual(moved.objects[2],before[2]);
 assert.deepEqual(g.objects[0],before[0]);
 assert.equal(isGarden(moved),true);
});

test('P009 group movement clamps without collapsing spacing',async()=>{
 const {moveSelection}=await import('../src/model.ts');
 const g=demoGarden(),a=g.objects[0],b=g.objects[1];
 const moved=moveSelection(g,[a.id,b.id],a.id,p(40,26));
 assert.deepEqual(moved.objects[0].position,p(40,26));
 assert.deepEqual(moved.objects[1].position,p(20,26));
 assert.equal(isGarden(moved),true);
});

test('P009 alignment distributes in one edit and keeps all permanent IDs',async()=>{
 const {alignSelection}=await import('../src/model.ts');
 const garden=demoGarden();
 const ids=garden.objects.slice(0,3).map(o=>o.id);
 const aligned=alignSelection(garden,ids,'left');
 assert.deepEqual(aligned.objects.slice(0,3).map(o=>o.position.x),[7,7,7]);
 assert.deepEqual(aligned.objects.slice(0,3).map(o=>o.id),ids);
 const spaced=alignSelection(garden,ids,'horizontal');
 assert.deepEqual(spaced.objects.slice(0,3).map(o=>o.position.x),[29,18,7]);
 assert.equal(isGarden(spaced),true);
 assert.equal(alignSelection(garden,ids.slice(0,1),'right'),garden);
});

test('P009 validates image safety, retaining legacy v6 compatibility',async()=>{
 const {setReferenceWidth}=await import('../src/model.ts');
 const plain=demoGarden();assert.ok(isGarden(plain));
 const reference={dataUrl:'data:image/jpeg;base64,AA==',name:'layout.jpg',x:3,y:4,widthM:20,heightM:10,opacity:.55};
 const withPhoto={...plain,reference};
 assert.ok(isGarden(withPhoto));
 assert.deepEqual(parseGarden(withPhoto),withPhoto);
 const scaled=setReferenceWidth(withPhoto,30);assert.ok(scaled);
 assert.equal(scaled.reference.heightM,15);
 assert.equal(setReferenceWidth(withPhoto,300),null);
 assert.equal(isGarden({...withPhoto,reference:{...reference,dataUrl:'data:image/svg+xml;base64,PHN2Zz4='}}),false);
 assert.equal(isGarden({...withPhoto,reference:{...reference,x:35}}),false);
 assert.equal(isGarden({...withPhoto,reference:{...reference,opacity:0}}),false);
 assert.equal(isGarden({...withPhoto,reference:{...reference,dataUrl:'data:image/jpeg;base64,'+'A'.repeat(360001)}}),false);
});

test('P009 reference stays aligned during world resizing and surrounding expansion',async()=>{
 const {resizeGarden,resizeWorkspace,addSurroundings}=await import('../src/model.ts');
 const garden={...demoGarden(),reference:{dataUrl:'data:image/jpeg;base64,AA==',name:'plan',x:2,y:3,widthM:20,heightM:10,opacity:.6}};
 assert.equal(resizeWorkspace(garden,15,15),null);
 const preserved=resizeWorkspace(garden,60,50);assert.ok(preserved);
 assert.deepEqual(preserved.reference,garden.reference);
 const scaled=resizeGarden(garden,80,52);assert.ok(scaled);
 assert.equal(scaled.reference.widthM,40);
 assert.equal(scaled.reference.heightM,20);
 const expanded=addSurroundings(garden,10);assert.ok(expanded);
 assert.equal(expanded.reference.x,12);
 assert.equal(expanded.reference.y,13);
 assert.equal(expanded.reference.widthM,20);
 assert.equal(isGarden(expanded),true);
});

test('P009 optional rotation is bounded and backed up as garden JSON',()=>{
 const g=demoGarden();const edited={...g,objects:g.objects.map((o,i)=>i===0?{...o,rotation:225}:o)};
 assert.equal(isGarden(edited),true);
 assert.deepEqual(parseGarden(JSON.parse(JSON.stringify(edited))),edited);
 assert.equal(isGarden({...edited,objects:[{...edited.objects[0],rotation:360},...edited.objects.slice(1)]}),false);
 assert.equal(isGarden({...edited,objects:[{...edited.objects[0],rotation:-1},...edited.objects.slice(1)]}),false);
});
