import { EDITOR_TOOLS } from '../editorVisuals';
import { MetricDraftInput } from '../MetricDraftInput';
import { GROUNDS, type Ground } from '../model';
import { MIN_LINE_WIDTH_M, MAX_LINE_WIDTH_M, LINE_WIDTH_PRESETS_M } from '../lineDimensions';
import type { Tool } from '../MapView';

interface Props {
  tool: Tool;
  multiSelect: boolean;
  snapEnabled: boolean;
  canUndo: boolean;
  canRedo: boolean;
  migrationBlocked: boolean;
  lineWidth: number;
  ground: Ground;
  onToggleMultiSelect: () => void;
  onToggleSnap: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onSelectTool: (tool: Tool) => boolean;
  onLineWidthChange: (width: number) => void;
  onGroundChange: (ground: Ground) => void;
  onNotice: (text: string) => void;
}

/** Presentational controls only; App owns navigation, history, confirmations and edits. */
export function MapEditingToolbar({tool,multiSelect,snapEnabled,canUndo,canRedo,migrationBlocked,
  lineWidth,ground,onToggleMultiSelect,onToggleSnap,onUndo,onRedo,onSelectTool,
  onLineWidthChange,onGroundChange,onNotice}:Props) {
  return <>
          <div className="editor-history-bar" aria-label="Editing history">
              <button className={multiSelect?'active-history':''} aria-pressed={multiSelect} onClick={onToggleMultiSelect} title="Tap objects to select multiple">◩ MULTI</button>
              <button className={snapEnabled?'active-history':''} aria-pressed={snapEnabled} onClick={onToggleSnap} title="Snap moves and placements to a 0.5 metre grid">⌗ SNAP {snapEnabled?'ON':'OFF'}</button>
              <button disabled={!canUndo||migrationBlocked} onClick={onUndo} title="Undo · Ctrl/Cmd+Z">↶ UNDO</button>
              <button disabled={!canRedo||migrationBlocked} onClick={onRedo} title="Redo · Ctrl/Cmd+Shift+Z">↷ REDO</button>
              <span>{migrationBlocked?'CHOOSE MAP SOURCE FIRST':'BOTH MAPS LINKED'}</span>
            </div>
            <div className="primary-tools" role="toolbar" aria-label="Editor interaction tools">
            {EDITOR_TOOLS.map(x=><button type="button" key={x.id} className={tool===x.id?'active':''} aria-pressed={tool===x.id} aria-label={`${x.name}: ${x.hint}`} title={x.hint} onClick={()=>onSelectTool(x.id)}>{x.label}</button>)}
          </div>
          {(tool==='path'||tool==='fence')&&<div className="terrain-chooser line-width-chooser">
            <label htmlFor="new-line-width">{tool.toUpperCase()} WIDTH (M)</label>
            <div className="line-width-controls" id="new-line-width">
              <MetricDraftInput label="New path or fence width in metres" min={MIN_LINE_WIDTH_M} max={MAX_LINE_WIDTH_M} value={lineWidth} onCommit={onLineWidthChange} onNotice={onNotice}/>
              <div className="line-width-presets" aria-label="Quick path and fence widths">
                {LINE_WIDTH_PRESETS_M.map(width=><button type="button" key={width} aria-label={`${width} m line width`} aria-pressed={lineWidth===width}
                  className={lineWidth===width?'active':''} onClick={()=>onLineWidthChange(width)}>{width} m</button>)}
              </div>
              <small>Widths from 0.05 m (5 cm). Decimals accepted, e.g. 0.15 m.</small>
            </div>
          </div>
          {tool==='terrain'&&<div className="terrain-chooser"><span>NEW REGION</span><select aria-label="Terrain brush" value={ground} onChange={e=>onGroundChange(e.target.value as Ground)}>{GROUNDS.map(g=><option key={g.value} value={g.value}>{g.label}</option>)}</select></div>}
  </>;
}
