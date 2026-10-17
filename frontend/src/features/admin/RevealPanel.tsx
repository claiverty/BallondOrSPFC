import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  ListOrdered,
  Maximize2,
  Minimize2,
  Sparkles,
  Trophy,
} from 'lucide-react';
import type { Category, Edition, Nominee } from '@awards/contracts';
import { Notice } from '../../components/ui';
import type { AdminContext } from './types';

type RevealResult = NonNullable<AdminContext['results']['data']>[number];

function byPlacement(a: RevealResult, b: RevealResult) {
  return (
    a.rank - b.rank ||
    b.votes_count - a.votes_count ||
    a.display_name.localeCompare(b.display_name)
  );
}

function formatPercentage(value: number) {
  const percentage = Number(value).toLocaleString('pt-BR', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
  return `${percentage}%`;
}

function formatPlace(rank: number) {
  return `${rank}º lugar`;
}

function categoryResults(categoryId: string, rows: RevealResult[]) {
  return rows.filter((row) => row.category_id === categoryId).sort(byPlacement);
}

function revealOrder(rows: RevealResult[]) {
  const lowerPlaces = rows
    .filter((row) => row.rank > 2)
    .sort(
      (a, b) =>
        b.rank - a.rank ||
        a.votes_count - b.votes_count ||
        a.display_name.localeCompare(b.display_name),
    );
  const firstPlace = rows.filter((row) => row.rank === 1).sort(byPlacement);
  const secondPlace = rows.filter((row) => row.rank === 2).sort(byPlacement);
  return [...lowerPlaces, ...firstPlace, ...secondPlace];
}

function podiumSlot(rank: number) {
  if (rank === 2) return 0;
  if (rank === 1) return 1;
  return 2;
}

function initials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toLocaleUpperCase('pt-BR');
}

function Portrait({
  nominee,
  name,
  className = '',
}: {
  nominee?: Nominee;
  name: string;
  className?: string;
}) {
  const [imageFailed, setImageFailed] = useState(!nominee?.avatar_url);

  useEffect(() => {
    setImageFailed(!nominee?.avatar_url);
  }, [nominee?.avatar_url]);

  return (
    <span className={`reveal-portrait ${className}`} aria-hidden="true">
      {nominee?.avatar_url && !imageFailed ? (
        <img src={nominee.avatar_url} alt="" onError={() => setImageFailed(true)} />
      ) : (
        <span className="reveal-portrait-fallback">{initials(name)}</span>
      )}
    </span>
  );
}

function FullscreenButton({
  active,
  onClick,
}: {
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      className="reveal-icon-action"
      type="button"
      onClick={onClick}
      aria-label={active ? 'Sair da tela cheia' : 'Apresentar em tela cheia'}
      title={active ? 'Sair da tela cheia · Esc' : 'Apresentar em tela cheia'}
    >
      {active ? <Minimize2 size={17} aria-hidden="true" /> : <Maximize2 size={17} aria-hidden="true" />}
      <span>{active ? 'Sair da tela cheia' : 'Tela cheia'}</span>
    </button>
  );
}

