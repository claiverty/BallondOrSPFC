import {
  SummaryPanel,
  TransitionPanel,
  EditionPanel,
  CategoriesPanel,
  NomineesPanel,
  NominationsPanel,
  ResultsPanel,
  AnalyticsPanel,
  AuditPanel,
  UsersPanel,
  MembersPanel,
  MediaWrapper,
} from './admin/panels';
import { useCallback, useEffect, useState } from 'react';
import { Link, NavLink, useParams, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Activity,
  ArrowUpRight,
  BarChart3,
  CalendarDays,
  ClipboardList,
  ContactRound,
  FileCheck2,
  Image,
  LayoutDashboard,
  ListOrdered,
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
  ['nominees', 'Indicados oficiais', Users],
  ['voting', 'Votação', FileCheck2],
  ['results', 'Resultados', Trophy],
  ['analytics', 'Estatísticas', BarChart3],
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
  const allowed = demoMode || (!!auth.identity && auth.identity.role !== 'user');
  const selectEdition = useCallback(
    (editionId: string) => {
      window.localStorage.setItem('admin-selected-edition', editionId);
      setStoredEdition(editionId);
      setSearchParams({ edition: editionId });
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
    enabled: allowed && !!id,
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
      setMessage('Alteração salva e registrada na auditoria.');
      setCreating(false);
      setDuplicate(false);
      setEditCat(undefined);
      if (
        data.id &&
        (variables.path === '/admin/editions' || variables.path.endsWith('/duplicate'))
      )
        selectEdition(data.id);
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
  const next = edition ? statuses[statuses.indexOf(edition.status) + 1] : undefined;
  const category = categories.data?.find((c) => c.id === categoryId) ?? categories.data?.[0];
  return (
    <div className="admin-layout">
      <aside className="admin-sidebar">
        <span className="eyebrow">BALLON D’OR SPFC</span>
        <h2>
          Control center
          <span />
        </h2>
        <label>
          Edição ativa
          <select
            value={id ?? ''}
            onChange={(e) => {
              selectEdition(e.target.value);
              setEditCat(undefined);
              setCategoryId('');
            }}
          >
            {editions.data?.map((e) => (
              <option key={e.id} value={e.id}>
                {e.year} · {e.name}
              </option>
            ))}
          </select>
        </label>
        <nav aria-label="Administração">
          {tabs.map(([key, label, Icon]) => (
            <NavLink key={key} to={`/admin/${key}${id ? `?edition=${id}` : ''}`}>
              <Icon size={18} aria-hidden="true" />
              {label}
            </NavLink>
          ))}
        </nav>
        <Link className="text-link" to="/">
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
                  {(tab === 'overview' || tab === 'analytics' || tab === 'voting') && (
                    <SummaryPanel edition={edition} categories={categories} analytics={analytics} />
                  )}
                  {(tab === 'overview' || tab === 'voting') && (
                    <TransitionPanel
                      id={id}
                      next={next}
                      reason={reason}
                      setReason={setReason}
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
                      reason={reason}
                      setReason={setReason}
                      action={action}
                      category={category}
                      setCategoryId={setCategoryId}
                      setMessage={setMessage}
                    />
                  )}
                  {tab === 'nominations' && (
                    <NominationsPanel
                      categories={categories}
                      key={id}
                      id={id}
                      reason={reason}
                      setReason={setReason}
                      action={action}
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
                  {tab === 'analytics' && <AnalyticsPanel analytics={analytics} />}
                  {tab === 'audit' && <AuditPanel logs={logs} />}
                  {tab === 'users' && <UsersPanel action={action} users={users} auth={auth} />}
                  {tab === 'members' && (
                    <MembersPanel
                      action={action}
                      auth={auth}
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
