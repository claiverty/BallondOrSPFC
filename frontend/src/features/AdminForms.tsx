import { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Category, CreateCategorySchema, CreateEditionSchema, Edition } from '@awards/contracts';
import { Check } from 'lucide-react';
import { DateTimePicker } from '../components/DateTimePicker';
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
        {dateFields.map((key, i) => {
          const labelId = `edition-${key}-label`;
          return (
            <div className="admin-date-field" key={key} role="group" aria-labelledby={labelId}>
              <span className="admin-date-label" id={labelId}>
                {labels[i]}
              </span>
              <Controller
                control={f.control}
                name={key}
                render={({ field }) => (
                  <DateTimePicker
                    id={`edition-${key}`}
                    label={labels[i]}
                    value={field.value}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                    controlRef={field.ref}
                  />
                )}
              />
            </div>
          );
        })}
        <p className="form-hint full">
          Configure apenas os períodos de indicações e votação. O reveal dos indicados e a
          publicação dos resultados são feitos manualmente nas etapas administrativas.
        </p>
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
  const name = f.watch('name');
  useEffect(() => {
    if (!category && name)
      f.setValue(
        'slug',
        name
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-+|-+$/g, ''),
        { shouldDirty: false },
      );
  }, [category, f, name]);
  const submit = f.handleSubmit((value) =>
    onSave({
      ...value,
      slug: category?.slug ?? value.slug,
      image_url: category?.image_url ?? null,
      vote_required: category?.vote_required ?? true,
      allow_self_nomination: category?.allow_self_nomination ?? false,
      display_order: category?.display_order ?? 0,
      archived: category?.archived ?? false,
      rules: category?.rules ?? {
        required_role_ids: [],
        min_membership_days: 0,
        blacklisted_discord_ids: [],
      },
    }),
  );
  return (
    <form className="admin-form" onSubmit={submit}>
      <div className="form-grid">
        <label>
          Nome
          <input {...f.register('name')} />
        </label>
        <input type="hidden" {...f.register('slug')} />
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
