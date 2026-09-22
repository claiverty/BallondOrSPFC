import {
  SummaryPanel,
  TransitionPanel,
  EditionPanel,
  CategoriesPanel,
  NomineesPanel,
  NominationsPanel,
  ResultsPanel,
  AuditPanel,
  UsersPanel,
  MembersPanel,
  MediaWrapper,
} from './admin/panels';
import { useCallback, useEffect, useState } from 'react';
import { Link, Navigate, NavLink, useParams, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Activity,
  ArrowUpRight,
  CalendarDays,
  ClipboardList,
  ContactRound,
  ChevronDown,
  FileCheck2,
  Image,
  LayoutDashboard,
  ListOrdered,
  Menu,
  Plus,
  Settings,
  ShieldCheck,
  Trophy,
  Users,
  X,
} from 'lucide-react';
import { Analytics, Category, Edition, statuses } from '@awards/contracts';
import { demoMode, request, useAuth } from '../lib/auth';
import { demoCategories, demoEdition, demoArchive } from '../lib/demo';
import { EditionForm } from './AdminForms';
import { Notice, PageHeading, State } from '../components/ui';
const tabs = [
  ['overview', 'Visão geral', LayoutDashboard],
  ['edition', 'Edição', Settings],
  ['categories', 'Categorias', ListOrdered],
  ['nominations', 'Indicações', ClipboardList],
  ['nominees', 'Classificação', Users],
  ['voting', 'Votação', FileCheck2],
  ['results', 'Resultados', Trophy],
  ['ceremony', 'Cerimônia', CalendarDays],
  ['media', 'Mídia', Image],
  ['members', 'Perfis', ContactRound],
  ['users', 'Usuários', ShieldCheck],
  ['audit', 'Auditoria', Activity],
] as const;
interface Audit {
  id: string;
  action: string;
  reason: string;
  created_at: string;
  actor_id: string;
}
interface Result {
  category_id: string;
  nominee_id: string;
  category_name: string;
  display_name: string;
  votes_count: number;
  rank: number;
  percentage: number;
}
export function Admin() {
  const auth = useAuth();
  const { tab = 'overview' } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const client = useQueryClient();
  const [storedEdition, setStoredEdition] = useState(
    () => window.localStorage.getItem('admin-selected-edition') ?? '',
  );
  const selected = searchParams.get('edition') ?? storedEdition;
  const [creating, setCreating] = useState(false);
  const [duplicate, setDuplicate] = useState(false);
  const [editCat, setEditCat] = useState<Category | null | undefined>();
  const [reason, setReason] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [message, setMessage] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [editionMenuOpen, setEditionMenuOpen] = useState(false);
  const allowed = demoMode || (!!auth.identity && auth.identity.role !== 'user');
  const selectEdition = useCallback(
    (editionId: string) => {
      window.localStorage.setItem('admin-selected-edition', editionId);
      setStoredEdition(editionId);
      setSearchParams({ edition: editionId });
      setEditionMenuOpen(false);
    },
    [setSearchParams],
  );
  const editions = useQuery({
    queryKey: ['admin', 'editions'],
    queryFn: () =>
      demoMode
        ? Promise.resolve([demoEdition, demoArchive])
        : request<Edition[]>('/admin/editions'),
    enabled: allowed,
  });
  const edition = editions.data?.find((e) => e.id === selected) ?? editions.data?.[0];
  const id = edition?.id;
  useEffect(() => {
    if (!id || id === selected) return;
    selectEdition(id);
  }, [id, selected, selectEdition]);
  const categories = useQuery({
    queryKey: ['admin', 'categories', id],
    queryFn: () =>
      demoMode
        ? Promise.resolve(demoCategories)
        : request<Category[]>(`/admin/editions/${id}/categories`),
    enabled: allowed && !!id,
  });
  const analytics = useQuery({
    queryKey: ['admin', 'analytics', id],
    queryFn: () =>
      demoMode
        ? Promise.resolve({
            ballots: 0,
            eligible_count: null,
            participation: null,
            categories: [],
            timeline: [],
          } as Analytics)
        : request<Analytics>(`/admin/editions/${id}/analytics`),
    enabled: allowed && !!id && (tab === 'overview' || tab === 'voting'),
  });
  const results = useQuery({
    queryKey: ['admin', 'results', id],
    queryFn: () =>
      demoMode ? Promise.resolve([]) : request<Result[]>(`/admin/editions/${id}/results`),
    enabled: allowed && !!id && tab === 'results',
  });
  const logs = useQuery({
    queryKey: ['admin', 'audit', id],
    queryFn: () =>
      demoMode ? Promise.resolve([]) : request<Audit[]>(`/admin/editions/${id}/audit`),
    enabled: allowed && !!id && tab === 'audit',
  });
  const users = useQuery({
    queryKey: ['admin', 'users'],
    queryFn: () =>
      demoMode
        ? Promise.resolve([])
        : request<
            Array<{ id: string; display_name: string; discord_user_id: string; role: string }>
          >('/admin/users'),
    enabled: allowed && tab === 'users',
  });
  const members = useQuery({
    queryKey: ['admin', 'members'],
    queryFn: () =>
      demoMode
        ? Promise.resolve([])
        : request<import('./admin/types').HistoricalMember[]>('/admin/members'),
    enabled: allowed && tab === 'members',
  });
  const mutation = useMutation({
    mutationFn: ({
      path,
      method = 'POST',
      body,
    }: {
      path: string;
      method?: string;
      body?: unknown;
    }) => {
      if (demoMode)
        throw new Error(
          'Este dashboard é demonstrativo. Configure o backend para executar ações reais.',
        );
      return request<{ id?: string }>(path, method, body);
    },
    onSuccess: (data, variables) => {
      setMessage(
        variables.method === 'DELETE'
          ? 'Edição excluída.'
          : 'Alteração salva e registrada na auditoria.',
      );
      setCreating(false);
      setDuplicate(false);
      setEditCat(undefined);
      if (
        data.id &&
        (variables.path === '/admin/editions' || variables.path.endsWith('/duplicate'))
      )
        selectEdition(data.id);
      if (variables.method === 'DELETE') {
        const replacement = editions.data?.find((item) => item.id !== id);
        if (replacement) selectEdition(replacement.id);
        else {
          window.localStorage.removeItem('admin-selected-edition');
          setStoredEdition('');
          setSearchParams({});
        }
      }
      client.invalidateQueries({ queryKey: ['admin'] });
      client.invalidateQueries({ queryKey: ['editions'] });
      client.invalidateQueries({ queryKey: ['edition'] });
      client.invalidateQueries({ queryKey: ['categories'] });
    },
  });
  const action = (path: string, body?: unknown, method = 'POST') => {
    setMessage('');
    mutation.mutate({ path, body, method });
  };
  const deleteEdition = () => {
    if (!id || !edition) return;
    if (
      !window.confirm(
        `Excluir a edição ${edition.year} e todos os seus dados? Essa ação não pode ser desfeita.`,
      )
    )
      return;
    action(`/admin/editions/${id}`, undefined, 'DELETE');
  };
  if (auth.loading) return <State loading>{null}</State>;
  if (!allowed)
    return (
      <div className="page public-page">
        <PageHeading
          eyebrow="CONTROL CENTER"
          title="Acesso administrativo."
          description="Entre com uma conta autorizada para gerenciar a premiação."
        />
        {!auth.session && (
          <button
            className="button"
            onClick={() => auth.login().catch((e) => setMessage(e.message))}
          >
            Entrar com Discord
            <ArrowUpRight size={18} />
          </button>
        )}
        {message && <Notice message={message} />}
      </div>
    );
  if (tab === 'analytics') {
    const query = searchParams.toString();
    return <Navigate to={`/admin/overview${query ? `?${query}` : ''}`} replace />;
  }
  const next = edition ? statuses[statuses.indexOf(edition.status) + 1] : undefined;
  const category = categories.data?.find((c) => c.id === categoryId) ?? categories.data?.[0];
  return (
    <div className="admin-layout">
      <div className="admin-mobile-controls" aria-label="Controles da administração">
        <button
          className="icon-button admin-sidebar-toggle"
          aria-label="Abrir menu administrativo"
          aria-expanded={sidebarOpen}
          onClick={() => setSidebarOpen(true)}
        >
          <Menu size={22} aria-hidden="true" />
        </button>
        <span className="eyebrow">
          ADMINISTRAÇÃO / {tabs.find((t) => t[0] === tab)?.[1].toUpperCase() ?? 'VISÃO GERAL'}
        </span>
      </div>
      {sidebarOpen && (
        <button
          className="admin-sidebar-backdrop"
          aria-label="Fechar menu administrativo"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      <aside className={`admin-sidebar${sidebarOpen ? ' open' : ''}`}>
        <button
          className="icon-button admin-sidebar-close"
          aria-label="Fechar menu administrativo"
          onClick={() => setSidebarOpen(false)}
        >
          <X size={20} aria-hidden="true" />
        </button>
        <span className="eyebrow">BALLON D’OR SPFC</span>
        <h2>
          Control center
          <span />
        </h2>
        <label className="edition-picker-label">
          Edição ativa
          <div className="edition-picker">
            <button
              type="button"
              className="edition-picker-trigger"
              aria-haspopup="listbox"
              aria-expanded={editionMenuOpen}
              aria-label={`Edição ativa: ${edition ? `${edition.year} · ${edition.name}` : 'Selecionar edição'}`}
              onClick={() => setEditionMenuOpen((open) => !open)}
            >
              <span>{edition ? `${edition.year} · ${edition.name}` : 'Selecionar edição'}</span>
              <ChevronDown className={editionMenuOpen ? 'open' : ''} size={18} aria-hidden="true" />
            </button>
            {editionMenuOpen && (
              <div className="edition-picker-menu" role="listbox" aria-label="Edições disponíveis">
                {editions.data?.map((option) => (
                  <button
                    type="button"
                    role="option"
                    aria-selected={option.id === id}
                    className={option.id === id ? 'active' : ''}
                    key={option.id}
                    onClick={() => {
                      selectEdition(option.id);
                      setEditCat(undefined);
                      setCategoryId('');
                      setSidebarOpen(false);
                    }}
                  >
                    {option.year} · {option.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        </label>
        <nav aria-label="Administração">
          {tabs.map(([key, label, Icon]) => (
            <NavLink
              key={key}
              to={`/admin/${key}${id ? `?edition=${id}` : ''}`}
              onClick={() => {
                setEditionMenuOpen(false);
                setSidebarOpen(false);
              }}
            >
              <Icon size={18} aria-hidden="true" />
              {label}
            </NavLink>
          ))}
        </nav>
        <Link
          className="text-link"
          to="/"
          onClick={() => {
            setEditionMenuOpen(false);
            setSidebarOpen(false);
          }}
        >
          Ver site público
          <ArrowUpRight size={16} />
        </Link>
      </aside>
      <div className="admin-content">
        <div className="admin-topbar">
          <span className="eyebrow">
            ADMINISTRAÇÃO / {tabs.find((t) => t[0] === tab)?.[1].toUpperCase() ?? 'VISÃO GERAL'}
          </span>
          <button
            className="button"
            onClick={() => {
              setCreating(true);
              setDuplicate(false);
            }}
          >
            <Plus size={17} />
            Nova edição
          </button>
        </div>
        {demoMode && (
          <Notice message="Preview de administração. Os números reais aparecem após conectar o backend; ações não modificam dados." />
        )}
        {(message || mutation.error) && <Notice message={message || mutation.error!.message} />}
        <State
          loading={editions.isLoading || categories.isLoading}
          error={editions.error ?? categories.error}
        >
          {creating || duplicate ? (
            <section className="admin-panel">
              <div className="panel-heading">
                <h2>{duplicate ? 'Duplicar edição' : 'Criar nova edição'}</h2>
                <button
                  className="icon-button"
                  aria-label="Fechar formulário"
                  onClick={() => {
                    setCreating(false);
                    setDuplicate(false);
                  }}
                >
                  <X />
                </button>
              </div>
              <EditionForm
                key={duplicate ? 'duplicate' : 'new'}
                edition={
                  duplicate && edition
                    ? {
                        ...edition,
                        is_current: false,
                        is_public: false,
                        name: `Ballon d’Or SPFC ${edition.year + 1}`,
                        slug: String(edition.year + 1),
                        year: edition.year + 1,
                        nominations_open_at: null,
                        nominations_close_at: null,
                        voting_open_at: null,
                        voting_close_at: null,
                        ceremony_at: null,
                        publish_at: null,
                        nominees_reveal_at: null,
                      }
                    : undefined
                }
                busy={mutation.isPending}
                onSave={(v) =>
                  action(duplicate ? `/admin/editions/${id}/duplicate` : '/admin/editions', v)
                }
              />
            </section>
          ) : (
            <>
              <PageHeading
                eyebrow={edition ? `EDIÇÃO ${edition.year}` : 'PREPARANDO A PRÓXIMA EDIÇÃO'}
                title={
                  tab === 'overview'
                    ? 'O palco, sob seu controle.'
                    : (tabs.find((t) => t[0] === tab)?.[1] ?? 'Visão geral')
                }
                description={edition ? edition.name : 'Crie sua primeira edição para começar.'}
              />
              {!edition ? (
                <button className="button" onClick={() => setCreating(true)}>
                  Criar primeira edição
                  <Plus size={17} />
                </button>
              ) : (
                <>
                  {(tab === 'overview' || tab === 'voting') && (
                    <SummaryPanel edition={edition} categories={categories} analytics={analytics} />
                  )}
                  {(tab === 'overview' || tab === 'voting') && (
                    <TransitionPanel
                      id={id}
                      next={next}
                      mutation={mutation}
                      action={action}
                    />
                  )}
                  {(tab === 'edition' || tab === 'ceremony') && (
                    <EditionPanel
                      edition={edition}
                      id={id}
                      mutation={mutation}
                      action={action}
                      setDuplicate={setDuplicate}
                      deleteEdition={demoMode ? undefined : deleteEdition}
                    />
                  )}
                  {tab === 'categories' && (
                    <CategoriesPanel
                      id={id}
                      categories={categories}
                      mutation={mutation}
                      action={action}
                      editCat={editCat}
                      setEditCat={setEditCat}
                    />
                  )}
                  {tab === 'nominees' && (
                    <NomineesPanel
                      id={id}
                      categories={categories}
                      action={action}
                      mutation={mutation}
                      category={category}
                      setCategoryId={setCategoryId}
                    />
                  )}
                  {tab === 'nominations' && (
                    <NominationsPanel
                      categories={categories}
                      key={id}
                      id={id}
                      action={action}
                      mutation={mutation}
                    />
                  )}
                  {tab === 'results' && (
                    <ResultsPanel
                      id={id}
                      next={next}
                      reason={reason}
                      setReason={setReason}
                      mutation={mutation}
                      action={action}
                      results={results}
                    />
                  )}
                  {tab === 'audit' && <AuditPanel logs={logs} />}
                  {tab === 'users' && <UsersPanel action={action} users={users} auth={auth} />}
                  {tab === 'members' && (
                    <MembersPanel
                      action={action}
                      auth={auth}
                      edition={edition}
                      members={members}
                      setMessage={setMessage}
                    />
                  )}
                  {tab === 'media' && <MediaWrapper edition={edition} setMessage={setMessage} />}
                </>
              )}
            </>
          )}
        </State>
      </div>
    </div>
  );
}
