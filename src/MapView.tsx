import { useEffect, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent, WheelEvent as ReactWheelEvent } from 'react';
import { Sprite } from './Sprite';
import { closestEdge, formatArea } from './geometry';
import type { FeatureSelection, EditAction } from './featureEdit';
import { fitCamera, panCamera, pinchCamera, zoomCamera, type Camera } from './camera';
import { clampPoint, polygonArea, simplifyStroke, validPolygon, objectDimensions, WORLD, KINDS, type Garden, type Ground, type Kind, type Mode, type Point, type LineKind } from './model';

export type Tool = 'select' | 'feature-edit' | 'pan' | 'outline-edit' | 'outline-draw' | 'freehand' | 'terrain' | LineKind | Kind;
interface Props {
  garden: Garden; mode: Mode; tool: Tool; selectedId: string | null; selectedGroupId: string | null; selectedIds: readonly string[]; multiSelect:boolean; snapEnabled:boolean; showReference:boolean;
  terrain: Ground; lineWidth: number; hidden: { objects: boolean; regions: boolean; boundary: boolean; lines: boolean };
  locked: {objects:boolean;regions:boolean;lines:boolean;boundary:boolean};
  selectedFeature: FeatureSelection|null;
  onSelectFeature:(selected:FeatureSelection|null)=>void;
  onSelectVertex:(index:number|null)=>void;
  onEditFeature:(selected:FeatureSelection,index:number,action:EditAction,point?:Point)=>void;
  onResizeObject:(id:string,widthM:number,lengthM:number)=>void;
  onPick: (id: string|null) => void;
  onTogglePick: (id:string)=>void;
  onMoveSelection: (anchorId:string,point:Point)=>void;
  onPlace: (kind:Kind,point:Point) => void;
  onMove: (id:string,point:Point,together:boolean) => void;
  onBoundary: (points:Point[]) => void;
  onTerrain: (points:Point[],ground:Ground) => void;
  onLine: (points:Point[],kind:LineKind,widthM:number) => void;
  onNotice: (text:string) => void;
}
type PointerInfo={x:number;y:number};
type Activity =
  | {kind:'pan';x:number;y:number;camera:Camera}
  | {kind:'object';id:string;start:Point;anchor:Point;together:boolean;moved:boolean;multiple:boolean}
  | {kind:'corner';index:number;point:Point;moved:boolean}
  | {kind:'freehand';points:Point[]}
  | {kind:'tap';start:PointerInfo}
  | {kind:'feature-node';feature:FeatureSelection;index:number;point:Point;moved:boolean}
  | {kind:'resize';id:string;origin:Point;widthM:number;lengthM:number;moved:boolean};
