import { Sprite } from '../Sprite';
import { showObjectMapLabel, type SelectionStyle } from '../editorVisuals';
import { WORLD, type GardenObject, type Mode, type Point } from '../model';
import { mapObjectVisualSize } from '../mapObjectGeometry';
import type { Tool } from '../MapView';

interface Props {
  item: GardenObject;
  point: Point;
  dimensions: { widthM: number; lengthM: number };
  marker: SelectionStyle;
  tool: Tool;
  mode: Mode;
  selectedId: string | null;
  multiSelect: boolean;
  objectsLocked: boolean;
  zoom: number;
}

/** Renders one placed object. Pointer actions and edits remain in MapView. */
export function MapObject({item, point, dimensions, marker, tool, mode, selectedId, multiSelect, objectsLocked, zoom}: Props) {
  const ppu = WORLD.pixelsPerUnit;
  const {width, length, hitWidth, hitLength} = mapObjectVisualSize(dimensions, mode, zoom);

  return <g data-object={item.id} className="map-object" transform={`translate(${point.x * ppu} ${point.y * ppu})`}>
    {marker !== null && <rect
      data-selection={marker} x={-width / 2 - 7} y={-length / 2 - 7}
      width={width + 14} height={length + 14} fill="none"
      stroke={marker === 'multiple' ? '#8bd8f0' : marker === 'group' ? '#dbefac' : '#fff3ac'}
      strokeWidth={marker === 'focused' ? '3.5' : '3'}
      strokeDasharray={marker === 'group' ? '5 5' : marker === 'multiple' ? '3 3' : '7 4'}
      pointerEvents="none" />}
    <svg x={-width / 2} y={-length / 2} width={width} height={length} viewBox="0 0 64 64" pointerEvents="none">
      <g transform={`rotate(${item.rotation ?? 0} 32 32)`}><Sprite kind={item.kind} presetId={item.presetId}/></g>
    </svg>
    <rect x={-hitWidth / 2} y={-hitLength / 2} width={hitWidth} height={hitLength} fill="transparent" />
    {tool === 'select' && !multiSelect && selectedId === item.id && !objectsLocked && <g>
      <line x1="0" y1="0" x2={width / 2 + 12 / zoom} y2={length / 2 + 12 / zoom}
        stroke="#fff3ac" strokeWidth={2 / zoom} pointerEvents="none"/>
      <rect data-resize={item.id} aria-label="Resize selected object width and length"
        x={width / 2 - 10 / zoom} y={length / 2 - 10 / zoom}
        width={Math.max(22, 36 / zoom)} height={Math.max(22, 36 / zoom)}
        fill="#f4df8e" stroke="#2a5442" strokeWidth={3 / zoom}/>
    </g>}
    {showObjectMapLabel(marker, tool) && <g pointerEvents="none">
      <rect x={-55} y={length / 2 + 6} width="110" height="20" fill="#1f382f" stroke="#f6dfa4" strokeWidth="1.5"/>
      <text textAnchor="middle" x="0" y={length / 2 + 20} fontSize="11" fontFamily="monospace" fill="#fff7d4">
        {item.name.slice(0, 15)}
      </text>
    </g>}
  </g>;
}
