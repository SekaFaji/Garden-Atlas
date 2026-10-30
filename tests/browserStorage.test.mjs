import test from 'node:test';
import assert from 'node:assert/strict';
import { demoGarden } from '../src/model.ts';
import { newLibrary, parseLibrary } from '../src/storage.ts';
import { openBrowserLibrary, createBrowserWriter, approveBrowserRecovery, exportStoredRecords, recoverBrowserLibrary, estimateBrowserSpace } from '../src/browserStorage.ts';

function memoryDatabase(){
 const rows=new Map();
 const fakeDB={
  objectStoreNames:{contains:()=>true},
  close:()=>{},
  createObjectStore:()=>{},
  transaction(){
   const transaction={oncomplete:null,onerror:null,onabort:null,objectStore(){return {
     get(key){const req={result:undefined,onsuccess:null};setImmediate(()=>{req.result=structuredClone(rows.get(key));req.onsuccess?.();setImmediate(()=>transaction.oncomplete?.());});return req;},
     put(value){rows.set(value.key,structuredClone(value));return {};},
     delete(key){rows.delete(key);return {};}
   };}};
   return transaction;
  }
 };
 globalThis.indexedDB={open(){const req={result:fakeDB,onupgradeneeded:null,onerror:null,onsuccess:null,onblocked:null};setImmediate(()=>req.onsuccess?.());return req;}};
 return rows;
}

test('P013 migration: original browser saves are copied into IndexedDB and remain intact',async()=>{
 const store=new Map();
 globalThis.localStorage={getItem:key=>store.get(key)??null,setItem:(key,value)=>{store.set(key,value)}};
 const previous=newLibrary(); previous.projects[0].garden.name='Before migration';
 store.set('garden-atlas:library:v1',JSON.stringify(previous));
 const rows=memoryDatabase();
 const loaded=await openBrowserLibrary();
 assert.equal(loaded.backend,'indexeddb');
 assert.equal(loaded.library.projects[0].garden.name,'Before migration');
 assert.equal((await createBrowserWriter('indexeddb',loaded.revision).save(loaded.library)).status,'saved');
 assert.equal(rows.get('current').library.projects[0].garden.name,'Before migration');
 assert.equal(store.get('garden-atlas:library:v1'),JSON.stringify(previous));
 const next=await openBrowserLibrary();
 assert.equal(next.library.projects[0].garden.name,'Before migration');
 delete globalThis.indexedDB;delete globalThis.localStorage;
});

test('P013 queued writes cannot replace newer edits with older snapshots',async()=>{
 const rows=memoryDatabase();
 const first=newLibrary();first.projects[0].garden.name='First';
 const second=structuredClone(first);second.projects[0].garden.name='Second';
 const writer=createBrowserWriter('indexeddb',null);
 const results=await Promise.all([writer.save(first),writer.save(second)]);
 assert.deepEqual(results.map(r=>r.status),['saved','saved']);
 assert.equal(rows.get('current').library.projects[0].garden.name,'Second');
 assert.equal(parseLibrary(rows.get('current').library)?.projects[0].garden.name,'Second');
 delete globalThis.indexedDB;
});

test('P013 recovery loads a previous valid snapshot if primary is invalid',async()=>{
 const rows=memoryDatabase();
 const recovered=newLibrary();recovered.projects[0].garden.name='Recovered';
 rows.set('current',{key:'current',library:{version:100},savedAt:1});
 rows.set('recovery',{key:'recovery',library:recovered,savedAt:1});
 const loaded=await openBrowserLibrary();
 assert.equal(loaded.recovered,true);
 assert.equal(loaded.locked,true);
 assert.equal(loaded.library.projects[0].garden.name,'Recovered');
 const recovery=await recoverBrowserLibrary('indexeddb');
 assert.equal(recovery.projects[0].garden.name,'Recovered');
 delete globalThis.indexedDB;
});

