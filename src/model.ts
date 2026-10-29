/** Garden Atlas P007. One source of truth for geometry; Scale/Illustration are render styles. */
import { getPreset, defaultPreset } from './catalog.ts';
import { validPlantAtlas } from './plantAtlas.ts';
import type { PlantSpecies, SpecimenProfile } from './plantAtlas.ts';
import {
  parseGarden as parseLegacyGarden, isGarden as isLegacyGarden,
  type Garden as LegacyGarden,
} from './legacy.ts';
export type Mode = 'scale' | 'illustration';
export type Kind = 'tree' | 'shrub' | 'flower' | 'bed' | 'house' | 'rock' | 'pond' | 'furniture';
export type Ground = 'grass' | 'soil' | 'gravel' | 'stone' | 'water';
export interface Point { x:number; y:number }
export interface GardenGroup { id:string; name:string; notes:string }
export interface GardenObject { id:string; kind:Kind; name:string; species:string; groupId:string|null; notes:string; diameterM:number; position?:Point; rotation?:number; presetId?:string; plant?:SpecimenProfile }
export interface Region { id:string; name:string; ground:Ground; points:Point[] }
export type LineKind = 'path'|'fence';
export interface LineFeature { id:string; kind:LineKind; name:string; points:Point[]; widthM:number }
export interface MapLayout { boundary:Point[]; ground:Ground; regions:Region[]; lines:LineFeature[] }
/** Preserve the entire pre-link garden, including BOTH independently authored layouts. */
export interface LinkMigration { original:LegacyGarden; source:Mode; confirmed:boolean }
/** Compressed JPEG stored with the garden; also travels in JSON backups. */
export interface ReferenceImage { dataUrl:string; name:string; x:number; y:number; widthM:number; heightM:number; opacity:number }
export interface Garden { version:6; name:string; width:number; height:number; groups:GardenGroup[]; objects:GardenObject[]; layout:MapLayout; linkMigration?:LinkMigration; reference?:ReferenceImage; speciesLibrary?:PlantSpecies[] }
export const WORLD={width:40,height:26,pixelsPerUnit:20} as const;
export const GROUNDS: {value:Ground;label:string}[]=[
 {value:'grass',label:'Grass'},{value:'soil',label:'Soil'},{value:'gravel',label:'Gravel'},
 {value:'stone',label:'Stone'},{value:'water',label:'Water'},
];
export const KINDS:{kind:Kind;label:string;initialName:string;diameterM:number}[]=[
 {kind:'tree',label:'Tree',initialName:'New tree',diameterM:3.8},
 {kind:'shrub',label:'Shrub',initialName:'New shrub',diameterM:2},
 {kind:'flower',label:'Flowers',initialName:'Flower patch',diameterM:1.6},
 {kind:'bed',label:'Garden bed',initialName:'Garden bed',diameterM:4},
 {kind:'house',label:'Structure',initialName:'Structure',diameterM:5},
 {kind:'rock',label:'Rocks',initialName:'Rock',diameterM:1.5},
 {kind:'pond',label:'Ponds',initialName:'Garden pond',diameterM:4},
 {kind:'furniture',label:'Furniture',initialName:'Garden furniture',diameterM:2},
];
export const info=(kind:Kind)=>KINDS.find(x=>x.kind===kind)!;
const validSize=(n:unknown)=>typeof n==='number'&&Number.isFinite(n)&&n>=10&&n<=500;
const isObj=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v);
const isText=(v:unknown,max=10000):v is string=>typeof v==='string'&&v.length<=max;
const isPoint=(v:unknown,g:Pick<Garden,'width'|'height'>):v is Point=>isObj(v)&&typeof v.x==='number'&&Number.isFinite(v.x)&&v.x>=0&&v.x<=g.width&&typeof v.y==='number'&&Number.isFinite(v.y)&&v.y>=0&&v.y<=g.height;
/** Data URLs are tightly bounded because all projects are stored in browser localStorage. */
function validReference(r:unknown,g:Pick<Garden,'width'|'height'>):boolean {
 if(!isObj(r)||!isText(r.name,140)||!isText(r.dataUrl,360_000)||!/^data:image\/jpeg;base64,[a-zA-Z0-9+/]+={0,2}$/.test(r.dataUrl))return false;
 const numbers=['x','y','widthM','heightM','opacity'] as const;
 if(!numbers.every(k=>typeof r[k]==='number'&&Number.isFinite(r[k])))return false;
 return (r.x as number)>=0&&(r.y as number)>=0&&(r.widthM as number)>.1&&(r.heightM as number)>.1&&
   (r.x as number)+(r.widthM as number)<=g.width+1e-6&&(r.y as number)+(r.heightM as number)<=g.height+1e-6&&
   (r.opacity as number)>=.05&&(r.opacity as number)<=1;
}
export const clampPoint=(p:Point,g:Pick<Garden,'width'|'height'>=WORLD):Point=>({x:Math.min(g.width,Math.max(0,p.x)),y:Math.min(g.height,Math.max(0,p.y))});
export function defaultLayout(width=40,height=26):MapLayout {
 return { boundary:[{x:1,y:1},{x:width-1,y:1},{x:width-1,y:height-1},{x:1,y:height-1}], ground:'grass',regions:[],lines:[] };
}
export function emptyGarden():Garden {return {version:6,name:'My Garden',width:40,height:26,groups:[],objects:[],layout:defaultLayout()};}
/** The shipped example is a fresh linked garden; no legacy migration prompt. */
export function demoGarden():Garden {
 const old=parseLegacyGarden({
   version:1,name:'Sample Garden',objects:[
    {id:'TREE-001',kind:'tree',name:'Old Oak',species:'Quercus robur (example)',group:'Back garden',notes:'Synthetic demo, not a real property.',diameterM:5.4,placements:{scale:{x:29,y:7}}},
    {id:'TREE-002',kind:'tree',name:'Apple Tree',species:'Malus domestica (example)',group:'Orchard',notes:'',diameterM:3.5,placements:{scale:{x:9,y:7}}},
    {id:'SHRUB-001',kind:'shrub',name:'Entrance Hedge',species:'',group:'Entrance',notes:'',diameterM:2.3,placements:{scale:{x:7,y:19}}},
    {id:'FLOWER-001',kind:'flower',name:'Wildflowers',species:'',group:'Front garden',notes:'',diameterM:2,placements:{scale:{x:31,y:19}}},
    {id:'BED-001',kind:'bed',name:'Vegetable Patch',species:'',group:'Kitchen garden',notes:'',diameterM:4,placements:{scale:{x:15,y:8}}},
    {id:'HOUSE-001',kind:'house',name:'House (demo)',species:'',group:'Structures',notes:'Not a real property.',diameterM:7,placements:{scale:{x:20,y:19}}},
   ]});
 if(!old)throw new Error('Invalid Garden Atlas sample');
 const next=fromLegacy(old,'scale',false);
 const {linkMigration:_archive,...sample}=next;void _archive;
 return sample;
}
const cross=(a:Point,b:Point,c:Point)=>(b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x);
const onSegment=(a:Point,b:Point,p:Point)=>Math.abs(cross(a,b,p))<1e-7&&p.x>=Math.min(a.x,b.x)-1e-7&&p.x<=Math.max(a.x,b.x)+1e-7&&p.y>=Math.min(a.y,b.y)-1e-7&&p.y<=Math.max(a.y,b.y)+1e-7;
function intersects(a:Point,b:Point,c:Point,d:Point):boolean {
 if(onSegment(a,b,c)||onSegment(a,b,d)||onSegment(c,d,a)||onSegment(c,d,b))return true;
 const q=cross(a,b,c),r=cross(a,b,d),s=cross(c,d,a),t=cross(c,d,b);
 return (q>0)!==(r>0)&&(s>0)!==(t>0);
}
export const polygonArea=(pts:Point[]):number=>Math.abs(pts.reduce((v,p,i)=>{const n=pts[(i+1)%pts.length];return v+p.x*n.y-n.x*p.y;},0))/2;
export function validPolygon(v:unknown,g:Pick<Garden,'width'|'height'>,maxPoints=100):v is Point[] {
 if(!Array.isArray(v)||v.length<3||v.length>maxPoints||!v.every(p=>isPoint(p,g)))return false;
 const pts=v as Point[];if(polygonArea(pts)<.1)return false;
 for(let i=0;i<pts.length;i++){
  const a=pts[i],b=pts[(i+1)%pts.length];if(Math.hypot(a.x-b.x,a.y-b.y)<.06)return false;
  for(let j=i+1;j<pts.length;j++)if(j!==i+1&&!(i===0&&j===pts.length-1)&&intersects(a,b,pts[j],pts[(j+1)%pts.length]))return false;
 }
 return true;
}
export const validBoundary=(v:unknown,g:Pick<Garden,'width'|'height'>=WORLD)=>validPolygon(v,g);
export function isGarden(value:unknown):value is Garden {
 if(!isObj(value)||value.version!==6||!isText(value.name)||!validSize(value.width)||!validSize(value.height))return false;
 const g=value as unknown as Garden;
 if(!Array.isArray(g.groups)||g.groups.length>1000||!Array.isArray(g.objects)||g.objects.length>3000||!isObj(g.layout))return false;
 const gids=new Set<string>(),oids=new Set<string>();
 for(const gr of g.groups){if(!isObj(gr)||!isText(gr.id,80)||!gr.id||gids.has(gr.id)||!isText(gr.name)||!gr.name.trim()||!isText(gr.notes))return false;gids.add(gr.id);}
 for(const o of g.objects){
  if(!isObj(o)||!isText(o.id,80)||!o.id||oids.has(o.id)||!KINDS.some(k=>k.kind===o.kind)||!isText(o.name)||!isText(o.species)||!isText(o.notes)||!Number.isFinite(o.diameterM)||o.diameterM<.5||o.diameterM>100||!(o.groupId===null||typeof o.groupId==='string'&&gids.has(o.groupId))||!(o.presetId===undefined||typeof o.presetId==='string'&&getPreset(o.presetId)?.kind===o.kind)||!(o.position===undefined||isPoint(o.position,g))||!(o.rotation===undefined||typeof o.rotation==='number'&&Number.isFinite(o.rotation)&&o.rotation>=0&&o.rotation<360))return false;
  oids.add(o.id);
 }
 if(g.reference!==undefined&&!validReference(g.reference,g))return false;
 if(!validPlantAtlas(value,g.objects))return false;
 const l=g.layout;
 if(!GROUNDS.some(gr=>gr.value===l.ground)||!validPolygon(l.boundary,g)||!Array.isArray(l.regions)||l.regions.length>200||!Array.isArray(l.lines)||l.lines.length>200)return false;
 const ids=new Set<string>();
 for(const r of l.regions){if(!isObj(r)||!isText(r.id,80)||!r.id||ids.has(r.id)||!isText(r.name,120)||!GROUNDS.some(z=>z.value===r.ground)||!validPolygon(r.points,g))return false;ids.add(r.id);}
 for(const line of l.lines){
  if(!isObj(line)||!isText(line.id,80)||!line.id||ids.has(line.id)||!isText(line.name,120)||!(line.kind==='path'||line.kind==='fence')||!Number.isFinite(line.widthM)||line.widthM<.2||line.widthM>12||!Array.isArray(line.points)||line.points.length<2||line.points.length>100||!line.points.every(p=>isPoint(p,g))||!line.points.some((p,i)=>i&&Math.hypot(p.x-line.points[0].x,p.y-line.points[0].y)>.1))return false;
  ids.add(line.id);
 }
 if(g.linkMigration!==undefined){const m=g.linkMigration;if(!isObj(m)||!isLegacyGarden(m.original)||!(m.source==='scale'||m.source==='illustration')||typeof m.confirmed!=='boolean')return false;}
 return true;
}
function fromLegacy(old:LegacyGarden,source:Mode,archive=true):Garden {
 const next:Garden={version:6,name:old.name,width:old.width,height:old.height,
   groups:old.groups.map(x=>({...x})),
   objects:old.objects.map(o=>({id:o.id,kind:o.kind,name:o.name,species:o.species,notes:o.notes,groupId:o.groupId,diameterM:o.diameterM,...(o.placements[source]?{position:{...o.placements[source]}}:{})})),
   layout:JSON.parse(JSON.stringify(old.layouts[source])) as MapLayout,
   ...(archive?{linkMigration:{original:JSON.parse(JSON.stringify(old)) as LegacyGarden,source,confirmed:false}}:{}),
 };
 return next;
}
/** Old view-specific data remains in the source archive; the user must approve a source view. */
export function chooseLinkedSource(g:Garden,source:Mode):Garden {
 if(!g.linkMigration||g.linkMigration.confirmed)return g;
 const merged=fromLegacy(g.linkMigration.original,source,true);
 return {...merged,linkMigration:{...merged.linkMigration!,confirmed:true}};
}
/** Preview the second old layout without accepting it; the editor must not allow edits while pending. */
export function previewLinkedSource(g:Garden,source:Mode):Garden {
 if(!g.linkMigration||g.linkMigration.confirmed)return g;
 const result=fromLegacy(g.linkMigration.original,source,true);
 return {...result,linkMigration:{...result.linkMigration!,confirmed:false}};
}
export function parseGarden(value:unknown):Garden|null {
 if(isGarden(value))return value;
 const old=parseLegacyGarden(value);
 if(!old)return null;
 const updated=fromLegacy(old,'scale');return isGarden(updated)?updated:null;
}
export function movePlaced(g:Garden,id:string,_mode:Mode,requested:Point,together:boolean):Garden {
 const item=g.objects.find(o=>o.id===id);if(!item)return g;
 const pos=item.position;if(!pos)return {...g,objects:g.objects.map(o=>o.id===id?{...o,position:clampPoint(requested,g)}:o)};
 const members=together&&item.groupId?g.objects.filter(o=>o.groupId===item.groupId&&o.position):[item];
 const pts=members.map(o=>o.position!);
 const clip=(n:number,min:number,max:number)=>Math.min(max,Math.max(min,n));
 const dx=clip(requested.x-pos.x,-Math.min(...pts.map(p=>p.x)),g.width-Math.max(...pts.map(p=>p.x)));
 const dy=clip(requested.y-pos.y,-Math.min(...pts.map(p=>p.y)),g.height-Math.max(...pts.map(p=>p.y)));
 const ids=new Set(members.map(o=>o.id));
 return {...g,objects:g.objects.map(o=>ids.has(o.id)&&o.position?{...o,position:{x:o.position.x+dx,y:o.position.y+dy}}:o)};
}