export function RevealPanel({
  edition,
  categories,
  results,
}: {
  edition: Edition;
  categories: Category[];
  results: AdminContext['results'];
}) {
  const presentationRef = useRef<HTMLElement | null>(null);
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null);
  const [step, setStep] = useState(0);
  const [showCategoryIntro, setShowCategoryIntro] = useState(true);
  const [showFullRanking, setShowFullRanking] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [fallbackFullscreen, setFallbackFullscreen] = useState(false);
  const rows = results.data ?? [];
  const activeCategory = categories.find((category) => category.id === activeCategoryId);
  const activeRows = activeCategory ? categoryResults(activeCategory.id, rows) : [];
  const sequence = activeRows.length ? revealOrder(activeRows) : [];
  const podiumRows = activeRows.slice(0, 3).sort((a, b) => podiumSlot(a.rank) - podiumSlot(b.rank));
  const remainingRows = activeRows.slice(3);
  const current = sequence[step];
  const nomineesById = useMemo<Map<string, Nominee>>(
    () =>
      new Map(
        (activeCategory?.nominees ?? []).map(
          (nominee): [string, Nominee] => [nominee.id, nominee],
        ),
      ),
    [activeCategory],
  );
  const fullscreenActive = isFullscreen || fallbackFullscreen;
  const hasFirstPlaceTie = activeRows.filter((row) => row.rank === 1).length > 1;
  const unresolvedCategories = categories.filter(
    (category) => categoryResults(category.id, rows).filter((row) => row.rank === 1).length > 1,
  );

  useEffect(() => {
    const syncFullscreen = () => {
      setIsFullscreen(document.fullscreenElement === presentationRef.current);
    };
    document.addEventListener('fullscreenchange', syncFullscreen);
    return () => document.removeEventListener('fullscreenchange', syncFullscreen);
  }, []);

  useEffect(() => {
    if (!activeCategory) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && fallbackFullscreen) {
        setFallbackFullscreen(false);
        return;
      }
      if (event.key === 'ArrowRight') {
        event.preventDefault();
        if (showFullRanking) return;
        if (showCategoryIntro) {
          setShowCategoryIntro(false);
          return;
        }
        if (step < sequence.length - 1) setStep((value) => value + 1);
        else setShowFullRanking(true);
      }
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        if (showFullRanking) {
          setShowFullRanking(false);
          setStep(Math.max(0, sequence.length - 1));
        } else if (!showCategoryIntro && step > 0) {
          setStep((value) => value - 1);
        } else if (!showCategoryIntro) {
          setShowCategoryIntro(true);
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [activeCategory, fallbackFullscreen, sequence.length, showCategoryIntro, showFullRanking, step]);

  function enterFullscreen() {
    const element = presentationRef.current;
    if (!element?.requestFullscreen) {
      setFallbackFullscreen(true);
      return;
    }
    void element
      .requestFullscreen()
      .then(() => setFallbackFullscreen(false))
      .catch(() => setFallbackFullscreen(true));
  }

  function toggleFullscreen() {
    if (document.fullscreenElement) {
      void document.exitFullscreen();
      return;
    }
    if (fallbackFullscreen) {
      setFallbackFullscreen(false);
      return;
    }
    enterFullscreen();
  }

  function chooseCategory(categoryId: string) {
    setActiveCategoryId(categoryId);
    setStep(0);
    setShowCategoryIntro(true);
    setShowFullRanking(false);
    enterFullscreen();
  }

  function backToCategories() {
    if (document.fullscreenElement) void document.exitFullscreen();
    setFallbackFullscreen(false);
    setActiveCategoryId(null);
    setStep(0);
    setShowCategoryIntro(true);
    setShowFullRanking(false);
  }

  function advance() {
    if (showCategoryIntro) {
      setShowCategoryIntro(false);
      return;
    }
    if (step < sequence.length - 1) setStep((currentStep) => currentStep + 1);
    else setShowFullRanking(true);
  }

  const rankName = (row: RevealResult) => nomineesById.get(row.nominee_id);

  return (
    <section
      ref={presentationRef}
      className={`reveal-panel reveal-presentation${fullscreenActive ? ' is-fullscreen' : ''}`}
    >
      {results.isLoading ? (
        <div className="reveal-empty">Carregando a apuração…</div>
      ) : results.error ? (
        <div className="admin-panel">
          <Notice message={results.error.message} />
        </div>
      ) : !rows.length ? (
        <div className="admin-panel reveal-empty">
          <Sparkles size={24} aria-hidden="true" />
          <h2>A apuração ainda não está pronta</h2>
          <p>
            Depois de encerrar a votação e iniciar a revisão dos resultados, as categorias vão
            aparecer aqui para você conduzir a revelação.
          </p>
          <Link className="button" to={`/admin/results?edition=${edition.id}`}>
            Ir para resultados
            <ArrowRight size={16} aria-hidden="true" />
          </Link>
        </div>
      ) : !activeCategory ? (
        <>
          <div className="reveal-intro">
            <span className="eyebrow">EDIÇÃO {edition.year}</span>
            <h2>Escolha uma categoria</h2>
            <p>Apresente cada resultado no seu ritmo. As posições aparecem uma por vez.</p>
          </div>
          {unresolvedCategories.length > 0 && (
            <Notice
              message={`Resolva o desempate em primeiro lugar de ${unresolvedCategories
                .map((category) => category.name)
                .join(', ')} antes de iniciar a revelação.`}
            />
          )}
          <div className="reveal-category-grid">
            {categories.map((category, index) => {
              const categoryRows = categoryResults(category.id, rows);
              const hasTie = categoryRows.filter((row) => row.rank === 1).length > 1;
              const ready = categoryRows.length > 0 && !hasTie;
              return (
                <button
                  className="reveal-category-card"
                  type="button"
                  key={category.id}
                  disabled={!ready}
                  onClick={() => chooseCategory(category.id)}
                >
                  <span className="reveal-category-index">{String(index + 1).padStart(2, '0')}</span>
                  <span className="reveal-category-portraits" aria-hidden="true">
                    {category.nominees.slice(0, 3).map((nominee) => (
                      <Portrait key={nominee.id} nominee={nominee} name={nominee.display_name} />
                    ))}
                  </span>
                  <span className="reveal-category-copy">
                    <strong>{category.name}</strong>
                    <span className="reveal-category-meta">
                      {hasTie
                        ? 'Desempate pendente'
                        : ready
                          ? `${categoryRows.length} ${categoryRows.length === 1 ? 'colocado' : 'colocados'}`
                          : 'Aguardando apuração'}
                    </span>
                  </span>
                  {ready && <ArrowRight size={18} aria-hidden="true" />}
                </button>
              );
            })}
          </div>
        </>
      ) : hasFirstPlaceTie ? (
        <div className="admin-panel reveal-empty">
          <Sparkles size={24} aria-hidden="true" />
          <h2>Resolva o empate antes da revelação</h2>
          <p>Esta categoria ainda tem mais de uma pessoa empatada em primeiro lugar.</p>
          <Link className="button" to={`/admin/results?edition=${edition.id}`}>
            Abrir apuração
            <ArrowRight size={16} aria-hidden="true" />
          </Link>
          <button className="text-link" type="button" onClick={backToCategories}>
            Voltar às categorias
          </button>
        </div>
      ) : !sequence.length || !current ? (
        <div className="admin-panel reveal-empty">
          <h2>Não há resultados para esta categoria</h2>
          <button className="text-link" type="button" onClick={backToCategories}>
            Voltar às categorias
          </button>
        </div>
      ) : (
        <>
          <header className="reveal-presentation-bar">
            <button className="reveal-category-return" type="button" onClick={backToCategories}>
              <ArrowLeft size={16} aria-hidden="true" />
              <span>Categoria</span>
            </button>
            <span className="reveal-edition-mark">BALLON D’OR · {edition.year}</span>
            <FullscreenButton active={fullscreenActive} onClick={toggleFullscreen} />
          </header>

          {showCategoryIntro ? (
            <div className="reveal-cover-slide">
              <div className="reveal-cover-copy">
                <span className="eyebrow">CATEGORIA · {edition.year}</span>
                <h1>{activeCategory.name}</h1>
                <p>{activeCategory.description || 'Conheça os nomes que disputaram esta categoria.'}</p>
                <span className="reveal-cover-rule" />
                <span className="reveal-cover-caption">OS INDICADOS</span>
              </div>
              <div className="reveal-nominee-grid">
                {activeRows.map((row) => (
                  <div className="reveal-nominee-tile" key={row.nominee_id}>
                    <Portrait nominee={rankName(row)} name={row.display_name} />
                    <span>{row.display_name}</span>
                  </div>
                ))}
              </div>
              <div className="reveal-cover-actions">
                <span>Use as setas do teclado ou os controles para avançar</span>
                <button className="button reveal-next" type="button" onClick={advance}>
                  Começar revelação
                  <ArrowRight size={17} aria-hidden="true" />
                </button>
              </div>
            </div>
          ) : showFullRanking ? (
            <div className="reveal-ranking-slide">
              <div className="reveal-ranking-heading">
                <span className="eyebrow">RESULTADO FINAL · {edition.year}</span>
                <h1>{activeCategory.name}</h1>
                <p>O pódio da categoria e todas as demais colocações.</p>
              </div>
              <section className="reveal-podium-stage" aria-label={`Pódio: ${activeCategory.name}`}>
                {podiumRows.map((row) => (
                  <article
                    className={`reveal-podium-card place-${row.rank}`}
                    key={row.nominee_id}
                  >
                    <Portrait
                      nominee={rankName(row)}
                      name={row.display_name}
                      className="reveal-podium-photo"
                    />
                    <span className="reveal-podium-place">{formatPlace(row.rank)}</span>
                    <strong>{row.display_name}</strong>
                    <span className="reveal-podium-percentage">
                      {formatPercentage(row.percentage)}
                    </span>
                    <span className="reveal-podium-base" aria-hidden="true">
                      {row.rank}º
                    </span>
                  </article>
                ))}
              </section>
              {remainingRows.length > 0 && (
                <section className="reveal-remaining-ranks" aria-label="Demais colocações">
                  <h2>Demais colocações</h2>
                  <div className="reveal-full-list">
                    {remainingRows.map((row) => (
                      <div className="reveal-full-row" key={row.nominee_id}>
                        <span className="reveal-full-rank">
                          {String(row.rank).padStart(2, '0')}
                        </span>
                        <Portrait nominee={rankName(row)} name={row.display_name} />
                        <strong>{row.display_name}</strong>
                        <span className="reveal-full-place">{formatPlace(row.rank)}</span>
                        <span className="reveal-full-percentage">
                          {formatPercentage(row.percentage)}
                        </span>
                      </div>
                    ))}
                  </div>
                </section>
              )}
              <div className="reveal-ranking-actions">
                <span>Encerramento da categoria</span>
                <button className="button reveal-next" type="button" onClick={backToCategories}>
                  Escolher outra categoria
                  <ArrowRight size={17} aria-hidden="true" />
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="reveal-stage-heading">
                <div>
                  <span className="eyebrow">REVELAÇÃO · {activeCategory.name}</span>
                  <h2>{activeCategory.name}</h2>
                </div>
                <span className="reveal-step-count">
                  Resultado {step + 1} de {sequence.length}
                </span>
              </div>
              <div
                className="reveal-progress"
                role="progressbar"
                aria-label="Progresso da revelação"
                aria-valuemin={1}
                aria-valuemax={sequence.length}
                aria-valuenow={step + 1}
              >
                <span style={{ width: `${((step + 1) / sequence.length) * 100}%` }} />
              </div>
              <article className={`reveal-result-card${current.rank === 1 ? ' champion' : ''}`}>
                <div className="reveal-result-photo-frame">
                  <Portrait
                    nominee={rankName(current)}
                    name={current.display_name}
                    className="reveal-result-photo"
                  />
                  <span className="reveal-result-ordinal" aria-hidden="true">
                    {current.rank}
                  </span>
                  <span className="reveal-photo-label">NOMINADO · {edition.year}</span>
                </div>
                <div className="reveal-result-copy" aria-live="polite">
                  <span className="reveal-result-kicker">
                    {current.rank === 1 ? <Trophy size={18} aria-hidden="true" /> : <Sparkles size={17} aria-hidden="true" />}
                    {current.rank === 1 ? 'O grande vencedor' : 'Classificação final'}
                  </span>
                  <span className="reveal-result-place">{formatPlace(current.rank)}</span>
                  <h1>{current.display_name}</h1>
                  <span className="reveal-result-percentage">{formatPercentage(current.percentage)}</span>
                  <span className="reveal-result-caption">dos votos válidos</span>
                  <span className="reveal-result-category">{activeCategory.name}</span>
                </div>
              </article>
              <div className="reveal-controls">
                <button
                  className="button secondary reveal-previous"
                  type="button"
                  onClick={() => {
                    if (step === 0) setShowCategoryIntro(true);
                    else setStep((currentStep) => Math.max(0, currentStep - 1));
                  }}
                >
                  <ArrowLeft size={16} aria-hidden="true" />
                  Anterior
                </button>
                <button className="button reveal-next" type="button" onClick={advance}>
                  {step === sequence.length - 1 ? (
                    <>
                      <ListOrdered size={17} aria-hidden="true" />
                      Mostrar classificação completa
                    </>
                  ) : (
                    <>
                      Próximo resultado
                      <ArrowRight size={16} aria-hidden="true" />
                    </>
                  )}
                </button>
              </div>
            </>
          )}
          <footer className="reveal-presentation-footer">
            <span>BALLON D’OR SÃO PAULO</span>
            <span>{activeCategory.name}</span>
            <span>← → avançar · Esc sair da tela cheia</span>
          </footer>
        </>
      )}
    </section>
  );
}
