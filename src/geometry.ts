import type { Point } from './model';

/** Distance between pointer and polygon edge, in world coordinates. */
export function closestEdge(points:Point[],point:Point):{index:number;point:Point;distance:number}|null {
  if(points.length<2)return null;
  let best:{index:number;point:Point;distance:number}|null=null;
  for(let i=0;i<points.length;i++){
    const a=points[i],b=points[(i+1)%points.length],dx=b.x-a.x,dy=b.y-a.y;
    const denom=dx*dx+dy*dy,t=denom===0?0:Math.max(0,Math.min(1,((point.x-a.x)*dx+(point.y-a.y)*dy)/denom));
    const p={x:a.x+t*dx,y:a.y+t*dy},d=Math.hypot(p.x-point.x,p.y-point.y);
    if(!best||d<best.distance)best={index:i,point:p,distance:d};
  }
  return best;
}
export function bounds(points:Point[]):{minX:number;minY:number;maxX:number;maxY:number}{
  return {minX:Math.min(...points.map(p=>p.x)),minY:Math.min(...points.map(p=>p.y)),maxX:Math.max(...points.map(p=>p.x)),maxY:Math.max(...points.map(p=>p.y))};
}
/** Geographic coordinates aren't inferred from a visually drawn garden. */
export function formatArea(area:number):string{return area>=10000?`${(area/10000).toFixed(2)} ha`:`${area.toFixed(1)} m²`;}
