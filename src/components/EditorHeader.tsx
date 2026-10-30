import type { ReactNode } from 'react';
import type { StorageBackend } from '../browserStorage';

export type SaveStatus = 'loading' | 'saving' | 'saved' | 'failed' | 'conflict' | 'blocked';

interface Props {
  status: SaveStatus;
  backend: StorageBackend;
  onImport: () => void;
  onBackup: () => void;
  onPrint: () => void;
  fileInputs: ReactNode;
}

/** Page identity and top-level backup controls, independent of garden editing state. */
export function EditorHeader({ status, backend, onImport, onBackup, onPrint, fileInputs }: Props) {
  const statusLabel = status === 'saved'
    ? backend === 'indexeddb' ? 'INDEXEDDB SAVED' : 'LOCAL SAVE'
    : status === 'saving' ? 'SAVING…'
    : status === 'failed' ? 'SAVE FAILED'
    : status === 'conflict' ? 'SAVE CONFLICT'
    : status === 'blocked' ? 'RECOVERY REQUIRED'
    : 'LOADING…';

  return <header className="topbar">
    <div className="brand"><span className="brand-icon">✿</span><div><div className="brand-name">GARDEN <span>ATLAS</span></div><div className="brand-caption">PIXEL LANDSCAPE EDITOR</div></div></div>
    <div className="top-actions">
      <span role="status" aria-live="polite" className={`save-status ${status === 'failed' || status === 'conflict' || status === 'blocked' ? 'danger' : ''}`}>● {statusLabel}</span>
      <button className="btn btn-muted" onClick={onImport}>IMPORT</button>
      <button className="btn btn-highlight" onClick={onBackup}>↓ BACKUP</button>
      <button className="btn btn-muted" onClick={onPrint} title="Open your browser print dialog to save the garden book as a PDF">☷ PDF / PRINT</button>
      {fileInputs}
    </div>
  </header>;
}
