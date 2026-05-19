import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { Session, User as SupabaseUser } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { HubUser } from '@/lib/types';

interface AuthContextValue {
  session: Session | null;
  authUser: SupabaseUser | null;
  /** The hub profile row from hub_users (full_name, role, etc.) */
  user: HubUser | null;
  /** Alias for user — the hub profile */
  hubUser: HubUser | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshHubUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [authUser, setAuthUser] = useState<SupabaseUser | null>(null);
  const [hubUser, setHubUser] = useState<HubUser | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchHubUser = async (userId: string) => {
    try {
      const timeout = new Promise<null>((resolve) => setTimeout(() => resolve(null), 4000));
      const query = supabase.from('hub_users').select('*').eq('id', userId).maybeSingle().then(r => r.data);
      const data = await Promise.race([query, timeout]);
      setHubUser(data ?? null);
    } catch {
      setHubUser(null);
    }
  };

  const refreshHubUser = async () => {
    if (authUser) await fetchHubUser(authUser.id);
  };

  useEffect(() => {
    // Hard timeout — loading never hangs past 5 seconds even if fetchHubUser stalls
    const timeout = setTimeout(() => setLoading(false), 5000);

    supabase.auth.getSession().then(async ({ data: { session: s } }) => {
      setSession(s);
      setAuthUser(s?.user ?? null);
      if (s?.user) await fetchHubUser(s.user.id);
      clearTimeout(timeout);
      setLoading(false);
    }).catch(() => {
      clearTimeout(timeout);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, s) => {
      setSession(s);
      setAuthUser(s?.user ?? null);
      if (s?.user) {
        await fetchHubUser(s.user.id);
      } else {
        setHubUser(null);
      }
      setLoading(false);
    });

    return () => {
      clearTimeout(timeout);
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error as Error | null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ session, authUser, user: hubUser, hubUser, loading, signIn, signOut, refreshHubUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}