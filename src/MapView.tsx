import { useEffect, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent, WheelEvent as ReactWheelEvent } from 'react';
import { Sprite } from './Sprite';
import { closestEdge, formatArea } from './geometry';
import { fitCamera, panCamera, pinchCamera, zoomCamera, type Camera } from './camera';
import { clampPoint, polygonArea, simplifyStroke, validPolygon, WORLD, type Garden, type Ground, type Kind, type Mode, type Point, type LineKind } from './model';

export type Tool = 'select' | 'pan' | 'outline-edit' | 'outline-draw' | 'freehand' | 'terrain' | LineKind | Kind;
interface Props {
  garden: Garden; mode: Mode; tool: Tool; selectedId: string | null; selectedGroupId: string | null;
  terrain: Ground; lineWidth: number; hidden: { objects: boolean; regions: boolean; boundary: boolean };
  onPick: (id: string|null) => void;
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
  | {kind:'object';id:string;start:Point;anchor:Point;together:boolean;moved:boolean}
  | {kind:'corner';index:number;point:Point;moved:boolean}
  | {kind:'freehand';points:Point[]}
  | {kind:'tap';start:PointerInfo};
const ppu=WORLD.pixelsPerUnit;
const color: Record<Ground,string>={grass:'#8ebc77',soil:'#a57c53',gravel:'#a8aca0',stone:'#bdb8a9',water:'#64a6bc'};
const snap=(p:Point,mode:Mode):Point=>mode==='scale'?{x:Math.round(p.x*10)/10,y:Math.round(p.y*10)/10}:p;
const px=(p:Point)=>`${p.x*ppu},${p.y*ppu}`;
const polygon=(pts:Point[])=>pts.map(px).join(' ');
const midpoint=(a:PointerInfo,b:PointerInfo)=>({x:(a.x+b.x)/2,y:(a.y+b.y)/2});
const distance=(a:PointerInfo,b:PointerInfo)=>Math.hypot(a.x-b.x,a.y-b.y);
export function MapView({garden,mode,tool,selectedId,selectedGroupId,terrain,lineWidth,hidden,onPick,onPlace,onMove,onBoundary,onTerrain,onLine,onNotice}:Props){
  const svgRef=useRef<SVGSVGElement>(null);
  const pointsRef=useRef(new Map<number,PointerInfo>());
  const activeRef=useRef<Activity|null>(null);
  const pinchRef=useRef<{dist:number;mid:PointerInfo;camera:Camera}|null>(null);
  const [size,setSize]=useState({width:0,height:0});
  const [camera,setCamera]=useState<Camera>({cx:20,cy:13,z:1});
  const cameraRef=useRef(camera);cameraRef.current=camera;
  const [preview,setPreview]=useState<{id:string;point:Point;together:boolean}|null>(null);
  const [cornerPreview,setCornerPreview]=useState<{index:number;point:Point}|null>(null);
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
  useEffect(()=>{setDraft([]);setPreview(null);setCornerPreview(null);activeRef.current=null;pointsRef.current.clear();pinchRef.current=null;},[mode,tool,garden.width,garden.height]);
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
    const corner=target.closest('[data-corner]') as SVGElement|null;
    const edge=target.closest('[data-edge]') as SVGElement|null;
    if(tool==='freehand'){
      activeRef.current={kind:'freehand',points:[clampPoint(start,garden)]};setDraft([clampPoint(start,garden)]);return;
    }
    if(tool==='outline-edit'&&corner){
      const index=Number(corner.dataset.corner);
      activeRef.current={kind:'corner',index,point:start,moved:false};return;
    }
    if(tool==='outline-edit'&&edge){
      const index=Number(edge.dataset.edge);
      const b=garden.layout.boundary;
      const closest=closestEdge(b,start);
      if(closest&&closest.index===index){
        const next=[...b];next.splice(index+1,0,clampPoint(closest.point,garden));
        if(validPolygon(next,garden)){onBoundary(next);onNotice('Boundary point added. Drag it to reshape.');}
      }
      activeRef.current={kind:'tap',start:{x:e.clientX,y:e.clientY}};return;
    }
    if((tool==='select')&&hit&&!hidden.objects){
      const id=hit.dataset.object!;
      const obj=garden.objects.find(o=>o.id===id);
      if(obj?.position){
        const together=Boolean(selectedGroupId&&obj.groupId===selectedGroupId);
        if(!together)onPick(id);
        activeRef.current={kind:'object',id,start:clampPoint(start,garden),anchor:obj.position!,together,moved:false};return;
      }
    }
    if(tool==='pan'||tool==='select'||tool==='outline-edit')activeRef.current={kind:'pan',x:e.clientX,y:e.clientY,camera:cameraRef.current};
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
      if(a.moved)setPreview({id:a.id,point:clampPoint(snap({x:a.anchor.x+p.x-a.start.x,y:a.anchor.y+p.y-a.start.y},mode),garden),together:a.together});
    }
    if(a.kind==='corner'&&p){a.moved=true;setCornerPreview({index:a.index,point:clampPoint(snap(p,mode),garden)});}
    if(a.kind==='freehand'&&p){const next=clampPoint(p,garden),prev=a.points[a.points.length-1];if(Math.hypot(prev.x-next.x,prev.y-next.y)>.16){a.points.push(next);if(a.points.length%3===0)setDraft([...a.points]);}}
  };
  const pointerUp=(e:ReactPointerEvent<SVGSVGElement>)=>{
    if(!pointsRef.current.has(e.pointerId))return;
    const wasPinch=Boolean(pinchRef.current),a=activeRef.current,p=pointFromEvent(e);
    pointsRef.current.delete(e.pointerId);
    if(wasPinch){if(pointsRef.current.size<2){pinchRef.current=null;activeRef.current=null;setPinching(false);}return;}
    activeRef.current=null;
    if(!a||!p)return;
    if(a.kind==='object'){
      if(a.moved){const final=snap({x:a.anchor.x+p.x-a.start.x,y:a.anchor.y+p.y-a.start.y},mode);onMove(a.id,clampPoint(final,garden),a.together);}
      setPreview(null);return;
    }
    if(a.kind==='corner'){
      if(a.moved){const boundary=garden.layout.boundary.map((pt,i)=>i===a.index?clampPoint(snap(p,mode),garden):pt);if(validPolygon(boundary,garden))onBoundary(boundary);else onNotice('Invalid outline. Edit cancelled to keep your garden safe.');}
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
    if(tool==='outline-draw'||tool==='terrain'||tool==='path'||tool==='fence'){setDraft(d=>d.length<100?[...d,snap(p,mode)]:d);return;}
    if(tool==='tree'||tool==='shrub'||tool==='flower'||tool==='bed'||tool==='house')onPlace(tool,snap(p,mode));
  };
  const cancelPointer=(e:ReactPointerEvent<SVGSVGElement>)=>{
    pointsRef.current.delete(e.pointerId);activeRef.current=null;pinchRef.current=null;setPreview(null);setCornerPreview(null);setPinching(false);
  };
  const wheel=(event:ReactWheelEvent<SVGSVGElement>)=>{
    event.preventDefault();const r=event.currentTarget.getBoundingClientRect();zoomAt(Math.exp(-event.deltaY*.0012),event.clientX-r.left,event.clientY-r.top);
  };
  const layout=garden.layout,place=garden.objects.find(o=>o.id===preview?.id)?.position;
  const groupIds=preview?.together?garden.objects.filter(o=>o.groupId&&o.groupId===garden.objects.find(x=>x.id===preview.id)?.groupId).map(o=>o.id):[];
  const dx=preview&&place?preview.point.x-place.x:0,dy=preview&&place?preview.point.y-place.y:0;
  const vw=size.width/camera.z,vh=size.height/camera.z;
  const shape=(pts:Point[])=>polygon(pts);
  const outline=layout.boundary.map((p,i)=>cornerPreview?.index===i?cornerPreview.point:p);
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
      {!hidden.regions&&layout.regions.map(reg=><polygon key={reg.id} points={shape(reg.points)} fill={color[reg.ground]} stroke="#3d634b" strokeWidth="2" opacity=".96"/>)}
      {!hidden.regions&&layout.lines.map(line=><g key={line.id} pointerEvents="none">
        <polyline points={shape(line.points)} stroke={line.kind==='fence'?'#4f3e31':'#6c614d'} strokeWidth={line.widthM*ppu+4} fill="none" strokeLinecap="square" strokeLinejoin="bevel" />
        <polyline points={shape(line.points)} stroke={line.kind==='fence'?'#bc9564':'#c9c0a8'} strokeWidth={line.widthM*ppu} strokeDasharray={line.kind==='fence'?'9 10':undefined} fill="none" strokeLinecap="square" strokeLinejoin="bevel" />
      </g>)}
      {!hidden.boundary&&<polygon points={shape(outline)} fill="none" stroke="#fff3c1" strokeWidth={Math.max(1.5,3/camera.z)} strokeDasharray={mode==='scale'?'10 6':undefined} pointerEvents="none" />}
      {!hidden.objects&&garden.objects.map(item=>{
        const original=item.position;if(!original)return null;
        const active=selectedId===item.id||Boolean(selectedGroupId&&selectedGroupId===item.groupId);
        const dragged=Boolean(preview&&(item.id===preview.id||groupIds.includes(item.id)));
        const offset=dragged?{x:dx,y:dy}:{x:0,y:0};
        const p={x:original.x+offset.x,y:original.y+offset.y};
        const diameter=item.diameterM*ppu*(mode==='illustration'?1.08:1);
        const hit=Math.max(diameter,48/Math.max(.06,camera.z));
        return <g data-object={item.id} key={item.id} className="map-object" transform={`translate(${p.x*ppu} ${p.y*ppu})`}>
          {active&&<rect x={-diameter/2-7} y={-diameter/2-7} width={diameter+14} height={diameter+14} fill="none" stroke="#fff3ac" strokeWidth="3" strokeDasharray="7 4" pointerEvents="none" />}
          <svg x={-diameter/2} y={-diameter/2} width={diameter} height={diameter} viewBox="0 0 64 64" pointerEvents="none"><Sprite kind={item.kind}/></svg>
          <rect x={-hit/2} y={-hit/2} width={hit} height={hit} fill="transparent" />
          {active&&<g pointerEvents="none"><rect x={-55} y={diameter/2+6} width="110" height="20" fill="#1f382f" stroke="#f6dfa4" strokeWidth="1.5"/><text textAnchor="middle" x="0" y={diameter/2+20} fontSize="11" fontFamily="monospace" fill="#fff7d4">{item.name.slice(0,15)}</text></g>}
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
