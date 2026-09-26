import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import type { Session, SupabaseClient } from '@supabase/supabase-js';
import { useQuery } from '@tanstack/react-query';
import { useLocation } from 'react-router-dom';
import type { Identity } from '@awards/contracts';
const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
let supabasePromise: Promise<SupabaseClient | null> | null = null;
let currentSession: Session | null = null;
function getSupabase() {
  if (!url || !key) return Promise.resolve(null);
  supabasePromise ??= import('@supabase/supabase-js').then(({ createClient }) =>
    createClient(url, key),
  );
  return supabasePromise;
}
function hasStoredSession() {
  if (!url || typeof window === 'undefined') return false;
  try {
    const projectRef = new URL(url).hostname.split('.')[0];
    return window.localStorage.getItem(`sb-${projectRef}-auth-token`) !== null;
  } catch {
    return false;
  }
}
export const demoMode =
  import.meta.env.VITE_DEMO_MODE === 'true' || (!url && !key && import.meta.env.DEV);
export const apiBase = import.meta.env.VITE_API_URL ?? '/api';
export class ApiRequestError extends Error {
  constructor(
    message: string,
    readonly memberDiscordUserId?: string,
  ) {
    super(message);
    this.name = 'ApiRequestError';
  }
}
export async function request<T>(path: string, method = 'GET', body?: unknown): Promise<T> {
  const session = currentSession;
  const response = await fetch(`${apiBase}${path}`, {
    method,
    headers: {
      ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
      ...(session ? { Authorization: `Bearer ${session.access_token}` } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await response
    .json()
    .catch(() => ({ message: 'A plataforma está indisponível. Tente novamente.' }));
  if (!response.ok)
    throw new ApiRequestError(
      data.message ?? 'Não foi possível concluir esta operação.',
      typeof data.member_discord_user_id === 'string' ? data.member_discord_user_id : undefined,
    );
  return data as T;
}
const AuthContext = createContext<{
  session: Session | null;
  identity: Identity | null;
  loading: boolean;
  login: () => Promise<void>;
  logout: () => Promise<void>;
}>({ session: null, identity: null, loading: true, login: async () => {}, logout: async () => {} });
export function AuthProvider({ children }: { children: ReactNode }) {
  const location = useLocation();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [clientReady, setClientReady] = useState(false);
  useEffect(() => {
    if (clientReady) return;
    const needsAuth =
      location.pathname.startsWith('/admin') ||
      location.pathname === '/auth/callback' ||
      hasStoredSession();
    if (!url || !key || !needsAuth) {
      setLoading(false);
      return;
    }
    let active = true;
    let unsubscribe = () => {};
    setLoading(true);
    const restoreSession = async () => {
      try {
        const client = await getSupabase();
        if (!client || !active) return;
        const { data } = client.auth.onAuthStateChange((_event, nextSession) => {
          currentSession = nextSession;
          if (active) setSession(nextSession);
        });
        unsubscribe = () => data.subscription.unsubscribe();
        const callbackParams = new URLSearchParams(window.location.hash.slice(1));
        const accessToken = callbackParams.get('access_token');
        const refreshToken = callbackParams.get('refresh_token');
        const result =
          accessToken && refreshToken
            ? await client.auth.setSession({
                access_token: accessToken,
                refresh_token: refreshToken,
              })
            : await client.auth.getSession();

        if (!active) return;
        currentSession = result.data.session;
        setSession(result.data.session);

        if (accessToken && refreshToken) {
          window.history.replaceState(
            {},
            document.title,
            `${window.location.pathname}${window.location.search}`,
          );
        }
      } catch {
        currentSession = null;
        if (active) setSession(null);
      } finally {
        if (active) {
          setClientReady(true);
          setLoading(false);
        }
      }
    };
    void restoreSession();
    return () => {
      active = false;
      unsubscribe();
    };
  }, [clientReady, location.pathname]);
  const identity = useQuery({
    queryKey: ['identity', session?.user.id],
    queryFn: () => request<Identity>('/me'),
    enabled: !!session && !demoMode,
    retry: 1,
  });
  async function login() {
    if (demoMode)
      throw new Error(
        'Este é um preview. Configure Supabase e Discord para entrar na plataforma real.',
      );
    const client = await getSupabase();
    if (!client) throw new Error('O login ainda não foi configurado.');
    sessionStorage.setItem('auth:return', window.location.pathname);
    const { error } = await client.auth.signInWithOAuth({
      provider: 'discord',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) throw new Error('Não foi possível iniciar o login com Discord.');
  }
  async function logout() {
    const client = await getSupabase();
    await client?.auth.signOut();
    currentSession = null;
    setSession(null);
  }
  return (
    <AuthContext.Provider
      value={{
        session,
        identity: identity.data ?? null,
        loading: loading || identity.isLoading,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
export const useAuth = () => useContext(AuthContext);