/** Move selected items in one operation, preserving distances and restricting the entire set to the workspace. */
export function moveSelection(g:Garden,ids:readonly string[],anchorId:string,requested:Point):Garden {
 const selected=new Set(ids);
 const members=g.objects.filter(o=>selected.has(o.id)&&o.position);
 const anchor=members.find(o=>o.id===anchorId);
 if(!anchor||!anchor.position)return g;
 const dx=Math.max(-Math.min(...members.map(o=>o.position!.x)),Math.min(g.width-Math.max(...members.map(o=>o.position!.x)),requested.x-anchor.position.x));
 const dy=Math.max(-Math.min(...members.map(o=>o.position!.y)),Math.min(g.height-Math.max(...members.map(o=>o.position!.y)),requested.y-anchor.position.y));
 if(!dx&&!dy)return g;
 return {...g,objects:g.objects.map(o=>selected.has(o.id)&&o.position?{...o,position:{x:o.position.x+dx,y:o.position.y+dy}}:o)};
}
export type AlignMode='left'|'right'|'top'|'bottom'|'horizontal'|'vertical';
/** Align selected objects to a common edge or distribute the interior objects evenly. */
export function alignSelection(g:Garden,ids:readonly string[],operation:AlignMode):Garden {
 const selected=new Set(ids);
 const members=g.objects.filter(o=>selected.has(o.id)&&o.position);
 if(members.length<2)return g;
 const xs=members.map(o=>o.position!.x),ys=members.map(o=>o.position!.y);
 const left=Math.min(...xs),right=Math.max(...xs),top=Math.min(...ys),bottom=Math.max(...ys);
 const positions=new Map<string,Point>();
 if(operation==='horizontal'||operation==='vertical'){
   if(members.length<3)return g;
   const axis=operation==='horizontal'?'x':'y',ordered=[...members].sort((a,b)=>a.position![axis]-b.position![axis]);
   const low=ordered[0].position![axis],high=ordered[ordered.length-1].position![axis];
   ordered.forEach((o,i)=>positions.set(o.id,{...o.position!,[axis]:low+(high-low)*i/(ordered.length-1)}));
 }else{
   members.forEach(o=>positions.set(o.id,{...o.position!,...(operation==='left'?{x:left}:operation==='right'?{x:right}:operation==='top'?{y:top}:{y:bottom})}));
 }
 return {...g,objects:g.objects.map(o=>positions.has(o.id)?{...o,position:positions.get(o.id)!}:o)};
}
/** Reference dimensions are bounded to the workspace; maintain the same pixel aspect ratio when resizing. */
export function setReferenceWidth(g:Garden,widthM:number):Garden|null {
 const r=g.reference;if(!r||!Number.isFinite(widthM)||widthM<=.1)return null;
 const heightM=r.heightM*widthM/r.widthM;
 const x=Math.min(r.x,Math.max(0,g.width-widthM)),y=Math.min(r.y,Math.max(0,g.height-heightM));
 if(widthM>g.width||heightM>g.height)return null;
 const next={...g,reference:{...r,x,y,widthM,heightM}};
 return isGarden(next)?next:null;
}

