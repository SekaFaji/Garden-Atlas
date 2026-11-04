import { MapObject } from './MapObject';
import { MapSurfacePatterns } from './MapSurfacePatterns';
import { surfacePatternFill } from '../mapSurfacePalette';
import { MapLineArt } from './MapLineArt';
import { objectPreviewTranslation, type ObjectDragPreview } from '../mapPreview';
import { selectionStyle } from '../editorVisuals';
import { objectDimensions, WORLD, type Garden, type Mode, type Point } from '../model';
import type { FeatureSelection } from '../featureEdit';
import type { Tool } from '../MapView';

export interface MapSceneProps {
  garden: Garden;
  mode: Mode;
  tool: Tool;
  zoom: number;
  hidden: { objects: boolean; regions: boolean; lines: boolean; boundary: boolean };
  locked: { objects: boolean; regions: boolean; lines: boolean; boundary: boolean };
  selectedId: string | null;
  selectedGroupId: string | null;
  selectedIds: readonly string[];
  multiSelect: boolean;
  showReference: boolean;
  selectedFeature: FeatureSelection | null;
  preview: ObjectDragPreview | null;
  cornerPreview: { index: number; point: Point } | null;
  featurePreview: { kind: FeatureSelection['kind']; id: string; index: number; point: Point } | null;
  resizePreview: { id: string; widthM: number; lengthM: number } | null;
  draft: Point[];
}

const ppu = WORLD.pixelsPerUnit;
const polygon = (points: Point[]) => points.map(p => `${p.x * ppu},${p.y * ppu}`).join(' ');

/** SVG only: preserves data-object, data-feature-node, edge and corner targets
 * that MapView uses for hit detection, while MapView owns all pointer state. */
