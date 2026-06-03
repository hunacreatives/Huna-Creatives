import { createContext, useContext, useEffect, useState, useRef, ReactNode } from 'react';
import { Session, User as SupabaseUser } from '@supabase/supabase-js';
import { clearSupabaseAuthStorage, supabase } from '@/lib/supabase';
import { HubUser } from '@/lib/types';

interface AuthContextValue {
  session: Session | null;
  authUser: SupabaseUser | null;
  user: HubUser | null;
  hubUser: HubUser | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null; hubUser: HubUser | null }>;
  signOut: () => Promise<void>;
  refreshHubUser: () => Promise<void>;
  devViewAs: 'owner' | 'admin' | 'contractor' | null;
  setDevViewAs: (role: 'owner' | 'admin' | 'contractor' | null) => void;
  effectiveRole: string | null;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [authUser, setAuthUser] = useState<SupabaseUser | null>(null);
  const [hubUser, setHubUser] = useState<HubUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [devViewAs, setDevViewAs] = useState<'owner' | 'admin' | 'contractor' | null>(null);
  const mountedRef = useRef(true);
  const profileRequestIdRef = useRef(0);

  const loadHubUser = async (userId: string): Promise<HubUser | null> => {
    try {
      const { data } = await supabase
        .from('hub_users')
        .select('*')
        .eq('id', userId)
        .maybeSingle();
      return data ?? null;
    } catch {
      return null;
    }
  };

  const resetAuthState = () => {
    clearSupabaseAuthStorage();
    setSession(null);
    setAuthUser(null);
    setHubUser(null);
  };

  const hydrateSession = async (nextSession: Session | null) => {
    if (!mountedRef.current) return;

    setSession(nextSession);
    const nextUser = nextSession?.user ?? null;
    setAuthUser(nextUser);

    if (!nextUser) {
      setHubUser(null);
      setLoading(false);
      return;
    }

    const requestId = ++profileRequestIdRef.current;
    const profile = await loadHubUser(nextUser.id);
    if (!mountedRef.current || requestId !== profileRequestIdRef.current) return;

    if (!profile) {
      resetAuthState();
      setLoading(false);
      await supabase.auth.signOut();
      return;
    }

    setHubUser(profile);
    setLoading(false);
  };

  const refreshHubUser = async () => {
    if (!authUser) return;
    const data = await loadHubUser(authUser.id);
    if (mountedRef.current) setHubUser(data);
  };

  useEffect(() => {
    mountedRef.current = true;

    const timeout = setTimeout(() => {
      if (mountedRef.current) setLoading(false);
    }, 4000);

    // Initial session load — single source of truth for first render
    supabase.auth.getSession().then(async ({ data: { session: s } }) => {
      await hydrateSession(s);
      clearTimeout(timeout);
    }).catch(() => {
      resetAuthState();
      clearTimeout(timeout);
      if (mountedRef.current) setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, s) => {
      if (!mountedRef.current) return;

      // Token refresh / user update — keep the profile already in memory
      if (event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
        setSession(s);
        setAuthUser(s?.user ?? null);
        return;
      }

      // Explicit sign-out
      if (event === 'SIGNED_OUT') {
        resetAuthState();
        if (mountedRef.current) setLoading(false);
        return;
      }

      // SIGNED_IN or INITIAL_SESSION
      await hydrateSession(s);
    });

    return () => {
      mountedRef.current = false;
      clearTimeout(timeout);
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      if (mountedRef.current) setLoading(false);
      return { error: error as Error | null, hubUser: null };
    }

    const signedInUser = data.user;
    if (!signedInUser) {
      if (mountedRef.current) setLoading(false);
      return { error: new Error('Sign-in succeeded but no user was returned.'), hubUser: null };
    }

    const profile = await loadHubUser(signedInUser.id);
    if (!profile) {
      resetAuthState();
      await supabase.auth.signOut();
      if (mountedRef.current) setLoading(false);
      return {
        error: new Error('Your account signed in, but no hub profile was found for this workspace.'),
        hubUser: null,
      };
    }

    if (mountedRef.current) {
      setSession(data.session);
      setAuthUser(signedInUser);
      setHubUser(profile);
      setLoading(false);
    }

    return { error: null, hubUser: profile };
  };

  const signOut = async () => {
    resetAuthState();
    await supabase.auth.signOut();
  };

  const effectiveRole = hubUser?.is_developer && devViewAs ? devViewAs : hubUser?.role ?? null;

  return (
    <AuthContext.Provider value={{ session, authUser, user: hubUser, hubUser, loading, signIn, signOut, refreshHubUser, devViewAs, setDevViewAs, effectiveRole }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
