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
  const [fontsReady, setFontsReady] = useState(false);
  const [routeReady, setRouteReady] = useState(false);
  const [ready, setReady] = useState(false);
  const [contentVisible, setContentVisible] = useState(false);
  const markRouteReady = useCallback(() => setRouteReady(true), []);
  const revealContent = useCallback(() => setContentVisible(true), []);

  useEffect(() => {
    let active = true;
    const stylesheet = document.querySelector<HTMLLinkElement>('link[data-app-stylesheet]');
    const markFontsReady = () => {
      if ('fonts' in document) {
        void document.fonts.ready.then(() => {
          if (active) setFontsReady(true);
        });
      } else {
        setFontsReady(true);
      }
    };
    const markStylesReady = () => {
      if (stylesheet?.media === 'print') stylesheet.media = 'all';
      markFontsReady();
    };

    if (!stylesheet || (stylesheet.sheet && stylesheet.media !== 'print')) {
      markFontsReady();
    } else {
      stylesheet.addEventListener('load', markStylesReady, { once: true });
      stylesheet.addEventListener('error', markStylesReady, { once: true });
    }

    return () => {
      active = false;
      stylesheet?.removeEventListener('load', markStylesReady);
      stylesheet?.removeEventListener('error', markStylesReady);
    };
  }, []);

  useEffect(() => {
    if (ready || !routeReady || !fontsReady || auth.loading) return;
    setReady(true);
  }, [auth.loading, fontsReady, ready, routeReady]);

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
