// Cola offline para logSet. Guarda los sets pendientes en IndexedDB
// y los reenvía apenas vuelve la red. Si fallan por auth u otro, los
// deja para el próximo intento. Sin dependencias externas.

import type { LogSetInput } from "./actions";
import { logSet } from "./actions";

const DB_NAME = "gymia-offline";
const DB_VERSION = 1;
const STORE = "log_set_queue";

type Entry = {
  id: string; // client-generated
  payload: LogSetInput;
  tries: number;
  created_at: number;
};

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "id" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function withStore<T>(
  mode: IDBTransactionMode,
  cb: (store: IDBObjectStore) => Promise<T> | T,
): Promise<T> {
  const db = await openDb();
  return await new Promise<T>((resolve, reject) => {
    const tx = db.transaction(STORE, mode);
    const store = tx.objectStore(STORE);
    Promise.resolve(cb(store)).then(resolve, reject);
    tx.oncomplete = () => db.close();
    tx.onerror = () => {
      db.close();
      reject(tx.error);
    };
  });
}

function reqAsPromise<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function enqueue(entry: Entry): Promise<void> {
  await withStore("readwrite", (store) => {
    store.put(entry);
  });
}

async function getAll(): Promise<Entry[]> {
  return withStore<Entry[]>("readonly", (store) =>
    reqAsPromise(store.getAll()),
  );
}

async function remove(id: string): Promise<void> {
  await withStore("readwrite", (store) => {
    store.delete(id);
  });
}

async function update(entry: Entry): Promise<void> {
  await withStore("readwrite", (store) => {
    store.put(entry);
  });
}

let drainingPromise: Promise<void> | null = null;

export async function drainQueue(): Promise<void> {
  if (typeof window === "undefined") return;
  if (!navigator.onLine) return;
  if (drainingPromise) return drainingPromise;
  drainingPromise = (async () => {
    try {
      const items = await getAll();
      for (const it of items) {
        const r = await logSet(it.payload);
        if (r.ok) {
          await remove(it.id);
        } else {
          await update({ ...it, tries: it.tries + 1 });
          // si no es un fallo de red, no ciclar infinito: después de 5 intentos descarta
          if (it.tries + 1 >= 5) await remove(it.id);
          break;
        }
      }
    } finally {
      drainingPromise = null;
    }
  })();
  return drainingPromise;
}

export async function logSetOffline(payload: LogSetInput): Promise<{ ok: true }> {
  if (typeof window !== "undefined" && navigator.onLine) {
    const r = await logSet(payload);
    if (r.ok) return { ok: true };
  }
  const entry: Entry = {
    id: `${payload.sessionId}:${payload.routineExerciseId}:${payload.numeroSerie}:${Date.now()}`,
    payload,
    tries: 0,
    created_at: Date.now(),
  };
  try {
    await enqueue(entry);
  } catch {
    // IndexedDB no disponible: último recurso, intentar directo
    await logSet(payload);
  }
  return { ok: true };
}

export function startQueueSyncOnline(): () => void {
  if (typeof window === "undefined") return () => undefined;
  const handler = () => void drainQueue();
  window.addEventListener("online", handler);
  // intento inicial
  void drainQueue();
  return () => window.removeEventListener("online", handler);
}