/** Create a shared record from an editable pixel-art preset; no identifying claim is made. */
export function createPresetObject(g:Garden,presetId:string,position:Point):Garden|null {
 const preset=getPreset(presetId);
 if(!preset||g.objects.length>=3000)return null;
 const obj:GardenObject={id:nextObjectId(g,preset.kind),kind:preset.kind,name:preset.name,
   species:preset.species,groupId:null,notes:'',diameterM:preset.diameterM,
   presetId:preset.id,position:clampPoint(position,g)};
 const next={...g,objects:[...g.objects,obj]};
 return isGarden(next)?next:null;
}
/** Update just the appearance preset, retaining record identity, notes and location. */
export function changeObjectPreset(g:Garden,id:string,presetId:string):Garden|null {
 const preset=getPreset(presetId),item=g.objects.find(o=>o.id===id);
 if(!preset||!item||preset.kind!==item.kind)return null;
 const next={...g,objects:g.objects.map(o=>o.id===id?{...o,presetId}:o)};
 return isGarden(next)?next:null;
}
export function presetForKind(kind:Kind):string {return defaultPreset(kind).id;}
export function nextGroupId(g:Garden):string {let n=1;const ids=new Set(g.groups.map(x=>x.id));while(ids.has('GROUP-'+String(n).padStart(3,'0')))n++;return 'GROUP-'+String(n).padStart(3,'0');}
export function nextObjectId(g:Garden,kind:Kind):string {let n=1;const ids=new Set(g.objects.map(x=>x.id)),prefix=kind.toUpperCase()+'-';while(ids.has(prefix+String(n).padStart(3,'0')))n++;return prefix+String(n).padStart(3,'0');}
export function nextLineId(g:Garden,_mode:Mode):string {let n=1;const ids=new Set(g.layout.lines.map(x=>x.id));while(ids.has('LINE-'+String(n).padStart(3,'0')))n++;return 'LINE-'+String(n).padStart(3,'0');}
export function addLine(g:Garden,mode:Mode,points:Point[],kind:LineKind,widthM:number):Garden|null {
 if(g.layout.lines.length>=200||points.length<2||points.length>100||!points.every(p=>isPoint(p,g))||!points.some((p,i)=>i&&Math.hypot(p.x-points[0].x,p.y-points[0].y)>.1)||!Number.isFinite(widthM)||widthM<.2||widthM>12)return null;
 const line:LineFeature={id:nextLineId(g,mode),kind,name:kind==='path'?'Garden path':'Fence',points,widthM};
 return {...g,layout:{...g.layout,lines:[...g.layout.lines,line]}};
}
export function nextRegionId(g:Garden,_mode:Mode):string {let n=1;const ids=new Set(g.layout.regions.map(x=>x.id));while(ids.has('REGION-'+String(n).padStart(3,'0')))n++;return 'REGION-'+String(n).padStart(3,'0');}
export function addRegion(g:Garden,mode:Mode,points:Point[],ground:Ground):Garden|null {
 if(!validPolygon(points,g)||g.layout.regions.length>=200)return null;
 const reg:Region={id:nextRegionId(g,mode),name:GROUNDS.find(x=>x.value===ground)!.label+' area',ground,points};
 return {...g,layout:{...g.layout,regions:[...g.layout.regions,reg]}};
}
export function removeGroup(g:Garden,id:string):Garden {return {...g,groups:g.groups.filter(x=>x.id!==id),objects:g.objects.map(x=>x.groupId===id?{...x,groupId:null}:x)};}
export function setBoundary(g:Garden,_mode:Mode,points:Point[]):Garden|null {return validPolygon(points,g)?{...g,layout:{...g.layout,boundary:points}}:null;}
export function moveBoundaryCorner(g:Garden,mode:Mode,index:number,point:Point):Garden|null {return index>=0&&index<g.layout.boundary.length?setBoundary(g,mode,g.layout.boundary.map((p,i)=>i===index?clampPoint(point,g):p)):null;}
export function addBoundaryCorner(g:Garden,mode:Mode,edgeIndex?:number,point?:Point):Garden|null {
 const old=g.layout.boundary;if(old.length>=100)return null;let edge=edgeIndex??0;
 if(edgeIndex===undefined){let longest=-1;old.forEach((p,i)=>{const q=old[(i+1)%old.length],d=Math.hypot(p.x-q.x,p.y-q.y);if(d>longest){longest=d;edge=i;}});}
 if(!Number.isInteger(edge)||edge<0||edge>=old.length)return null;
 const a=old[edge],b=old[(edge+1)%old.length],p=point??{x:(a.x+b.x)/2,y:(a.y+b.y)/2};
 const next=[...old];next.splice(edge+1,0,clampPoint(p,g));return setBoundary(g,mode,next);
}
export function removeBoundaryCorner(g:Garden,mode:Mode,index:number):Garden|null {return g.layout.boundary.length<=3||index<0||index>=g.layout.boundary.length?null:setBoundary(g,mode,g.layout.boundary.filter((_,i)=>i!==index));}
/** Ramer–Douglas–Peucker simplification for finger-drawn outlines. */
export function simplifyStroke(points:Point[],tolerance=.25):Point[] {
 if(points.length<=2)return points;
 const dist=(p:Point,a:Point,b:Point)=>{const dx=b.x-a.x,dy=b.y-a.y,t=dx*dx+dy*dy===0?0:Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.y-a.y)*dy)/(dx*dx+dy*dy)));return Math.hypot(p.x-a.x-t*dx,p.y-a.y-t*dy);};
 let max=-1,index=0;for(let i=1;i<points.length-1;i++){const d=dist(points[i],points[0],points[points.length-1]);if(d>max){max=d;index=i;}}
 return max<=tolerance?[points[0],points[points.length-1]]:[...simplifyStroke(points.slice(0,index+1),tolerance).slice(0,-1),...simplifyStroke(points.slice(index),tolerance)];
}
export function resizeGarden(g:Garden,width:number,height:number):Garden|null {
 if(!validSize(width)||!validSize(height))return null;
 const fx=width/g.width,fy=height/g.height;
 const transform=(p:Point)=>({x:Number((p.x*fx).toFixed(5)),y:Number((p.y*fy).toFixed(5))});
 const l=g.layout;
 const next:Garden={...g,width,height,layout:{...l,boundary:l.boundary.map(transform),regions:l.regions.map(r=>({...r,points:r.points.map(transform)})),lines:l.lines.map(line=>({...line,points:line.points.map(transform)}))},objects:g.objects.map(o=>o.position?{...o,position:transform(o.position)}:o),...(g.reference?{reference:{...g.reference,x:g.reference.x*fx,y:g.reference.y*fy,widthM:g.reference.widthM*fx,heightM:g.reference.heightM*fy}}:{})};
 return isGarden(next)?next:null;
}
/** Adjust the surrounding workspace, retaining exact measured garden coordinates.
 * Shrinks that would clip ANY boundary, path, region or placed object are rejected.
 */
