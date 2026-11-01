import { polygonArea, type Garden } from '../model';

export type ResizeMode = 'preserve' | 'scale';
interface Dimensions { width: string; height: string }

interface Props {
  garden: Garden;
  dimensions: Dimensions;
  resizeMode: ResizeMode;
  onDimensionChange: (axis: keyof Dimensions, value: string) => void;
  onResizeModeChange: (mode: ResizeMode) => void;
  onApply: () => void;
  onReset: () => void;
  onExpand: (margin: number) => void;
}

/** Presentation only: App validates dimensions, confirms destructive scaling and saves changes. */
export function MapSizePanel({garden,dimensions,resizeMode,onDimensionChange,onResizeModeChange,onApply,onReset,onExpand}:Props) {
  return (
<section id="map-size-panel" className="map-size-panel" aria-label="Map size and surrounding workspace">
            <div className="map-size-heading"><strong>EDIT MAP SIZE</strong><span>Both map styles use the same dimensions</span></div>
            <p>Set the surrounding <b>workspace</b> size separately from the property boundary. You can enlarge the map without stretching trees, paths or land measurements.</p>
            <div className="map-size-fields">
              <label>WIDTH (m)<input type="number" min="10" max="500" step="1" value={dimensions.width} onChange={e=>onDimensionChange('width',e.target.value)}/></label>
              <label>HEIGHT (m)<input type="number" min="10" max="500" step="1" value={dimensions.height} onChange={e=>onDimensionChange('height',e.target.value)}/></label>
            </div>
            <fieldset className="map-size-modes"><legend>WHEN RESIZING</legend>
              <label><input type="radio" name="map-resize-mode" checked={resizeMode==='preserve'} onChange={()=>onResizeModeChange('preserve')}/> Keep actual garden size and positions <small>Recommended: change only the surrounding workspace; unsafe shrinking is blocked.</small></label>
              <label><input type="radio" name="map-resize-mode" checked={resizeMode==='scale'} onChange={()=>onResizeModeChange('scale')}/> Scale entire garden to fit <small>Changes distances, plant positions, boundaries and paths. Requires confirmation.</small></label>
            </fieldset>
            <div className="map-size-actions"><button className="btn btn-highlight" onClick={onApply}>APPLY MAP SIZE</button><button className="btn btn-muted" onClick={onReset}>RESET FIELDS</button></div>
            <div className="map-margin-controls"><span>NEED MORE SURROUNDINGS?</span><button className="btn btn-muted" onClick={()=>onExpand(10)}>+10 m EACH SIDE</button><button className="btn btn-muted" onClick={()=>onExpand(25)}>+25 m EACH SIDE</button></div>
            <p className="map-size-footnote">Property outline: {polygonArea(garden.layout.boundary).toFixed(1)} m². To alter the actual land border, use DRAW BORDER or EDIT BORDER. All changes can be undone.</p>
          </section>
  );
}
