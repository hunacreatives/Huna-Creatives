import { createClient } from '@supabase/supabase-js';

const supabaseUrl =
  (import.meta.env.VITE_PUBLIC_SUPABASE_URL as string)
  || (import.meta.env.VITE_SUPABASE_URL as string)
  || '';
const supabaseAnonKey =
  (import.meta.env.VITE_PUBLIC_SUPABASE_ANON_KEY as string)
  || (import.meta.env.VITE_SUPABASE_ANON_KEY as string)
  || '';

export const supabaseAnonKey_ = supabaseAnonKey;
export const supabaseUrl_ = supabaseUrl;
export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

function getSupabaseProjectRef() {
  try {
    const hostname = new URL(supabaseUrl).hostname;
    return hostname.split('.')[0] || '';
  } catch {
    return '';
  }
}

// IndexedDB-backed storage so iOS PWAs don't lose the session when
// the OS evicts localStorage (happens after ~7 days of inactivity).
const IDB_NAME = 'sentro-auth';
const IDB_STORE = 'kv';

function openAuthDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(IDB_STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

const idbStorage = {
  async getItem(key: string): Promise<string | null> {
    try {
      const db = await openAuthDb();
      return await new Promise((resolve, reject) => {
        const req = db.transaction(IDB_STORE, 'readonly').objectStore(IDB_STORE).get(key);
        req.onsuccess = () => resolve(req.result ?? null);
        req.onerror = () => reject(req.error);
      });
    } catch {
      return window.localStorage.getItem(key);
    }
  },
  async setItem(key: string, value: string): Promise<void> {
    try {
      const db = await openAuthDb();
      await new Promise<void>((resolve, reject) => {
        const req = db.transaction(IDB_STORE, 'readwrite').objectStore(IDB_STORE).put(value, key);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
    } catch {
      window.localStorage.setItem(key, value);
    }
  },
  async removeItem(key: string): Promise<void> {
    try {
      const db = await openAuthDb();
      await new Promise<void>((resolve, reject) => {
        const req = db.transaction(IDB_STORE, 'readwrite').objectStore(IDB_STORE).delete(key);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
    } catch {
      window.localStorage.removeItem(key);
    }
  },
};

export function clearSupabaseAuthStorage() {
  if (typeof window === 'undefined') return;

  const projectRef = getSupabaseProjectRef();
  const candidates = new Set<string>();

  if (projectRef) {
    candidates.add(`sb-${projectRef}-auth-token`);
    candidates.add(`sb-${projectRef}-auth-token-code-verifier`);
  }

  for (let i = 0; i < window.localStorage.length; i += 1) {
    const key = window.localStorage.key(i);
    if (key && key.startsWith('sb-') && (key.endsWith('-auth-token') || key.endsWith('-auth-token-code-verifier'))) {
      candidates.add(key);
    }
  }

  for (let i = 0; i < window.sessionStorage.length; i += 1) {
    const key = window.sessionStorage.key(i);
    if (key && key.startsWith('sb-') && (key.endsWith('-auth-token') || key.endsWith('-auth-token-code-verifier'))) {
      candidates.add(key);
    }
  }

  candidates.forEach((key) => {
    window.localStorage.removeItem(key);
    window.sessionStorage.removeItem(key);
    idbStorage.removeItem(key).catch(() => {});
  });
}

const realClient = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: typeof indexedDB !== 'undefined' ? idbStorage : undefined,
  },
});

// --- Demo isolation guard ---------------------------------------------------
// The interactive demo (passcode-gated, see DemoContext) must NEVER read or
// write live client data. Individual hub pages opt into mock data via
// `if (isDemo) { ...DEMO... }`, but any page that forgets would leak real
// employee/payroll info to anyone with the shared passcode. This is the
// backstop: while the demo flag is set, every `.from()` query resolves to
// empty and every mutation / rpc / edge-function call is a no-op. Real users
// never have this flag, so production is unaffected.
export function isDemoMode(): boolean {
  try {
    return typeof window !== 'undefined' && window.localStorage.getItem('hub_demo') === '1';
  } catch {
    return false;
  }
}

// A chainable, thenable stub mirroring the PostgREST query builder. Every
// filter/modifier returns itself; awaiting it yields empty data.
function makeQueryStub(): any {
  const result = { data: [] as unknown[], error: null, count: 0, status: 200, statusText: 'OK' };
  const singleResult = { data: null, error: null, count: 0, status: 200, statusText: 'OK' };
  const stub: any = new Proxy(function () {} as any, {
    get(_t, prop) {
      if (prop === 'then') {
        // Awaiting the builder resolves to an empty list result.
        return (onFulfilled: (v: unknown) => unknown) => Promise.resolve(result).then(onFulfilled);
      }
      if (prop === 'single' || prop === 'maybeSingle') {
        return () => Promise.resolve(singleResult);
      }
      if (prop === 'csv') return () => Promise.resolve({ data: '', error: null });
      // Any other method (select/insert/update/eq/order/limit/...) chains.
      return () => stub;
    },
    apply() {
      return stub;
    },
  });
  return stub;
}

export const supabase: typeof realClient = new Proxy(realClient, {
  get(target, prop, receiver) {
    if (!isDemoMode()) return Reflect.get(target, prop, receiver);
    if (prop === 'from') return () => makeQueryStub();
    if (prop === 'rpc') return () => makeQueryStub();
    if (prop === 'functions') {
      return { invoke: async () => ({ data: null, error: null }) };
    }
    // auth, storage, realtime, channel, etc. pass through unchanged — the demo
    // has no Supabase session, so auth calls are harmless.
    return Reflect.get(target, prop, receiver);
  },
}) as typeof realClient;
