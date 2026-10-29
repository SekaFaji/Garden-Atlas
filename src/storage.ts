import { demoGarden, loadGarden, parseGarden, type Garden } from './model.ts';

export interface GardenProject { id: string; garden: Garden; modifiedAt: string }
export interface ProjectLibrary { version: 1; activeId: string; projects: GardenProject[] }
const KEY='garden-atlas:library:v1', RECOVERY='garden-atlas:library:recovery', STAMP='garden-atlas:library:checkpoint';
const iso=()=>new Date().toISOString();
const id=()=> typeof crypto!=='undefined'&&'randomUUID' in crypto?crypto.randomUUID():`garden-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,10)}`;
export function project(garden:Garden):GardenProject {return {id:id(),garden,modifiedAt:iso()};}
export function newLibrary():ProjectLibrary {const p=project(demoGarden());return {version:1,activeId:p.id,projects:[p]};}
export function parseLibrary(value:unknown):ProjectLibrary|null {
  if(!value||typeof value!=='object')return null;
  const v=value as Partial<ProjectLibrary>;
  if(v.version!==1||!Array.isArray(v.projects)||v.projects.length<1||v.projects.length>20||typeof v.activeId!=='string')return null;
  const seen=new Set<string>(),projects:GardenProject[]=[];
  for(const p of v.projects){
    if(!p||typeof p.id!=='string'||!p.id||p.id.length>120||seen.has(p.id)||typeof p.modifiedAt!=='string'||Number.isNaN(Date.parse(p.modifiedAt)))return null;
    const garden=parseGarden(p.garden);
    if(!garden)return null;
    projects.push({...p,garden});seen.add(p.id);
  }
  if(!seen.has(v.activeId))return null;
  return {version:1,activeId:v.activeId,projects};
}
export function loadLibrary():ProjectLibrary {
  try {
    for(const key of [KEY,RECOVERY]){
      const raw=localStorage.getItem(key);
      if(!raw)continue;
      try {const parsed=parseLibrary(JSON.parse(raw));if(parsed)return parsed;}catch{/* recover */}
    }
  }catch{/* disabled storage */}
  // Import an existing P001–P003 browser garden, without modifying its original key.
  const p=project(loadGarden());
  return {version:1,activeId:p.id,projects:[p]};
}
export function saveLibrary(library:ProjectLibrary):boolean {
  if(!parseLibrary(library))return false;
  try {
    const next=JSON.stringify(library),old=localStorage.getItem(KEY);
    if(old&&old!==next){
      const last=Number(localStorage.getItem(STAMP)||0);
      if(Date.now()-last>=60_000){
        try {if(parseLibrary(JSON.parse(old))){localStorage.setItem(RECOVERY,old);localStorage.setItem(STAMP,String(Date.now()));}}catch{/* no previous */}
      }
    }
    localStorage.setItem(KEY,next);
    return true;
  }catch{return false;}
}
export function loadLibraryRecovery():ProjectLibrary|null {
  try {const raw=localStorage.getItem(RECOVERY);return raw?parseLibrary(JSON.parse(raw)):null;}catch{return null;}
}
export function updateActiveGarden(lib:ProjectLibrary,garden:Garden):ProjectLibrary {
  return {...lib,projects:lib.projects.map(p=>p.id===lib.activeId?{...p,garden,modifiedAt:iso()}:p)};
}
export function addProject(lib:ProjectLibrary,garden:Garden):ProjectLibrary|null {
  if(lib.projects.length>=20)return null;
  const p=project(garden);return {...lib,projects:[...lib.projects,p],activeId:p.id};
}
export function deleteProject(lib:ProjectLibrary,projectId:string):ProjectLibrary|null {
  if(lib.projects.length<=1)return null;
  const projects=lib.projects.filter(p=>p.id!==projectId);
  if(projects.length===lib.projects.length)return null;
  return {version:1,projects,activeId:lib.activeId===projectId?projects[0].id:lib.activeId};
}
export function importGarden(text:string):Garden|null {try {return parseGarden(JSON.parse(text) as unknown);}catch{return null;}}
export function importLibrary(text:string):ProjectLibrary|null {try{return parseLibrary(JSON.parse(text) as unknown);}catch{return null;}}
