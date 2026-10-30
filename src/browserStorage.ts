/** Local, single-writer snapshots. Never replace unknown browser data without consent. */
import { loadLibrary, loadLibraryRecovery, parseLibrary, saveLibrary, type ProjectLibrary } from './storage.ts';

const DATABASE = 'garden-atlas-offline';
const STORE = 'libraries';
const VERSION = 1;
const CHECKPOINT_INTERVAL = 2 * 60_000;
const LOCAL_KEY = 'garden-atlas:library:v1';
interface Snapshot { key: string; library: ProjectLibrary; savedAt: number; checkpointAt?: number; revision?: string }
export type StorageBackend = 'indexeddb' | 'localstorage';
export interface LibraryLoad {
  library: ProjectLibrary;
  backend: StorageBackend;
  recovered: boolean;
  warning: string;
  /** Never autosave over an invalid primary or recovery record. */
  locked: boolean;
  /** Revision read from the same snapshot as library; null means no primary exists. */
  revision: string | null;
  /** A legacy browser library needs its first IndexedDB save. */
  needsMigration: boolean;
}
export type SaveResult =
  | { status: 'saved'; revision: string | null }
  | { status: 'conflict' | 'failed' };

function connect(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') { reject(new Error('IndexedDB unavailable')); return; }
    let request: IDBOpenDBRequest;
    try { request = indexedDB.open(DATABASE, VERSION); } catch (error) { reject(error); return; }
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: 'key' });
    };
    request.onerror = () => reject(request.error ?? new Error('Cannot open IndexedDB'));
    request.onblocked = () => reject(new Error('Database upgrade blocked by another tab'));
    request.onsuccess = () => resolve(request.result);
  });
}

async function readRow(key: string): Promise<unknown> {
  const db = await connect();
  try {
    return await new Promise<unknown>((resolve, reject) => {
      const transaction = db.transaction(STORE, 'readonly');
      const request = transaction.objectStore(STORE).get(key);
      let value: unknown;
      request.onsuccess = () => { value = request.result as unknown; };
      transaction.oncomplete = () => resolve(value);
      transaction.onerror = () => reject(transaction.error ?? new Error('Failed to read garden data'));
      transaction.onabort = () => reject(transaction.error ?? new Error('Read aborted'));
    });
  } finally { db.close(); }
}

function validLibrary(row: unknown): ProjectLibrary | null {
  if (!row || typeof row !== 'object' || !('library' in row)) return null;
  return parseLibrary(row.library);
}
function snapshotRevision(row: unknown): string | null {
  if (!row || typeof row !== 'object') return null;
  if ('revision' in row && typeof row.revision === 'string' && row.revision) return row.revision;
  // P013–P022 snapshots did not carry revisions; the first guarded write upgrades them.
  return 'legacy:' + ('savedAt' in row ? String(row.savedAt) : 'unstamped');
}
function nextRevision(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}
function localRaw(): string | null { return localStorage.getItem(LOCAL_KEY); }

export async function openBrowserLibrary(): Promise<LibraryLoad> {
  try {
    const primaryRow = await readRow('current');
    const primary = validLibrary(primaryRow);
    if (primary) return {
      library: primary, backend: 'indexeddb', recovered: false, warning: '',
      locked: false, revision: snapshotRevision(primaryRow), needsMigration: false
    };
    const recoveryRow = await readRow('recovery');
    const recovery = validLibrary(recoveryRow);
    if (primaryRow !== undefined || (recoveryRow !== undefined && !recovery)) {
      return {
        library: recovery ?? loadLibrary(), backend: 'indexeddb', recovered: Boolean(recovery),
        warning: 'Existing IndexedDB data cannot be safely loaded. Editing is blocked until you download a backup and explicitly approve recovery. No stored records were overwritten.',
        locked: true, revision: null, needsMigration: false
      };
    }
    if (recovery) return {
      library: recovery, backend: 'indexeddb', recovered: true,
      warning: 'Previous recovery snapshot found. Confirm restoration before making changes.',
      locked: true, revision: null, needsMigration: false
    };
    return {
      library: loadLibrary(), backend: 'indexeddb', recovered: false,
      warning: 'IndexedDB ready. Previous browser saves are retained for migration safety.',
      locked: false, revision: null, needsMigration: true
    };
  } catch {
    return {
      library: loadLibrary(), backend: 'localstorage', recovered: false,
      warning: 'IndexedDB unavailable. Using limited browser storage; export JSON backups. Cross-tab protection is best-effort in this fallback.',
      locked: false, revision: null, needsMigration: true
    };
  }
}

