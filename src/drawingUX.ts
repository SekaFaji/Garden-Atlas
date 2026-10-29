/** Presentation-only guidance for existing multi-point garden drawing tools. */
import type { Tool } from './MapView';

export type DrawingTool = Extract<Tool, 'outline-draw' | 'terrain' | 'path' | 'fence'>;
export function isDrawingTool(tool:Tool):tool is DrawingTool {
  return tool==='outline-draw'||tool==='terrain'||tool==='path'||tool==='fence';
}
export function minimumDrawingPoints(tool:DrawingTool):number {
  return tool==='path'||tool==='fence'?2:3;
}
export function drawingToolName(tool:DrawingTool):string {
  return ({'outline-draw':'BORDER',terrain:'TERRAIN',path:'PATH',fence:'FENCE'} as const)[tool];
}
export function drawingHint(tool:DrawingTool,count:number):string {
  const required=minimumDrawingPoints(tool);
  if(count===0)return `Tap the map to start ${drawingToolName(tool).toLowerCase()}.`;
  if(count<required)return `Add ${required-count} more point${required-count===1?'':'s'} to finish.`;
  return 'Finish this shape, remove a point, or clear the draft.';
}
