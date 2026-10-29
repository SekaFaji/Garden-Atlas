/** Garden Atlas v4: shared records, independent layouts, dimensioned workspace and terrain regions. */
export type Mode = 'scale' | 'illustration';
export type Kind = 'tree' | 'shrub' | 'flower' | 'bed' | 'house';
export type Ground = 'grass' | 'soil' | 'gravel' | 'stone' | 'water';
export interface Point { x: number; y: number }
export interface GardenGroup { id: string; name: string; notes: string }
export interface GardenObject { id: string; kind: Kind; name: string; species: string; groupId: string | null; notes: string; diameterM: number; placements: Partial<Record<Mode, Point>> }
export interface Region { id: string; name: string; ground: Ground; points: Point[] }
export interface MapLayout { boundary: Point[]; ground: Ground; regions: Region[] }
export interface Garden { version: 4; name: string; width: number; height: number; groups: GardenGroup[]; objects: GardenObject[]; layouts: Record<Mode, MapLayout> }
export const WORLD = { width: 40, height: 26, pixelsPerUnit: 20 } as const;
export const GROUNDS: { value: Ground; label: string }[] = [
  {value:'grass',label:'Grass'}, {value:'soil',label:'Soil'}, {value:'gravel',label:'Gravel'}, {value:'stone',label:'Stone'}, {value:'water',label:'Water'}
];
export const KINDS: {kind:Kind; label:string; initialName:string; diameterM:number}[] = [
  {kind:'tree',label:'Tree',initialName:'New tree',diameterM:3.8},
  {kind:'shrub',label:'Shrub',initialName:'New shrub',diameterM:2},
  {kind:'flower',label:'Flowers',initialName:'Flower patch',diameterM:1.6},
  {kind:'bed',label:'Garden bed',initialName:'Garden bed',diameterM:4},
  {kind:'house',label:'Structure',initialName:'Structure',diameterM:5},
];
export const info = (kind:Kind) => KINDS.find(x=>x.kind===kind)!;
const STORAGE_V1='garden-atlas:p001:v1', STORAGE_V2='garden-atlas:p002:v2', STORAGE_V3='garden-atlas:p003:v3';
const BACKUP_V3='garden-atlas:p003:recovery';

