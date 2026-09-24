import { Link, useParams } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { isOpen } from '@awards/contracts';
import { HeroTrophy } from '../components/HeroTrophy';
import { useEdition } from '../lib/queries';

export function Home() {
  const { slug: routeSlug } = useParams();
  const edition = useEdition(routeSlug);
  const currentEdition = edition.data ?? undefined;
  const slug = currentEdition?.slug ?? routeSlug;
  const nominationsOpen = currentEdition && isOpen(currentEdition, 'nominations');
  const votingOpen = currentEdition && isOpen(currentEdition, 'voting');
  const showWinners =
    currentEdition &&
    (['DRAFT', 'NOMINATIONS_REVIEW'].includes(currentEdition.status) ||
      ['RESULTS_PUBLISHED', 'ARCHIVED'].includes(currentEdition.status));
  const ctaLabel = showWinners && currentEdition
    ? `Ver vencedores ${currentEdition.year}`
    : nominationsOpen
      ? 'Indicar candidatos'
      : votingOpen
        ? 'Votar agora'
        : 'Conhecer indicados';
  const ctaPath = showWinners
    ? slug && currentEdition && ['RESULTS_PUBLISHED', 'ARCHIVED'].includes(currentEdition.status)
      ? `/${slug}/winners`
      : '/hall-of-fame'
    : slug
      ? `/${slug}/${votingOpen ? 'vote' : nominationsOpen ? 'nominations' : 'nominees'}`
      : '/';
  const waitingForEdition = !edition.data && edition.isPending;
  const editionError = !edition.data && edition.isError;
  const noCurrentEdition = edition.isSuccess && edition.data === null;
  return (
    <section className="award-hero" aria-busy={waitingForEdition}>
      <div className="award-hero-trophy" aria-hidden="true">
        <HeroTrophy />
      </div>
      <div className="award-hero-center page">
        <div className="award-hero-title">
          <h1>
            <em>Ballon d’Or</em>
            <strong>SÃO PAULO</strong>
          </h1>
        </div>
        {noCurrentEdition && (
          <div className="award-hero-preparation" role="status">
            <p className="award-hero-status">NENHUMA EDIÇÃO EM ANDAMENTO</p>
            <p className="award-hero-description">
              As edições anteriores continuam disponíveis no histórico e no Hall da Fama.
            </p>
          </div>
        )}
        <div className="award-hero-actions">
          {waitingForEdition ? (
            <div className="award-hero-cta-skeleton" role="status" aria-live="polite">
              <span className="sr-only">Carregando a edição atual…</span>
              <span className="award-hero-cta-skeleton-label" aria-hidden="true" />
              <span className="award-hero-cta-skeleton-arrow" aria-hidden="true" />
            </div>
          ) : editionError ? (
            <button
              className="award-hero-cta"
              type="button"
              onClick={() => void edition.refetch()}
              disabled={edition.isFetching}
            >
              <span>{edition.isFetching ? 'Carregando edição…' : 'Tentar novamente'}</span>
              <span className="award-hero-cta-arrow" aria-hidden="true">
                <ArrowRight size={22} strokeWidth={1.8} />
              </span>
            </button>
          ) : noCurrentEdition ? (
            <>
              <Link className="award-hero-cta" to="/hall-of-fame">
                <span>Conhecer o Hall da Fama</span>
                <span className="award-hero-cta-arrow" aria-hidden="true">
                  <ArrowRight size={22} strokeWidth={1.8} />
                </span>
              </Link>
              <Link className="award-hero-history-link" to="/history">
                Ver histórico
              </Link>
            </>
          ) : (
            <Link className="award-hero-cta" to={ctaPath}>
              <span>{ctaLabel}</span>
              <span className="award-hero-cta-arrow" aria-hidden="true">
                <ArrowRight size={22} strokeWidth={1.8} />
              </span>
            </Link>
          )}
        </div>
        <a
          className="award-hero-stream"
          href="https://kick.com/claiverty"
          target="_blank"
          rel="noreferrer"
          aria-label="Abrir a transmissão na Kick"
        >
          <span>Transmissão na{' '}</span>
          <span title="Kick">
            <img src="/images/kick-icon.svg" alt="" aria-hidden="true" />
          </span>
        </a>
      </div>
    </section>
  );
}