const ppu=WORLD.pixelsPerUnit;
const color: Record<Ground,string>={grass:'#8ebc77',soil:'#a57c53',gravel:'#a8aca0',stone:'#bdb8a9',water:'#64a6bc'};
const snap=(p:Point,mode:Mode,force=false):Point=>force?{x:Math.round(p.x*2)/2,y:Math.round(p.y*2)/2}:mode==='scale'?{x:Math.round(p.x*10)/10,y:Math.round(p.y*10)/10}:p;
const px=(p:Point)=>`${p.x*ppu},${p.y*ppu}`;
const polygon=(pts:Point[])=>pts.map(px).join(' ');
const midpoint=(a:PointerInfo,b:PointerInfo)=>({x:(a.x+b.x)/2,y:(a.y+b.y)/2});
const distance=(a:PointerInfo,b:PointerInfo)=>Math.hypot(a.x-b.x,a.y-b.y);
export function MapView({garden,mode,tool,selectedId,selectedGroupId,selectedIds,multiSelect,snapEnabled,showReference,terrain,lineWidth,hidden,locked,selectedFeature,onSelectFeature,onSelectVertex,onEditFeature,onResizeObject,onPick,onTogglePick,onMoveSelection,onPlace,onMove,onBoundary,onTerrain,onLine,onNotice}:Props){
  const svgRef=useRef<SVGSVGElement>(null);
  const pointsRef=useRef(new Map<number,PointerInfo>());
  const activeRef=useRef<Activity|null>(null);
  const pinchRef=useRef<{dist:number;mid:PointerInfo;camera:Camera}|null>(null);
  const [size,setSize]=useState({width:0,height:0});
  const [camera,setCamera]=useState<Camera>({cx:20,cy:13,z:1});
  const cameraRef=useRef(camera);cameraRef.current=camera;
  const [preview,setPreview]=useState<{id:string;point:Point;together:boolean;many?:readonly string[]}|null>(null);
  const [cornerPreview,setCornerPreview]=useState<{index:number;point:Point}|null>(null);
  const [featurePreview,setFeaturePreview]=useState<{kind:FeatureSelection['kind'];id:string;index:number;point:Point}|null>(null);
  const [resizePreview,setResizePreview]=useState<{id:string;widthM:number;lengthM:number}|null>(null);
  const [draft,setDraft]=useState<Point[]>([]);
  const [pinching,setPinching]=useState(false);
  const initialFit=useRef(false);
  useEffect(()=>{
    const node=svgRef.current;if(!node)return;
    const refresh=()=>{const r=node.getBoundingClientRect();if(r.width&&r.height)setSize({width:r.width,height:r.height});};
    refresh();const observer=new ResizeObserver(refresh);observer.observe(node);return ()=>observer.disconnect();
  },[]);
  useEffect(()=>{
    if(!initialFit.current&&size.width>2&&size.height>2){initialFit.current=true;setCamera(fitCamera(garden,size));}
  },[size.width,size.height,garden]);
  // Workspace dimensions change independently of garden geometry. Fit the newly sized area
  // once after each resize; don't reset the camera for ordinary edits or zoom gestures.
  const dimensionsRef=useRef({width:garden.width,height:garden.height});
  useEffect(()=>{
    const previous=dimensionsRef.current;
    if(previous.width!==garden.width||previous.height!==garden.height){
      dimensionsRef.current={width:garden.width,height:garden.height};
      if(size.width>2&&size.height>2)setCamera(fitCamera(garden,size,undefined,1.2));
    }
  },[garden.width,garden.height,size.width,size.height,garden]);
  useEffect(()=>{setDraft([]);setPreview(null);setCornerPreview(null);setFeaturePreview(null);setResizePreview(null);activeRef.current=null;pointsRef.current.clear();pinchRef.current=null;},[mode,tool,garden.width,garden.height]);
  const fit=(outer=false)=>{setCamera(fitCamera(garden,size,outer?undefined:garden.layout.boundary,outer?1.75:1.17));};
  const zoomAt=(factor:number,x:number,y:number)=>{
    setCamera(zoomCamera(cameraRef.current,size,factor,x,y));
  };
  const pointFromEvent=(event:ReactPointerEvent<SVGSVGElement>):Point|null=>{
    const svg=svgRef.current,m=svg?.getScreenCTM();if(!svg||!m)return null;
    const p=svg.createSVGPoint();p.x=event.clientX;p.y=event.clientY;
    try{const local=p.matrixTransform(m.inverse());return {x:local.x/ppu,y:local.y/ppu};}catch{return null;}
  };
  const inside=(p:Point)=>p.x>=0&&p.y>=0&&p.x<=garden.width&&p.y<=garden.height;
  const finishDraft=()=>{
    const clean=draft.length>1&&distance(draft[0],draft[draft.length-1])<.15?draft.slice(0,-1):draft;
    if(tool==='path'||tool==='fence'){
      if(clean.length<2){onNotice('Tap at least two points for a path or fence.');return;}
      onLine(clean,tool,lineWidth);setDraft([]);return;
    }
    if(!validPolygon(clean,garden)){onNotice('Shape must have 3+ non-crossing corners inside the workspace.');return;}
    if(tool==='outline-draw'){onBoundary(clean);onNotice('Property outline updated.');}
    if(tool==='terrain'){onTerrain(clean,terrain);onNotice('Terrain area added.');}
    setDraft([]);
  };
  const pointerDown=(e:ReactPointerEvent<SVGSVGElement>)=>{
    if(e.button!==0)return;
    e.preventDefault();
    const before=pointsRef.current.size;
    pointsRef.current.set(e.pointerId,{x:e.clientX,y:e.clientY});
    try{e.currentTarget.setPointerCapture(e.pointerId);}catch{/* not supported */}
    if(before>=1){
      const pts=[...pointsRef.current.values()];
      pinchRef.current={dist:Math.max(1,distance(pts[0],pts[1])),mid:midpoint(pts[0],pts[1]),camera:cameraRef.current};
      activeRef.current=null;setPreview(null);setCornerPreview(null);setPinching(true);return;
    }
    const start=pointFromEvent(e);if(!start)return;
    const target=e.target as Element;
    const hit=target.closest('[data-object]') as SVGElement|null;
    const resizeHit=target.closest('[data-resize]') as SVGElement|null;
    const featureHit=target.closest('[data-feature-id]') as SVGElement|null;
    const featureNode=target.closest('[data-feature-node]') as SVGElement|null;
    const featureEdge=target.closest('[data-feature-edge]') as SVGElement|null;
    if(tool==='select'&&resizeHit&&!locked.objects){
      const obj=garden.objects.find(o=>o.id===resizeHit.dataset.resize);
      if(obj?.position){activeRef.current={kind:'resize',id:obj.id,origin:obj.position,...objectDimensions(obj),moved:false};return;}
    }
    if(tool==='feature-edit'&&featureHit){
      const feature={kind:featureHit.dataset.featureKind as FeatureSelection['kind'],id:featureHit.dataset.featureId!};
      if(locked[feature.kind==='region'?'regions':'lines'])return;
      onSelectFeature(feature);
      if(!featureNode)onSelectVertex(null);
      if(featureNode){const index=Number(featureNode.dataset.featureNode);onSelectVertex(index);activeRef.current={kind:'feature-node',feature,index,point:start,moved:false};return;}
      if(featureEdge){
        const index=Number(featureEdge.dataset.featureEdge);
        const f=feature.kind==='region'?garden.layout.regions.find(r=>r.id===feature.id):garden.layout.lines.find(l=>l.id===feature.id);
        if(f){const a=f.points[index],b=f.points[(index+1)%f.points.length];
          if(a&&b){const dx=b.x-a.x,dy=b.y-a.y,len=dx*dx+dy*dy;
            const t=len?Math.max(.05,Math.min(.95,((start.x-a.x)*dx+(start.y-a.y)*dy)/len)):.5;
            onEditFeature(feature,index,'insert',clampPoint({x:a.x+t*dx,y:a.y+t*dy},garden));
          }
        }
      }
      activeRef.current={kind:'tap',start:{x:e.clientX,y:e.clientY}};return;
    }
    const corner=target.closest('[data-corner]') as SVGElement|null;
    const edge=target.closest('[data-edge]') as SVGElement|null;
    if(tool==='freehand'){
      activeRef.current={kind:'freehand',points:[clampPoint(start,garden)]};setDraft([clampPoint(start,garden)]);return;
    }
    if(tool==='outline-edit'&&!locked.boundary&&corner){
      const index=Number(corner.dataset.corner);
      activeRef.current={kind:'corner',index,point:start,moved:false};return;
    }
    if(tool==='outline-edit'&&!locked.boundary&&edge){
      const index=Number(edge.dataset.edge);
      const b=garden.layout.boundary;
      const closest=closestEdge(b,start);
      if(closest&&closest.index===index){
        const next=[...b];next.splice(index+1,0,clampPoint(closest.point,garden));
        if(validPolygon(next,garden)){onBoundary(next);onNotice('Boundary point added. Drag it to reshape.');}
      }
      activeRef.current={kind:'tap',start:{x:e.clientX,y:e.clientY}};return;
    }
    if((tool==='select')&&hit&&!hidden.objects&&!locked.objects){
      const id=hit.dataset.object!;
      const obj=garden.objects.find(o=>o.id===id);
      if(obj?.position){
        const multiple=multiSelect&&selectedIds.includes(id);
        const together=Boolean(!multiSelect&&selectedGroupId&&obj.groupId===selectedGroupId);
        if(!multiSelect&&!together)onPick(id);
        activeRef.current={kind:'object',id,start:clampPoint(start,garden),anchor:obj.position!,together,multiple,moved:false};return;
      }
    }
    if(tool==='pan'||tool==='select'||tool==='outline-edit'||tool==='feature-edit')activeRef.current={kind:'pan',x:e.clientX,y:e.clientY,camera:cameraRef.current};
    else activeRef.current={kind:'tap',start:{x:e.clientX,y:e.clientY}};
  };
  const pointerMove=(e:ReactPointerEvent<SVGSVGElement>)=>{
    if(!pointsRef.current.has(e.pointerId))return;
    pointsRef.current.set(e.pointerId,{x:e.clientX,y:e.clientY});
    if(pointsRef.current.size>=2){
      const pts=[...pointsRef.current.values()],pinch=pinchRef.current;if(!pinch)return;
      const mid=midpoint(pts[0],pts[1]);
      setCamera(pinchCamera(pinch.camera,size,pinch.mid,mid,distance(pts[0],pts[1])/pinch.dist));return;
    }
    const a=activeRef.current;if(!a)return;
    const p=pointFromEvent(e);
    if(a.kind==='pan')setCamera(panCamera(a.camera,e.clientX-a.x,e.clientY-a.y));
    if(a.kind==='object'&&p){
      if(Math.hypot(p.x-a.start.x,p.y-a.start.y)>.16)a.moved=true;
      if(a.moved)setPreview({id:a.id,point:clampPoint(snap({x:a.anchor.x+p.x-a.start.x,y:a.anchor.y+p.y-a.start.y},mode,snapEnabled),garden),together:a.together,many:a.multiple?selectedIds:undefined});
    }
    if(a.kind==='corner'&&p){a.moved=true;setCornerPreview({index:a.index,point:clampPoint(snap(p,mode,snapEnabled),garden)});}
    if(a.kind==='feature-node'&&p){
      if(Math.hypot(p.x-a.point.x,p.y-a.point.y)>.08)a.moved=true;
      if(a.moved)setFeaturePreview({...a.feature,index:a.index,point:clampPoint(snap(p,mode,snapEnabled),garden)});
    }
    if(a.kind==='resize'&&p){
      const widthM=Math.min(100,Math.max(0,2*Math.abs(p.x-a.origin.x)));
      const lengthM=Math.min(100,Math.max(0,2*Math.abs(p.y-a.origin.y)));
      if(Math.abs(widthM-a.widthM)>.06||Math.abs(lengthM-a.lengthM)>.06)a.moved=true;
      const round=(n:number)=>snapEnabled?Math.round(n*2)/2:Math.round(n*20)/20;
      if(a.moved)setResizePreview({id:a.id,widthM:round(widthM),lengthM:round(lengthM)});
    }
    if(a.kind==='freehand'&&p){const next=clampPoint(p,garden),prev=a.points[a.points.length-1];if(Math.hypot(prev.x-next.x,prev.y-next.y)>.16){a.points.push(next);if(a.points.length%3===0)setDraft([...a.points]);}}
  };
  const pointerUp=(e:ReactPointerEvent<SVGSVGElement>)=>{
    if(!pointsRef.current.has(e.pointerId))return;
    const wasPinch=Boolean(pinchRef.current),a=activeRef.current,p=pointFromEvent(e);
    pointsRef.current.delete(e.pointerId);
    if(wasPinch){if(pointsRef.current.size<2){pinchRef.current=null;activeRef.current=null;setPinching(false);}return;}
    activeRef.current=null;
    if(!a||!p)return;
    if(a.kind==='feature-node'){
      if(a.moved)onEditFeature(a.feature,a.index,'move',clampPoint(snap(p,mode,snapEnabled),garden));
      setFeaturePreview(null);return;
    }
    if(a.kind==='resize'){
      if(a.moved){const widthM=Math.min(100,Math.max(0,2*Math.abs(p.x-a.origin.x))),lengthM=Math.min(100,Math.max(0,2*Math.abs(p.y-a.origin.y)));
        const round=(n:number)=>snapEnabled?Math.round(n*2)/2:Math.round(n*20)/20;
        onResizeObject(a.id,round(widthM),round(lengthM));}
      setResizePreview(null);return;
    }
    if(a.kind==='object'){
      if(a.moved){const final=clampPoint(snap({x:a.anchor.x+p.x-a.start.x,y:a.anchor.y+p.y-a.start.y},mode,snapEnabled),garden);
        if(a.multiple)onMoveSelection(a.id,final);
        else if(multiSelect)onTogglePick(a.id);
        else onMove(a.id,final,a.together);
      }else if(multiSelect)onTogglePick(a.id);
      setPreview(null);return;
    }
    if(a.kind==='corner'){
      if(a.moved){const boundary=garden.layout.boundary.map((pt,i)=>i===a.index?clampPoint(snap(p,mode,snapEnabled),garden):pt);if(validPolygon(boundary,garden))onBoundary(boundary);else onNotice('Invalid outline. Edit cancelled to keep your garden safe.');}
      setCornerPreview(null);return;
    }
    if(a.kind==='freehand'){
      const reduced=simplifyStroke([...a.points,clampPoint(p,garden)],Math.max(.15,.8/cameraRef.current.z));
      if(validPolygon(reduced,garden)){onBoundary(reduced);setDraft([]);onNotice('Freehand outline created. Edit corners to refine it.');}
      else{setDraft([]);onNotice('Freehand shape was too small or crossed itself; previous outline was kept.');}
      return;
    }
    if(a.kind==='pan')return;
    if(a.kind==='tap'&&Math.hypot(e.clientX-a.start.x,e.clientY-a.start.y)>12)return;
    if(!inside(p))return;
    if(tool==='outline-draw'||tool==='terrain'||tool==='path'||tool==='fence'){setDraft(d=>d.length<100?[...d,snap(p,mode,snapEnabled)]:d);return;}
    if(KINDS.some(k=>k.kind===tool))onPlace(tool as Kind,snap(p,mode,snapEnabled));
  };
  const cancelPointer=(e:ReactPointerEvent<SVGSVGElement>)=>{
    pointsRef.current.delete(e.pointerId);activeRef.current=null;pinchRef.current=null;setPreview(null);setCornerPreview(null);setFeaturePreview(null);setResizePreview(null);setPinching(false);
  };
  const wheel=(event:ReactWheelEvent<SVGSVGElement>)=>{
    event.preventDefault();const r=event.currentTarget.getBoundingClientRect();zoomAt(Math.exp(-event.deltaY*.0012),event.clientX-r.left,event.clientY-r.top);
  };
  const layout=garden.layout,place=garden.objects.find(o=>o.id===preview?.id)?.position;
  const groupIds=preview?.many??(preview?.together?garden.objects.filter(o=>o.groupId&&o.groupId===garden.objects.find(x=>x.id===preview.id)?.groupId).map(o=>o.id):[]);
  const dx=preview&&place?preview.point.x-place.x:0,dy=preview&&place?preview.point.y-place.y:0;
  const vw=size.width/camera.z,vh=size.height/camera.z;
  const shape=(pts:Point[])=>polygon(pts);
  const outline=layout.boundary.map((p,i)=>cornerPreview?.index===i?cornerPreview.point:p);
  const previewPoints=(feature:FeatureSelection,points:Point[])=>points.map((p,i)=>featurePreview&&featurePreview.kind===feature.kind&&featurePreview.id===feature.id&&featurePreview.index===i?featurePreview.point:p);
  return <div className="atlas-viewport">
    <svg ref={svgRef} className="map-surface" role="application" aria-label={`Interactive ${mode} garden map; drag objects with one finger, pan on empty land, pinch to zoom.`}
      viewBox={`${camera.cx*ppu-vw/2} ${camera.cy*ppu-vh/2} ${vw} ${vh}`} preserveAspectRatio="none"
      onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={pointerUp} onPointerCancel={cancelPointer}
      onWheel={wheel}>
      <defs>
        <pattern id="ground-grid" width="20" height="20" patternUnits="userSpaceOnUse"><rect width="20" height="20" fill="#aebca3"/><path d="M0 0h20v20" stroke="#91a98d" fill="none" strokeWidth=".5"/></pattern>
        <pattern id="map-grass" width="40" height="40" patternUnits="userSpaceOnUse"><rect width="40" height="40" fill={color[layout.ground]}/><rect x="4" y="8" width="6" height="4" fill="#ecf5ba" opacity=".17"/><rect x="27" y="24" width="4" height="6" fill="#2b5a45" opacity=".14"/></pattern>
        <clipPath id="property-clip"><polygon points={shape(outline)}/></clipPath>
      </defs>
      <rect x={-garden.width*ppu} y={-garden.height*ppu} width={garden.width*ppu*3} height={garden.height*ppu*3} fill="url(#ground-grid)" />
      <rect width={garden.width*ppu} height={garden.height*ppu} fill="#c0ccb3" stroke="#78947d" strokeWidth="3"/>
      <polygon points={shape(outline)} fill="url(#map-grass)" />
      {mode==='scale'&&<g clipPath="url(#property-clip)" pointerEvents="none">
        {Array.from({length:Math.floor(garden.width)+1},(_,i)=><line key={'x'+i} x1={i*ppu} x2={i*ppu} y1="0" y2={garden.height*ppu} stroke="#3f6950" strokeWidth={i%5===0?1.6:.7} opacity={i%5===0?.55:.3}/>)}
        {Array.from({length:Math.floor(garden.height)+1},(_,i)=><line key={'y'+i} x1="0" x2={garden.width*ppu} y1={i*ppu} y2={i*ppu} stroke="#3f6950" strokeWidth={i%5===0?1.6:.7} opacity={i%5===0?.55:.3}/>)}
      </g>}
      {!hidden.regions&&layout.regions.map(reg=><polygon key={reg.id} points={shape(previewPoints({kind:'region',id:reg.id},reg.points))} fill={color[reg.ground]} stroke="#3d634b" strokeWidth="2" opacity=".96"/>)}
      {garden.reference&&showReference&&<image
        href={garden.reference.dataUrl}
        x={garden.reference.x*ppu} y={garden.reference.y*ppu}
        width={garden.reference.widthM*ppu} height={garden.reference.heightM*ppu}
        opacity={garden.reference.opacity} preserveAspectRatio="none"
        pointerEvents="none" aria-label="Imported tracing reference" />}
      {!hidden.lines&&layout.lines.map(line=><g key={line.id} pointerEvents="none">
        <polyline points={shape(previewPoints({kind:'line',id:line.id},line.points))} stroke={line.kind==='fence'?'#4f3e31':'#6c614d'} strokeWidth={line.widthM*ppu+4} fill="none" strokeLinecap="square" strokeLinejoin="bevel" />
        <polyline points={shape(previewPoints({kind:'line',id:line.id},line.points))} stroke={line.kind==='fence'?'#bc9564':'#c9c0a8'} strokeWidth={line.widthM*ppu} strokeDasharray={line.kind==='fence'?'9 10':undefined} fill="none" strokeLinecap="square" strokeLinejoin="bevel" />
      </g>)}
      {!hidden.boundary&&<polygon points={shape(outline)} fill="none" stroke="#fff3c1" strokeWidth={Math.max(1.5,3/camera.z)} strokeDasharray={mode==='scale'?'10 6':undefined} pointerEvents="none" />}
      {!hidden.objects&&garden.objects.map(item=>{
        const original=item.position;if(!original)return null;
        const active=selectedId===item.id||selectedIds.includes(item.id)||Boolean(selectedGroupId&&selectedGroupId===item.groupId);
        const dragged=Boolean(preview&&(item.id===preview.id||groupIds.includes(item.id)));
        const offset=dragged?{x:dx,y:dy}:{x:0,y:0};
        const p={x:original.x+offset.x,y:original.y+offset.y};
        const axes=resizePreview?.id===item.id?resizePreview:objectDimensions(item);
        // A zero measurement is kept in the record; use only a small visible/tappable marker.
        const width=Math.max(.5,axes.widthM)*ppu*(mode==='illustration'?1.08:1);
        const length=Math.max(.5,axes.lengthM)*ppu*(mode==='illustration'?1.08:1);
        const hitWidth=Math.max(width,48/Math.max(.06,camera.z));
        const hitLength=Math.max(length,48/Math.max(.06,camera.z));
        return <g data-object={item.id} key={item.id} className="map-object" transform={`translate(${p.x*ppu} ${p.y*ppu})`}>
          {active&&<rect x={-width/2-7} y={-length/2-7} width={width+14} height={length+14} fill="none" stroke="#fff3ac" strokeWidth="3" strokeDasharray="7 4" pointerEvents="none" />}
          <svg x={-width/2} y={-length/2} width={width} height={length} viewBox="0 0 64 64" pointerEvents="none"><g transform={`rotate(${item.rotation??0} 32 32)`}><Sprite kind={item.kind} presetId={item.presetId}/></g></svg>
          <rect x={-hitWidth/2} y={-hitLength/2} width={hitWidth} height={hitLength} fill="transparent" />
          {tool==='select'&&!multiSelect&&selectedId===item.id&&!locked.objects&&<g>
            <line x1="0" y1="0" x2={width/2+12/camera.z} y2={length/2+12/camera.z} stroke="#fff3ac" strokeWidth={2/camera.z} pointerEvents="none"/>
            <rect data-resize={item.id} aria-label="Resize selected object width and length" x={width/2-10/camera.z} y={length/2-10/camera.z} width={Math.max(22,36/camera.z)} height={Math.max(22,36/camera.z)} fill="#f4df8e" stroke="#2a5442" strokeWidth={3/camera.z}/>
          </g>}
          {active&&<g pointerEvents="none"><rect x={-55} y={length/2+6} width="110" height="20" fill="#1f382f" stroke="#f6dfa4" strokeWidth="1.5"/><text textAnchor="middle" x="0" y={length/2+20} fontSize="11" fontFamily="monospace" fill="#fff7d4">{item.name.slice(0,15)}</text></g>}
        </g>;
      })}
      {tool==='outline-edit'&&outline.map((p,i)=>{
        const next=outline[(i+1)%outline.length];const mid={x:(p.x+next.x)/2,y:(p.y+next.y)/2};
        const handle=Math.max(12,30/camera.z);return <g key={i}>
          <line data-edge={i} x1={p.x*ppu} y1={p.y*ppu} x2={next.x*ppu} y2={next.y*ppu} stroke="transparent" strokeWidth={Math.max(20,36/camera.z)} pointerEvents="stroke" />
          <circle data-edge={i} cx={mid.x*ppu} cy={mid.y*ppu} r={handle*.55} fill="#b9efc8" stroke="#265f48" strokeWidth="2" opacity=".82" />
          <rect data-corner={i} x={p.x*ppu-handle/2} y={p.y*ppu-handle/2} width={handle} height={handle} fill="#f9e5a7" stroke="#345a47" strokeWidth="3" />
        </g>;
      })}
      {tool==='feature-edit'&&<g className="feature-overlay">
        {!hidden.regions&&!locked.regions&&layout.regions.map(reg=><g key={reg.id} data-feature-kind="region" data-feature-id={reg.id}>
          <polygon points={shape(previewPoints({kind:'region',id:reg.id},reg.points))} fill="transparent" stroke={selectedFeature?.id===reg.id?'#ffef92':'transparent'} strokeWidth={3/camera.z} />
          {selectedFeature?.kind==='region'&&selectedFeature.id===reg.id&&<>
            {reg.points.map((pt,i)=>{const next=reg.points[(i+1)%reg.points.length],p=featurePreview?.id===reg.id&&featurePreview.index===i?featurePreview.point:pt;
              return <g key={i}><line data-feature-edge={i} x1={p.x*ppu} y1={p.y*ppu} x2={next.x*ppu} y2={next.y*ppu} stroke="transparent" strokeWidth={Math.max(16,28/camera.z)} />
                <rect data-feature-node={i} x={p.x*ppu-13/camera.z} y={p.y*ppu-13/camera.z} width={26/camera.z} height={26/camera.z} fill="#f6e7a8" stroke="#315644" strokeWidth={2/camera.z}/></g>;
            })}
          </>}
        </g>)}
        {!hidden.lines&&!locked.lines&&layout.lines.map(line=><g key={line.id} data-feature-kind="line" data-feature-id={line.id}>
          <polyline points={shape(previewPoints({kind:'line',id:line.id},line.points))} fill="none" stroke="transparent" strokeWidth={Math.max(20,Math.max(line.widthM*ppu,30/camera.z))} />
          {selectedFeature?.kind==='line'&&selectedFeature.id===line.id&&<>
            {line.points.map((pt,i)=>{const p=featurePreview?.id===line.id&&featurePreview.index===i?featurePreview.point:pt;
              return <g key={i}>
                {i<line.points.length-1&&<line data-feature-edge={i} x1={p.x*ppu} y1={p.y*ppu} x2={line.points[i+1].x*ppu} y2={line.points[i+1].y*ppu} stroke="transparent" strokeWidth={Math.max(22,32/camera.z)}/>}
                <circle data-feature-node={i} cx={p.x*ppu} cy={p.y*ppu} r={Math.max(8,14/camera.z)} fill="#f6e7a8" stroke="#315644" strokeWidth={3/camera.z}/>
              </g>;
            })}
          </>}
        </g>)}
      </g>}
      {draft.length>0&&<g pointerEvents="none"><polyline points={shape(draft)} fill="none" stroke="#fff1a0" strokeWidth="3" strokeDasharray="6 3"/>{draft.map((p,i)=><circle key={i} cx={p.x*ppu} cy={p.y*ppu} r="5" fill="#fff1a0"/>)}</g>}
      <text x={10} y={garden.height*ppu+20} fontSize="12" fill="#41644c" pointerEvents="none">Surrounding workspace · {garden.width} × {garden.height} m</text>
    </svg>
    <div className="viewport-tools" aria-label="Map camera">
      <button aria-label="Zoom in" title="Zoom in" onClick={()=>zoomAt(1.35,size.width/2,size.height/2)}>+</button>
      <button aria-label="Zoom out" title="Zoom out" onClick={()=>zoomAt(1/1.35,size.width/2,size.height/2)}>−</button>
      <button onClick={()=>fit(false)} title="Fit garden boundary">FIT</button>
      <button onClick={()=>fit(true)} title="Show surrounding workspace">AREA</button>
    </div>
    <div className="viewport-status"><span>{mode==='scale'?formatArea(polygonArea(layout.boundary)):'ILLUSTRATION'}</span><span>ZOOM {Math.round(camera.z*100)}%</span></div>
    {(tool==='outline-draw'||tool==='terrain'||tool==='path'||tool==='fence')&&draft.length>0&&<div className="drawing-controls"><span>{draft.length} points</span><button onClick={finishDraft} disabled={draft.length<(tool==='path'||tool==='fence'?2:3)}>✓ FINISH</button><button onClick={()=>setDraft([])}>✕ CLEAR</button></div>}
    {pinching&&<div className="gesture-hint">PINCH TO ZOOM</div>}
  </div>;
}