test('P013 previous valid data is checkpointed even after frequent edits',async()=>{
 const rows=memoryDatabase();
 const old=newLibrary();old.projects[0].garden.name='Old revision';
 rows.set('current',{key:'current',library:old,savedAt:Date.now()-5_000,checkpointAt:Date.now()-180_000});
 const next=structuredClone(old);next.projects[0].garden.name='New revision';
 assert.equal((await createBrowserWriter('indexeddb',`legacy:${rows.get('current').savedAt}`).save(next)).status,'saved');
 assert.equal(rows.get('recovery').library.projects[0].garden.name,'Old revision');
 assert.equal(rows.get('current').library.projects[0].garden.name,'New revision');
 delete globalThis.indexedDB;
});

test('P013 fallback does not depend on IndexedDB availability',async()=>{
 delete globalThis.indexedDB;
 const store=new Map();
 globalThis.localStorage={getItem:k=>store.get(k)??null,setItem:(k,v)=>store.set(k,v)};
 const loaded=await openBrowserLibrary();
 assert.equal(loaded.backend,'localstorage');
 assert.equal(loaded.library.projects.length,1);
 const next={...loaded.library,projects:[{...loaded.library.projects[0],garden:{...demoGarden(),name:'Fallback saved'}}]};
 assert.equal((await createBrowserWriter('localstorage',null).save(next)).status,'saved');
 assert.equal(JSON.parse(store.get('garden-atlas:library:v1')).projects[0].garden.name,'Fallback saved');
 delete globalThis.localStorage;
});


test('P015 rejects failed IndexedDB writes rather than showing a successful save',async()=>{
 const backup=newLibrary();
 const old=globalThis.indexedDB;
 globalThis.indexedDB={open(){throw new Error('Database disabled');}};
 try {
  assert.equal((await createBrowserWriter('indexeddb',null).save(backup)).status,'failed');
 } finally {
  if(old===undefined)delete globalThis.indexedDB;else globalThis.indexedDB=old;
 }
});

test('P015 falls back to intact local data when opening IndexedDB fails',async()=>{
 const oldDB=globalThis.indexedDB,oldStorage=globalThis.localStorage;
 const store=new Map();const previous=newLibrary();previous.projects[0].garden.name='Last known browser save';
 store.set('garden-atlas:library:v1',JSON.stringify(previous));
 globalThis.localStorage={getItem:key=>store.get(key)??null,setItem:(key,value)=>store.set(key,value)};
 globalThis.indexedDB={open(){throw new Error('Private browsing restriction');}};
 try {
  const loaded=await openBrowserLibrary();
  assert.equal(loaded.backend,'localstorage');
  assert.equal(loaded.library.projects[0].garden.name,'Last known browser save');
  assert.equal(store.get('garden-atlas:library:v1'),JSON.stringify(previous));
 } finally {
  if(oldDB===undefined)delete globalThis.indexedDB;else globalThis.indexedDB=oldDB;
  if(oldStorage===undefined)delete globalThis.localStorage;else globalThis.localStorage=oldStorage;
 }
});

test('P015 editor uses IndexedDB hydration and its queued writes instead of legacy autosave',async()=>{
 const {readFile}=await import('node:fs/promises');
 const app=await readFile(new URL('../src/App.tsx',import.meta.url),'utf8');
 assert.match(app,/openBrowserLibrary\(\)/);
 assert.match(app,/createBrowserWriter\(result\.backend,result\.revision\)/);
 assert.match(app,/writerRef\.current\?\.save\(library\)/);
 assert.doesNotMatch(app,/setSaved\(saveLibrary\(library\)\)/);
 assert.match(app,/if\(!hydrated\)return/);
 assert.match(app,/SAVE FAILED/);
 const projects=await readFile(new URL('../src/components/GardenProjectsPanel.tsx',import.meta.url),'utf8');
 assert.match(app,/<GardenProjectsPanel[\s\S]*saved=\{saved\}/);
 assert.match(projects,/<OfflineTools saved=\{saved\}/);
});


test('P015 storage estimate correctly handles zero bytes used',async()=>{
 const old=Object.getOwnPropertyDescriptor(globalThis,'navigator');
 Object.defineProperty(globalThis,'navigator',{configurable:true,value:{storage:{estimate:async()=>({usage:0,quota:1048576})}}});
 try {assert.match(await estimateBrowserSpace(),/0\.0 MB used of approximately 1\.0 MB/);}
 finally {if(old)Object.defineProperty(globalThis,'navigator',old);else delete globalThis.navigator;}
});


