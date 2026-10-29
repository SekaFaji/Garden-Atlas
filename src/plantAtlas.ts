/** P012 plant atlas: species reference records and independent specimen field notes. */
import type { Garden, GardenObject } from './model.ts';
export type Identification = 'unidentified' | 'tentative' | 'confirmed';
export type CareAction = 'watering'|'pruning'|'feeding'|'planting'|'inspection'|'other';
export interface PlantSpecies {
  id: string;
  commonName: string;
  scientificName: string;
  description: string;
  careNotes: string;
}
export interface Observation { id: string; date: string; note: string }
export interface Maintenance { id: string; date: string; action: CareAction; note: string }
export interface SpecimenPhoto { id: string; addedOn: string; caption: string; dataUrl: string }
export interface SpecimenProfile {
  speciesId: string | null;
  identification: Identification;
  plantedOn: string;
  observations: Observation[];
  maintenance: Maintenance[];
  photos: SpecimenPhoto[];
}
export const MAX_SPECIMEN_PHOTOS = 8;
export const MAX_PHOTO_DATA_CHARS = 320_000;
export const PLANT_KINDS = ['tree','shrub','flower'] as const;
export const isPlantKind=(kind:GardenObject['kind'])=>PLANT_KINDS.some(x=>x===kind);
export const blankProfile=():SpecimenProfile=>({speciesId:null,identification:'unidentified',plantedOn:'',observations:[],maintenance:[],photos:[]});
const obj=(v:unknown):v is Record<string,unknown>=>v!==null&&typeof v==='object'&&!Array.isArray(v);
const str=(v:unknown,max:number):v is string=>typeof v==='string'&&v.length<=max;
export const validDate=(value:unknown):value is string=>{
 if(typeof value!=='string'||!/^(\d{4})-(\d{2})-(\d{2})$/.test(value))return false;
 const [year,month,day]=value.split('-').map(Number);
 const d=new Date(Date.UTC(year,month-1,day));
 return year>=1900&&year<=2100&&d.getUTCFullYear()===year&&d.getUTCMonth()===month-1&&d.getUTCDate()===day;
};
const validIds=(items:unknown[],max:number,validator:(v:Record<string,unknown>)=>boolean)=>{
 if(items.length>max)return false;
 const ids=new Set<string>();
 return items.every(row=>{
  if(!obj(row)||!str(row.id,100)||!row.id||ids.has(row.id)||!validator(row))return false;
  ids.add(row.id);return true;
 });
};
const jpeg=(v:unknown):v is string=>str(v,MAX_PHOTO_DATA_CHARS)&&/^data:image\/jpeg;base64,[A-Za-z0-9+/]+={0,2}$/.test(v);
/** Backwards compatible validation: absent fields mean a P011 garden or an unprofiled specimen. */
export function validPlantAtlas(input:Record<string,unknown>,objects:unknown[]):boolean {
 const species=input.speciesLibrary;
 if(species!==undefined&&!Array.isArray(species))return false;
 const entries:unknown[]=species===undefined?[]:species as unknown[];
 if(!validIds(entries,300,item=>str(item.commonName,120)&&str(item.scientificName,160)&&str(item.description,4000)&&str(item.careNotes,4000)))return false;
 const ids=new Set(entries.map(v=>(v as PlantSpecies).id));
 for(const raw of objects){
  if(!obj(raw)||raw.plant===undefined)continue;
  if(!isPlantKind(raw.kind as GardenObject['kind'])||!obj(raw.plant))return false;
  const p=raw.plant;
  if(!(p.speciesId===null||typeof p.speciesId==='string'&&ids.has(p.speciesId)))return false;
  if(!(['unidentified','tentative','confirmed'] as unknown[]).includes(p.identification))return false;
  if(!(p.plantedOn===''||validDate(p.plantedOn)))return false;
  if(!Array.isArray(p.observations)||!Array.isArray(p.maintenance)||!Array.isArray(p.photos))return false;
  if(!validIds(p.observations,100,v=>validDate(v.date)&&str(v.note,3000)))return false;
  if(!validIds(p.maintenance,100,v=>validDate(v.date)&&['watering','pruning','feeding','planting','inspection','other'].includes(String(v.action))&&str(v.note,3000)))return false;
  if(!validIds(p.photos,MAX_SPECIMEN_PHOTOS,v=>validDate(v.addedOn)&&str(v.caption,240)&&jpeg(v.dataUrl)))return false;
 }
 return true;
}
export function addSpecies(g:Garden,commonName:string,scientificName=''):Garden|null {
 const common=commonName.trim(),scientific=scientificName.trim();
 if(!common||common.length>120||scientific.length>160||(g.speciesLibrary?.length??0)>=300)return null;
 const entries=g.speciesLibrary??[];
 let n=1;while(entries.some(e=>e.id===`SPECIES-${String(n).padStart(3,'0')}`))n++;
 const s:PlantSpecies={id:`SPECIES-${String(n).padStart(3,'0')}`,commonName:common,scientificName:scientific,description:'',careNotes:''};
 return {...g,speciesLibrary:[...entries,s]};
}
export function updateSpecies(g:Garden,id:string,update:Partial<Omit<PlantSpecies,'id'>>):Garden {
 return {...g,speciesLibrary:(g.speciesLibrary??[]).map(s=>s.id===id?{...s,...update}:s)};
}
export function deleteSpecies(g:Garden,id:string):Garden {
 return {...g,speciesLibrary:(g.speciesLibrary??[]).filter(x=>x.id!==id),objects:g.objects.map(o=>o.plant?.speciesId===id?{...o,plant:{...o.plant,speciesId:null}}:o)};
}
export function updateProfile(g:Garden,id:string,change:(before:SpecimenProfile)=>SpecimenProfile):Garden {
 return {...g,objects:g.objects.map(o=>o.id===id&&isPlantKind(o.kind)?{...o,plant:change(o.plant??blankProfile())}:o)};
}
export function addEntry(g:Garden,id:string,entry:Observation|Maintenance,kind:'observation'|'maintenance'):Garden {
 return updateProfile(g,id,p=>kind==='observation'?{...p,observations:[...p.observations,entry as Observation]}:{...p,maintenance:[...p.maintenance,entry as Maintenance]});
}
export function uniqueEntryId(prefix:string,existing:readonly {id:string}[]):string {
 let n=1;const ids=new Set(existing.map(e=>e.id));while(ids.has(`${prefix}-${n}`))n++;return `${prefix}-${n}`;
}
