import { Link, useParams } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { isOpen } from '@awards/contracts';
import { HeroTrophy } from '../components/HeroTrophy';
import { useEdition } from '../lib/queries';

export function Home() {
  const { slug: routeSlug } = useParams();
  const edition = useEdition(routeSlug);
  const slug = edition.data?.slug ?? routeSlug;
  const nominationsOpen = edition.data && isOpen(edition.data, 'nominations');
  const votingOpen = edition.data && isOpen(edition.data, 'voting');
  const showWinners =
    edition.data &&
    (['DRAFT', 'NOMINATIONS_REVIEW'].includes(edition.data.status) ||
      ['RESULTS_PUBLISHED', 'ARCHIVED'].includes(edition.data.status));
  const ctaLabel = showWinners
    ? 'Conhecer vencedores'
    : nominationsOpen
      ? 'Indicar candidatos'
      : votingOpen
        ? 'Votar agora'
        : 'Conhecer indicados';
  const ctaPath = showWinners
    ? '/hall-of-fame'
    : slug
      ? `/${slug}/${votingOpen ? 'vote' : nominationsOpen ? 'nominations' : 'nominees'}`
      : '/';
  const waitingForEdition = !edition.data && edition.isPending;
  const editionError = !edition.data && edition.isError;
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
