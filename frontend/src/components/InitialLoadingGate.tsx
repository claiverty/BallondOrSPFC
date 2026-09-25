import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { LoadingScreen } from './LoadingScreen';
import { useAuth } from '../lib/auth';

const InitialRouteReadyContext = createContext<() => void>(() => {});

export function useMarkInitialRouteReady() {
  return useContext(InitialRouteReadyContext);
}

export function InitialRouteReady({ children }: { children: ReactNode }) {
  const markRouteReady = useMarkInitialRouteReady();

  useEffect(() => {
    markRouteReady();
  }, [markRouteReady]);

  return <>{children}</>;
}

export function InitialLoadingGate({ children }: { children: ReactNode }) {
  const auth = useAuth();
  const [stylesReady, setStylesReady] = useState(false);
  const [routeReady, setRouteReady] = useState(false);
  const [ready, setReady] = useState(false);
  const [contentVisible, setContentVisible] = useState(false);
  const markRouteReady = useCallback(() => setRouteReady(true), []);
  const revealContent = useCallback(() => setContentVisible(true), []);

  useEffect(() => {
    const stylesheet = document.querySelector<HTMLLinkElement>('link[data-app-stylesheet]');
    const markStylesReady = () => {
      if (stylesheet?.media === 'print') stylesheet.media = 'all';
      setStylesReady(true);
    };

    if (!stylesheet || (stylesheet.sheet && stylesheet.media !== 'print')) {
      setStylesReady(true);
    } else {
      stylesheet.addEventListener('load', markStylesReady, { once: true });
      stylesheet.addEventListener('error', markStylesReady, { once: true });
    }

    return () => {
      stylesheet?.removeEventListener('load', markStylesReady);
      stylesheet?.removeEventListener('error', markStylesReady);
    };
  }, []);

  useEffect(() => {
    if (ready || !routeReady || !stylesReady || auth.loading) return;
    setReady(true);
  }, [auth.loading, ready, routeReady, stylesReady]);

  return (
    <InitialRouteReadyContext.Provider value={markRouteReady}>
      <div
        aria-hidden={!contentVisible}
        inert={!contentVisible}
        style={{ visibility: contentVisible ? 'visible' : 'hidden' }}
      >
        {children}
      </div>
      <LoadingScreen loading={!ready} label="Carregando o site…" onDismiss={revealContent} />
    </InitialRouteReadyContext.Provider>
  );
}
