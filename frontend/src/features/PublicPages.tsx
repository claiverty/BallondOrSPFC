import { Link, useParams } from 'react-router-dom';
import { ArrowUpRight, ArrowRight, Medal } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { phaseLabels, Nominee } from '@awards/contracts';
import { useEdition, useCategories, useEditions, useWinners } from '../lib/queries';
import { demoMode, request } from '../lib/auth';
import { demoAllWinners, demoMembers } from '../lib/demo';
import { NomineeCard, PageHeading, State } from '../components/ui';

const winnerCardAssets: Record<string, string> = {
  '2025:mais-querido': '/images/Winners 2025/ClaiQuerido.png',
  '2025:staff-do-ano': '/images/Winners 2025/ClaiStaff.png',
  '2025:membro-do-ano': '/images/Winners 2025/TheusAno.png',
  '2025:membro-mais-ativo': '/images/Winners 2025/ThaisAtivo.png',
  '2025:rei-da-resenha': '/images/Winners 2025/SukitaResenha.png',
  '2025:o-mais-chato': '/images/Winners 2025/BambiChato.png',
  '2024:mais-querido': '/images/Winners 2024/clai.png',
  '2024:fabuloso': '/images/Winners 2024/Bambinox.png',
  '2024:terror-do-morumbi': '/images/Winners 2024/Pudim.png',
};
const demoHistoricalWinners = demoAllWinners;
export function Nominees({ categoriesOnly = false }: { categoriesOnly?: boolean }) {
  const { slug } = useParams();
  const e = useEdition(slug);
  const cats = useCategories(e.data);
  const votingFinished =
    !!e.data &&
    ['VOTING_CLOSED', 'RESULTS_READY', 'RESULTS_PUBLISHED', 'ARCHIVED'].includes(e.data.status);
  return (
    <State loading={e.isLoading || cats.isLoading} error={e.error ?? cats.error}>
      <div className="page public-page">
        <PageHeading
          eyebrow={`BALLON D’OR SPFC · ${e.data?.year ?? ''}`}
          title={
            categoriesOnly
              ? 'Cada categoria, uma história.'
              : 'Os nomes. As histórias. Os indicados.'
          }
          description={
            categoriesOnly
              ? 'Conheça os reconhecimentos da nossa comunidade.'
              : 'O melhor da comunidade está aqui. Agora, o próximo capítulo é com você.'
          }
        />
        {votingFinished && (
          <div className="stage-notice">
            <span className="eyebrow">A VOTAÇÃO FOI ENCERRADA</span>
            <p>Confira os vencedores no Hall da Fama.</p>
            <Link className="text-link" to="/hall-of-fame">
              Ir para o Hall da Fama <ArrowRight size={16} />
            </Link>
          </div>
        )}
        <div className="category-jump">
          {cats.data?.map((c) => (
            <a key={c.id} href={`#${c.slug}`}>
              {c.name}
              <ArrowUpRight size={14} />
            </a>
          ))}
        </div>
        {cats.data?.map((c, i) => (
          <section id={c.slug} className="nominee-section" key={c.id}>
            <div className="nominee-heading">
              <span className="outline-number">{String(i + 1).padStart(2, '0')}</span>
              <div>
                <span className="eyebrow">CATEGORIA OFICIAL</span>
                <h2>{c.name}</h2>
                <p>{c.description}</p>
              </div>
              {e.data?.status === 'VOTING_OPEN' && (
                <Link className="text-link" to={`/${slug}/vote`}>
                  Votar <ArrowUpRight size={18} />
                </Link>
              )}
            </div>
            {!categoriesOnly && (
              <div className="nominee-grid">
                {c.nominees.length ? (
                  c.nominees.map((n) => <NomineeCard key={n.id} nominee={n} />)
                ) : (
                  <p className="empty">Os indicados serão revelados após a revisão.</p>
                )}
              </div>
            )}
            {categoriesOnly && (
              <div className="category-rules">
                <span>Até {c.max_nominees} indicados oficiais</span>
                <span>{c.max_nominations} indicação(ões) por membro</span>
                <span>{c.vote_required ? 'Voto obrigatório' : 'Voto opcional'}</span>
                <span>
                  {c.allow_self_nomination ? 'Autoindicação permitida' : 'Sem autoindicação'}
                </span>
              </div>
            )}
          </section>
        ))}
      </div>
    </State>
  );
}
export function Winners({ hall = false }: { hall?: boolean }) {
  const { slug } = useParams();
  const winners = useWinners(hall ? undefined : slug);
  const editions = Array.from(
    (winners.data ?? []).reduce((groups, winner) => {
      const current = groups.get(winner.year) ?? [];
      current.push(winner);
      groups.set(winner.year, current);
      return groups;
    }, new Map<number, NonNullable<typeof winners.data>[number][]>()),
  ).sort(([a], [b]) => b - a);
  return (
    <State loading={winners.isLoading} error={winners.error}>
      <div className="page public-page">
        <PageHeading
          eyebrow={hall ? 'O RECONHECIMENTO É ETERNO' : `BALLON D’OR SPFC · ${slug}`}
          title={hall ? 'Hall da Fama.' : 'Eles fizeram história.'}
          description={
            hall
              ? 'Os nomes que deixaram sua marca, edição após edição.'
              : 'A comunidade escolheu. Este é o lugar de quem merece ser lembrado.'
          }
        />
        {!winners.data?.length ? (
          <div className="empty">
            <Medal size={36} aria-hidden="true" />
            <h2>O grande momento está chegando.</h2>
            <p>Os vencedores aparecem aqui quando os resultados forem publicados.</p>
            <Link className="text-link" to={slug ? `/${slug}/nominees` : '/history'}>
              Conhecer as histórias <ArrowRight size={16} />
            </Link>
          </div>
        ) : (
          <div className="winner-editions">
            {editions.map(([year, yearRows]) => (
              <section className="winner-edition" key={year}>
                <div className="winner-edition-heading">
                  <span className="eyebrow">BALLON D’OR SPFC</span>
                  <h2>Vencedores — {year}</h2>
                </div>
                <div className="winners-grid">
                  {yearRows.map((w) => {
                    const poster = winnerCardAssets[`${w.year}:${w.category_slug}`];
                    return (
                      <Link
                        key={`${w.edition_id}-${w.category_id}-${w.nominee_id}`}
                        className="winner-card"
                        aria-label={`${w.display_name}, @${w.username}, ${w.category_name}`}
                        to={`/members/${w.discord_user_id}`}
                      >
                        <div className="winner-poster-media">
                          <img
                            src={poster ?? w.avatar_url ?? '/images/user.png'}
                            alt=""
                            loading="lazy"
                          />
                        </div>
                        <div className="winner-content">
                          <span className="winner-category">{w.category_name}</span>
                          {!poster && <h2>{w.display_name}</h2>}
                          <p>@{w.username}</p>
                          <span className="text-link">
                            Conhecer trajetória <ArrowUpRight size={18} />
                          </span>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </State>
  );
}
export function History() {
  const editions = useEditions();
  const visibleEditions = editions.data
    ?.filter(
      (edition) => edition.is_current || ['RESULTS_PUBLISHED', 'ARCHIVED'].includes(edition.status),
    )
    .sort((a, b) => b.year - a.year);
  return (
    <State loading={editions.isLoading} error={editions.error}>
      <div className="page public-page">
        <PageHeading
          eyebrow="NOSSA MEMÓRIA, NOSSO LEGADO"
          title="Anos que ficam. Histórias que inspiram."
          description="Cada edição é um capítulo da nossa comunidade. Relembre todos eles."
        />
        <div className="history-list">
          {visibleEditions?.map((e) => (
            <Link to={`/${e.slug}`} key={e.id}>
              <span className="history-year">{e.year}</span>
              <div>
                <span className="eyebrow">{phaseLabels[e.status]}</span>
                <h2>{e.name}</h2>
                <p>{e.tagline}</p>
              </div>
              <ArrowUpRight size={28} />
            </Link>
          ))}
        </div>
      </div>
    </State>
  );
}
interface MemberProfile extends Nominee {
  history: Array<{ year: number; edition_slug: string; category_name: string; rank: number }>;
}
export function Member() {
  const { id } = useParams();
  const q = useQuery({
    queryKey: ['member', id],
    queryFn: async () => {
      if (!demoMode) return request<MemberProfile | null>(`/members/${id}`);
      const member = demoMembers.find((m) => m.discord_user_id === id);
      return member
        ? {
            ...member,
            history: demoHistoricalWinners
              .filter((w) => w.discord_user_id === id)
              .map((w) => ({
                year: w.year,
                edition_slug: w.edition_slug,
                category_name: w.category_name,
                rank: 1,
              })),
          }
        : null;
    },
  });
  return (
    <State loading={q.isLoading} error={q.error}>
      <div className="page public-page">
        {q.data ? (
          <>
            <div className="profile-heading">
              <img src={q.data.avatar_url ?? '/images/user.png'} alt="" />
              <PageHeading
                eyebrow="UMA TRAJETÓRIA NA COMUNIDADE"
                title={q.data.display_name}
                description={`@${q.data.username}`}
              />
            </div>
            <div className="profile-stats">
              <div>
                <strong>{q.data.history.filter((h) => h.rank === 1).length}</strong>vitórias
              </div>
              <div>
                <strong>{q.data.history.length}</strong>indicações oficiais
              </div>
            </div>
            <div className="history-list">
              {q.data.history.map((h, i) => (
                <Link key={i} to={`/${h.edition_slug}/winners`}>
                  <span className="history-year">{h.year}</span>
                  <div>
                    <span className="eyebrow">{h.rank === 1 ? 'VENCEDOR' : 'INDICADO'}</span>
                    <h2>{h.category_name}</h2>
                  </div>
                  <ArrowUpRight />
                </Link>
              ))}
            </div>
            {!q.data.history.length && (
              <p className="empty">A próxima história ainda está por ser escrita.</p>
            )}
          </>
        ) : (
          <PageHeading eyebrow="PERFIL" title="Membro não encontrado." />
        )}
      </div>
    </State>
  );
}
export function Records() {
  const q = useQuery({
    queryKey: ['records'],
    queryFn: () =>
      demoMode
        ? Promise.resolve(
            demoMembers
              .map((m) => ({
                ...m,
                wins: demoHistoricalWinners.filter((w) => w.discord_user_id === m.discord_user_id)
                  .length,
              }))
              .filter((m) => m.wins)
              .sort((a, b) => b.wins - a.wins),
          )
        : request<Array<Nominee & { wins: number }>>('/records'),
  });
  return (
    <State loading={q.isLoading} error={q.error}>
      <div className="page public-page">
        <PageHeading
          eyebrow="OS NÚMEROS DA NOSSA HISTÓRIA"
          title="Uma comunidade. Grandes marcas."
          description="Conquistas derivadas dos resultados publicados."
        />
        <div className="records-list">
          {q.data?.map((r, i) => (
            <Link to={`/members/${r.discord_user_id}`} key={r.discord_user_id}>
              <span>{String(i + 1).padStart(2, '0')}</span>
              <h2>{r.display_name}</h2>
              <strong>{r.wins} vitórias</strong>
              <ArrowUpRight />
            </Link>
          ))}
          {!q.data?.length && (
            <p className="empty">As marcas aparecem após a primeira publicação de resultados.</p>
          )}
        </div>
      </div>
    </State>
  );
}
export function Rules() {
  return (
    <div className="page public-page prose">
      <PageHeading eyebrow="PARTICIPAÇÃO E PRIVACIDADE" title="Sua voz merece respeito." />
      <h2>Uma participação por edição</h2>
      <p>
        Entre com Discord e faça parte do servidor da comunidade. Cada membro confirma uma única
        cédula por edição. Após a confirmação, os votos não podem ser alterados. As categorias
        obrigatórias devem ser preenchidas.
      </p>
      <h2>Indicação não é voto</h2>
      <p>
        Durante o período de indicações, você pode atualizar suas sugestões dentro do limite de cada
        categoria. A administração revisa elegibilidade e define os indicados oficiais. Sugestões
        manuais aguardam associação a um membro real.
      </p>
      <h2>Resultados protegidos</h2>
      <p>
        Votos individuais nunca são publicados. Estatísticas agregadas são privadas até a publicação
        dos resultados. A edição define se haverá números públicos. Empates são resolvidos pela
        administração com registro de motivo.
      </p>
      <h2>Dados pessoais</h2>
      <p>
        Armazenamos o ID do Discord, nome e avatar para identificar sua participação e os
        candidatos. Não armazenamos sua senha do Discord. Administradores podem consultar a
        participação e a apuração agregada. Para solicitar correção, exclusão ou informações sobre
        retenção, entre em contato com a staff do servidor. A política de retenção e o responsável
        pelo tratamento devem ser definidos pela organização antes do lançamento.
      </p>
    </div>
  );
}
