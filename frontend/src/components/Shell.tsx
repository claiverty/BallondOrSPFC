import { lazy, Suspense, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { ArrowUpRight, Menu, X, LogOut } from 'lucide-react';
import { isOpen } from '@awards/contracts';
import { demoMode, useAuth } from '../lib/auth';
import { useEdition } from '../lib/queries';
import { RouteLoadingPlaceholder } from './ui';
const MemberDialog = lazy(() =>
  import('../features/MemberDialog').then((module) => ({ default: module.MemberDialog })),
);
function SpfcMark() {
  return <img className="spfc-mark" src="/images/spfc-gold-logo.webp" alt="" aria-hidden="true" />;
}
function DiscordMark() {
  return (
    <svg className="discord-mark" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M20.32 4.37A19.8 19.8 0 0 0 15.5 3c-.2.35-.44.82-.6 1.2a18.3 18.3 0 0 0-5.8 0A12.7 12.7 0 0 0 8.5 3a19.4 19.4 0 0 0-4.83 1.37C.62 8.9-.2 13.3.2 17.63A19.8 19.8 0 0 0 6.12 20.6c.48-.65.9-1.34 1.25-2.07a12.4 12.4 0 0 1-1.96-.95c.17-.13.34-.27.5-.4 3.78 1.76 7.87 1.76 11.6 0 .17.14.34.28.5.4-.62.37-1.28.69-1.97.96.36.72.78 1.41 1.25 2.06a19.8 19.8 0 0 0 5.92-2.97c.48-5.03-.82-9.39-2.89-13.26ZM8.68 14.99c-1.16 0-2.11-1.07-2.11-2.39s.93-2.39 2.11-2.39 2.13 1.08 2.11 2.39c0 1.32-.94 2.39-2.11 2.39Zm7.58 0c-1.16 0-2.1-1.07-2.1-2.39s.93-2.39 2.1-2.39c1.18 0 2.13 1.08 2.11 2.39 0 1.32-.93 2.39-2.11 2.39Z" />
    </svg>
  );
}
function LoginButton({ className, onClick }: { className?: string; onClick: () => void }) {
  return (
    <button className={`login-button ${className ?? ''}`} onClick={onClick}>
      <DiscordMark />
      <span>Entrar</span>
    </button>
  );
}
export function Shell() {
  const [menu, setMenu] = useState(false);
  const [error, setError] = useState('');
  const auth = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const selectedMember = new URLSearchParams(location.search).get('member');
  const closeMember = () => {
    const params = new URLSearchParams(location.search);
    params.delete('member');
    navigate(
      {
        pathname: location.pathname,
        search: params.size ? `?${params.toString()}` : '',
        hash: location.hash,
      },
      { replace: true },
    );
  };
  const firstSegment = location.pathname.split('/')[1];
  const reserved = ['history', 'hall-of-fame', 'records', 'rules', 'members', 'auth', 'admin'];
  const editionSlug = firstSegment && !reserved.includes(firstSegment) ? firstSegment : undefined;
  const editionQuery = useEdition(editionSlug);
  const edition = editionQuery.data;
  const year = edition?.slug ?? editionSlug;
  const nomineesPublished =
    edition && ['NOMINEES_ANNOUNCED', 'VOTING_CLOSED', 'RESULTS_READY'].includes(edition.status);
  const resultsPublished = edition && ['RESULTS_PUBLISHED', 'ARCHIVED'].includes(edition.status);
  const participationName = edition
    ? isOpen(edition, 'nominations')
      ? 'Indicação'
      : isOpen(edition, 'voting')
        ? 'Votação'
        : nomineesPublished
          ? 'Indicados'
          : resultsPublished
            ? 'Vencedores'
            : 'Categorias'
    : null;
  const participationPath =
    participationName === 'Vencedores'
      ? resultsPublished && year
        ? `/${year}/winners`
        : '/hall-of-fame'
      : participationName === 'Categorias'
        ? year
          ? `/${year}/categories`
          : '/history'
        : participationName === 'Votação'
          ? year
            ? `/${year}/vote`
            : '/history'
          : participationName === 'Indicação'
            ? year
              ? `/${year}/nominations`
              : '/history'
            : year
              ? `/${year}/nominees`
              : '/history';
  return (
    <>
      <a className="skip-link" href="#main">
        Pular para o conteúdo
      </a>
      {demoMode && (
        <div className="demo-strip">
          PREVIEW DA PLATAFORMA <span>Dados demonstrativos. Nenhum voto real é registrado.</span>
          <Link to="/admin">
            Explorar administração <ArrowUpRight size={13} aria-hidden="true" />
          </Link>
        </div>
      )}
      <header className="header">
        <div className="header-inner">
          <Link to="/" className="brand" aria-label="Ballon d’Or São Paulo — Início">
            <SpfcMark />
            <span>
              <strong>Ballon d’Or</strong>
              <small>SÃO PAULO</small>
            </span>
          </Link>
          <nav className={menu ? 'main-nav open' : 'main-nav'} aria-label="Navegação principal">
            <NavLink end to="/" onClick={() => setMenu(false)}>
              Início
            </NavLink>
            {participationName ? (
              <NavLink to={participationPath} onClick={() => setMenu(false)}>
                {participationName}
              </NavLink>
            ) : editionQuery.isSuccess && editionQuery.data === null ? (
              <span className="main-nav-state-unavailable" role="status">
                Sem edição ativa
              </span>
            ) : (
              <span
                className={
                  editionQuery.isError ? 'main-nav-state-unavailable' : 'main-nav-state-placeholder'
                }
                role="status"
                aria-busy={editionQuery.isPending}
              >
                {editionQuery.isError ? (
                  'Edição indisponível'
                ) : (
                  <>
                    <span className="main-nav-state-sr-only">Carregando status da edição</span>
                    <span className="main-nav-state-bar" aria-hidden="true" />
                  </>
                )}
              </span>
            )}
            <NavLink to="/history" onClick={() => setMenu(false)}>
              Histórico
            </NavLink>
            <NavLink to="/hall-of-fame" onClick={() => setMenu(false)}>
              Hall da Fama
            </NavLink>
            {!auth.session && (
              <LoginButton
                className="menu-login-button"
                onClick={() => {
                  setMenu(false);
                  auth.login().catch((e) => setError(e.message));
                }}
              />
            )}
            {auth.session && (
              <div className="menu-member-actions">
                <span>{auth.identity?.display_name ?? 'Membro'}</span>
                {auth.identity?.role !== 'user' && auth.identity && (
                  <Link className="text-link" to="/admin" onClick={() => setMenu(false)}>
                    Administração
                  </Link>
                )}
                <button onClick={() => auth.logout()}>
                  Sair <LogOut size={16} aria-hidden="true" />
                </button>
              </div>
            )}
          </nav>
          <div className="header-actions">
            {auth.session ? (
              <>
                <span className="user-name">{auth.identity?.display_name ?? 'Membro'}</span>
                {auth.identity?.role !== 'user' && auth.identity && (
                  <Link className="text-link header-admin-link" to="/admin">
                    Admin
                  </Link>
                )}
                <button
                  className="icon-button header-logout-button"
                  aria-label="Sair"
                  onClick={() => auth.logout()}
                >
                  <LogOut size={18} />
                </button>
              </>
            ) : (
              <LoginButton
                className="desktop-login-button"
                onClick={() => auth.login().catch((e) => setError(e.message))}
              />
            )}
            <button
              className="icon-button menu-button"
              aria-label={menu ? 'Fechar menu' : 'Abrir menu'}
              aria-expanded={menu}
              onClick={() => setMenu(!menu)}
            >
              {menu ? <X /> : <Menu />}
            </button>
          </div>
        </div>
      </header>
      {error && (
        <div className="global-notice" role="alert">
          {error}
          <button aria-label="Fechar aviso" className="icon-button" onClick={() => setError('')}>
            <X size={18} />
          </button>
        </div>
      )}
      <main id="main" key={location.pathname}>
        <Suspense fallback={<RouteLoadingPlaceholder label="Abrindo seção…" />}>
          <Outlet />
        </Suspense>
      </main>
      <footer className="footer">
        <div className="footer-top">
          <Link to="/" className="brand">
            <SpfcMark />
            <span>
              <strong>Ballon d’Or</strong>
              <small>SÃO PAULO</small>
            </span>
          </Link>
          <p>
            Um projeto da comunidade.
            <br />
            Para quem faz parte da nossa história.
          </p>
          <Link className="text-link" to="/hall-of-fame">
            Entre para a história <ArrowUpRight size={17} />
          </Link>
          <a
            className="text-link"
            href="https://discord.gg/saopaulo"
            target="_blank"
            rel="noopener noreferrer"
          >
            Entrar no Discord <ArrowUpRight size={17} aria-hidden="true" />
          </a>
        </div>
        <div className="footer-bottom">
          <span>© {new Date().getFullYear()} Ballon d’Or SPFC</span>
          <span>Feito por torcedores. Movido pela comunidade.</span>
          <Link to="/rules">Regras e privacidade</Link>
        </div>
      </footer>
      {selectedMember && (
        <Suspense fallback={null}>
          <MemberDialog key={selectedMember} id={selectedMember} onClose={closeMember} />
        </Suspense>
      )}
    </>
  );
}
