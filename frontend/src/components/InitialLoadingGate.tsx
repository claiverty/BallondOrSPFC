import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { useIsFetching } from '@tanstack/react-query';
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
  const fetching = useIsFetching();
  const auth = useAuth();
  const [fontsReady, setFontsReady] = useState(false);
  const [routeReady, setRouteReady] = useState(false);
  const [minimumTimeElapsed, setMinimumTimeElapsed] = useState(false);
  const [ready, setReady] = useState(false);
  const [contentVisible, setContentVisible] = useState(false);
  const markRouteReady = useCallback(() => setRouteReady(true), []);

  useEffect(() => {
    let active = true;
    const minimumTimer = window.setTimeout(() => setMinimumTimeElapsed(true), 650);

    if ('fonts' in document) {
      void document.fonts.ready.then(() => {
        if (active) setFontsReady(true);
      });
    } else {
      setFontsReady(true);
    }

    return () => {
      active = false;
      window.clearTimeout(minimumTimer);
    };
  }, []);

  useEffect(() => {
    if (!routeReady || !fontsReady || !minimumTimeElapsed || fetching > 0 || auth.loading) return;

    const stableTimer = window.setTimeout(() => setReady(true), 180);
    return () => window.clearTimeout(stableTimer);
  }, [auth.loading, fetching, fontsReady, minimumTimeElapsed, routeReady]);

  useEffect(() => {
    if (!ready) return;

    const revealTimer = window.setTimeout(() => setContentVisible(true), 300);
    return () => window.clearTimeout(revealTimer);
  }, [ready]);

  return (
    <InitialRouteReadyContext.Provider value={markRouteReady}>
      <div
        aria-hidden={!contentVisible}
        inert={!contentVisible}
        style={{ visibility: contentVisible ? 'visible' : 'hidden' }}
      >
        {children}
      </div>
      <LoadingScreen loading={!ready} label="Carregando o site…" />
    </InitialRouteReadyContext.Provider>
  );
}
