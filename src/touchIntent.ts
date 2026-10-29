/** P018: translate a finger/stylus movement into a deliberate edit, in screen pixels. */
export interface ScreenPoint {x:number;y:number}
export function dragThresholdPx(pointerType:string):number {
  return pointerType==='touch'?11:pointerType==='pen'?6:4;
}
export function intentionalDrag(start:ScreenPoint,next:ScreenPoint,pointerType:string):boolean {
  const distanceSquared=(next.x-start.x)**2+(next.y-start.y)**2;
  return distanceSquared>dragThresholdPx(pointerType)**2;
}

/** True only if a stationary tap is safe to commit; dragging/panning cancels edits. */
export function deliberateTap(start:ScreenPoint,end:ScreenPoint,pointerType:string,alreadyMoved=false):boolean {
  return !alreadyMoved&&!intentionalDrag(start,end,pointerType);
}
