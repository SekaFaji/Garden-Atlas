import test from 'node:test';
import assert from 'node:assert/strict';
import { demoGarden } from '../src/model.ts';
import { emptyGardenHistory, recordGardenEdit, undoGardenEdit, redoGardenEdit } from '../src/history.ts';
import { readFile } from 'node:fs/promises';

const named=(garden,name)=>({...garden,name});

test('P035 records edits without mutating garden or history snapshots',()=>{
  const garden=demoGarden(),original=structuredClone(garden),empty=emptyGardenHistory();
  const updated=recordGardenEdit(empty,garden,undefined,1000);
  assert.deepEqual(updated.past,[garden]);
  assert.deepEqual(updated.future,[]);
  assert.equal(updated.burst,null);
  assert.deepEqual(garden,original);
  assert.deepEqual(empty,emptyGardenHistory());
});

test('P035 groups consecutive keyed edits within 1200 ms, but not other edits',()=>{
  const garden=demoGarden();
  const first=recordGardenEdit(emptyGardenHistory(),garden,'object:TREE-001:notes',1000);
  const grouped=recordGardenEdit(first,named(garden,'next'),'object:TREE-001:notes',2199);
  assert.equal(grouped.past.length,1);
  const separated=recordGardenEdit(grouped,named(garden,'later'),'object:TREE-001:notes',3400);
  assert.equal(separated.past.length,2);
  const unrelated=recordGardenEdit(separated,named(garden,'other'),'object:TREE-002:notes',3500);
  assert.equal(unrelated.past.length,3);
  const unlabelled=recordGardenEdit(unrelated,named(garden,'unlabelled'),undefined,3550);
  assert.equal(unlabelled.past.length,4);
  assert.equal(unlabelled.burst,null);
});

test('P035 caps undo at 40 snapshots without changing garden data',()=>{
  const garden=demoGarden();let history=emptyGardenHistory();
  for(let i=0;i<55;i++)history=recordGardenEdit(history,named(garden,`garden ${i}`),undefined,i*1300);
  assert.equal(history.past.length,40);
  assert.equal(history.past[0].name,'garden 15');
  assert.equal(history.past.at(-1).name,'garden 54');
});

test('P035 undo/redo round-trip and new edit invalidates redo stack',()=>{
  const garden=demoGarden(),a=named(garden,'A'),b=named(garden,'B');
  const initial=recordGardenEdit(recordGardenEdit(emptyGardenHistory(),garden,undefined,100),a,undefined,200);
  const u=undoGardenEdit(initial,b);
  assert.equal(u.garden.name,'A');
  assert.deepEqual(u.history.future,[b]);
  assert.equal(u.history.burst,null);
  const r=redoGardenEdit(u.history,a);
  assert.equal(r.garden.name,'B');
  assert.deepEqual(r.history.future,[]);
  const newEdit=recordGardenEdit(u.history,a,undefined,300);
  assert.equal(newEdit.future.length,0);
  assert.equal(redoGardenEdit(newEdit,b).garden,null);
  assert.deepEqual(undoGardenEdit(emptyGardenHistory(),garden),{history:emptyGardenHistory(),garden:null});
});

test('P035 undo breaks edit bursts and project switch clears stacks',()=>{
  const garden=demoGarden();
  const state=recordGardenEdit(emptyGardenHistory(),garden,'object:TREE-001:notes',1000);
  const undone=undoGardenEdit(state,named(garden,'edited'));
  assert.equal(undone.history.burst,null);
  const next=recordGardenEdit(undone.history,garden,'object:TREE-001:notes',1100);
  assert.equal(next.past.length,1);
  assert.equal(next.future.length,0);
  assert.deepEqual(emptyGardenHistory().past,[]);
});

test('P035 garden history hook owns stacks while App retains validation and persistence',async()=>{
  const [app,hook]=await Promise.all([
    readFile(new URL('../src/App.tsx',import.meta.url),'utf8'),
    readFile(new URL('../src/hooks/useGardenHistory.ts',import.meta.url),'utf8')
  ]);
  assert.match(app,/useGardenHistory\(\)/);
  assert.match(app,/if\(withHistory\)recordEdit\(previous,historyKey\)/);
  assert.match(app,/if\(!isGarden\(next\)\)/);
  assert.match(app,/const previous=takeUndo\(garden\)/);
  assert.match(app,/const next=takeRedo\(garden\)/);
  assert.match(app,/clearHistory\(\);resetSelection\(\)/);
  assert.match(app,/createBrowserWriter\(result.backend,result.revision\)/);
  assert.doesNotMatch(hook,/localStorage|indexedDB|createBrowserWriter|applyGarden|window.confirm/);
});
