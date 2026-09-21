import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { isOpen, Nomination, Nominee } from '@awards/contracts';
import { ArrowRight, Plus, X, Check } from 'lucide-react';
import { useEdition, useCategories } from '../lib/queries';
import { demoMode, request, useAuth } from '../lib/auth';
import { MemberSearch } from '../components/MemberSearch';
import { Notice, PageHeading, State } from '../components/ui';
const ManualSchema = z.object({
  name: z.string().trim().min(2, 'Informe pelo menos 2 caracteres').max(100),
});
export function Nominations() {
  const { slug } = useParams();
  const e = useEdition(slug);
  const cats = useCategories(e.data);
  const auth = useAuth();
  const client = useQueryClient();
  const [catId, setCatId] = useState('');
  const [manual, setManual] = useState(false);
  type Choice = { discord_user_id?: string; manual_name?: string; display_name: string };
  const [drafts, setDrafts] = useState<Record<string, Choice[]>>({});
  const [message, setMessage] = useState('');
  const form = useForm<z.infer<typeof ManualSchema>>({ resolver: zodResolver(ManualSchema) });
  const mine = useQuery({
    queryKey: ['nominations', e.data?.id, auth.identity?.id],
    queryFn: () => request<Nomination[]>(`/nominations/me?edition_id=${e.data!.id}`),
    enabled: !!auth.identity && !!e.data && !demoMode,
  });
  const cat = cats.data?.find((c) => c.id === catId) ?? cats.data?.[0];
  const draftKey = `${auth.identity?.id ?? 'preview'}:${e.data?.id}:${cat?.id}`;
  const chosen =
    drafts[draftKey] ??
    (mine.data ?? [])
      .filter((n) => n.category_id === cat?.id)
      .map((n) => ({
        discord_user_id: n.discord_user_id ?? undefined,
        manual_name: n.manual_name ?? undefined,
        display_name: n.display_name ?? n.manual_name ?? 'Membro',
      }));
  const submitted = !!cat && !!mine.data?.some((n) => n.category_id === cat.id);
  const setChosen = (choices: Choice[]) =>
    setDrafts((previous) => ({ ...previous, [draftKey]: choices }));
  const active = !!e.data && isOpen(e.data, 'nominations');
  const save = useMutation({
    mutationFn: () =>
      request('/nominations', 'POST', {
        edition_id: e.data!.id,
        category_id: cat!.id,
        items: chosen.map(({ discord_user_id, manual_name }) => ({ discord_user_id, manual_name })),
      }),
    onSuccess: () => {
      setMessage('Indicações enviadas. Você pode atualizá-las enquanto a fase estiver aberta.');
      client.invalidateQueries({ queryKey: ['nominations'] });
    },
  });
  function select(m: Omit<Nominee, 'id'>) {
    if (chosen.length >= (cat?.max_nominations ?? 0)) return;
    if (chosen.some((c) => c.discord_user_id === m.discord_user_id)) return;
    setChosen([...chosen, { discord_user_id: m.discord_user_id, display_name: m.display_name }]);
  }
  function change(id: string) {
    setCatId(id);
    setManual(false);
    setMessage('');
  }
  return (
    <State
      loading={e.isLoading || cats.isLoading || auth.loading || mine.isLoading}
      error={e.error ?? cats.error ?? mine.error}
    >
      <div className="page public-page nomination-page">
        <PageHeading
          eyebrow={`BALLON D’OR SPFC · ${e.data?.year ?? ''}`}
          title="Indicação"
          description="Indique quem marcou o ano. Sua sugestão ajuda a construir a lista de indicados oficiais."
        />
        {!demoMode && !auth.identity ? (
          <>
            <button
              className="button"
              onClick={() => auth.login().catch((err) => setMessage(err.message))}
            >
              Entrar com Discord
              <ArrowRight size={18} />
            </button>
            {message && <Notice message={message} />}
          </>
        ) : !active ? (
          <>
            <Notice message="As indicações não estão abertas. Suas indicações já enviadas permanecem abaixo para consulta." />
            {mine.data?.map((n) => (
              <div className="review-row" key={n.id}>
                <span>{cats.data?.find((c) => c.id === n.category_id)?.name}</span>
                <strong>{n.display_name ?? n.manual_name}</strong>
                <span>
                  {n.status === 'pending_review'
                    ? 'Em revisão'
                    : n.status === 'approved'
                      ? 'Aprovada'
                      : 'Rejeitada'}
                </span>
              </div>
            ))}
            <Link className="text-link" to={`/${slug}/categories`}>
              Conheça as categorias <ArrowRight size={16} />
            </Link>
          </>
        ) : (
          <div className="nomination-layout">
            <aside className="nomination-categories">
              {cats.data?.map((c) => (
                <button
                  className={cat?.id === c.id ? 'active' : ''}
                  key={c.id}
                  onClick={() => change(c.id)}
                >
                  {c.name}
                  {mine.data?.some((n) => n.category_id === c.id) && <Check size={16} />}
                </button>
              ))}
            </aside>
            {cat && (
              <section className="nomination-workspace">
                <span className="eyebrow">ATÉ {cat.max_nominations} INDICAÇÃO(ÕES)</span>
                <h2>{cat.name}</h2>
                <p>{cat.description}</p>
                <div className="chosen-members">
                  {chosen.map((m, i) => (
                    <div key={m.discord_user_id ?? m.manual_name}>
                      <span>
                        {m.display_name}
                        <small>
                          {m.manual_name
                            ? 'Indicação manual · revisão obrigatória'
                            : 'Membro do Discord'}
                        </small>
                      </span>
                      {!submitted && (
                        <button
                          className="icon-button"
                          aria-label={`Remover ${m.display_name}`}
                          onClick={() => setChosen(chosen.filter((_, n) => n !== i))}
                        >
                          <X size={18} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                {submitted ? (
                  <Notice message="Indicações enviadas. Esta categoria não pode ser editada." />
                ) : (
                  <>
                    {chosen.length < cat.max_nominations && <MemberSearch onSelect={select} />}
                    <div
                      className={`nomination-actions${chosen.length >= cat.max_nominations ? ' full' : ''}`}
                    >
                      {chosen.length < cat.max_nominations && (
                        <div className="nomination-manual-action">
                          <button className="text-link" onClick={() => setManual(!manual)}>
                            <Plus size={16} />
                            Não encontrou? Indicar manualmente
                          </button>
                          {manual && (
                            <form
                              className="manual-form"
                              onSubmit={form.handleSubmit((v) => {
                                if (chosen.length >= cat.max_nominations) return;
                                if (
                                  chosen.some(
                                    (c) => c.manual_name?.toLowerCase() === v.name.toLowerCase(),
                                  )
                                )
                                  return;
                                setChosen([
                                  ...chosen,
                                  { manual_name: v.name, display_name: v.name },
                                ]);
                                setManual(false);
                                form.reset();
                              })}
                            >
                              <label>
                                Nome para revisão
                                <input {...form.register('name')} />
                              </label>
                              {form.formState.errors.name && (
                                <p role="alert">{form.formState.errors.name.message}</p>
                              )}
                              <p>
                                Esta sugestão precisa ser associada a um membro real pela
                                administração.
                              </p>
                              <button className="button button-outline">
                                Adicionar sugestão
                                <Plus size={16} />
                              </button>
                            </form>
                          )}
                        </div>
                      )}
                      <button
                        className="button"
                        disabled={save.isPending || chosen.length === 0}
                        onClick={() =>
                          demoMode
                            ? setMessage('Este preview não envia indicações reais.')
                            : save.mutate()
                        }
                      >
                        {save.isPending ? 'Enviando…' : 'Enviar indicações'}
                        <Check size={18} />
                      </button>
                    </div>
                  </>
                )}
                {(message || save.error) && <Notice message={message || save.error!.message} />}
              </section>
            )}
          </div>
        )}
      </div>
    </State>
  );
}
