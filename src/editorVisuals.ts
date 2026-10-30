/** P022: presentation-only selection and tool guidance; never changes garden records. */
import type { Tool } from './MapView';
export type SelectionStyle = 'focused' | 'multiple' | 'group' | null;

export function selectionStyle(
  id: string,
  groupId: string | null,
  focusedId: string | null,
  selectedIds: readonly string[],
  selectedGroupId: string | null,
  multiSelect: boolean,
): SelectionStyle {
  if (multiSelect) return selectedIds.includes(id) ? 'multiple' : null;
  if (focusedId === id) return 'focused';
  return groupId !== null && selectedGroupId === groupId ? 'group' : null;
}

export function showObjectMapLabel(style: SelectionStyle, tool: Tool): boolean {
  return style === 'focused' && tool === 'select';
}

export const EDITOR_TOOLS = [
  {id:'select',label:'↖ SELECT',name:'SELECT',hint:'Tap to select · Drag to move · Pinch to zoom'},
  {id:'pan',label:'✋ PAN',name:'PAN',hint:'Drag empty or occupied space to move the map'},
  {id:'feature-edit',label:'✎ FEATURES',name:'EDIT FEATURES',hint:'Select a path or region · Drag its corners'},
  {id:'outline-edit',label:'◇ EDIT EDGE',name:'EDIT BORDER',hint:'Drag a corner · Tap an edge to add a corner'},
  {id:'outline-draw',label:'＋ BORDER',name:'DRAW BORDER',hint:'Tap corners · Finish to close the outline'},
  {id:'freehand',label:'〰 FREEHAND',name:'FREEHAND',hint:'Trace a closed outline with one finger'},
  {id:'terrain',label:'▧ TERRAIN',name:'TERRAIN',hint:'Tap terrain corners · Finish to fill the area'},
  {id:'path',label:'〰 PATH',name:'PATH',hint:'Tap path points · Finish to save the path'},
  {id:'fence',label:'┃ FENCE',name:'FENCE',hint:'Tap fence points · Finish to save the fence'},
] as const satisfies readonly {id: Tool;label:string;name:string;hint:string}[];

export function activeToolDescription(tool: Tool, multiSelect = false): {name:string;hint:string} {
  if (tool === 'select' && multiSelect) return {name:'MULTI SELECT',hint:'Tap several objects · Drag selected objects together'};
  const found = EDITOR_TOOLS.find(item => item.id === tool);
  return found ?? {name:'PLACE OBJECT',hint:'Tap the map to place the selected object'};
}
