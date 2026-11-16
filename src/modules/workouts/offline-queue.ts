// Cola offline para logSet. Guarda los sets pendientes en IndexedDB
// y los reenvía apenas vuelve la red, sólo si el user actual coincide
// con el que los generó (evita fugas cross-user en el mismo browser).

import type { LogSetInput } from "./actions";
import { logSet } from "./actions";
import { createClient } from "@/lib/supabase/client";

const DB_NAME = "gymia-offline";
const DB_VERSION = 2;
const STORE = "log_set_queue";
const MAX_TRIES = 5;

type Entry = {
  id: string;
  user_id: string;
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
      // Stores agregados en v2 (session_cache, finish_queue) los crea
      // offline-session.ts si no existen.
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

async function currentUserId(): Promise<string | null> {
  if (typeof window === "undefined") return null;
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    return user?.id ?? null;
  } catch {
    return null;
  }
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
      for (const it of items) {
        // Namespacing: no reenviar items de OTRO user con las credenciales de este.
        if (it.user_id !== uid) {
          if (it.tries + 1 >= MAX_TRIES) await remove(it.id);
          else await update({ ...it, tries: it.tries + 1 });
          continue;
        }
        const r = await logSet(it.payload);
        if (r.ok) {
          await remove(it.id);
        } else {
          await update({ ...it, tries: it.tries + 1 });
          if (it.tries + 1 >= MAX_TRIES) await remove(it.id);
          // Seguimos con el siguiente en vez de abortar: un item roto
          // no debe bloquear a los demás.
          continue;
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
    const r = await logSet(payload);
    if (r.ok) return { ok: true, queued: false };
    // Si el error es claramente de red (TypeError de fetch), encolamos.
    // Si es un error de validación / RLS / FK, lo propagamos para que la UI
    // lo muestre en vez de "guardar" en silencio una cola que luego también
    // va a fallar.
    const msg = r.error ?? "No se pudo guardar la serie.";
    const esRed = /network|fetch|load failed|timeout/i.test(msg);
    if (!esRed) return { ok: false, error: msg };
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
  window.addEventListener("online", handler);
  void drainQueue();
  return () => window.removeEventListener("online", handler);
}
