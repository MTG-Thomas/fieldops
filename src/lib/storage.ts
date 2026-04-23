import type { JobDraft, SyncBatchItem } from "../../shared/contracts";

const JOB_KEY = "fo_job_draft_v2";
const DB_NAME = "fieldops-sync";
const STORE_NAME = "queue";

export function loadJobDraft(): JobDraft | null {
  try {
    const raw = localStorage.getItem(JOB_KEY);
    return raw ? (JSON.parse(raw) as JobDraft) : null;
  } catch {
    return null;
  }
}

export function saveJobDraft(job: JobDraft | null): void {
  if (!job) {
    localStorage.removeItem(JOB_KEY);
    return;
  }
  localStorage.setItem(JOB_KEY, JSON.stringify(job));
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onerror = () => reject(request.error);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
  });
}

export async function enqueueSyncItem(item: SyncBatchItem): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).put(item);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getQueuedItems(): Promise<SyncBatchItem[]> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const req = tx.objectStore(STORE_NAME).getAll();
    req.onsuccess = () => resolve((req.result as SyncBatchItem[]) ?? []);
    req.onerror = () => reject(req.error);
  });
}

export async function deleteQueuedItems(ids: string[]): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    ids.forEach((id) => store.delete(id));
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}
