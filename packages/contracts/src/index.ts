import { z } from 'zod';
export const statuses = [
  'DRAFT',
  'NOMINATIONS_OPEN',
  'NOMINATIONS_REVIEW',
  'NOMINEES_ANNOUNCED',
  'VOTING_OPEN',
  'VOTING_CLOSED',
  'RESULTS_READY',
  'RESULTS_PUBLISHED',
  'ARCHIVED',
] as const;
export type EditionStatus = (typeof statuses)[number];
export function canTransition(from: EditionStatus, to: EditionStatus) {
  return statuses.indexOf(to) === statuses.indexOf(from) + 1;
}
export const phaseLabels: Record<EditionStatus, string> = {
  DRAFT: 'Em preparação',
  NOMINATIONS_OPEN: 'Indicações abertas',
  NOMINATIONS_REVIEW: 'Indicações em revisão',
  NOMINEES_ANNOUNCED: 'Indicados revelados',
  VOTING_OPEN: 'Votação aberta',
  VOTING_CLOSED: 'Votação encerrada',
  RESULTS_READY: 'Resultados em revisão',
  RESULTS_PUBLISHED: 'Vencedores revelados',
  ARCHIVED: 'Edição histórica',
};
export const phaseCopy: Record<
  EditionStatus,
  { headline: string; description: string; cta: string; path: string }
> = {
  DRAFT: {
    headline: 'A próxima história começa aqui.',
    description:
      'Uma comunidade. Milhares de histórias. Um palco para celebrar quem faz a diferença.',
    cta: 'Conheça a premiação',
    path: 'categories',
  },
  NOMINATIONS_OPEN: {
    headline: 'Quem marcou o seu ano?',
    description:
      'O reconhecimento começa com você. Indique os membros que fizeram a diferença na comunidade.',
    cta: 'Começar indicações',
    path: 'nominations',
  },
  NOMINATIONS_REVIEW: {
    headline: 'Grandes histórias merecem um palco.',
    description: 'As indicações estão em revisão. Em breve, você conhece os nomes desta edição.',
    cta: 'Conheça as categorias',
    path: 'categories',
  },
  NOMINEES_ANNOUNCED: {
    headline: 'Eles já fizeram história.',
    description: 'Conheça os indicados que representam o melhor da nossa comunidade.',
    cta: 'Conhecer indicados',
    path: 'nominees',
  },
  VOTING_OPEN: {
    headline: 'O palco é nosso. A escolha é sua.',
    description:
      'Quem fez a diferença merece o reconhecimento. Vote nos destaques do ano da nossa comunidade.',
    cta: 'Votar agora',
    path: 'vote',
  },
  VOTING_CLOSED: {
    headline: 'Sua escolha faz parte da história.',
    description: 'A votação terminou. Os vencedores serão revelados em breve.',
    cta: 'Conhecer indicados',
    path: 'nominees',
  },
  RESULTS_READY: {
    headline: 'O próximo capítulo está chegando.',
    description: 'A apuração está em revisão. Prepare-se para conhecer os vencedores.',
    cta: 'Conhecer indicados',
    path: 'nominees',
  },
  RESULTS_PUBLISHED: {
    headline: 'A comunidade fez sua escolha.',
    description: 'O talento, a presença e as histórias que mereceram o nosso maior reconhecimento.',
    cta: 'Conhecer vencedores',
    path: 'winners',
  },
  ARCHIVED: {
    headline: 'Um ano. Histórias para sempre.',
    description: 'Relembre os nomes que ficaram na história da comunidade.',
    cta: 'Conhecer vencedores',
    path: 'winners',
  },
};
export const id = z.uuid();
export const snowflake = z.string().regex(/^\d{17,20}$/);
const slug = z
  .string()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  .max(100);
const date = z.iso.datetime({ offset: true }).nullable().default(null);
const safeUrl = z
  .url()
  .refine((v) => new URL(v).protocol === 'https:', 'Use uma URL HTTPS')
  .nullable()
  .default(null);
export const RulesSchema = z.object({
  required_role_ids: z.array(snowflake).max(20).default([]),
  min_membership_days: z.number().int().min(0).max(3650).default(0),
  blacklisted_discord_ids: z.array(snowflake).max(500).default([]),
});
export const CreateEditionSchema = z
  .object({
    is_public: z.boolean().default(false),
    is_current: z.boolean().default(false),
    name: z.string().min(3).max(120),
    slug,
    year: z.number().int().min(2024).max(2100),
    description: z.string().max(2000).default(''),
    tagline: z.string().max(200).default('A comunidade faz história.'),
    nominations_open_at: date,
    nominations_close_at: date,
    voting_open_at: date,
    voting_close_at: date,
    nominees_reveal_at: date,
    publish_at: date,
  })
  .refine(
    (v) =>
      !v.nominations_open_at ||
      !v.nominations_close_at ||
      Date.parse(v.nominations_open_at) < Date.parse(v.nominations_close_at),
    { message: 'O encerramento deve ser posterior à abertura', path: ['nominations_close_at'] },
  )
  .refine(
    (v) =>
      !v.voting_open_at ||
      !v.voting_close_at ||
      Date.parse(v.voting_open_at) < Date.parse(v.voting_close_at),
    { message: 'O encerramento deve ser posterior à abertura', path: ['voting_close_at'] },
  );