export function resizeWorkspace(g:Garden,width:number,height:number):Garden|null {
 if(!validSize(width)||!validSize(height))return null;
 const fits=(p:Point)=>p.x<=width&&p.y<=height;
 if(g.reference&&(g.reference.x+g.reference.widthM>width||g.reference.y+g.reference.heightM>height))return null;
 if(g.layout.boundary.some(p=>!fits(p))||g.layout.regions.some(r=>r.points.some(p=>!fits(p)))||
    g.layout.lines.some(l=>l.points.some(p=>!fits(p)))||g.objects.some(o=>o.position&&!fits(o.position)))return null;
 const next={...g,width,height};
 return isGarden(next)?next:null;
}
/** Add an equal margin on all sides, translating geometry but keeping size/spacing unchanged.
 * This creates space for roads and neighbouring plots without stretching the property.
 */
export function addSurroundings(g:Garden,margin:number):Garden|null {
 if(!Number.isFinite(margin)||margin<=0||g.width+2*margin>500||g.height+2*margin>500)return null;
 const shift=(p:Point):Point=>({x:Number((p.x+margin).toFixed(5)),y:Number((p.y+margin).toFixed(5))});
 const l=g.layout;
 const next:Garden={...g,width:g.width+2*margin,height:g.height+2*margin,
   layout:{...l,boundary:l.boundary.map(shift),regions:l.regions.map(r=>({...r,points:r.points.map(shift)})),
     lines:l.lines.map(line=>({...line,points:line.points.map(shift)}))},
   objects:g.objects.map(o=>o.position?{...o,position:shift(o.position)}:o),...(g.reference?{reference:{...g.reference,x:g.reference.x+margin,y:g.reference.y+margin}}:{})};
 return isGarden(next)?next:null;
}
export function loadGarden():Garden {
 try{for(const key of ['garden-atlas:p003:v3','garden-atlas:p003:recovery','garden-atlas:p002:v2','garden-atlas:p001:v1']){
  const raw=localStorage.getItem(key);if(!raw)continue;try{const found=parseGarden(JSON.parse(raw));if(found)return found;}catch{/* next */}
 }}catch{/* storage disabled */}
 return demoGarden();
}
