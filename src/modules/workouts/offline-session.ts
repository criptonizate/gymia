// Cache local de la sesión y cola para finishSession y notas.
// Complementa offline-queue.ts (que maneja logSet).
//
// Objetivo: que /sesion/[id] se pueda ABRIR sin conexión en el gym.
// La primera vez que la cargás online, guardamos el contexto en IndexedDB
// (bajo la key del user). Al volver a abrir offline, hidratamos de ahí.

import type { RoutineExerciseRow } from "@/modules/routines/queries";
import type { ExerciseWithRelations } from "@/modules/exercises/types";
import type { SetLog } from "@/modules/workouts/queries";
import { getOfflineUserId } from "@/lib/offline-user";
import { finishSession, saveSessionNotas } from "@/modules/workouts/actions";

const DB_NAME = "gymia-offline";
const DB_VERSION = 2;
const SESSION_STORE = "session_cache";
const FINISH_STORE = "finish_queue";

type SessionCache = {
  key: string; // `${userId}:${sessionId}`
  user_id: string;
  session_id: string;
  startedAt: string;
  dayNombre: string;
  ejercicios: RoutineExerciseRow[];
  logs: SetLog[];
  lastLogsByExercise: Record<string, SetLog[]>;
  substitutes: Record<string, ExerciseWithRelations>;
  updated_at: number;
};

type FinishEntry = {
  id: string; // `${userId}:${sessionId}`
  user_id: string;
  session_id: string;
  notas?: string;
  tries: number;
  created_at: number;
};

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains("log_set_queue"))
        db.createObjectStore("log_set_queue", { keyPath: "id" });
      if (!db.objectStoreNames.contains(SESSION_STORE))
        db.createObjectStore(SESSION_STORE, { keyPath: "key" });
      if (!db.objectStoreNames.contains(FINISH_STORE))
        db.createObjectStore(FINISH_STORE, { keyPath: "id" });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function tx<T>(
  store: string,
  mode: IDBTransactionMode,
  cb: (s: IDBObjectStore) => Promise<T> | T,
): Promise<T> {
  const db = await openDb();
  return new Promise<T>((resolve, reject) => {
    const t = db.transaction(store, mode);
    const s = t.objectStore(store);
    Promise.resolve(cb(s)).then(resolve, reject);
    t.oncomplete = () => db.close();
    t.onerror = () => {
      db.close();
      reject(t.error);
    };
  });
}

function asPromise<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function currentUserId(): Promise<string | null> {
  return getOfflineUserId();
}

// --------------------------- Session cache ------------------------------

export async function saveSessionCache(
  payload: Omit<SessionCache, "key" | "user_id" | "updated_at"> & {
    user_id?: string;
  },
): Promise<void> {
  const uid = payload.user_id ?? (await currentUserId());
  if (!uid) return;
  try {
    await tx(SESSION_STORE, "readwrite", (store) => {
      store.put({
        key: `${uid}:${payload.session_id}`,
        user_id: uid,
        ...payload,
        updated_at: Date.now(),
      });
    });
  } catch {
    /* noop */
  }
}

export async function readSessionCache(
  sessionId: string,
): Promise<SessionCache | null> {
  const uid = await currentUserId();
  if (!uid) return null;
  try {
    return (await tx(SESSION_STORE, "readonly", (store) =>
      asPromise(store.get(`${uid}:${sessionId}`)),
    )) as SessionCache | undefined ?? null;
  } catch {
    return null;
  }
}

export async function clearSessionCache(sessionId?: string): Promise<void> {
  const uid = await currentUserId();
  if (!uid) return;
  try {
    await tx(SESSION_STORE, "readwrite", (store) => {
      if (sessionId) store.delete(`${uid}:${sessionId}`);
      else store.clear();
    });
  } catch {
    /* noop */
  }
}

// --------------------------- Finish queue ------------------------------

export async function finishSessionOffline(
  sessionId: string,
  notas?: string,
): Promise<void> {
  const uid = (await currentUserId()) ?? "anon";
  if (typeof window !== "undefined" && navigator.onLine) {
    const r = await finishSession(sessionId, notas);
    if (r.ok) {
      await clearSessionCache(sessionId);
      return;
    }
  }
  try {
    await tx(FINISH_STORE, "readwrite", (store) => {
      store.put({
        id: `${uid}:${sessionId}`,
        user_id: uid,
        session_id: sessionId,
        notas,
        tries: 0,
        created_at: Date.now(),
      } satisfies FinishEntry);
    });
  } catch {
    /* noop */
  }
  await clearSessionCache(sessionId);
}

export async function saveSessionNotasOffline(
  sessionId: string,
  notas: string,
): Promise<void> {
  if (typeof window !== "undefined" && navigator.onLine) {
    await saveSessionNotas(sessionId, notas);
    return;
  }
  // Si está offline, metemos las notas en finish_queue como pre-pending
  const uid = (await currentUserId()) ?? "anon";
  try {
    await tx(FINISH_STORE, "readwrite", (store) => {
      const existing = store.get(`${uid}:${sessionId}`);
      existing.onsuccess = () => {
        const prev = existing.result as FinishEntry | undefined;
        store.put({
          id: `${uid}:${sessionId}`,
          user_id: uid,
          session_id: sessionId,
          notas,
          tries: prev?.tries ?? 0,
          created_at: prev?.created_at ?? Date.now(),
        });
      };
    });
  } catch {
    /* noop */
  }
}

async function drainFinish(): Promise<void> {
  const uid = await currentUserId();
  if (!uid || typeof window === "undefined" || !navigator.onLine) return;
  let entries: FinishEntry[] = [];
  try {
    entries = (await tx(FINISH_STORE, "readonly", (s) =>
      asPromise(s.getAll()),
    )) as FinishEntry[];
  } catch {
    return;
  }
  for (const it of entries) {
    if (it.user_id !== uid) continue;
    const r = await finishSession(it.session_id, it.notas);
    if (r.ok) {
      await tx(FINISH_STORE, "readwrite", (s) => s.delete(it.id));
      await clearSessionCache(it.session_id);
    } else {
      await tx(FINISH_STORE, "readwrite", (s) => {
        const u = { ...it, tries: it.tries + 1 } satisfies FinishEntry;
        s.put(u);
      });
    }
  }
}

export function startFinishSyncOnline(): () => void {
  if (typeof window === "undefined") return () => undefined;
  const handler = () => void drainFinish();
  window.addEventListener("online", handler);
  void drainFinish();
  return () => window.removeEventListener("online", handler);
}

export async function clearAllOfflineData(): Promise<void> {
  try {
    await tx(SESSION_STORE, "readwrite", (s) => s.clear());
    await tx(FINISH_STORE, "readwrite", (s) => s.clear());
  } catch {
    /* noop */
  }
}