async function writeChecked(library: ProjectLibrary, expected: string | null): Promise<SaveResult> {
  if (!parseLibrary(library)) return { status: 'failed' };
  try {
    const db = await connect();
    try {
      return await new Promise<SaveResult>((resolve, reject) => {
        const transaction = db.transaction(STORE, 'readwrite');
        const store = transaction.objectStore(STORE);
        const request = store.get('current');
        let result: SaveResult = { status: 'failed' };
        request.onsuccess = () => {
          const previous = request.result as Snapshot | undefined;
          const current = previous === undefined ? null : snapshotRevision(previous);
          if (current !== expected || (previous !== undefined && !validLibrary(previous))) {
            result = { status: 'conflict' };return;
          }
          const now = Date.now();
          const checkpointAt = previous?.checkpointAt ?? previous?.savedAt ?? now;
          const rotate = Boolean(previous && now - checkpointAt >= CHECKPOINT_INTERVAL && validLibrary(previous));
          if (rotate && previous) store.put({key: 'recovery', library: previous.library, savedAt: previous.savedAt, revision: current ?? undefined} satisfies Snapshot);
          const revision = nextRevision();
          store.put({ key: 'current', library, savedAt: now, checkpointAt: rotate ? now : checkpointAt, revision } satisfies Snapshot);
          result = { status: 'saved', revision };
        };
        transaction.oncomplete = () => resolve(result);
        transaction.onerror = () => reject(transaction.error ?? new Error('Garden write failed'));
        transaction.onabort = () => reject(transaction.error ?? new Error('Garden write aborted'));
      });
    } finally { db.close(); }
  } catch { return { status: 'failed' }; }
}

/** One writer per open editor. IDB version comparison and put share one atomic transaction. */
export function createBrowserWriter(backend: StorageBackend, initialRevision: string | null) {
  let expected = initialRevision;
  let localExpected: string | null = null;
  let blocked = false;
  let queue: Promise<unknown> = Promise.resolve();
  if (backend === 'localstorage') {
    try { localExpected = localRaw(); } catch { blocked = true; }
  }
  return {
    save(library: ProjectLibrary): Promise<SaveResult> {
      const task = async (): Promise<SaveResult> => {
        if (blocked) return { status: 'conflict' };
        let result: SaveResult;
        if (backend === 'indexeddb') result = await writeChecked(library, expected);
        else {
          try {
            if (localRaw() !== localExpected) result = { status: 'conflict' };
            else if (!saveLibrary(library)) result = { status: 'failed' };
            else { localExpected = localRaw();result = { status: 'saved', revision: null }; }
          } catch { result = { status: 'failed' }; }
        }
        if (result.status === 'saved') expected = result.revision;
        if (result.status === 'conflict') blocked = true;
        return result;
      };
      const pending = queue.then(task, task);
      queue = pending.catch(() => undefined);
      return pending;
    }
  };
}

/** Explicit destructive recovery: preserve damaged rows under new unique keys first. */
export async function approveBrowserRecovery(library: ProjectLibrary): Promise<SaveResult> {
  if (!parseLibrary(library)) return { status: 'failed' };
  try {
    const db = await connect();
    try {
      return await new Promise<SaveResult>((resolve, reject) => {
        const transaction = db.transaction(STORE, 'readwrite');
        const store = transaction.objectStore(STORE);
        const current = store.get('current');
        let result: SaveResult = { status: 'failed' };
        current.onsuccess = () => {
          const old = current.result as unknown;
          if (validLibrary(old)) {result = {status:'conflict'};return;}
          const recovery = store.get('recovery');
          recovery.onsuccess = () => {
            const backup = recovery.result as unknown;
            const stamp = Date.now();
            if (old !== undefined) store.put({key:`damaged-current-${stamp}-${nextRevision()}`, original:old, preservedAt:stamp});
            if (backup !== undefined && !validLibrary(backup)) store.put({key:`damaged-recovery-${stamp}-${nextRevision()}`, original:backup, preservedAt:stamp});
            if (backup !== undefined && !validLibrary(backup)) store.delete('recovery');
            const revision = nextRevision();
            store.put({key:'current',library,savedAt:stamp,checkpointAt:stamp,revision} satisfies Snapshot);
            result = {status:'saved',revision};
          };
        };
        transaction.oncomplete = () => resolve(result);
        transaction.onerror = () => reject(transaction.error ?? new Error('Recovery failed'));
        transaction.onabort = () => reject(transaction.error ?? new Error('Recovery aborted'));
      });
    } finally { db.close(); }
  } catch { return { status:'failed' }; }
}

/** Export existing raw rows before approving replacement; never transmit them. */
export async function exportStoredRecords(): Promise<string | null> {
  try {
    const [current,recovery] = await Promise.all([readRow('current'),readRow('recovery')]);
    return JSON.stringify({ exportedAt:new Date().toISOString(),current,recovery },null,2);
  } catch { return null; }
}

export async function recoverBrowserLibrary(backend: StorageBackend): Promise<ProjectLibrary | null> {
  if (backend === 'indexeddb') {
    try { return validLibrary(await readRow('recovery')) ?? loadLibraryRecovery(); }
    catch { return loadLibraryRecovery(); }
  }
  return loadLibraryRecovery();
}

export async function estimateBrowserSpace(): Promise<string> {
  try {
    const estimate = await navigator.storage?.estimate();
    if (estimate?.usage === undefined || !estimate.quota) return 'Storage estimate unavailable';
    const mb = (n: number) => `${(n / (1024 * 1024)).toFixed(1)} MB`;
    return `${mb(estimate.usage)} used of approximately ${mb(estimate.quota)} available for this site`;
  } catch { return 'Storage estimate unavailable'; }
}

export async function requestPersistentStorage(): Promise<boolean> {
  try { return Boolean(await navigator.storage?.persist?.()); } catch { return false; }
}
