import { Category, Edition, Nominee, Nomination, Winner } from '@awards/contracts';
const uid = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const names = [
  'Claiverty',
  'Sukita',
  'Thais',
  'Theus',
  'Bambinox',
  'Bia',
  'Cind',
  'Fefeli',
  'Diovani',
  'Peixoto',
  'Pudim',
  'Priska',
  'Zold',
  'Pedroaaaa',
  'GabrielSPFC',
  'TH',
  'Dragonlarte',
];
export const demoMembers: Nominee[] = names.map((name, i) => ({
  id: uid(100 + i),
  discord_user_id: String(900000000000000000n + BigInt(i)),
  display_name: name,
  username: name.toLowerCase(),
  avatar_url: `/images/Nominees/${name}.webp`,
}));
export const demoEdition: Edition = {
  is_public: true,
  is_current: true,
  id: uid(1),
  name: 'Ballon d’Or SPFC 2026',
  slug: '2026',
  year: 2026,
  status: 'VOTING_OPEN',
  description: 'A premiação de quem faz a nossa comunidade acontecer.',
  tagline: 'A comunidade faz história.',
  nominations_open_at: '2026-08-01T00:00:00Z',
  nominations_close_at: '2026-08-31T00:00:00Z',
  voting_open_at: '2026-09-01T00:00:00Z',
  voting_close_at: '2026-11-25T02:59:59Z',
  nominees_reveal_at: null,
  publish_at: null,
  created_at: '2026-01-01T00:00:00Z',
};
const categoryData = [
  [
    'Membro do Ano',
    'membro-do-ano',
    'Quem deixou a maior marca na comunidade neste ano?',
    [3, 2, 0, 5, 10],
  ],
  [
    'Staff do Ano',
    'staff-do-ano',
    'Presença, dedicação e cuidado com a nossa comunidade.',
    [0, 1, 7, 15, 16],
  ],
  [
    'Rei da resenha',
    'rei-da-resenha',
    'Quem transforma qualquer conversa em um bom momento.',
    [1, 12, 4, 13, 11],
  ],
  [
    'O mais querido',
    'mais-querido',
    'Aquela pessoa que faz todo mundo se sentir em casa.',
    [0, 6, 1, 7, 5],
  ],
  [
    'Membro mais ativo',
    'membro-mais-ativo',
    'Sempre presente. Sempre fazendo a comunidade acontecer.',
    [2, 8, 14, 5, 9],
  ],
  [
    'O mais chato',
    'o-mais-chato',
    'Uma homenagem bem-humorada a quem nunca passa despercebido.',
    [4, 13, 12, 9, 10],
  ],
] as const;
export const demoCategories: Category[] = categoryData.map(
  ([name, slug, description, indices], i) => ({
    id: uid(10 + i),
    edition_id: demoEdition.id,
    name,
    slug,
    description,
    image_url: demoMembers[indices[0]].avatar_url,
    display_order: i,
    max_nominees: 5,
    max_nominations: 3,
    vote_required: true,
    allow_self_nomination: false,
    archived: false,
    rules: { required_role_ids: [], min_membership_days: 0, blacklisted_discord_ids: [] },
    nominees: indices.map((n) => demoMembers[n]),
  }),
);
export const demoAdminCategories: Category[] = demoCategories.map((category) => ({
  ...category,
  nominees: category.nominees.slice(0, 2),
}));
export const demoNominations: Nomination[] = demoCategories.flatMap((category, categoryIndex) =>
  [
    ...category.nominees.slice(0, 2),
    ...demoMembers
      .filter((nominee) => !category.nominees.slice(0, 2).some((item) => item.id === nominee.id))
      .slice(0, 6),
  ].map((nominee, nomineeIndex) => ({
    id: uid(300 + categoryIndex * 10 + nomineeIndex),
    category_id: category.id,
    member_id: nominee.id,
    manual_name: null,
    display_name: nominee.display_name,
    discord_user_id: nominee.discord_user_id,
    status: 'pending_review' as const,
    count: [18, 14, 11, 7, 4][(nomineeIndex + categoryIndex) % 5],
  })),
);
export const demoArchive: Edition = {
  ...demoEdition,
  id: uid(2),
  name: 'Ballon d’Or SPFC 2025',
  slug: '2025',
  year: 2025,
  status: 'ARCHIVED',
  is_current: false,
};
export const demoWinners: Winner[] = demoCategories.flatMap((c, i) => {
  const winnerIndex = [3, 0, 1, 0, 2, 4][i];
  return [0, 1, 2].map((offset, rank) => {
    const m = demoMembers[winnerIndex + offset];
    return {
      edition_id: demoArchive.id,
      edition_name: demoArchive.name,
      year: 2025,
      edition_slug: '2025',
      category_id: c.id,
      category_name: c.name,
      category_slug: c.slug,
      nominee_id: m.id,
      display_name: m.display_name,
      username: m.username,
      discord_user_id: m.discord_user_id,
      avatar_url: m.avatar_url,
      rank: rank + 1,
      percentage: [52.4, 30.1, 17.5][rank],
    };
  });
});

export const demoArchive2024: Edition = {
  ...demoArchive,
  id: uid(4),
  name: 'Ballon d’Or SPFC 2024',
  slug: '2024',
  year: 2024,
};

export const demoWinners2024: Winner[] = [
  {
    edition_id: demoArchive2024.id,
    edition_name: demoArchive2024.name,
    year: 2024,
    edition_slug: demoArchive2024.slug,
    category_id: uid(40),
    category_name: 'O mais querido',
    category_slug: 'mais-querido',
    nominee_id: demoMembers[0].id,
    display_name: demoMembers[0].display_name,
    username: demoMembers[0].username,
    discord_user_id: demoMembers[0].discord_user_id,
    avatar_url: demoMembers[0].avatar_url,
    rank: 1,
  },
  {
    edition_id: demoArchive2024.id,
    edition_name: demoArchive2024.name,
    year: 2024,
    edition_slug: demoArchive2024.slug,
    category_id: uid(41),
    category_name: 'Fabuloso',
    category_slug: 'fabuloso',
    nominee_id: demoMembers[4].id,
    display_name: demoMembers[4].display_name,
    username: demoMembers[4].username,
    discord_user_id: demoMembers[4].discord_user_id,
    avatar_url: demoMembers[4].avatar_url,
    rank: 1,
  },
  {
    edition_id: demoArchive2024.id,
    edition_name: demoArchive2024.name,
    year: 2024,
    edition_slug: demoArchive2024.slug,
    category_id: uid(42),
    category_name: 'Terror do Morumbi',
    category_slug: 'terror-do-morumbi',
    nominee_id: demoMembers[10].id,
    display_name: demoMembers[10].display_name,
    username: demoMembers[10].username,
    discord_user_id: demoMembers[10].discord_user_id,
    avatar_url: demoMembers[10].avatar_url,
    rank: 1,
  },
];

export const demoAllWinners: Winner[] = [...demoWinners, ...demoWinners2024];

export const demoNominationEdition: Edition = {
  ...demoEdition,
  id: uid(3),
  name: 'Ballon d’Or SPFC 2027 — Preview de indicações',
  slug: '2027',
  year: 2027,
  is_current: false,
  status: 'NOMINATIONS_OPEN',
  nominations_open_at: '2026-09-01T00:00:00Z',
  nominations_close_at: '2027-09-01T00:00:00Z',
};
