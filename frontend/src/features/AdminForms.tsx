import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Category, CreateCategorySchema, CreateEditionSchema, Edition } from '@awards/contracts';
import { Check } from 'lucide-react';
const nullableDate = (v: string) => (v ? new Date(v).toISOString() : null);
function localDate(v: string | null | undefined) {
  if (!v) return '';
  const d = new Date(v);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}
export function EditionForm({
  edition,
  onSave,
  busy,
}: {
  edition?: Edition;
  onSave: (v: z.output<typeof CreateEditionSchema>) => void;
  busy: boolean;
}) {
  const f = useForm<
    z.input<typeof CreateEditionSchema>,
    unknown,
    z.output<typeof CreateEditionSchema>
  >({
    resolver: zodResolver(CreateEditionSchema),
    defaultValues: edition ?? {
      name: '',
      slug: '',
      year: new Date().getFullYear() + 1,
      description: '',
      tagline: 'A comunidade faz história.',
      result_visibility: 'winner',
      branding: { accent: '#d6b77a' },
      publish_counts: false,
      publish_percentages: false,
    },
  });
  const dateFields = [
    'nominations_open_at',
    'nominations_close_at',
    'voting_open_at',
    'voting_close_at',
  ] as const;
  const labels = [
    'Início das indicações',
    'Fim das indicações',
    'Início da votação',
    'Fim da votação',
  ];
  const year = f.watch('year');
  useEffect(() => {
    if (Number.isInteger(year)) f.setValue('slug', String(year), { shouldDirty: false });
  }, [f, year]);
  return (
    <form className="admin-form" onSubmit={f.handleSubmit(onSave)}>
      <div className="form-grid">
        <label className="checkbox-label">
          <input type="checkbox" {...f.register('is_public')} />
          Exibir pré-evento publicamente
        </label>
        <label className="checkbox-label">
          <input type="checkbox" {...f.register('is_current')} />
          Usar como edição da Home
        </label>
        <label>
          Nome da edição
          <input {...f.register('name')} />
        </label>
        <label>
          Ano
          <input type="number" {...f.register('year', { valueAsNumber: true })} />
        </label>
        <input type="hidden" {...f.register('slug')} />
        <label>
          Tagline
          <input {...f.register('tagline')} />
        </label>
        <label className="full">
          Descrição
          <textarea {...f.register('description')} />
        </label>
        {dateFields.map((key, i) => (
          <label key={key}>
            {labels[i]}
            <input
              type="datetime-local"
              defaultValue={localDate(edition?.[key])}
              {...f.register(key, { setValueAs: nullableDate })}
            />
          </label>
        ))}
        <p className="form-hint full">
          Configure apenas os períodos de indicações e votação. O reveal dos indicados e a
          publicação dos resultados são feitos manualmente nas etapas administrativas.
        </p>
        <label>
          URL da cerimônia
          <input type="url" {...f.register('ceremony_url', { setValueAs: (v) => v || null })} />
        </label>
        <label className="full">
          Sobre a cerimônia
          <textarea {...f.register('ceremony_description')} />
        </label>
        <label>
          Banner (URL HTTPS)
          <input type="url" {...f.register('banner_url', { setValueAs: (v) => v || null })} />
        </label>
        <label>
          Logo próprio (URL HTTPS)
          <input type="url" {...f.register('logo_url', { setValueAs: (v) => v || null })} />
        </label>
        <label>
          Cor da edição
          <input {...f.register('branding.accent')} />
        </label>
        <label>
          Universo elegível (opcional)
          <input
            type="number"
            {...f.register('eligible_count', { setValueAs: (v) => (v === '' ? null : Number(v)) })}
          />
        </label>
        <label>
          Resultado público
          <select {...f.register('result_visibility')}>
            <option value="winner">Somente vencedor</option>
            <option value="top3">Top 3</option>
          </select>
        </label>
        <label className="checkbox-label">
          <input type="checkbox" {...f.register('publish_counts')} />
          Publicar totais de votos
        </label>
        <label className="checkbox-label">
          <input type="checkbox" {...f.register('publish_percentages')} />
          Publicar percentuais
        </label>
      </div>
      {Object.entries(f.formState.errors).length > 0 && (
        <div role="alert" className="error-text">
          Confira os campos:{' '}
          {Object.entries(f.formState.errors)
            .map(([k, v]) => `${k}: ${v?.message ?? 'inválido'}`)
            .join('; ')}
        </div>
      )}
      <button className="button" disabled={busy}>
        {busy ? 'Salvando…' : 'Salvar edição'}
        <Check size={16} />
      </button>
      <p>
        Datas são preenchidas no seu fuso local e armazenadas em UTC. A publicação depende da
        mudança de fase pela administração.
      </p>
    </form>
  );
}
export function CategoryForm({
  category,
  onSave,
  busy,
}: {
  category?: Category;
  onSave: (v: z.output<typeof CreateCategorySchema>) => void;
  busy: boolean;
}) {
  const f = useForm<
    z.input<typeof CreateCategorySchema>,
    unknown,
    z.output<typeof CreateCategorySchema>
  >({
    resolver: zodResolver(CreateCategorySchema),
    defaultValues: category ?? {
      name: '',
      slug: '',
      description: '',
      max_nominees: 5,
      max_nominations: 3,
      vote_required: true,
      allow_self_nomination: false,
      display_order: 0,
      archived: false,
      rules: { required_role_ids: [], min_membership_days: 0, blacklisted_discord_ids: [] },
    },
  });
  const split = (v: string) =>
    typeof v === 'string'
      ? v
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
      : v;
  return (
    <form className="admin-form" onSubmit={f.handleSubmit(onSave)}>
      <div className="form-grid">
        <label>
          Nome
          <input {...f.register('name')} />
        </label>
        <label>
          Slug histórico
          <input {...f.register('slug')} />
        </label>
        <label className="full">
          Descrição
          <textarea {...f.register('description')} />
        </label>
        <label>
          Máximo de indicados
          <input type="number" {...f.register('max_nominees', { valueAsNumber: true })} />
        </label>
        <label>
          Indicações por membro
          <input type="number" {...f.register('max_nominations', { valueAsNumber: true })} />
        </label>
        <label>
          Ordem
          <input type="number" {...f.register('display_order', { valueAsNumber: true })} />
        </label>
        <label>
          Imagem (URL HTTPS)
          <input {...f.register('image_url', { setValueAs: (v) => v || null })} />
        </label>
        <label>
          Cargos elegíveis (IDs separados por vírgula)
          <input
            defaultValue={category?.rules.required_role_ids.join(', ')}
            {...f.register('rules.required_role_ids', { setValueAs: split })}
          />
        </label>
        <label>
          Tempo mínimo no servidor (dias)
          <input
            type="number"
            {...f.register('rules.min_membership_days', { valueAsNumber: true })}
          />
        </label>
        <label className="full">
          Membros impedidos (IDs separados por vírgula)
          <input
            defaultValue={category?.rules.blacklisted_discord_ids.join(', ')}
            {...f.register('rules.blacklisted_discord_ids', { setValueAs: split })}
          />
        </label>
        <label className="checkbox-label">
          <input type="checkbox" {...f.register('vote_required')} />
          Voto obrigatório
        </label>
        <label className="checkbox-label">
          <input type="checkbox" {...f.register('allow_self_nomination')} />
          Permitir autoindicação
        </label>
        <label className="checkbox-label">
          <input type="checkbox" {...f.register('archived')} />
          Arquivar categoria
        </label>
      </div>
      {Object.keys(f.formState.errors).length > 0 && (
        <p role="alert" className="error-text">
          Confira os campos:{' '}
          {Object.entries(f.formState.errors)
            .map(([k, v]) => `${k}: ${v?.message ?? 'valor inválido'}`)
            .join('; ')}
        </p>
      )}
      <button className="button" disabled={busy}>
        Salvar categoria
        <Check size={16} />
      </button>
    </form>
  );
}