export const CreateCategorySchema = z.object({
  name: z.string().min(3).max(100),
  slug,
  description: z.string().max(1000).default(''),
  image_url: safeUrl,
  max_nominees: z.number().int().min(2).max(20).default(5),
  max_nominations: z.number().int().min(1).max(3).default(3),
  vote_required: z.boolean().default(true),
  allow_self_nomination: z.boolean().default(false),
  display_order: z.number().int().min(0).max(1000).default(0),
  archived: z.boolean().default(false),
  rules: RulesSchema.default({
    required_role_ids: [],
    min_membership_days: 0,
    blacklisted_discord_ids: [],
  }),
});
export const SubmitBallotSchema = z
  .object({
    edition_id: id,
    idempotency_key: id,
    items: z
      .array(z.object({ category_id: id, nominee_id: id }))
      .min(1)
      .max(100),
  })
  .refine((v) => new Set(v.items.map((i) => i.category_id)).size === v.items.length, {
    message: 'Categorias duplicadas',
    path: ['items'],
  });
export const NominationSchema = z.object({
  edition_id: id,
  category_id: id,
  items: z
    .array(
      z
        .object({
          discord_user_id: snowflake.optional(),
          manual_name: z.string().trim().min(2).max(100).optional(),
        })
        .refine(
          (v) => Boolean(v.discord_user_id) !== Boolean(v.manual_name),
          'Informe um membro ou um nome manual',
        ),
    )
    .min(1, 'Escolha pelo menos uma pessoa')
    .max(10),
});
export const TransitionSchema = z.object({
  status: z.enum(statuses),
  reason: z.string().trim().min(3).max(500),
});
export const OfficialNomineeSchema = z.object({
  discord_user_id: snowflake,
  display_order: z.number().int().min(0).max(1000).default(0),
  reason: z.string().min(3).max(500),
});
export const ReviewNominationSchema = z.object({
  status: z.enum(['approved', 'rejected']),
  discord_user_id: snowflake.optional(),
  reason: z.string().min(3).max(500),
});
export type Edition = z.output<typeof CreateEditionSchema> & {
  id: string;
  status: EditionStatus;
  created_at: string;
};
export type Category = z.output<typeof CreateCategorySchema> & {
  id: string;
  edition_id: string;
  nominees: Nominee[];
};
export interface Nominee {
  id: string;
  discord_user_id: string;
  display_name: string;
  username: string;
  avatar_url: string | null;
  display_order?: number;
}
export interface Winner {
  edition_id: string;
  edition_name: string;
  year: number;
  edition_slug: string;
  category_id: string;
  category_name: string;
  category_slug: string;
  nominee_id: string;
  display_name: string;
  username: string;
  discord_user_id: string;
  avatar_url: string | null;
  rank: number;
  percentage?: number;
  hall_of_fame_image_url?: string | null;
}
export interface Nomination {
  category_name?: string;
  id: string;
  category_id: string;
  member_id: string | null;
  manual_name: string | null;
  display_name: string | null;
  discord_user_id: string | null;
  status: 'pending_review' | 'approved' | 'rejected';
  count?: number;
}
export interface Analytics {
  ballots: number;
  categories: Array<{
    category_id: string;
    category_name: string;
    nominee_id: string;
    display_name: string;
    votes_count: number;
    percentage: number;
  }>;
  timeline: Array<{ day: string; count: number }>;
}
export interface Identity {
  id: string;
  discord_user_id: string;
  display_name: string;
  avatar_url: string | null;
  role: 'user' | 'admin' | 'super_admin';
}
export function isOpen(
  edition: Pick<
    Edition,
    'status' | 'voting_open_at' | 'voting_close_at' | 'nominations_open_at' | 'nominations_close_at'
  >,
  kind: 'voting' | 'nominations',
  now = Date.now(),
) {
  const expected = kind === 'voting' ? 'VOTING_OPEN' : 'NOMINATIONS_OPEN';
  const start = edition[`${kind}_open_at`];
  const end = edition[`${kind}_close_at`];
  return (
    edition.status === expected &&
    !!start &&
    !!end &&
    now >= Date.parse(start) &&
    now < Date.parse(end)
  );
}

export function editionPresentation(e: Edition, now = Date.now()) {
  let phase = e.status;
  let countdown: string | null = null;
  if (e.status === 'VOTING_OPEN') {
    if (e.voting_open_at && now < Date.parse(e.voting_open_at)) {
      phase = 'NOMINEES_ANNOUNCED';
      countdown = e.voting_open_at;
    } else if (!isOpen(e, 'voting', now)) phase = 'VOTING_CLOSED';
  }
  if (e.status === 'NOMINATIONS_OPEN') {
    if (e.nominations_open_at && now < Date.parse(e.nominations_open_at)) {
      phase = 'DRAFT';
      countdown = e.nominations_open_at;
    } else if (!isOpen(e, 'nominations', now)) phase = 'NOMINATIONS_REVIEW';
  }
  if (e.status === 'DRAFT' && e.nominations_open_at && now < Date.parse(e.nominations_open_at))
    countdown = e.nominations_open_at;
  return { ...phaseCopy[phase], label: phaseLabels[phase], countdown };
}
