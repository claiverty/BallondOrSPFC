import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useParams } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Analytics } from '@vercel/analytics/react';
import { useEffect } from 'react';
import '@fontsource/cormorant-garamond/latin-400.css';
import '@fontsource/cormorant-garamond/latin-500.css';
import '@fontsource/cormorant-garamond/latin-400-italic.css';
import '@fontsource/manrope/latin-400.css';
import '@fontsource/manrope/latin-500.css';
import '@fontsource/manrope/latin-600.css';
import '@fontsource/manrope/latin-700.css';
import './styles.css';
import { AuthProvider, useAuth } from './lib/auth';
import { Shell } from './components/Shell';
import { Home } from './features/Home';
import { Nominees, Winners, History, Records, Rules } from './features/PublicPages';
const EditionStage = React.lazy(() =>
  import('./features/EditionStage').then((m) => ({ default: m.EditionStage })),
);
const Voting = React.lazy(() => import('./features/Voting').then((m) => ({ default: m.Voting })));
const Admin = React.lazy(() => import('./features/Admin').then((m) => ({ default: m.Admin })));
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
          <React.Suspense
            fallback={
              <div className="page state" role="status">
                Preparando o palco…
              </div>
            }
          >
            <Routes>
              <Route element={<Shell />}>
                <Route index element={<Home />} />
                <Route path="history" element={<History />} />
                <Route path="hall-of-fame" element={<Winners hall />} />
                <Route path="records" element={<Records />} />
                <Route path="rules" element={<Rules />} />
                <Route path="members/:id" element={<LegacyMemberRedirect />} />
                <Route path="auth/callback" element={<Callback />} />
                <Route path="admin" element={<Navigate to="/admin/overview" replace />} />
                <Route path="admin/:tab" element={<Admin />} />
                <Route path=":slug" element={<Home />} />
                <Route path=":slug/categories" element={<Nominees categoriesOnly />} />
                <Route path=":slug/nominees" element={<EditionStage />} />
                <Route path=":slug/nominations" element={<EditionStage />} />
                <Route path=":slug/vote" element={<Voting />} />
                <Route path=":slug/winners" element={<Winners />} />
                <Route
                  path="*"
                  element={
                    <div className="page public-page">
                      <PageHeading eyebrow="404" title="Esta página não faz parte da história." />
                    </div>
                  }
                />
              </Route>
            </Routes>
          </React.Suspense>
          <Analytics />
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>,
);
