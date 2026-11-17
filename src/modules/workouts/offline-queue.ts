// Cola offline para logSet. Guarda los sets pendientes en IndexedDB
// y los reenvía apenas vuelve la red, sólo si el user actual coincide
// con el que los generó (evita fugas cross-user en el mismo browser).

import type { LogSetInput } from "./actions";
import { logSet } from "./actions";
import { getOfflineUserId } from "@/lib/offline-user";

const DB_NAME = "gymia-offline";
const DB_VERSION = 2;
const STORE = "log_set_queue";
const MAX_TRIES = 5;
// Timeout para la call al server action. Server actions usan el fetch
// interno de Next que no respeta el timeout de createClient — lo
// aplicamos en el llamador con Promise.race para que en 4G degradado
// no esperemos 30s antes de clasificar como red.
const ACTION_TIMEOUT_MS = 8000;

type Entry = {
  id: string;
  user_id: string;
  payload: LogSetInput;
  tries: number;
  created_at: number;
  next_attempt_at?: number;
};

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains("session_cache")) {
        db.createObjectStore("session_cache", { keyPath: "key" });
      }
      if (!db.objectStoreNames.contains("finish_queue")) {
        db.createObjectStore("finish_queue", { keyPath: "id" });
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

/** Borra TODO el store. Llamar en signOut y al cambiar de user. */
export async function clearOfflineQueue(): Promise<void> {
  try {
    await withStore("readwrite", (store) => {
      store.clear();
    });
  } catch {
    // noop
  }
}

/** Cantidad de items encolados para el user actual. Para la chip de UI. */
export async function countPending(): Promise<number> {
  try {
    const uid = await getOfflineUserId();
    if (!uid) return 0;
    const items = await getAll();
    return items.filter((i) => i.user_id === uid).length;
  } catch {
    return 0;
  }
}

async function currentUserId(): Promise<string | null> {
  return getOfflineUserId();
}

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const t = setTimeout(
      () => reject(new Error("timeout")),
      ms,
    );
    p.then(
      (v) => {
        clearTimeout(t);
        resolve(v);
      },
      (e) => {
        clearTimeout(t);
        reject(e);
      },
    );
  });
}

let drainingPromise: Promise<void> | null = null;

export async function drainQueue(): Promise<void> {
  if (typeof window === "undefined") return;
  if (!navigator.onLine) return;
  if (drainingPromise) return drainingPromise;
  drainingPromise = (async () => {
    try {
      const uid = await currentUserId();
      if (!uid) return;
      const items = await getAll();
      const now = Date.now();
      for (const it of items) {
        if (it.user_id !== uid) {
          if (it.tries + 1 >= MAX_TRIES) await remove(it.id);
          else await update({ ...it, tries: it.tries + 1 });
          continue;
        }
        // Backoff: respetar next_attempt_at.
        if (it.next_attempt_at && it.next_attempt_at > now) continue;
        let errMsg: string | null = null;
        let threw = false;
        try {
          const r = await withTimeout(logSet(it.payload), ACTION_TIMEOUT_MS);
          if (r.ok) {
            await remove(it.id);
            continue;
          }
          errMsg = r.error ?? "unknown";
        } catch (e) {
          threw = true;
          errMsg = e instanceof Error ? e.message : String(e);
        }
        const esRed =
          threw ||
          /network|fetch|load failed|timeout|offline/i.test(errMsg ?? "");
        if (esRed) {
          // Red mala: no consumimos retry, pero sí ponemos backoff para
          // no martillar.
          await update({
            ...it,
            next_attempt_at: now + 15000 + Math.random() * 5000,
          });
          return;
        }
        // Error de server: consumimos retry con backoff exponencial.
        const nextTries = it.tries + 1;
        if (nextTries >= MAX_TRIES) {
          await remove(it.id);
        } else {
          const delay = Math.min(5 * 60_000, 2 ** nextTries * 1000);
          await update({
            ...it,
            tries: nextTries,
            next_attempt_at: now + delay + Math.random() * 1000,
          });
        }
      }
    } finally {
      drainingPromise = null;
    }
  })();
  return drainingPromise;
}

export type LogSetOfflineResult =
  | { ok: true; queued: boolean }
  | { ok: false; error: string };

export async function logSetOffline(
  payload: LogSetInput,
): Promise<LogSetOfflineResult> {
  const uid = (await currentUserId()) ?? "anon";
  const online = typeof window !== "undefined" && navigator.onLine;

  if (online) {
    try {
      const r = await withTimeout(logSet(payload), ACTION_TIMEOUT_MS);
      if (r.ok) return { ok: true, queued: false };
      const msg = r.error ?? "No se pudo guardar la serie.";
      const esRed = /network|fetch|load failed|timeout/i.test(msg);
      if (!esRed) return { ok: false, error: msg };
    } catch {
      // Timeout o fallo de red → cae al encolado abajo.
    }
  }

  const entry: Entry = {
    id: `${payload.sessionId}:${payload.routineExerciseId}:${payload.numeroSerie}:${Date.now()}`,
    user_id: uid,
    payload,
    tries: 0,
    created_at: Date.now(),
  };
  try {
    await enqueue(entry);
    return { ok: true, queued: true };
  } catch {
    const r = await logSet(payload);
    if (r.ok) return { ok: true, queued: false };
    return { ok: false, error: r.error ?? "No se pudo guardar la serie." };
  }
}

export function startQueueSyncOnline(): () => void {
  if (typeof window === "undefined") return () => undefined;
  const handler = () => void drainQueue();
  const visHandler = () => {
    if (document.visibilityState === "visible") void drainQueue();
  };
  window.addEventListener("online", handler);
  document.addEventListener("visibilitychange", visHandler);
  // Reintentar cada 30s mientras la app esté viva: cubre el caso de
  // `online` que no re-dispara si nunca pasó a offline (packet loss
  // silencioso) y de items con backoff que hay que destrabar.
  const interval = window.setInterval(() => {
    if (document.visibilityState === "visible") void drainQueue();
  }, 30000);
  void drainQueue();
  return () => {
    window.removeEventListener("online", handler);
    document.removeEventListener("visibilitychange", visHandler);
    clearInterval(interval);
  };
}
