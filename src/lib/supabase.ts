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
  });
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
