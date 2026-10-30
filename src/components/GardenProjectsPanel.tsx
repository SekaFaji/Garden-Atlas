import type { Ref } from 'react';
import type { Garden } from '../model';
import type { ProjectLibrary } from '../storage';
import type { StorageBackend } from '../browserStorage';
import { OfflineTools } from '../OfflineTools';

interface Props {
  panelRef: Ref<HTMLElement>;
  active: boolean;
  library: ProjectLibrary;
  garden: Garden;
  saved: boolean;
  backend: StorageBackend;
  storageInfo: string;
  onOpenProject: (id: string) => void;
  onNewProject: (demo: boolean) => void;
  onRemoveProject: () => void;
  onExportOriginal: () => void;
  onBackupAll: () => void;
  onRestoreAll: () => void;
  onRecover: () => void;
  onProtectStorage: () => void;
}

/** Presentational project manager. Parent owns all changes to garden and browser storage. */
export function GardenProjectsPanel({ panelRef, active, library, garden, saved, backend, storageInfo,
  onOpenProject, onNewProject, onRemoveProject, onExportOriginal, onBackupAll,
  onRestoreAll, onRecover, onProtectStorage }: Props) {
  return <aside ref={panelRef} className={`panel project-panel ${active ? 'mobile-active' : ''}`}>

    <div className="section-heading">07 / MY GARDENS</div>
    <p className="panel-hint">Your projects are stored in this browser only. Download regular backups.</p>
    <div className="project-list">{library.projects.map(p=><button key={p.id} className={`project-entry ${p.id===library.activeId?'active':''}`} onClick={() => onOpenProject(p.id)}><span>▧ {p.garden.name}</span><small>{p.garden.objects.length} items · {p.garden.width}×{p.garden.height} m</small></button>)}</div>
    <div className="project-actions"><button className="btn btn-highlight" onClick={() => onNewProject(false)}>+ EMPTY GARDEN</button><button className="btn btn-muted" onClick={() => onNewProject(true)}>+ DEMO COPY</button><button className="btn btn-danger" onClick={onRemoveProject}>DELETE CURRENT GARDEN</button></div>
    <div className="section-heading list-heading">OFFLINE APP & INSTALLATION</div>
    <OfflineTools saved={saved}/>
    <div className="section-heading list-heading">BACKUP & RECOVERY</div>
    {garden.linkMigration&&<button className="btn btn-muted" onClick={onExportOriginal}>↓ EXPORT ORIGINAL PRE-LINK MAPS</button>}
    <div className="project-actions"><button className="btn btn-muted" onClick={onBackupAll}>↓ BACKUP ALL GARDENS</button><button className="btn btn-muted" onClick={onRestoreAll}>↑ RESTORE ALL GARDENS</button><button className="btn btn-muted" onClick={onRecover}>↶ LOCAL RECOVERY COPY</button></div>
    <p className="panel-hint">Primary storage: {backend==='indexeddb'?'IndexedDB (larger local storage)':'limited localStorage fallback'}. {storageInfo}. Clearing browser site data can still erase it; no cloud sync. JSON backups also include compressed photos.</p>
    <button className="btn btn-muted" onClick={onProtectStorage}>PROTECT LOCAL STORAGE</button>
  </aside>;
}
