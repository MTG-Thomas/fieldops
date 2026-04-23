import type { JobDraft, SyncBatchItem } from "../../shared/contracts";

const JOB_KEY = "fo_job_draft_v2";
const DB_NAME = "fieldops-sync";
const STORE_NAME = "queue";
const MAX_TEXT_LENGTH = 2000;
const MAX_DRAFT_ITEMS = 100;

function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function cleanText(value: unknown, maxLength = MAX_TEXT_LENGTH): string {
  return typeof value === "string" ? value.slice(0, maxLength) : "";
}

function cleanIso(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? undefined : new Date(parsed).toISOString();
}

function sanitizeJobDraft(value: unknown): JobDraft | null {
  if (!isObject(value) || typeof value.ticketId !== "number" || !Number.isFinite(value.ticketId)) {
    return null;
  }

  const notes = Array.isArray(value.notes) ? value.notes : [];
  const photos = Array.isArray(value.photos) ? value.photos : [];

  return {
    ticketId: value.ticketId,
    ticketSummary: cleanText(value.ticketSummary, 300),
    travelStart: cleanIso(value.travelStart),
    travelEnd: cleanIso(value.travelEnd),
    onsiteStart: cleanIso(value.onsiteStart),
    onsiteEnd: cleanIso(value.onsiteEnd),
    notes: notes.slice(0, MAX_DRAFT_ITEMS).flatMap((item) => {
      if (!isObject(item) || typeof item.id !== "string") return [];
      const type = item.type;
      if (type !== "travel" && type !== "onsite" && type !== "note" && type !== "photo" && type !== "system") return [];
      const at = cleanIso(item.at);
      if (!at) return [];
      return [{
        id: cleanText(item.id, 80),
        type,
        at,
        text: cleanText(item.text),
        minutes: typeof item.minutes === "number" && Number.isFinite(item.minutes) ? item.minutes : undefined,
      }];
    }),
    photos: photos.slice(0, MAX_DRAFT_ITEMS).flatMap((item) => {
      if (!isObject(item) || typeof item.id !== "string") return [];
      return [{
        id: cleanText(item.id, 80),
        name: cleanText(item.name, 255),
        previewUrl: typeof item.previewUrl === "string" && !item.previewUrl.startsWith("blob:")
          ? item.previewUrl
          : undefined,
      }];
    }),
  };
}

export function loadJobDraft(): JobDraft | null {
  try {
    const raw = localStorage.getItem(JOB_KEY);
    return raw ? sanitizeJobDraft(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
}

export function saveJobDraft(job: JobDraft | null): boolean {
  if (!job) {
    localStorage.removeItem(JOB_KEY);
    return true;
  }
  const safeJob = sanitizeJobDraft(job);
  if (!safeJob) {
    const existing = localStorage.getItem(JOB_KEY);
    console.warn(
      existing
        ? "saveJobDraft: sanitization failed; existing draft was preserved"
        : "saveJobDraft: sanitization failed; input was discarded",
    );
    return false;
  }
  localStorage.setItem(JOB_KEY, JSON.stringify(safeJob));
  return true;
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