test('P023 corruption without recovery is locked and never overwrites primary automatically',async()=>{
 const rows=memoryDatabase();
 rows.set('current',{key:'current',library:{invalid:true},savedAt:12});
 const loaded=await openBrowserLibrary();
 assert.equal(loaded.locked,true);
 assert.equal(loaded.backend,'indexeddb');
 assert.equal(loaded.needsMigration,false);
 assert.equal(rows.get('current').library.invalid,true);
 assert.equal((await createBrowserWriter('indexeddb',loaded.revision).save(loaded.library)).status,'conflict');
 assert.equal(rows.get('current').library.invalid,true);
 delete globalThis.indexedDB;
});

test('P023 explicit repair preserves malformed records for later export',async()=>{
 const rows=memoryDatabase();
 const old={key:'current',library:{unrecognized:'future-version'},savedAt:20};
 rows.set('current',old);
 const recovered=newLibrary();recovered.projects[0].garden.name='Verified recovery';
 const loaded=await openBrowserLibrary();
 assert.equal(loaded.locked,true);
 const before=JSON.parse(await exportStoredRecords());
 assert.deepEqual(before.current,old);
 const result=await approveBrowserRecovery(recovered);
 assert.equal(result.status,'saved');
 assert.equal(rows.get('current').library.projects[0].garden.name,'Verified recovery');
 assert.ok([...rows.keys()].some(k=>k.startsWith('damaged-current-')));
 assert.ok([...rows.values()].some(row=>row.original?.library?.unrecognized==='future-version'));
 delete globalThis.indexedDB;
});

test('P023 two editors cannot silently overwrite newer IndexedDB changes',async()=>{
 const rows=memoryDatabase();
 const first=newLibrary();first.projects[0].garden.name='Initial';
 const writerA=createBrowserWriter('indexeddb',null);
 const writerB=createBrowserWriter('indexeddb',null);
 assert.equal((await writerA.save(first)).status,'saved');
 const newer=structuredClone(first);newer.projects[0].garden.name='Old tab';
 assert.equal((await writerB.save(newer)).status,'conflict');
 assert.equal(rows.get('current').library.projects[0].garden.name,'Initial');
 assert.equal((await writerB.save(newer)).status,'conflict');
 delete globalThis.indexedDB;
});

test('P023 stale editor loaded from an existing snapshot detects changed revision',async()=>{
 const rows=memoryDatabase();
 const initial=newLibrary();
 const first=createBrowserWriter('indexeddb',null);
 assert.equal((await first.save(initial)).status,'saved');
 const opened=await openBrowserLibrary();
 const stale=createBrowserWriter(opened.backend,opened.revision);
 const latest=structuredClone(initial);latest.projects[0].garden.name='Newer edit';
 assert.equal((await first.save(latest)).status,'saved');
 const older=structuredClone(initial);older.projects[0].garden.name='Stale edit';
 assert.equal((await stale.save(older)).status,'conflict');
 assert.equal(rows.get('current').library.projects[0].garden.name,'Newer edit');
 delete globalThis.indexedDB;
});

test('P023 recovery cannot overwrite an existing valid primary even with confirmation',async()=>{
 const rows=memoryDatabase(),good=newLibrary();
 rows.set('current',{key:'current',library:good,savedAt:100});
 const result=await approveBrowserRecovery(newLibrary());
 assert.equal(result.status,'conflict');
 assert.deepEqual(rows.get('current').library,good);
 delete globalThis.indexedDB;
});

test('P023 editor displays a blocking recovery screen and an unsaved-work backup on conflict',async()=>{
 const {readFile}=await import('node:fs/promises');
 const app=await readFile(new URL('../src/App.tsx',import.meta.url),'utf8');
 assert.match(app,/if\(storageLocked\|\|saveStatus==='conflict'\)/);
 assert.match(app,/DOWNLOAD RAW STORED RECORDS/);
 assert.match(app,/DOWNLOAD VISIBLE GARDEN BACKUP/);
 assert.match(app,/APPROVE RECOVERY/);
});
