import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { HeroTrophy } from '../components/HeroTrophy';

export function Home() {
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
          <Link className="award-hero-cta" to="/2026/vote">
            <span>Votar agora</span>
            <span className="award-hero-cta-arrow" aria-hidden="true">
              <ArrowRight size={22} strokeWidth={1.8} />
            </span>
          </Link>
        </div>
      </div>
    </section>
  );
}
