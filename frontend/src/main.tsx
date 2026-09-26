import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useParams } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Analytics } from '@vercel/analytics/react';
import { useEffect } from 'react';
import './styles/fonts.css';
import './styles.css';
import { AuthProvider, useAuth } from './lib/auth';
import { Shell } from './components/Shell';
import { InitialLoadingGate, InitialRouteReady } from './components/InitialLoadingGate';
import { Home } from './features/Home';
const loadPublicPages = () => import('./features/PublicPages');
const Nominees = React.lazy(() => loadPublicPages().then((m) => ({ default: m.Nominees })));
const Winners = React.lazy(() => loadPublicPages().then((m) => ({ default: m.Winners })));
const History = React.lazy(() => loadPublicPages().then((m) => ({ default: m.History })));
const Records = React.lazy(() => loadPublicPages().then((m) => ({ default: m.Records })));
const Rules = React.lazy(() => loadPublicPages().then((m) => ({ default: m.Rules })));
const EditionStage = React.lazy(() =>
  import('./features/EditionStage').then((m) => ({ default: m.EditionStage })),
);
const Voting = React.lazy(() => import('./features/Voting').then((m) => ({ default: m.Voting })));
const Admin = React.lazy(() => import('./features/Admin').then((m) => ({ default: m.Admin })));
const MembershipPreview = import.meta.env.DEV
  ? React.lazy(() => import('./features/MembershipPreview'))
  : null;
import { PageHeading } from './components/ui';
const client = new QueryClient({
  defaultOptions: { queries: { staleTime: 30000, retry: 1, refetchOnWindowFocus: false } },
});
function Callback() {
  const auth = useAuth();
  const navigate = useNavigate();
  useEffect(() => {
    if (auth.session) {
      const path = sessionStorage.getItem('auth:return');
      sessionStorage.removeItem('auth:return');
      navigate(
        path?.startsWith('/') && !path.startsWith('//') && path !== '/auth/callback' ? path : '/',
        { replace: true },
      );
    }
  }, [auth.session, navigate]);
  return (
    <div className="page public-page">
      <PageHeading
        eyebrow="DISCORD"
        title={
          auth.loading
            ? 'Conectando sua conta…'
            : auth.session
              ? 'Login concluído.'
              : 'Não foi possível concluir o login.'
        }
        description="Você será redirecionado após a autenticação."
      />
    </div>
  );
}
function LegacyMemberRedirect() {
  const { id } = useParams();
  return <Navigate to={`/hall-of-fame?member=${encodeURIComponent(id ?? '')}`} replace />;
}
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={client}>
      <BrowserRouter>
        <AuthProvider>
          <InitialLoadingGate>
            <Routes>
              <Route element={<Shell />}>
                {MembershipPreview && (
                  <Route
                    path="preview/membership"
                    element={
                      <InitialRouteReady>
                        <MembershipPreview />
                      </InitialRouteReady>
                    }
                  />
                )}
                <Route
                  index
                  element={
                    <InitialRouteReady>
                      <Home />
                    </InitialRouteReady>
                  }
                />
                <Route
                  path="history"
                  element={
                    <InitialRouteReady>
                      <History />
                    </InitialRouteReady>
                  }
                />
                <Route
                  path="hall-of-fame"
                  element={
                    <InitialRouteReady>
                      <Winners hall />
                    </InitialRouteReady>
                  }
                />
                <Route
                  path="records"
                  element={
                    <InitialRouteReady>
                      <Records />
                    </InitialRouteReady>
                  }
                />
                <Route
                  path="rules"
                  element={
                    <InitialRouteReady>
                      <Rules />
                    </InitialRouteReady>
                  }
                />
                <Route path="members/:id" element={<LegacyMemberRedirect />} />
                <Route
                  path="auth/callback"
                  element={
                    <InitialRouteReady>
                      <Callback />
                    </InitialRouteReady>
                  }
                />
                <Route path="admin" element={<Navigate to="/admin/overview" replace />} />
                <Route
                  path="admin/:tab"
                  element={
                    <InitialRouteReady>
                      <Admin />
                    </InitialRouteReady>
                  }
                />
                <Route
                  path=":slug"
                  element={
                    <InitialRouteReady>
                      <Home />
                    </InitialRouteReady>
                  }
                />
                <Route
                  path=":slug/categories"
                  element={
                    <InitialRouteReady>
                      <Nominees categoriesOnly />
                    </InitialRouteReady>
                  }
                />
                <Route
                  path=":slug/nominees"
                  element={
                    <InitialRouteReady>
                      <EditionStage />
                    </InitialRouteReady>
                  }
                />
                <Route
                  path=":slug/nominations"
                  element={
                    <InitialRouteReady>
                      <EditionStage />
                    </InitialRouteReady>
                  }
                />
                <Route
                  path=":slug/vote"
                  element={
                    <InitialRouteReady>
                      <Voting />
                    </InitialRouteReady>
                  }
                />
                <Route
                  path=":slug/winners"
                  element={
                    <InitialRouteReady>
                      <Winners />
                    </InitialRouteReady>
                  }
                />
                <Route
                  path="*"
                  element={
                    <InitialRouteReady>
                      <div className="page public-page">
                        <PageHeading eyebrow="404" title="Esta página não faz parte da história." />
                      </div>
                    </InitialRouteReady>
                  }
                />
              </Route>
            </Routes>
            <Analytics />
          </InitialLoadingGate>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>,
);
