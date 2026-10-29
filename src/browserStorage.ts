/** P013: ordered, transactional IndexedDB snapshots. Legacy localStorage is never deleted. */
import { loadLibrary, loadLibraryRecovery, parseLibrary, saveLibrary, type ProjectLibrary } from './storage.ts';

const DATABASE = 'garden-atlas-offline';
const STORE = 'libraries';
const VERSION = 1;
const CHECKPOINT_INTERVAL = 2 * 60_000;
interface Snapshot { key: 'current' | 'recovery'; library: ProjectLibrary; savedAt: number; checkpointAt?: number }
export type StorageBackend = 'indexeddb' | 'localstorage';
export interface LibraryLoad { library: ProjectLibrary; backend: StorageBackend; recovered: boolean; warning: string }

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

async function read(key: Snapshot['key']): Promise<ProjectLibrary | null> {
  const db = await connect();
  try {
    return await new Promise<ProjectLibrary | null>((resolve, reject) => {
      const transaction = db.transaction(STORE, 'readonly');
      const request = transaction.objectStore(STORE).get(key);
      let result: ProjectLibrary | null = null;
      request.onsuccess = () => {
        const row = request.result as Snapshot | undefined;
        result = row ? parseLibrary(row.library) : null;
      };
      transaction.oncomplete = () => resolve(result);
      transaction.onerror = () => reject(transaction.error ?? new Error('Failed to read garden data'));
      transaction.onabort = () => reject(transaction.error ?? new Error('Read aborted'));
    });
  } finally { db.close(); }
}

export async function openBrowserLibrary(): Promise<LibraryLoad> {
  try {
    const primary = await read('current');
    if (primary) return { library: primary, backend: 'indexeddb', recovered: false, warning: '' };
    const recovery = await read('recovery');
    if (recovery) return { library: recovery, backend: 'indexeddb', recovered: true, warning: 'Loaded a previous IndexedDB recovery snapshot. Export a backup.' };
    // First IndexedDB launch: import the existing browser library without touching old keys.
    return { library: loadLibrary(), backend: 'indexeddb', recovered: false, warning: 'IndexedDB ready. Previous browser saves are retained for migration safety.' };
  } catch {
    return { library: loadLibrary(), backend: 'localstorage', recovered: false, warning: 'IndexedDB is unavailable. Using limited browser storage; export a JSON backup.' };
  }
}

async function write(library: ProjectLibrary): Promise<boolean> {
  if (!parseLibrary(library)) return false;
  try {
    const db = await connect();
    try {
      await new Promise<void>((resolve, reject) => {
        const transaction = db.transaction(STORE, 'readwrite');
        const store = transaction.objectStore(STORE);
        const request = store.get('current');
        request.onsuccess = () => {
          const previous = request.result as Snapshot | undefined;
          const now = Date.now();
          const checkpointAt = previous?.checkpointAt ?? previous?.savedAt ?? now;
          const rotate = Boolean(previous && now - checkpointAt >= CHECKPOINT_INTERVAL && parseLibrary(previous.library));
          if (rotate && previous) {
            store.put({ key: 'recovery', library: previous.library, savedAt: previous.savedAt } satisfies Snapshot);
          }
          store.put({ key: 'current', library, savedAt: now, checkpointAt: rotate ? now : checkpointAt } satisfies Snapshot);
        };
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error ?? new Error('Garden write failed'));
        transaction.onabort = () => reject(transaction.error ?? new Error('Garden write aborted'));
      });
    } finally { db.close(); }
    return true;
  } catch { return false; }
}

// Serialize every write in edit order so an older async write cannot overwrite a newer garden.
let writeQueue: Promise<unknown> = Promise.resolve();
export function queueBrowserSave(library: ProjectLibrary, backend: StorageBackend): Promise<boolean> {
  const task = () => backend === 'indexeddb' ? write(library) : Promise.resolve(saveLibrary(library));
  const pending = writeQueue.then(task, task);
  writeQueue = pending.catch(() => false);
  return pending;
}

export async function recoverBrowserLibrary(backend: StorageBackend): Promise<ProjectLibrary | null> {
  if (backend === 'indexeddb') {
    try { return await read('recovery') ?? loadLibraryRecovery(); }
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
