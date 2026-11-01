import { useEffect, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent, WheelEvent as ReactWheelEvent } from 'react';
import { MapScene } from './components/MapScene';
import { closestEdge, formatArea } from './geometry';
import { deliberateTap, intentionalDrag, type ScreenPoint } from './touchIntent';
import { isDrawingTool, minimumDrawingPoints, drawingHint, drawingToolName } from './drawingUX';
import type { FeatureSelection, EditAction } from './featureEdit';
import { fitCamera, panCamera, pinchCamera, zoomCamera, type Camera } from './camera';
import { clampPoint, polygonArea, simplifyStroke, validPolygon, objectDimensions, WORLD, KINDS, type Garden, type Ground, type Kind, type Mode, type Point, type LineKind } from './model';

export type Tool = 'select' | 'feature-edit' | 'pan' | 'outline-edit' | 'outline-draw' | 'freehand' | 'terrain' | LineKind | Kind;
interface Props {
  garden: Garden; mode: Mode; tool: Tool; onDraftCountChange:(count:number)=>void; selectedId: string | null; selectedGroupId: string | null; selectedIds: readonly string[]; multiSelect:boolean; snapEnabled:boolean; showReference:boolean;
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
type PointerInfo=ScreenPoint;
type Activity =
  | {kind:'pan';x:number;y:number;camera:Camera}
  | {kind:'object';id:string;start:Point;screenStart:ScreenPoint;pointerType:string;anchor:Point;together:boolean;moved:boolean;multiple:boolean}
  | {kind:'corner';index:number;point:Point;screenStart:ScreenPoint;pointerType:string;moved:boolean}
  | {kind:'freehand';points:Point[]}
  | {kind:'tap';start:PointerInfo;pointerType:string}
  | {kind:'edge-tap';feature?:FeatureSelection;index:number;point:Point;screenStart:ScreenPoint;pointerType:string;camera:Camera;moved:boolean}
  | {kind:'feature-node';feature:FeatureSelection;index:number;point:Point;screenStart:ScreenPoint;pointerType:string;moved:boolean}
  | {kind:'resize';id:string;origin:Point;widthM:number;lengthM:number;screenStart:ScreenPoint;pointerType:string;moved:boolean};
const ppu=WORLD.pixelsPerUnit;
const snap=(p:Point,mode:Mode,force=false):Point=>force?{x:Math.round(p.x*2)/2,y:Math.round(p.y*2)/2}:mode==='scale'?{x:Math.round(p.x*10)/10,y:Math.round(p.y*10)/10}:p;
const midpoint=(a:PointerInfo,b:PointerInfo)=>({x:(a.x+b.x)/2,y:(a.y+b.y)/2});
const distance=(a:PointerInfo,b:PointerInfo)=>Math.hypot(a.x-b.x,a.y-b.y);
export function MapView({garden,mode,tool,onDraftCountChange,selectedId,selectedGroupId,selectedIds,multiSelect,snapEnabled,showReference,terrain,lineWidth,hidden,locked,selectedFeature,onSelectFeature,onSelectVertex,onEditFeature,onResizeObject,onPick,onTogglePick,onMoveSelection,onPlace,onMove,onBoundary,onTerrain,onLine,onNotice}:Props){
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
  useEffect(()=>onDraftCountChange(draft.length),[draft.length,onDraftCountChange]);
  useEffect(()=>{
    if(!isDrawingTool(tool)||draft.length===0)return;
    const onKey=(e:KeyboardEvent)=>{
      const target=e.target as HTMLElement|null;
      if(target?.closest('input,textarea,select,[contenteditable=true]'))return;
      if(e.key==='Backspace'){e.preventDefault();setDraft(points=>points.slice(0,-1));}
      if(e.key==='Escape'){e.preventDefault();setDraft([]);}
    };
    window.addEventListener('keydown',onKey);return()=>window.removeEventListener('keydown',onKey);
  },[tool,draft.length]);
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
      if(obj?.position){activeRef.current={kind:'resize',id:obj.id,origin:obj.position,...objectDimensions(obj),screenStart:{x:e.clientX,y:e.clientY},pointerType:e.pointerType,moved:false};return;}
    }
    if(tool==='feature-edit'&&featureHit){
      const feature={kind:featureHit.dataset.featureKind as FeatureSelection['kind'],id:featureHit.dataset.featureId!};
      if(locked[feature.kind==='region'?'regions':'lines'])return;
      onSelectFeature(feature);
      if(!featureNode)onSelectVertex(null);
      if(featureNode){const index=Number(featureNode.dataset.featureNode);onSelectVertex(index);activeRef.current={kind:'feature-node',feature,index,point:start,screenStart:{x:e.clientX,y:e.clientY},pointerType:e.pointerType,moved:false};return;}
      if(featureEdge){
        // Don't insert on pointer-down: the gesture might be a scroll, pan or pinch.
        activeRef.current={kind:'edge-tap',feature,index:Number(featureEdge.dataset.featureEdge),point:start,
          screenStart:{x:e.clientX,y:e.clientY},pointerType:e.pointerType,camera:cameraRef.current,moved:false};return;
      }
      activeRef.current={kind:'tap',start:{x:e.clientX,y:e.clientY},pointerType:e.pointerType};return;
    }
    const corner=target.closest('[data-corner]') as SVGElement|null;
    const edge=target.closest('[data-edge]') as SVGElement|null;
    if(tool==='freehand'){
      activeRef.current={kind:'freehand',points:[clampPoint(start,garden)]};setDraft([clampPoint(start,garden)]);return;
    }
    if(tool==='outline-edit'&&!locked.boundary&&corner){
      const index=Number(corner.dataset.corner);
      activeRef.current={kind:'corner',index,point:start,screenStart:{x:e.clientX,y:e.clientY},pointerType:e.pointerType,moved:false};return;
    }
    if(tool==='outline-edit'&&!locked.boundary&&edge){
      const index=Number(edge.dataset.edge);
      activeRef.current={kind:'edge-tap',index,point:start,screenStart:{x:e.clientX,y:e.clientY},
        pointerType:e.pointerType,camera:cameraRef.current,moved:false};return;
    }
    if((tool==='select')&&hit&&!hidden.objects&&!locked.objects){
      const id=hit.dataset.object!;
      const obj=garden.objects.find(o=>o.id===id);
      if(obj?.position){
        const multiple=multiSelect&&selectedIds.includes(id);
        const together=Boolean(!multiSelect&&selectedGroupId&&obj.groupId===selectedGroupId);
        activeRef.current={kind:'object',id,start:clampPoint(start,garden),screenStart:{x:e.clientX,y:e.clientY},pointerType:e.pointerType,anchor:obj.position!,together,multiple,moved:false};return;
      }
    }
    if(tool==='pan'||tool==='select'||tool==='outline-edit'||tool==='feature-edit')activeRef.current={kind:'pan',x:e.clientX,y:e.clientY,camera:cameraRef.current};
    else activeRef.current={kind:'tap',start:{x:e.clientX,y:e.clientY},pointerType:e.pointerType};
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
    if(a.kind==='edge-tap'&&intentionalDrag(a.screenStart,{x:e.clientX,y:e.clientY},a.pointerType)){a.moved=true;setCamera(panCamera(a.camera,e.clientX-a.screenStart.x,e.clientY-a.screenStart.y));}
    if(a.kind==='object'&&p){
      if(intentionalDrag(a.screenStart,{x:e.clientX,y:e.clientY},a.pointerType))a.moved=true;
      if(a.moved)setPreview({id:a.id,point:clampPoint(snap({x:a.anchor.x+p.x-a.start.x,y:a.anchor.y+p.y-a.start.y},mode,snapEnabled),garden),together:a.together,many:a.multiple?selectedIds:undefined});
    }
    if(a.kind==='corner'&&p){if(intentionalDrag(a.screenStart,{x:e.clientX,y:e.clientY},a.pointerType))a.moved=true;if(a.moved)setCornerPreview({index:a.index,point:clampPoint(snap(p,mode,snapEnabled),garden)});}
    if(a.kind==='feature-node'&&p){
      if(intentionalDrag(a.screenStart,{x:e.clientX,y:e.clientY},a.pointerType))a.moved=true;
      if(a.moved)setFeaturePreview({...a.feature,index:a.index,point:clampPoint(snap(p,mode,snapEnabled),garden)});
    }
    if(a.kind==='resize'&&p){
      const widthM=Math.min(100,Math.max(0,2*Math.abs(p.x-a.origin.x)));
      const lengthM=Math.min(100,Math.max(0,2*Math.abs(p.y-a.origin.y)));
      if(intentionalDrag(a.screenStart,{x:e.clientX,y:e.clientY},a.pointerType))a.moved=true;
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
    if(a.kind==='edge-tap'){
      // Only deliberate taps insert vertices. Swiping an edge pans instead.
      if(!deliberateTap(a.screenStart,{x:e.clientX,y:e.clientY},a.pointerType,a.moved))return;
      if(a.feature){
        const f=a.feature.kind==='region'?garden.layout.regions.find(r=>r.id===a.feature!.id):garden.layout.lines.find(l=>l.id===a.feature!.id);
        if(!f)return;
        const start=f.points[a.index],end=f.points[(a.index+1)%f.points.length];
        if(!start||!end)return;
        const dx=end.x-start.x,dy=end.y-start.y,len=dx*dx+dy*dy;
        const t=len?Math.max(.05,Math.min(.95,((a.point.x-start.x)*dx+(a.point.y-start.y)*dy)/len)):.5;
        onEditFeature(a.feature,a.index,'insert',clampPoint({x:start.x+t*dx,y:start.y+t*dy},garden));
      }else{
        const closest=closestEdge(garden.layout.boundary,a.point);
        if(closest&&closest.index===a.index){
          const next=[...garden.layout.boundary];next.splice(a.index+1,0,clampPoint(closest.point,garden));
          if(validPolygon(next,garden)){onBoundary(next);onNotice('Boundary point added. Drag it to reshape.');}
        }
      }
      return;
    }
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
        else {onMove(a.id,final,a.together);if(!a.together)onPick(a.id);}
      }else if(multiSelect)onTogglePick(a.id);
      else if(!a.together)onPick(a.id);
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
    if(a.kind==='tap'&&!deliberateTap(a.start,{x:e.clientX,y:e.clientY},a.pointerType))return;
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
  const vw=size.width/camera.z,vh=size.height/camera.z;
  return <div className="atlas-viewport">
    <svg ref={svgRef} className="map-surface" role="application" aria-label={`Interactive ${mode} garden map; drag objects with one finger, pan on empty land, pinch to zoom.`}
      viewBox={`${camera.cx*ppu-vw/2} ${camera.cy*ppu-vh/2} ${vw} ${vh}`} preserveAspectRatio="none"
      onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={pointerUp} onPointerCancel={cancelPointer}
      onWheel={wheel}>
      <MapScene garden={garden} mode={mode} tool={tool} zoom={camera.z}
        hidden={hidden} locked={locked} selectedId={selectedId} selectedGroupId={selectedGroupId}
        selectedIds={selectedIds} multiSelect={multiSelect} showReference={showReference}
        selectedFeature={selectedFeature} preview={preview} cornerPreview={cornerPreview}
        featurePreview={featurePreview} resizePreview={resizePreview} draft={draft}/>
    </svg>
    <div className="viewport-tools" aria-label="Map camera">
      <button aria-label="Zoom in" title="Zoom in" onClick={()=>zoomAt(1.35,size.width/2,size.height/2)}>+</button>
      <button aria-label="Zoom out" title="Zoom out" onClick={()=>zoomAt(1/1.35,size.width/2,size.height/2)}>−</button>
      <button onClick={()=>fit(false)} title="Fit garden boundary">FIT</button>
      <button onClick={()=>fit(true)} title="Show surrounding workspace">AREA</button>
    </div>
    <div className="viewport-status"><span>{mode==='scale'?formatArea(polygonArea(garden.layout.boundary)):'ILLUSTRATION'}</span><span>ZOOM {Math.round(camera.z*100)}%</span></div>
    {isDrawingTool(tool)&&<div className="drawing-controls" aria-label={`${drawingToolName(tool)} drawing controls`}>
      <span className="drawing-progress" role="status" aria-live="polite"><b>{drawingToolName(tool)}</b> · {draft.length} / {minimumDrawingPoints(tool)} minimum</span>
      <span className="drawing-instruction">{drawingHint(tool,draft.length)}</span>
      <div className="drawing-actions">
        <button className="drawing-finish" onClick={finishDraft} disabled={draft.length<minimumDrawingPoints(tool)} title="Complete the shape">✓ FINISH</button>
        <button onClick={()=>setDraft(points=>points.slice(0,-1))} disabled={!draft.length} title="Remove the last draft point">↶ POINT</button>
        <button onClick={()=>setDraft([])} disabled={!draft.length} title="Discard draft points">✕ CLEAR</button>
      </div>
    </div>}
    {pinching&&<div className="gesture-hint">PINCH TO ZOOM</div>}
  </div>;
}
