import test from 'node:test';
import assert from 'node:assert/strict';
import { demoGarden } from '../src/model.ts';
import { newLibrary, parseLibrary } from '../src/storage.ts';
import { openBrowserLibrary, queueBrowserSave, recoverBrowserLibrary, estimateBrowserSpace } from '../src/browserStorage.ts';

function memoryDatabase(){
 const rows=new Map();
 const fakeDB={
  objectStoreNames:{contains:()=>true},
  close:()=>{},
  createObjectStore:()=>{},
  transaction(){
   const transaction={oncomplete:null,onerror:null,onabort:null,objectStore(){return {
     get(key){const req={result:undefined,onsuccess:null};setImmediate(()=>{req.result=structuredClone(rows.get(key));req.onsuccess?.();setImmediate(()=>transaction.oncomplete?.());});return req;},
     put(value){rows.set(value.key,structuredClone(value));return {};}
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
 assert.equal(await queueBrowserSave(loaded.library,'indexeddb'),true);
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
 const results=await Promise.all([queueBrowserSave(first,'indexeddb'),queueBrowserSave(second,'indexeddb')]);
 assert.deepEqual(results,[true,true]);
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
 assert.equal(await queueBrowserSave(next,'indexeddb'),true);
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
 assert.equal(await queueBrowserSave(next,'localstorage'),true);
 assert.equal(JSON.parse(store.get('garden-atlas:library:v1')).projects[0].garden.name,'Fallback saved');
 delete globalThis.localStorage;
});


test('P015 rejects failed IndexedDB writes rather than showing a successful save',async()=>{
 const backup=newLibrary();
 const old=globalThis.indexedDB;
 globalThis.indexedDB={open(){throw new Error('Database disabled');}};
 try {
  assert.equal(await queueBrowserSave(backup,'indexeddb'),false);
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
 assert.match(app,/queueBrowserSave\(library,backend\)/);
 assert.doesNotMatch(app,/setSaved\(saveLibrary\(library\)\)/);
 assert.match(app,/if\(!hydrated\)return/);
 assert.match(app,/SAVE FAILED/);
 assert.match(app,/OfflineTools saved=\{saved\}/);
});


test('P015 storage estimate correctly handles zero bytes used',async()=>{
 const old=Object.getOwnPropertyDescriptor(globalThis,'navigator');
 Object.defineProperty(globalThis,'navigator',{configurable:true,value:{storage:{estimate:async()=>({usage:0,quota:1048576})}}});
 try {assert.match(await estimateBrowserSpace(),/0\.0 MB used of approximately 1\.0 MB/);}
 finally {if(old)Object.defineProperty(globalThis,'navigator',old);else delete globalThis.navigator;}
});
