import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Notice, PageHeading } from '../components/ui';
import { ApiRequestError } from '../lib/auth';
import { nominationErrorMessage } from '../lib/nomination-errors';
import '../styles/membership-preview.css';

const cases = [
  {
    step: '01 · INDICAÇÃO',
    title: 'Quem indica está fora do servidor',
    detail: 'A conta Discord usada no login não aparece entre os membros do servidor.',
    message: 'Entre no discord.gg/saopaulo com a conta usada no login para poder indicar.',
  },
  {
    step: '02 · INDICAÇÃO',
    title: 'A pessoa indicada saiu do servidor',
    detail: 'Ela aparecia na busca, mas não está mais no servidor no momento do envio.',
    message: nominationErrorMessage(
      new ApiRequestError(
        'A pessoa indicada não está mais no servidor. Busque outro membro.',
        '123456789012345678',
      ),
      [{ discord_user_id: '123456789012345678', display_name: 'Bia', username: 'bia' }],
    ),
  },
  {
    step: '03 · VOTAÇÃO',
    title: 'Quem vota está fora do servidor',
    detail: 'A conta Discord usada no login precisa entrar no servidor antes de confirmar o voto.',
    message: 'Entre no discord.gg/saopaulo com a conta usada no login para poder votar.',
  },
] as const;

export default function MembershipPreview() {
  return (
    <div className="page public-page membership-preview">
      <PageHeading
        eyebrow="PRÉVIA LOCAL · PARTICIPAÇÃO"
        title="Como aparecem os avisos"
        description="Estas são as mensagens exibidas nos três caminhos de validação. Nenhum voto ou indicação é enviado nesta página."
      />
      <div className="membership-preview-grid">
        {cases.map((item) => (
          <section className="membership-preview-card" key={item.step}>
            <span className="eyebrow">{item.step}</span>
            <h2>{item.title}</h2>
            <p>{item.detail}</p>
            <div className="membership-preview-result">
              <span className="membership-preview-label">AVISO MOSTRADO NA TELA</span>
              <Notice message={item.message} />
            </div>
          </section>
        ))}
      </div>
      <Link className="button button-outline" to="/">
        <ArrowLeft size={18} aria-hidden="true" />
        Voltar ao site
      </Link>
    </div>
  );
}
