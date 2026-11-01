import type { ChangeEventHandler, RefObject } from 'react';
import type { Garden } from '../model';
import { MetricDraftInput } from '../MetricDraftInput';

interface Props {
  garden: Garden;
  open: boolean;
  importing: boolean;
  visible: boolean;
  fileInputRef: RefObject<HTMLInputElement | null>;
  onToggle: () => void;
  onVisibleChange: (value: boolean) => void;
  onImport: ChangeEventHandler<HTMLInputElement>;
  onOpacityChange: (opacity: number) => void;
  onWidthChange: (metres: number) => void;
  onPositionChange: (position: {x?: number; y?: number}) => void;
  onRemove: () => void;
  onNotice: (message: string) => void;
}

/** Tracing controls only. App handles image conversion, permissions, history and persistence. */
export function ReferenceImagePanel({garden,open,importing,visible,fileInputRef,onToggle,onVisibleChange,onImport,onOpacityChange,onWidthChange,onPositionChange,onRemove,onNotice}:Props) {
  return <>
          <div className="reference-toolbar">
            <button className="btn btn-muted" onClick={()=>onToggle()} aria-expanded={open} aria-controls="reference-panel">▧ TRACE IMAGE {open?'▴':'▾'} {garden.reference?'●':''}</button>
            {garden.reference&&<label><input type="checkbox" checked={visible} onChange={e=>onVisibleChange(e.target.checked)}/> SHOW ON MAP</label>}
          </div>
          {open&&<section id="reference-panel" className="reference-panel" aria-label="Local reference image controls">
            <p>Import a JPG, PNG or WebP aerial photo or plan. The image stays on this device, and is included in JSON backups. No automatic geolocation or measurement accuracy is assumed.</p>
            <input ref={fileInputRef} hidden type="file" accept="image/jpeg,image/png,image/webp" onChange={onImport}/>
            <button className="btn btn-highlight" disabled={importing} onClick={()=>fileInputRef.current?.click()}>{importing?'PROCESSING IMAGE…':garden.reference?'REPLACE REFERENCE IMAGE':'IMPORT REFERENCE IMAGE'}</button>
            {garden.reference&&<>
              <small>{garden.reference.name} · shown in BOTH map styles</small>
              <label>OPACITY {Math.round(garden.reference.opacity*100)}%<input type="range" min="5" max="100" step="5" value={garden.reference.opacity*100} onChange={e=>onOpacityChange(Number(e.target.value)/100)}/></label>
              <label>IMAGE WIDTH (metres)<MetricDraftInput label="Tracing image width in metres" min={0.5} max={garden.width} value={garden.reference.widthM} onCommit={onWidthChange} onNotice={onNotice}/></label>
              <div className="reference-coordinates">
                <label>LEFT X (m)<MetricDraftInput label="Tracing image X offset in metres" min={0} max={Math.max(0,garden.width-garden.reference.widthM)} value={garden.reference.x} onCommit={x=>onPositionChange({x})} onNotice={onNotice}/></label>
                <label>TOP Y (m)<MetricDraftInput label="Tracing image Y offset in metres" min={0} max={Math.max(0,garden.height-garden.reference.heightM)} value={garden.reference.y} onCommit={y=>onPositionChange({y})} onNotice={onNotice}/></label>
              </div>
              <button className="btn btn-danger" onClick={onRemove}>REMOVE REFERENCE</button>
              <p>Align the image using width and X/Y offsets. For accurate tracing, calibrate from a known real-world distance. This is a visual reference, not a legal survey.</p>
            </>}
          </section>}
  </>;
}
