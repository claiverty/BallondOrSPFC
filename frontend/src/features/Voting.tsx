import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  LockKeyhole,
  Pencil,
  ShieldCheck,
} from 'lucide-react';
import { Edition, Category, isOpen } from '@awards/contracts';
import { useEdition, useCategories } from '../lib/queries';
import { demoMode, request, useAuth } from '../lib/auth';
import { Notice, NomineeCard, PageHeading, State } from '../components/ui';
import { readDraft, saveDraft } from '../lib/draft';
export function Voting() {
  const { slug } = useParams();
  const e = useEdition(slug);
  const cats = useCategories(e.data);
  const auth = useAuth();
  return (
    <State loading={e.isLoading || cats.isLoading || auth.loading} error={e.error ?? cats.error}>
      {e.data && cats.data && (
        <VotingFlow
          key={`${e.data.id}:${auth.identity?.id ?? 'preview'}`}
          edition={e.data}
          categories={cats.data}
        />
      )}
    </State>
  );
}
function VotingFlow({ edition, categories }: { edition: Edition; categories: Category[] }) {
  const auth = useAuth();
  const client = useQueryClient();
  const storageKey = `ballot-draft:${edition.id}:${auth.identity?.id ?? 'preview'}`;
  const [initial] = useState(() => readDraft(storageKey));
  const [choices, setChoices] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      Object.entries(initial.choices).filter(([category, id]) =>
        categories.some((c) => c.id === category && c.nominees.some((n) => n.id === id)),
      ),
    ),
  );
  const [step, setStep] = useState(0);
  const [idempotency, setIdempotency] = useState(initial.idempotency_key);
  const [message, setMessage] = useState('');
  const [complete, setComplete] = useState(false);
  const me = useQuery({
    queryKey: ['ballot', edition.id, auth.identity?.id],
    queryFn: () =>
      request<{ id: string; submitted_at: string } | null>(`/ballots/me?edition_id=${edition.id}`),
    enabled: !!auth.identity && !demoMode,
  });
  const submit = useMutation({
    mutationFn: () =>
      request('/ballots', 'POST', {
        edition_id: edition.id,
        idempotency_key: idempotency,
        items: categories.flatMap((c) =>
          choices[c.id] ? [{ category_id: c.id, nominee_id: choices[c.id] }] : [],
        ),
      }),
    onSuccess: () => {
      setComplete(true);
      try {
        localStorage.removeItem(storageKey);
      } catch {
        /* Unavailable storage does not affect the confirmed ballot. */
      }
      client.invalidateQueries({ queryKey: ['ballot', edition.id] });
    },
  });
  function select(cat: string, id?: string) {
    const next = { ...choices };
    if (id) next[cat] = id;
    else delete next[cat];
    const key = crypto.randomUUID();
    setChoices(next);
    setIdempotency(key);
    saveDraft(storageKey, { choices: next, idempotency_key: key });
    setMessage('');
  }
  if (me.isLoading && !demoMode) return <State loading>{null}</State>;
  if (me.error && !demoMode) return <State error={me.error}>{null}</State>;
  if (complete || me.data)
    return (
      <div className="page public-page vote-success">
        <CheckCircle2 size={52} aria-hidden="true" />
        <PageHeading
          eyebrow="SUA VOZ FAZ PARTE DA HISTÓRIA"
          title="Votação confirmada."
          description="Obrigado por reconhecer quem fez a diferença. Sua cédula foi registrada e não pode ser enviada novamente."
        />
        <Link className="button button-outline" to={`/${edition.slug}`}>
          Voltar à edição
          <ArrowRight size={18} />
        </Link>
      </div>
    );
  if (!demoMode && !auth.identity)
    return (
      <div className="page public-page vote-success">
        <LockKeyhole size={42} aria-hidden="true" />
        <PageHeading
          eyebrow={`EDIÇÃO ${edition.year}`}
          title="Sua comunidade. Sua escolha."
          description="Entre com Discord para votar. É necessário fazer parte do servidor."
        />
        <button className="button" onClick={() => auth.login().catch((e) => setMessage(e.message))}>
          Entrar com Discord
          <ArrowRight size={18} />
        </button>
        {message && <Notice message={message} />}
      </div>
    );
  if (!isOpen(edition, 'voting'))
    return (
      <div className="page public-page">
        <PageHeading
          eyebrow={`EDIÇÃO ${edition.year}`}
          title="A votação não está aberta."
          description="Acompanhe a edição para conhecer as próximas etapas."
        />
        <Link className="button" to={`/${edition.slug}`}>
          Voltar à edição
          <ArrowRight size={18} />
        </Link>
      </div>
    );
  if (!categories.length)
    return (
      <div className="page public-page">
        <PageHeading eyebrow="VOTAÇÃO" title="As categorias estão em preparação." />
      </div>
    );
  const cat = categories[step];
  const reviewing = step === categories.length;
  const selected = categories.filter((c) => choices[c.id]).length;
  const missing = categories.filter((c) => c.vote_required && !choices[c.id]);
  function next() {
    if (cat.vote_required && !choices[cat.id]) {
      setMessage('Selecione um indicado para continuar nesta categoria obrigatória.');
      return;
    }
    setMessage('');
    setStep(step + 1);
    window.scrollTo({ top: 0, behavior: 'instant' });
  }
  return (
    <div className="page voting-page">
      <div className="vote-topline">
        <Link className="text-link" to={`/${edition.slug}`}>
          <ArrowLeft size={16} />
          Voltar à edição
        </Link>
        <span>BALLON D’OR SPFC · {edition.year}</span>
        <span>
          <ShieldCheck size={16} /> UMA CÉDULA POR MEMBRO
        </span>
      </div>
      <div className="voting-progress">
        <div>
          <span>
            {reviewing
              ? 'REVISÃO DA CÉDULA'
              : `CATEGORIA ${String(step + 1).padStart(2, '0')} DE ${String(categories.length).padStart(2, '0')}`}
          </span>
          <span>
            {selected} de {categories.length} escolhas
          </span>
        </div>
        <progress value={selected} max={categories.length} aria-label="Categorias escolhidas" />
        <div className="step-buttons">
          {categories.map((c, i) => (
            <button
              key={c.id}
              title={c.name}
              aria-label={`Ir para ${c.name}`}
              aria-current={i === step ? 'step' : undefined}
              className={i === step ? 'active' : choices[c.id] ? 'done' : ''}
              onClick={() => {
                setStep(i);
                setMessage('');
              }}
            >
              {choices[c.id] ? <Check size={14} /> : String(i + 1).padStart(2, '0')}
            </button>
          ))}
        </div>
      </div>
      {reviewing ? (
        <>
          <PageHeading
            eyebrow="ANTES DO GRANDE MOMENTO"
            title="Revise suas escolhas."
            description="Confira sua cédula. Após confirmar, você não poderá alterar os votos."
          />
          <div className="vote-review">
            {categories.map((c, i) => {
              const n = c.nominees.find((n) => n.id === choices[c.id]);
              return (
                <div key={c.id}>
                  <span>{String(i + 1).padStart(2, '0')}</span>
                  <div>
                    <small>{c.name}</small>
                    <strong>{n?.display_name ?? 'Categoria pulada'}</strong>
                  </div>
                  <button className="text-link" onClick={() => setStep(i)}>
                    <Pencil size={16} />
                    Alterar
                  </button>
                </div>
              );
            })}
          </div>
          {missing.length > 0 && (
            <Notice
              message={`Faltam escolhas obrigatórias: ${missing.map((c) => c.name).join(', ')}.`}
            />
          )}
          <div className="vote-navigation">
            <button className="button button-outline" onClick={() => setStep(0)}>
              <ArrowLeft size={18} />
              Alterar votos
            </button>
            <button
              className="button"
              disabled={submit.isPending || !!missing.length}
              onClick={() =>
                demoMode
                  ? setMessage(
                      'Preview concluído. Nenhum voto foi registrado. A submissão real exige autenticação e conexão com o backend.',
                    )
                  : submit.mutate()
              }
            >
              {submit.isPending
                ? 'Confirmando…'
                : demoMode
                  ? 'Concluir preview'
                  : 'Confirmar votação'}
              <Check size={18} />
            </button>
          </div>
        </>
      ) : (
        <>
          <div className="vote-category-heading">
            <span className="eyebrow">
              {cat.vote_required ? 'SEU VOTO É OBRIGATÓRIO NESTA CATEGORIA' : 'CATEGORIA OPCIONAL'}
            </span>
            <h1>{cat.name}</h1>
            <p>{cat.description}</p>
          </div>
          <div className="nominee-grid voting-grid">
            {cat.nominees.map((n) => (
              <NomineeCard
                key={n.id}
                nominee={n}
                selected={choices[cat.id] === n.id}
                onSelect={() => select(cat.id, n.id)}
              />
            ))}
          </div>
          <div className="vote-navigation">
            <button
              className="button button-outline"
              disabled={step === 0}
              onClick={() => {
                setStep(step - 1);
                setMessage('');
              }}
            >
              <ArrowLeft size={18} />
              Anterior
            </button>
            {!cat.vote_required && (
              <button
                className="text-link"
                onClick={() => {
                  select(cat.id);
                  setStep(step + 1);
                }}
              >
                Pular categoria
              </button>
            )}
            <button className="button" onClick={next}>
              {step === categories.length - 1 ? 'Revisar votos' : 'Próxima categoria'}
              <ArrowRight size={18} />
            </button>
          </div>
        </>
      )}
      {(message || submit.error || me.error) && (
        <Notice message={message || submit.error?.message || me.error?.message || ''} />
      )}
      <p className="vote-footnote">
        <LockKeyhole size={14} />
        Suas escolhas ficam em rascunho até a confirmação final.
        {demoMode ? ' Este fluxo é apenas demonstrativo.' : ''}
      </p>
    </div>
  );
}