export function MapScene({garden,mode,tool,zoom,hidden,locked,selectedId,selectedGroupId,selectedIds,multiSelect,showReference,selectedFeature,preview,cornerPreview,featurePreview,resizePreview,draft}:MapSceneProps) {
  const layout=garden.layout;
  const {dx,dy,companions}=objectPreviewTranslation(garden,preview);
  const shape=(pts:Point[])=>polygon(pts);
  const outline=layout.boundary.map((p,i)=>cornerPreview?.index===i?cornerPreview.point:p);
  const previewPoints=(feature:FeatureSelection,points:Point[])=>points.map((p,i)=>featurePreview&&featurePreview.kind===feature.kind&&featurePreview.id===feature.id&&featurePreview.index===i?featurePreview.point:p);
  return <>
      <defs>
        <MapSurfacePatterns/>
        <clipPath id="property-clip"><polygon points={shape(outline)}/></clipPath>
      </defs>
      <rect x={-garden.width*ppu} y={-garden.height*ppu} width={garden.width*ppu*3} height={garden.height*ppu*3} fill="url(#ground-grid)" />
      <rect width={garden.width*ppu} height={garden.height*ppu} fill="#c0ccb3" stroke="#78947d" strokeWidth="3"/>
      <polygon points={shape(outline)} fill={surfacePatternFill(layout.ground)} />
      {mode==='scale'&&<g clipPath="url(#property-clip)" pointerEvents="none">
        {Array.from({length:Math.floor(garden.width)+1},(_,i)=><line key={'x'+i} x1={i*ppu} x2={i*ppu} y1="0" y2={garden.height*ppu} stroke="#3f6950" strokeWidth={i%5===0?1.6:.7} opacity={i%5===0?.55:.3}/>)}
        {Array.from({length:Math.floor(garden.height)+1},(_,i)=><line key={'y'+i} x1="0" x2={garden.width*ppu} y1={i*ppu} y2={i*ppu} stroke="#3f6950" strokeWidth={i%5===0?1.6:.7} opacity={i%5===0?.55:.3}/>)}
      </g>}
      {!hidden.regions&&layout.regions.map(reg=><polygon key={reg.id} points={shape(previewPoints({kind:'region',id:reg.id},reg.points))} fill={surfacePatternFill(reg.ground)} stroke="#597460" strokeWidth="2" opacity=".96"/>)}
      {garden.reference&&showReference&&<image
        href={garden.reference.dataUrl}
        x={garden.reference.x*ppu} y={garden.reference.y*ppu}
        width={garden.reference.widthM*ppu} height={garden.reference.heightM*ppu}
        opacity={garden.reference.opacity} preserveAspectRatio="none"
        pointerEvents="none" aria-label="Imported tracing reference" />}
      {!hidden.lines&&layout.lines.map(line=><MapLineArt key={line.id} line={line}
        points={previewPoints({kind:'line',id:line.id},line.points)} pixelsPerMetre={ppu} zoom={zoom}/>)}
      {!hidden.boundary&&<polygon points={shape(outline)} fill="none" stroke="#fff3c1" strokeWidth={Math.max(1.5,3/zoom)} strokeDasharray={mode==='scale'?'10 6':undefined} pointerEvents="none" />}
      {!hidden.objects&&garden.objects.map(item=>{
        const original=item.position;if(!original)return null;
        const marker=selectionStyle(item.id,item.groupId,selectedId,selectedIds,selectedGroupId,multiSelect);
        const dragged=Boolean(preview&&(item.id===preview.id||companions.includes(item.id)));
        const offset=dragged?{x:dx,y:dy}:{x:0,y:0};
        const p={x:original.x+offset.x,y:original.y+offset.y};
        const axes=resizePreview?.id===item.id?resizePreview:objectDimensions(item);
        return <MapObject key={item.id} item={item} point={p} dimensions={axes} marker={marker}
          mode={mode} tool={tool} selectedId={selectedId} multiSelect={multiSelect}
          objectsLocked={locked.objects} zoom={zoom}/>;
      })}
      {tool==='outline-edit'&&outline.map((p,i)=>{
        const next=outline[(i+1)%outline.length];const mid={x:(p.x+next.x)/2,y:(p.y+next.y)/2};
        const handle=Math.max(12,30/zoom);return <g key={i}>
          <line data-edge={i} x1={p.x*ppu} y1={p.y*ppu} x2={next.x*ppu} y2={next.y*ppu} stroke="transparent" strokeWidth={Math.max(20,36/zoom)} pointerEvents="stroke" />
          <circle data-edge={i} cx={mid.x*ppu} cy={mid.y*ppu} r={handle*.55} fill="#b9efc8" stroke="#265f48" strokeWidth="2" opacity=".82" />
          <rect data-corner={i} x={p.x*ppu-handle/2} y={p.y*ppu-handle/2} width={handle} height={handle} fill="#f9e5a7" stroke="#345a47" strokeWidth="3" />
        </g>;
      })}
      {tool==='feature-edit'&&<g className="feature-overlay">
        {!hidden.regions&&!locked.regions&&layout.regions.map(reg=><g key={reg.id} data-feature-kind="region" data-feature-id={reg.id}>
          <polygon points={shape(previewPoints({kind:'region',id:reg.id},reg.points))} fill="transparent" stroke={selectedFeature?.id===reg.id?'#ffef92':'transparent'} strokeWidth={3/zoom} />
          {selectedFeature?.kind==='region'&&selectedFeature.id===reg.id&&<>
            {reg.points.map((pt,i)=>{const next=reg.points[(i+1)%reg.points.length],p=featurePreview?.id===reg.id&&featurePreview.index===i?featurePreview.point:pt;
              return <g key={i}><line data-feature-edge={i} x1={p.x*ppu} y1={p.y*ppu} x2={next.x*ppu} y2={next.y*ppu} stroke="transparent" strokeWidth={Math.max(16,28/zoom)} />
                <rect data-feature-node={i} x={p.x*ppu-13/zoom} y={p.y*ppu-13/zoom} width={26/zoom} height={26/zoom} fill="#f6e7a8" stroke="#315644" strokeWidth={2/zoom}/></g>;
            })}
          </>}
        </g>)}
        {!hidden.lines&&!locked.lines&&layout.lines.map(line=><g key={line.id} data-feature-kind="line" data-feature-id={line.id}>
          <polyline points={shape(previewPoints({kind:'line',id:line.id},line.points))} fill="none" stroke="transparent" strokeWidth={Math.max(20,Math.max(line.widthM*ppu,30/zoom))} />
          {selectedFeature?.kind==='line'&&selectedFeature.id===line.id&&<>
            {line.points.map((pt,i)=>{const p=featurePreview?.id===line.id&&featurePreview.index===i?featurePreview.point:pt;
              return <g key={i}>
                {i<line.points.length-1&&<line data-feature-edge={i} x1={p.x*ppu} y1={p.y*ppu} x2={line.points[i+1].x*ppu} y2={line.points[i+1].y*ppu} stroke="transparent" strokeWidth={Math.max(22,32/zoom)}/>}
                <circle data-feature-node={i} cx={p.x*ppu} cy={p.y*ppu} r={Math.max(8,14/zoom)} fill="#f6e7a8" stroke="#315644" strokeWidth={3/zoom}/>
              </g>;
            })}
          </>}
        </g>)}
      </g>}
      {draft.length>0&&<g pointerEvents="none"><polyline points={shape(draft)} fill="none" stroke="#fff1a0" strokeWidth="3" strokeDasharray="6 3"/>{draft.map((p,i)=><circle key={i} cx={p.x*ppu} cy={p.y*ppu} r="5" fill="#fff1a0"/>)}</g>}
      <text x={10} y={garden.height*ppu+20} fontSize="12" fill="#41644c" pointerEvents="none">Surrounding workspace · {garden.width} × {garden.height} m</text>
  </>;
}
