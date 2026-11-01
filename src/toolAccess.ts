import { KINDS, type Mode } from './model.ts';
import type { Tool } from './MapView';
import type { LayerKey, LayerState } from './components/GardenLayersPanel';

/** Tool permissions are independent from toolbar presentation. */
export function requiredToolLayer(tool: Tool): LayerKey | null {
  if (tool === 'outline-edit' || tool === 'outline-draw' || tool === 'freehand') return 'boundary';
  if (tool === 'terrain') return 'regions';
  if (tool === 'path' || tool === 'fence' || tool === 'feature-edit') return 'lines';
  return KINDS.some(item => item.kind === tool) ? 'objects' : null;
}

/** Feature editing also works when regions are unlocked and lines remain locked. */
export function toolLockMessage(tool: Tool, locked: LayerState): string | null {
  const layer = requiredToolLayer(tool);
  if (!layer || !locked[layer] || (tool === 'feature-edit' && !locked.regions)) return null;
  return 'Unlock ' + layer + ' to use this tool.';
}

export function needsDraftExitConfirmation(
  draftCount: number, currentTool: Tool, nextTool: Tool, currentMode: Mode, nextMode: Mode
): boolean {
  return draftCount > 0 && (nextTool !== currentTool || nextMode !== currentMode);
}

export function draftExitMessage(draftCount: number): string {
  return 'Discard ' + draftCount + ' unfinished drawing point' + (draftCount === 1 ? '' : 's') + '? Finish or clear the shape first to keep working on it.';
}
