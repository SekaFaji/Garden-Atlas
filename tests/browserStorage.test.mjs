import test from 'node:test';
import assert from 'node:assert/strict';
import { demoGarden } from '../src/model.ts';
import { newLibrary, parseLibrary } from '../src/storage.ts';
import { openBrowserLibrary, queueBrowserSave, recoverBrowserLibrary } from '../src/browserStorage.ts';

function memoryDatabase(){
 const rows=new Map();
 const fakeDB={
  objectStoreNames:{contains:()=>true},close:()=>{},createObjectStore:()=>{},
  transaction(){
   const tx={oncomplete:null,onerror:null,onabort:null,objectStore(){return {
    get(key){const req={result:undefined,onsuccess:null};setImmediate(()=>{req.result=structuredClone(rows.get(key));req.onsuccess?.();setImmediate(()=>tx.oncomplete?.());});return req;},
    put(value){rows.set(value.key,structuredClone(value));return {};}
   };}};
   return tx;
  }
 };
 globalThis.indexedDB={open(){const req={result:fakeDB,onupgradeneeded:null,onerror:null,onsuccess:null,onblocked:null};setImmediate(()=>req.onsuccess?.());return req;}};
 return rows;
}
test('P013 preserves previous localStorage data during IndexedDB migration',async()=>{
 const store=new Map();
 globalThis.localStorage={getItem:key=>store.get(key)??null,setItem:(key,value)=>store.set(key,value)};
 const old=newLibrary();old.projects[0].garden.name='Legacy';
 store.set('garden-atlas:library:v1',JSON.stringify(old));
 const rows=memoryDatabase();
 const result=await openBrowserLibrary();
 assert.equal(result.backend,'indexeddb');
 assert.equal(result.library.projects[0].garden.name,'Legacy');
 assert.equal(await queueBrowserSave(result.library,'indexeddb'),true);
 assert.equal(rows.get('current').library.projects[0].garden.name,'Legacy');
 assert.equal(store.get('garden-atlas:library:v1'),JSON.stringify(old));
 delete globalThis.indexedDB;delete globalThis.localStorage;
});
test('P013 serializes concurrent saves to keep the most recent edit',async()=>{
 const rows=memoryDatabase(),first=newLibrary();first.projects[0].garden.name='First';
 const second=structuredClone(first);second.projects[0].garden.name='Second';
 assert.deepEqual(await Promise.all([queueBrowserSave(first,'indexeddb'),queueBrowserSave(second,'indexeddb')]),[true,true]);
 assert.equal(rows.get('current').library.projects[0].garden.name,'Second');
 assert.equal(parseLibrary(rows.get('current').library).projects[0].garden.name,'Second');
 delete globalThis.indexedDB;
});
test('P013 recovery loads valid snapshots when primary is corrupt',async()=>{
 const rows=memoryDatabase(),copy=newLibrary();copy.projects[0].garden.name='Recovered';
 rows.set('current',{key:'current',library:{version:100},savedAt:1});
 rows.set('recovery',{key:'recovery',library:copy,savedAt:1});
 const result=await openBrowserLibrary();
 assert.equal(result.recovered,true);
 assert.equal(result.library.projects[0].garden.name,'Recovered');
 assert.equal((await recoverBrowserLibrary('indexeddb')).projects[0].garden.name,'Recovered');
 delete globalThis.indexedDB;
});
test('P013 rotates previous revisions after checkpoint interval despite frequent edits',async()=>{
 const rows=memoryDatabase(),old=newLibrary();old.projects[0].garden.name='Earlier';
 rows.set('current',{key:'current',library:old,savedAt:Date.now()-5000,checkpointAt:Date.now()-180000});
 const updated=structuredClone(old);updated.projects[0].garden.name='Current';
 assert.equal(await queueBrowserSave(updated,'indexeddb'),true);
 assert.equal(rows.get('recovery').library.projects[0].garden.name,'Earlier');
 assert.equal(rows.get('current').library.projects[0].garden.name,'Current');
 delete globalThis.indexedDB;
});
test('P013 keeps limited localStorage fallback when IndexedDB is unavailable',async()=>{
 delete globalThis.indexedDB;
 const store=new Map();
 globalThis.localStorage={getItem:key=>store.get(key)??null,setItem:(key,value)=>store.set(key,value)};
 const result=await openBrowserLibrary();
 assert.equal(result.backend,'localstorage');
 const next={...result.library,projects:[{...result.library.projects[0],garden:{...demoGarden(),name:'Fallback'}}]};
 assert.equal(await queueBrowserSave(next,'localstorage'),true);
 assert.equal(JSON.parse(store.get('garden-atlas:library:v1')).projects[0].garden.name,'Fallback');
 delete globalThis.localStorage;
});