export function clampPoint(p:Point, g:Pick<Garden,'width'|'height'> = WORLD):Point {
  return { x:Math.min(g.width,Math.max(0,p.x)), y:Math.min(g.height,Math.max(0,p.y)) };
}
export function defaultLayouts(width=40,height=26):Record<Mode,MapLayout> {
  const boundary=()=>[{x:1,y:1},{x:width-1,y:1},{x:width-1,y:height-1},{x:1,y:height-1}];
  return { scale:{boundary:boundary(),ground:'grass',regions:[]}, illustration:{boundary:boundary(),ground:'grass',regions:[]} };
}
export function emptyGarden():Garden {return {version:4,name:'My Garden',width:40,height:26,groups:[],objects:[],layouts:defaultLayouts()};}
export function demoGarden():Garden {
  return {
    version:4,name:'Sample Garden',width:40,height:26,layouts:defaultLayouts(),
    groups:[
      {id:'GROUP-001',name:'Back garden',notes:'An example garden zone.'},
      {id:'GROUP-002',name:'Orchard',notes:''},
      {id:'GROUP-003',name:'Entrance',notes:''},
      {id:'GROUP-004',name:'Front garden',notes:''},
      {id:'GROUP-005',name:'Kitchen garden',notes:''},
      {id:'GROUP-006',name:'Structures',notes:''},
    ],
    objects:[
      {id:'TREE-001',kind:'tree',name:'Old Oak',species:'Quercus robur (example)',groupId:'GROUP-001',notes:'Synthetic demo — not a real property.',diameterM:5.4,placements:{scale:{x:29,y:7},illustration:{x:31,y:8}}},
      {id:'TREE-002',kind:'tree',name:'Apple Tree',species:'Malus domestica (example)',groupId:'GROUP-002',notes:'',diameterM:3.5,placements:{scale:{x:9,y:7},illustration:{x:9,y:6}}},
      {id:'SHRUB-001',kind:'shrub',name:'Entrance Hedge',species:'',groupId:'GROUP-003',notes:'',diameterM:2.3,placements:{scale:{x:7,y:19},illustration:{x:5,y:20}}},
      {id:'FLOWER-001',kind:'flower',name:'Wildflowers',species:'',groupId:'GROUP-004',notes:'',diameterM:2,placements:{scale:{x:31,y:19},illustration:{x:32,y:20}}},
      {id:'BED-001',kind:'bed',name:'Vegetable Patch',species:'',groupId:'GROUP-005',notes:'',diameterM:4,placements:{scale:{x:15,y:8},illustration:{x:18,y:8}}},
      {id:'HOUSE-001',kind:'house',name:'House (demo)',species:'',groupId:'GROUP-006',notes:'Not a real property.',diameterM:7,placements:{scale:{x:20,y:19},illustration:{x:21,y:19}}},
    ]
  };
}
const isText=(v:unknown,max=10000):v is string=>typeof v==='string' && v.length<=max;
const isObj=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v);
const validSize=(n:unknown)=>typeof n==='number'&&Number.isFinite(n)&&n>=10&&n<=500;
const isPoint=(v:unknown,g:{width:number;height:number}):v is Point=>isObj(v)&&typeof v.x==='number'&&Number.isFinite(v.x)&&v.x>=0&&v.x<=g.width&&typeof v.y==='number'&&Number.isFinite(v.y)&&v.y>=0&&v.y<=g.height;
const cross=(a:Point,b:Point,c:Point)=>(b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x);
const onSegment=(a:Point,b:Point,p:Point)=>Math.abs(cross(a,b,p))<1e-7&&p.x>=Math.min(a.x,b.x)-1e-7&&p.x<=Math.max(a.x,b.x)+1e-7&&p.y>=Math.min(a.y,b.y)-1e-7&&p.y<=Math.max(a.y,b.y)+1e-7;
function intersects(a:Point,b:Point,c:Point,d:Point):boolean {
  if(onSegment(a,b,c)||onSegment(a,b,d)||onSegment(c,d,a)||onSegment(c,d,b))return true;
  const q=cross(a,b,c),r=cross(a,b,d),s=cross(c,d,a),t=cross(c,d,b);
  return (q>0)!==(r>0)&&(s>0)!==(t>0);
}
export function polygonArea(pts:Point[]):number {
  return Math.abs(pts.reduce((v,p,i)=>{const n=pts[(i+1)%pts.length];return v+p.x*n.y-n.x*p.y;},0))/2;
}
export function validPolygon(v:unknown,g:Pick<Garden,'width'|'height'>,maxPoints=100):v is Point[] {
  if(!Array.isArray(v)||v.length<3||v.length>maxPoints||!v.every(p=>isPoint(p,g)))return false;
  const pts=v as Point[];
  if(polygonArea(pts)<.1)return false;
  for(let i=0;i<pts.length;i++){
    const a=pts[i],b=pts[(i+1)%pts.length];
    if(Math.hypot(a.x-b.x,a.y-b.y)<.06)return false;
    for(let j=i+1;j<pts.length;j++){
      if(j===i+1||(i===0&&j===pts.length-1))continue;
      if(intersects(a,b,pts[j],pts[(j+1)%pts.length]))return false;
    }
  }
  return true;
}
export function validBoundary(v:unknown,g:Pick<Garden,'width'|'height'>=WORLD):v is Point[]{return validPolygon(v,g,100);}
export function isGarden(value:unknown):value is Garden {
  if(!isObj(value)||value.version!==4||!isText(value.name)||!validSize(value.width)||!validSize(value.height))return false;
  const g=value as unknown as Garden;
  if(!Array.isArray(g.groups)||g.groups.length>1000||!Array.isArray(g.objects)||g.objects.length>3000||!isObj(g.layouts))return false;
  const groupIds=new Set<string>(),objectIds=new Set<string>();
  for(const gr of g.groups){if(!isObj(gr)||!isText(gr.id,80)||!gr.id||groupIds.has(gr.id)||!isText(gr.name)||!gr.name.trim()||!isText(gr.notes))return false;groupIds.add(gr.id);}
  for(const o of g.objects){
    if(!isObj(o)||!isText(o.id,80)||!o.id||objectIds.has(o.id)||!KINDS.some(k=>k.kind===o.kind)||!isText(o.name)||!isText(o.species)||!isText(o.notes)||!Number.isFinite(o.diameterM)||o.diameterM<.5||o.diameterM>100||!(o.groupId===null||typeof o.groupId==='string'&&groupIds.has(o.groupId))||!isObj(o.placements))return false;
    if(!(['scale','illustration'] as const).every(m=>o.placements[m]===undefined||isPoint(o.placements[m],g)))return false;
    objectIds.add(o.id);
  }
  for(const mode of ['scale','illustration'] as const){
    const layout=g.layouts[mode];
    if(!isObj(layout)||!GROUNDS.some(gr=>gr.value===layout.ground)||!validPolygon(layout.boundary,g)||!Array.isArray(layout.regions)||layout.regions.length>200)return false;
    const ids=new Set<string>();
    for(const rg of layout.regions){if(!isObj(rg)||!isText(rg.id,80)||!rg.id||ids.has(rg.id)||!isText(rg.name,120)||!GROUNDS.some(ground=>ground.value===rg.ground)||!validPolygon(rg.points,g))return false;ids.add(rg.id);}
  }
  return true;
}
/** P001–P003 data migrates without changing specimen IDs or either saved placement. */
export function parseGarden(value:unknown):Garden|null {
  if(isGarden(value))return value;
  if(!isObj(value)||!isText(value.name)||!Array.isArray(value.objects))return null;
  const v=value.version;
  if(v!==1&&v!==2&&v!==3)return null;
  const groups:GardenGroup[]=[];
  let objects:GardenObject[]=[];
  if(v===1){
    const names=new Map<string,string>();
    for(const raw of value.objects){
      if(!isObj(raw)||!isText(raw.group))return null;
      const label=raw.group.trim(),key=label.toLocaleLowerCase();
      if(label&&!names.has(key)){const id='GROUP-'+String(groups.length+1).padStart(3,'0');names.set(key,id);groups.push({id,name:label,notes:''});}
      const {group:_unused, ...record}=raw; void _unused;
      objects.push({...record,groupId:label?names.get(key)!:null} as unknown as GardenObject);
    }
  }else{
    if(!Array.isArray(value.groups))return null;
    groups.push(...value.groups as GardenGroup[]);
    objects=value.objects as GardenObject[];
  }
  const oldLayouts=value.layouts;
  const defaults=defaultLayouts();
  const layouts:Record<Mode,MapLayout>={scale:defaults.scale,illustration:defaults.illustration};
  if(v===3){if(!isObj(oldLayouts))return null;
    for(const mode of ['scale','illustration'] as const){const l=oldLayouts[mode];if(!isObj(l))return null;layouts[mode]={boundary:l.boundary as Point[],ground:l.ground as Ground,regions:[]};}
  }
  const upgraded:Garden={version:4,name:value.name,width:40,height:26,groups,objects,layouts};
  return isGarden(upgraded)?upgraded:null;
}
export function movePlaced(g:Garden,id:string,mode:Mode,requested:Point,together:boolean):Garden {
  const item=g.objects.find(o=>o.id===id);if(!item)return g;
  const pos=item.placements[mode];
  if(!pos)return {...g,objects:g.objects.map(o=>o.id===id?{...o,placements:{...o.placements,[mode]:clampPoint(requested,g)}}:o)};
  const members=together&&item.groupId?g.objects.filter(o=>o.groupId===item.groupId&&o.placements[mode]):[item];
  const pts=members.map(o=>o.placements[mode]!);
  const clip=(n:number,min:number,max:number)=>Math.min(max,Math.max(min,n));
  const dx=clip(requested.x-pos.x,-Math.min(...pts.map(p=>p.x)),g.width-Math.max(...pts.map(p=>p.x)));
  const dy=clip(requested.y-pos.y,-Math.min(...pts.map(p=>p.y)),g.height-Math.max(...pts.map(p=>p.y)));
  const ids=new Set(members.map(o=>o.id));
  return {...g,objects:g.objects.map(o=>{if(!ids.has(o.id))return o;const p=o.placements[mode]!;return {...o,placements:{...o.placements,[mode]:{x:p.x+dx,y:p.y+dy}}};})};
}
export function nextGroupId(g:Garden):string {let n=1;const existing=new Set(g.groups.map(x=>x.id));while(existing.has('GROUP-'+String(n).padStart(3,'0')))n++;return 'GROUP-'+String(n).padStart(3,'0');}
export function nextObjectId(g:Garden,kind:Kind):string {let n=1,prefix=kind.toUpperCase()+'-';const ids=new Set(g.objects.map(o=>o.id));while(ids.has(prefix+String(n).padStart(3,'0')))n++;return prefix+String(n).padStart(3,'0');}
export function nextRegionId(g:Garden,mode:Mode):string {let n=1;const ids=new Set(g.layouts[mode].regions.map(o=>o.id));while(ids.has('REGION-'+String(n).padStart(3,'0')))n++;return 'REGION-'+String(n).padStart(3,'0');}
export function removeGroup(g:Garden,id:string):Garden{return {...g,groups:g.groups.filter(x=>x.id!==id),objects:g.objects.map(x=>x.groupId===id?{...x,groupId:null}:x)};}
export function setBoundary(g:Garden,mode:Mode,points:Point[]):Garden|null {if(!validPolygon(points,g))return null;return {...g,layouts:{...g.layouts,[mode]:{...g.layouts[mode],boundary:points}}};}
export function moveBoundaryCorner(g:Garden,mode:Mode,index:number,point:Point):Garden|null {
  const old=g.layouts[mode].boundary;if(!Number.isInteger(index)||index<0||index>=old.length)return null;
  return setBoundary(g,mode,old.map((p,i)=>i===index?clampPoint(point,g):p));
}
export function addBoundaryCorner(g:Garden,mode:Mode,edgeIndex?:number,point?:Point):Garden|null {
  const old=g.layouts[mode].boundary;if(old.length>=100)return null;
  let edge=edgeIndex??0;
  if(edgeIndex===undefined){let longest=-1;old.forEach((p,i)=>{const q=old[(i+1)%old.length],d=Math.hypot(p.x-q.x,p.y-q.y);if(d>longest){longest=d;edge=i;}});}
  if(!Number.isInteger(edge)||edge<0||edge>=old.length)return null;
  const a=old[edge],b=old[(edge+1)%old.length];
  const p=point??{x:(a.x+b.x)/2,y:(a.y+b.y)/2};
  const next=[...old];next.splice(edge+1,0,clampPoint(p,g));return setBoundary(g,mode,next);
}
export function removeBoundaryCorner(g:Garden,mode:Mode,index:number):Garden|null {const old=g.layouts[mode].boundary;if(old.length<=3||index<0||index>=old.length)return null;return setBoundary(g,mode,old.filter((_,i)=>i!==index));}
export function addRegion(g:Garden,mode:Mode,points:Point[],ground:Ground):Garden|null {
  if(!validPolygon(points,g)||g.layouts[mode].regions.length>=200)return null;
  const reg:Region={id:nextRegionId(g,mode),name:GROUNDS.find(x=>x.value===ground)!.label+' area',ground,points};
  return {...g,layouts:{...g.layouts,[mode]:{...g.layouts[mode],regions:[...g.layouts[mode].regions,reg]}}};
}
/** Ramer–Douglas–Peucker simplification for finger-drawn outlines. */
export function simplifyStroke(points:Point[],tolerance=.25):Point[] {
  if(points.length<=2)return points;
  const dist=(p:Point,a:Point,b:Point)=>{const dx=b.x-a.x,dy=b.y-a.y;const t=dx*dx+dy*dy===0?0:Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.y-a.y)*dy)/(dx*dx+dy*dy)));return Math.hypot(p.x-(a.x+t*dx),p.y-(a.y+t*dy));};
  let max=-1,index=0;
  for(let i=1;i<points.length-1;i++){const d=dist(points[i],points[0],points[points.length-1]);if(d>max){max=d;index=i;}}
  return max<=tolerance?[points[0],points[points.length-1]]:[...simplifyStroke(points.slice(0,index+1),tolerance).slice(0,-1),...simplifyStroke(points.slice(index),tolerance)];
}
export function resizeGarden(g:Garden,width:number,height:number):Garden|null {
  if(!validSize(width)||!validSize(height))return null;
  const fx=width/g.width,fy=height/g.height;
  const transform=(p:Point)=>({x:Number((p.x*fx).toFixed(5)),y:Number((p.y*fy).toFixed(5))});
  const layouts={...g.layouts};
  for(const mode of ['scale','illustration'] as const){const l=g.layouts[mode];layouts[mode]={...l,boundary:l.boundary.map(transform),regions:l.regions.map(r=>({...r,points:r.points.map(transform)}))};}
  const updated:Garden={...g,width,height,layouts,objects:g.objects.map(o=>({...o,placements:Object.fromEntries(Object.entries(o.placements).map(([mode,p])=>[mode,transform(p!)]))}))};
  return isGarden(updated)?updated:null;
}
export function loadGarden():Garden {
  try {for(const key of [STORAGE_V3,BACKUP_V3,STORAGE_V2,STORAGE_V1]){const raw=localStorage.getItem(key);if(!raw)continue;try{const g=parseGarden(JSON.parse(raw));if(g)return g;}catch{/* next */}}}catch{/* no storage */}
  return demoGarden();
}
