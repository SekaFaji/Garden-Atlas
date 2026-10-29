/** P013: ordered transactional IndexedDB snapshots; legacy localStorage is never deleted. */
import { loadLibrary, loadLibraryRecovery, parseLibrary, saveLibrary, type ProjectLibrary } from './storage.ts';
const DATABASE='garden-atlas-offline', STORE='libraries', VERSION=1, CHECKPOINT_INTERVAL=120000;
interface Snapshot {key:'current'|'recovery'; library:ProjectLibrary; savedAt:number; checkpointAt?:number}
export type StorageBackend='indexeddb'|'localstorage';
export interface LibraryLoad {library:ProjectLibrary;backend:StorageBackend;recovered:boolean;warning:string}
function connect():Promise<IDBDatabase>{
 return new Promise((resolve,reject)=>{
  if(typeof indexedDB==='undefined'){reject(new Error('IndexedDB unavailable'));return;}
  let req:IDBOpenDBRequest;
  try{req=indexedDB.open(DATABASE,VERSION);}catch(e){reject(e);return;}
  req.onupgradeneeded=()=>{const db=req.result;if(!db.objectStoreNames.contains(STORE))db.createObjectStore(STORE,{keyPath:'key'});};
  req.onerror=()=>reject(req.error??new Error('Cannot open IndexedDB'));
  req.onblocked=()=>reject(new Error('Database upgrade blocked by another tab'));
  req.onsuccess=()=>resolve(req.result);
 });
}
async function read(key:Snapshot['key']):Promise<ProjectLibrary|null>{
 const db=await connect();
 try{return await new Promise<ProjectLibrary|null>((resolve,reject)=>{
  const tx=db.transaction(STORE,'readonly'),req=tx.objectStore(STORE).get(key);
  let result:ProjectLibrary|null=null;
  req.onsuccess=()=>{const row=req.result as Snapshot|undefined;result=row?parseLibrary(row.library):null;};
  tx.oncomplete=()=>resolve(result);
  tx.onerror=()=>reject(tx.error??new Error('Garden read failed'));
  tx.onabort=()=>reject(tx.error??new Error('Garden read aborted'));
 });}finally{db.close();}
}
export async function openBrowserLibrary():Promise<LibraryLoad>{
 try{
  const current=await read('current');
  if(current)return {library:current,backend:'indexeddb',recovered:false,warning:''};
  const previous=await read('recovery');
  if(previous)return {library:previous,backend:'indexeddb',recovered:true,warning:'Loaded a previous IndexedDB recovery snapshot. Export a backup.'};
  return {library:loadLibrary(),backend:'indexeddb',recovered:false,warning:'IndexedDB ready. Previous browser saves are retained for migration safety.'};
 }catch{return {library:loadLibrary(),backend:'localstorage',recovered:false,warning:'IndexedDB is unavailable. Using limited browser storage; export a JSON backup.'};}
}
async function write(library:ProjectLibrary):Promise<boolean>{
 if(!parseLibrary(library))return false;
 try{
  const db=await connect();
  try{await new Promise<void>((resolve,reject)=>{
   const tx=db.transaction(STORE,'readwrite'),store=tx.objectStore(STORE),req=store.get('current');
   req.onsuccess=()=>{
    const previous=req.result as Snapshot|undefined,now=Date.now();
    const checkpointAt=previous?.checkpointAt??previous?.savedAt??now;
    const rotate=Boolean(previous&&now-checkpointAt>=CHECKPOINT_INTERVAL&&parseLibrary(previous.library));
    if(rotate&&previous)store.put({key:'recovery',library:previous.library,savedAt:previous.savedAt} satisfies Snapshot);
    store.put({key:'current',library,savedAt:now,checkpointAt:rotate?now:checkpointAt} satisfies Snapshot);
   };
   tx.oncomplete=()=>resolve();
   tx.onerror=()=>reject(tx.error??new Error('Garden write failed'));
   tx.onabort=()=>reject(tx.error??new Error('Garden write aborted'));
  });}finally{db.close();}
  return true;
 }catch{return false;}
}
let writeQueue:Promise<unknown>=Promise.resolve();
export function queueBrowserSave(library:ProjectLibrary,backend:StorageBackend):Promise<boolean>{
 const task=()=>backend==='indexeddb'?write(library):Promise.resolve(saveLibrary(library));
 const pending=writeQueue.then(task,task);
 writeQueue=pending.catch(()=>false);
 return pending;
}
export async function recoverBrowserLibrary(backend:StorageBackend):Promise<ProjectLibrary|null>{
 if(backend==='indexeddb'){
  try{return await read('recovery')??loadLibraryRecovery();}catch{return loadLibraryRecovery();}
 }
 return loadLibraryRecovery();
}
export async function estimateBrowserSpace():Promise<string>{
 try{
  const e=await navigator.storage?.estimate();
  if(!e?.usage||!e?.quota)return 'Storage estimate unavailable';
  const mb=(n:number)=>(n/(1024*1024)).toFixed(1)+' MB';
  return mb(e.usage)+' used of approximately '+mb(e.quota)+' available for this site';
 }catch{return 'Storage estimate unavailable';}
}
export async function requestPersistentStorage():Promise<boolean>{
 try{return Boolean(await navigator.storage?.persist?.());}catch{return false;}
}
