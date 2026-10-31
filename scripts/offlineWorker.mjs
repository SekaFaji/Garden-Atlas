import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join, posix } from 'node:path';
import { createHash } from 'node:crypto';
const INCLUDED=/\.(?:html|js|css|png|svg|webp|ico|webmanifest|woff2?)$/i;
export async function listOfflineAssets(dir){
 const files=[];
 async function walk(p,prefix=''){
  for(const entry of await readdir(p,{withFileTypes:true})){
   const path=posix.join(prefix,entry.name);
   if(entry.isDirectory())await walk(join(p,entry.name),path);
   else if(entry.isFile()&&INCLUDED.test(path)&&path!=='sw.js')files.push(path);
  }
 }
 await walk(dir);return files.sort();
}
export function makeWorker(files,hash,base='/Garden-Atlas/'){
 if(!base.startsWith('/')||!base.endsWith('/')||!files.includes('index.html')||!files.includes('manifest.webmanifest'))throw Error('Invalid offline app build');
 const paths=files.map(p=>base+p);
 return `/* Garden Atlas cache: exact generated assets only. */\nconst BASE=${JSON.stringify(base)};const CACHE='garden-atlas-shell-${hash}';const PREFIX='garden-atlas-shell-';const ASSETS=${JSON.stringify(paths)};
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)));});
self.addEventListener('activate',e=>{e.waitUntil((async()=>{for(const k of await caches.keys())if(k.startsWith(PREFIX)&&k!==CACHE)await caches.delete(k);await self.clients.claim();})());});
self.addEventListener('message',e=>{if(e.data?.type==='SKIP_WAITING')self.skipWaiting();});
self.addEventListener('fetch',e=>{
 if(e.request.method!=='GET')return;
 const u=new URL(e.request.url);
 if(u.origin!==self.location.origin||!u.pathname.startsWith(BASE))return;
 if(e.request.mode==='navigate'){e.respondWith(fetch(e.request).catch(()=>caches.open(CACHE).then(c=>c.match(BASE+'index.html'))));return;}
 if(!ASSETS.includes(u.pathname))return;
 e.respondWith(caches.open(CACHE).then(c=>c.match(u.pathname)).then(hit=>hit||fetch(e.request)));
});`;
}
export async function writeOfflineWorker(dir,base='/Garden-Atlas/'){
 const paths=await listOfflineAssets(dir),digest=createHash('sha256');
 for(const p of paths){digest.update(p);digest.update('\0');digest.update(await readFile(join(dir,p)));digest.update('\0');}
 await writeFile(join(dir,'sw.js'),makeWorker(paths,digest.digest('hex').slice(0,16),base),'utf8');
 return paths;
}
