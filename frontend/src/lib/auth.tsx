import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { createClient, Session } from '@supabase/supabase-js';
import { useQuery } from '@tanstack/react-query';
import { Identity } from '@awards/contracts';
const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
export const supabase = url && key ? createClient(url, key) : null;
export const demoMode =
  import.meta.env.VITE_DEMO_MODE === 'true' || (!url && !key && import.meta.env.DEV);
export const apiBase = import.meta.env.VITE_API_URL ?? '/api';
export async function request<T>(path: string, method = 'GET', body?: unknown): Promise<T> {
  const session = (await supabase?.auth.getSession())?.data.session;
  const response = await fetch(`${apiBase}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(session ? { Authorization: `Bearer ${session.access_token}` } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await response
    .json()
    .catch(() => ({ message: 'A plataforma está indisponível. Tente novamente.' }));
  if (!response.ok) throw new Error(data.message ?? 'Não foi possível concluir esta operação.');
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
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }
    let active = true;
    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (active) setSession(nextSession);
    });
    const restoreSession = async () => {
      const callbackParams = new URLSearchParams(location.hash.slice(1));
      const accessToken = callbackParams.get('access_token');
      const refreshToken = callbackParams.get('refresh_token');
      const result =
        accessToken && refreshToken
          ? await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            })
          : await supabase.auth.getSession();

      if (!active) return;
      setSession(result.data.session);
      setLoading(false);

      if (accessToken && refreshToken) {
        window.history.replaceState({}, document.title, `${location.pathname}${location.search}`);
      }
    };
    void restoreSession();
    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, []);
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
    if (!supabase) throw new Error('O login ainda não foi configurado.');
    sessionStorage.setItem('auth:return', location.pathname);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'discord',
      options: { redirectTo: `${location.origin}/auth/callback` },
    });
    if (error) throw new Error('Não foi possível iniciar o login com Discord.');
  }
  async function logout() {
    await supabase?.auth.signOut();
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
