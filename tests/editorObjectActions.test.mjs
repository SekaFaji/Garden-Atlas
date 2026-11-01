import test from 'node:test';
import assert from 'node:assert/strict';
import { demoGarden, isGarden } from '../src/model.ts';
import { toggleObjectId, patchGardenObject, withoutGardenObjects, assignGardenObjects, addGardenGroup, duplicateGardenObject } from '../src/editorObjectActions.ts';
import { readFile } from 'node:fs/promises';

test('P032 selection toggle is immutable and reversible',()=>{
  const ids=['TREE-001'];
  assert.deepEqual(toggleObjectId(ids,'TREE-002'),['TREE-001','TREE-002']);
  assert.deepEqual(toggleObjectId(ids,'TREE-001'),[]);
  assert.deepEqual(ids,['TREE-001']);
});

test('P032 object patch preserves unrelated garden records and source',()=>{
  const original=demoGarden(),snapshot=structuredClone(original);
  const id=original.objects[0].id;
  const edited=patchGardenObject(original,id,{name:'Edited Oak'});
  assert.equal(edited.objects[0].name,'Edited Oak');
  assert.deepEqual(edited.objects.slice(1),original.objects.slice(1));
  assert.deepEqual(original,snapshot);
  assert.ok(isGarden(edited));
});

test('P032 batch assignment and deletion are scoped to selected object IDs',()=>{
  const original=demoGarden(),snapshot=structuredClone(original);
  const ids=original.objects.slice(0,2).map(item=>item.id);
  const group=original.groups[0].id;
  const assigned=assignGardenObjects(original,ids,group);
  assert.ok(assigned.objects.slice(0,2).every(item=>item.groupId===group));
  assert.deepEqual(assigned.objects.slice(2),original.objects.slice(2));
  const deleted=withoutGardenObjects(assigned,ids);
  assert.equal(deleted.objects.length,original.objects.length-2);
  assert.ok(deleted.objects.every(item=>!ids.includes(item.id)));
  assert.deepEqual(deleted.groups,original.groups);
  assert.deepEqual(original,snapshot);
  assert.ok(isGarden(assigned)&&isGarden(deleted));
});

test('P032 group creation uses next available ID and does not mutate the source',()=>{
  const garden=demoGarden(),before=structuredClone(garden);
  const created=addGardenGroup(garden,'New orchard');
  assert.ok(created.id.startsWith('GROUP-'));
  assert.deepEqual(created.garden.groups.at(-1),{id:created.id,name:'New orchard',notes:''});
  assert.deepEqual(garden,before);
  assert.ok(isGarden(created.garden));
});

test('P032 duplicate clamps position and resets specimen history without modifying original',()=>{
  const garden=demoGarden();
  const source=garden.objects[0];
  source.position={x:garden.width-0.2,y:garden.height-0.3};
  source.plant={speciesId:null,identification:'confirmed',plantedOn:'2026-01-02',
    observations:[{id:'NOTE-1',date:'2026-01-02',note:'Healthy'}],maintenance:[],photos:[]};
  const before=structuredClone(garden);
  const duplicated=duplicateGardenObject(garden,source);
  const copy=duplicated.garden.objects.at(-1);
  assert.equal(copy.id,duplicated.id);
  assert.equal(copy.name,source.name+' copy');
  assert.deepEqual(copy.position,{x:garden.width,y:garden.height});
  assert.deepEqual(copy.plant,{speciesId:null,identification:'unidentified',plantedOn:'',
    observations:[],maintenance:[],photos:[]});
  assert.deepEqual(garden,before);
  assert.ok(isGarden(duplicated.garden));
});

test('P032 selection changes do not own storage, history or browser side effects',async()=>{
  const [hook,actions,app]=await Promise.all([
    readFile(new URL('../src/hooks/useEditorSelection.ts',import.meta.url),'utf8'),
    readFile(new URL('../src/editorObjectActions.ts',import.meta.url),'utf8'),
    readFile(new URL('../src/App.tsx',import.meta.url),'utf8')
  ]);
  assert.match(app,/useEditorSelection\(\)/);
  assert.match(app,/applyGarden\(assignGardenObjects\(garden,checkedIds,groupId\)\)/);
  assert.match(app,/resetSelection\(\)/);
  assert.doesNotMatch(hook,/createBrowserWriter|localStorage|applyGarden|Date\.now/);
  assert.doesNotMatch(actions,/window\.|document\.|createBrowserWriter|useState/);
});
