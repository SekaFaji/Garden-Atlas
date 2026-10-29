/** P010: Non-destructive edits to existing terrain and line geometry. */
import { clampPoint, isGarden, validPolygon, validObjectAxis, type Garden, type Point } from './model.ts';

export type FeatureSelection = {kind:'region'|'line'; id:string};
export type EditAction = 'move'|'insert'|'remove';

export function editFeaturePoint(g:Garden,selection:FeatureSelection,index:number,action:EditAction,point?:Point):Garden|null {
  const items=selection.kind==='region'?g.layout.regions:g.layout.lines;
  const feature=items.find(item=>item.id===selection.id);
  if(!feature || !Number.isInteger(index) || index<0 || index>=feature.points.length || (action!=='remove'&&!point))return null;
  const points=feature.points.map(p=>({...p}));
  if(action==='remove'){
    if(points.length<=(selection.kind==='region'?3:2))return null;
    points.splice(index,1);
  } else if(action==='insert'){
    if(points.length>=100)return null;
    points.splice(index+1,0,clampPoint(point!,g));
  } else points[index]=clampPoint(point!,g);
  if(selection.kind==='region'&&!validPolygon(points,g))return null;
  if(selection.kind==='line'&&(
    !points.every((p,i)=>i===0||Math.hypot(p.x-points[i-1].x,p.y-points[i-1].y)>.05) ||
    !points.some(p=>Math.hypot(p.x-points[0].x,p.y-points[0].y)>.1)
  ))return null;
  const layout={...g.layout};
  if(selection.kind==='region')layout.regions=g.layout.regions.map(f=>f.id===selection.id?{...f,points}:f);
  else layout.lines=g.layout.lines.map(f=>f.id===selection.id?{...f,points}:f);
  const next={...g,layout};
  return isGarden(next)?next:null;
}

export function resizeObjectDiameter(g:Garden,id:string,diameterM:number):Garden|null {
  const diameter=Math.round(diameterM*20)/20;
  if(!Number.isFinite(diameter)||diameter<.5||diameter>100||!g.objects.some(o=>o.id===id))return null;
  const next={...g,objects:g.objects.map(o=>o.id===id?{...o,diameterM:diameter,widthM:diameter,lengthM:diameter}:o)};
  return isGarden(next)?next:null;
}

/** Non-destructive P016 footprint dimensions; zero denotes an unmeasured axis. */
export function resizeObjectAxes(g:Garden,id:string,dimensions:{widthM:number;lengthM:number}):Garden|null {
 const widthM=Math.round(dimensions.widthM*100)/100;
 const lengthM=Math.round(dimensions.lengthM*100)/100;
 if(!validObjectAxis(widthM)||!validObjectAxis(lengthM)||!g.objects.some(o=>o.id===id))return null;
 const next={...g,objects:g.objects.map(o=>o.id===id?{...o,widthM,lengthM}:o)};
 return isGarden(next)?next:null;
}
