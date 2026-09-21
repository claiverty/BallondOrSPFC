import { Link, useParams } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { isOpen } from '@awards/contracts';
import { HeroTrophy } from '../components/HeroTrophy';
import { useEdition } from '../lib/queries';

export function Home() {
  const { slug: routeSlug } = useParams();
  const edition = useEdition(routeSlug);
  const slug = edition.data?.slug ?? routeSlug ?? '2026';
  const nominationsOpen = edition.data && isOpen(edition.data, 'nominations');
  const votingOpen = edition.data && isOpen(edition.data, 'voting');
  const showWinners =
    edition.data &&
    (['DRAFT', 'NOMINATIONS_OPEN', 'NOMINATIONS_REVIEW'].includes(edition.data.status) ||
      ['RESULTS_PUBLISHED', 'ARCHIVED'].includes(edition.data.status));
  const ctaLabel = showWinners
    ? 'Conhecer vencedores'
    : nominationsOpen
      ? 'Indicar candidatos'
      : votingOpen
        ? 'Votar agora'
        : 'Conhecer indicados';
  const ctaPath = showWinners ? '/hall-of-fame' : `/${slug}/nominees`;
  return (
    <section className="award-hero">
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
          <Link className="award-hero-cta" to={ctaPath}>
            <span>{ctaLabel}</span>
            <span className="award-hero-cta-arrow" aria-hidden="true">
              <ArrowRight size={22} strokeWidth={1.8} />
            </span>
          </Link>
        </div>
      </div>
    </section>
  );
}
