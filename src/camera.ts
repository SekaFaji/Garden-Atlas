import type { Point } from './model.ts';

export interface Camera { cx:number; cy:number; z:number }
export interface Viewport {width:number;height:number}
const PIXELS_PER_METRE=20;
const clamp=(z:number)=>Math.min(12,Math.max(.06,z));
/** Scale to contain either plot points or the whole workspace; a larger margin shows context. */
export function fitCamera(world:{width:number;height:number},viewport:Viewport,points?:Point[],margin=1.17):Camera {
  const minX=points?.length?Math.min(...points.map(p=>p.x)):0;
  const minY=points?.length?Math.min(...points.map(p=>p.y)):0;
  const maxX=points?.length?Math.max(...points.map(p=>p.x)):world.width;
  const maxY=points?.length?Math.max(...points.map(p=>p.y)):world.height;
  const spanX=Math.max(3,maxX-minX)*margin,spanY=Math.max(3,maxY-minY)*margin;
  return {cx:(minX+maxX)/2,cy:(minY+maxY)/2,z:clamp(Math.min(viewport.width/spanX,viewport.height/spanY)/PIXELS_PER_METRE)};
}
/** Keep the world point beneath a finger/wheel anchor fixed as zoom changes. */
export function zoomCamera(c:Camera,viewport:Viewport,factor:number,x:number,y:number):Camera {
  const z=clamp(c.z*factor);
  const wx=c.cx+(x-viewport.width/2)/(PIXELS_PER_METRE*c.z);
  const wy=c.cy+(y-viewport.height/2)/(PIXELS_PER_METRE*c.z);
  return {z,cx:wx-(x-viewport.width/2)/(PIXELS_PER_METRE*z),cy:wy-(y-viewport.height/2)/(PIXELS_PER_METRE*z)};
}
export function panCamera(start:Camera,dxPixels:number,dyPixels:number):Camera {
  return {...start,cx:start.cx-dxPixels/(PIXELS_PER_METRE*start.z),cy:start.cy-dyPixels/(PIXELS_PER_METRE*start.z)};
}
/** A pinch pans and zooms simultaneously, keeping the start midpoint's world point under the current midpoint. */
export function pinchCamera(start:Camera,viewport:Viewport,oldMid:Point,newMid:Point,distanceRatio:number):Camera {
  const z=clamp(start.z*distanceRatio);
  const worldX=start.cx+(oldMid.x-viewport.width/2)/(PIXELS_PER_METRE*start.z);
  const worldY=start.cy+(oldMid.y-viewport.height/2)/(PIXELS_PER_METRE*start.z);
  return {z,cx:worldX-(newMid.x-viewport.width/2)/(PIXELS_PER_METRE*z),cy:worldY-(newMid.y-viewport.height/2)/(PIXELS_PER_METRE*z)};
}
