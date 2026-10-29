import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import vm from 'node:vm';
import {listOfflineAssets,makeWorker,writeOfflineWorker} from '../scripts/offlineWorker.mjs';
test('P014 offline shell precaches generated application assets and excludes user backup JSON',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'atlas-pwa-'));
 try{
  await mkdir(join(dir,'assets'));
  for(const [p,c] of [['index.html','<html/>'],['manifest.webmanifest','{}'],['assets/app-123.js','console.log(1)'],['assets/app-123.css','body{}'],['backup.json','sensitive']])await writeFile(join(dir,p),c);
  assert.deepEqual(await listOfflineAssets(dir),['assets/app-123.css','assets/app-123.js','index.html','manifest.webmanifest']);
  await writeOfflineWorker(dir);
  const old=await readFile(join(dir,'sw.js'),'utf8');
  assert.ok(old.includes('/Garden-Atlas/assets/app-123.js'));
  assert.ok(!old.includes('backup.json'));
  await writeFile(join(dir,'assets/app-123.css'),'body{color:green}');
  await writeOfflineWorker(dir);
  assert.notEqual(old,await readFile(join(dir,'sw.js'),'utf8'));
 }finally{await rm(dir,{recursive:true,force:true});}
});
test('P014 app shell serves offline navigation but never intercepts another origin',async()=>{
 const handlers={},cacheStore=new Map();
 const c={async addAll(paths){for(const p of paths)cacheStore.set('https://test.example'+p,{cached:p});},async match(path){return cacheStore.get(new URL(path,'https://test.example').href);}};
 const env={URL,self:{location:{origin:'https://test.example'},addEventListener(n,f){handlers[n]=f;},clients:{claim:async()=>{}},skipWaiting:()=>{}},caches:{open:async()=>c,keys:async()=>['garden-atlas-shell-older'],delete:async()=>true},fetch:async()=>{throw Error('offline');}};
 vm.runInNewContext(makeWorker(['index.html','manifest.webmanifest','assets/app.js'],'abc'),env);
 let task;handlers.install({waitUntil(p){task=p;}});await task;
 let result;handlers.fetch({request:{method:'GET',mode:'navigate',url:'https://test.example/Garden-Atlas/'},respondWith(p){result=p;}});
 assert.equal((await result).cached,'/Garden-Atlas/index.html');
 let intercepted=false;handlers.fetch({request:{method:'GET',mode:'cors',url:'https://other.example/'},respondWith(){intercepted=true;}});
 assert.equal(intercepted,false);
});
test('P014 manifest has project-scoped standalone installation and two sized icons',async()=>{
 const m=JSON.parse(await readFile(new URL('../public/manifest.webmanifest',import.meta.url),'utf8'));
 assert.equal(m.scope,'/Garden-Atlas/');
 assert.equal(m.start_url,'/Garden-Atlas/');
 assert.equal(m.display,'standalone');
 assert.ok(m.icons.some(i=>i.sizes==='192x192')&&m.icons.some(i=>i.sizes==='512x512'));
});
