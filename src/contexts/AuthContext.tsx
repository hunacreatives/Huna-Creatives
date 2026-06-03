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

    // If profile lookup failed (transient error or no hub record), clear local state only.
    // Never call supabase.auth.signOut() here — a slow DB query would permanently log the user out.
    // HubRouteGate will redirect to /hub/login if hubUser is null.
    setHubUser(profile ?? null);
    setLoading(false);
  };

  const refreshHubUser = async () => {
    if (!authUser) return;
    const data = await loadHubUser(authUser.id);
    if (mountedRef.current) setHubUser(data);
  };

  useEffect(() => {
    mountedRef.current = true;

    // Fallback: if onAuthStateChange never fires, unblock the UI
    const timeout = setTimeout(() => {
      if (mountedRef.current) setLoading(false);
    }, 8000);

    // Single source of truth — onAuthStateChange fires INITIAL_SESSION on subscribe,
    // so we don't need a separate getSession() call (which would race with INITIAL_SESSION).
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, s) => {
      if (!mountedRef.current) return;

      if (event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
        setSession(s);
        setAuthUser(s?.user ?? null);
        return;
      }

      if (event === 'SIGNED_OUT') {
        resetAuthState();
        if (mountedRef.current) setLoading(false);
        clearTimeout(timeout);
        return;
      }

      // INITIAL_SESSION or SIGNED_IN
      await hydrateSession(s);
      clearTimeout(timeout);
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
