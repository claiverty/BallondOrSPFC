import { useQuery } from '@tanstack/react-query';
import { Category, Edition, Winner } from '@awards/contracts';
import { demoMode, request } from './auth';
import {
  demoArchive,
  demoArchive2024,
  demoAllWinners,
  demoCategories,
  demoEdition,
  demoWinners,
  demoWinners2024,
  demoNominationEdition,
} from './demo';
export const keys = {
  editions: ['editions'] as const,
  edition: (slug: string) => ['edition', slug] as const,
  categories: (id: string) => ['categories', id] as const,
};
export const useEditions = () =>
  useQuery({
    queryKey: keys.editions,
    queryFn: () =>
      demoMode
        ? Promise.resolve([demoEdition, demoNominationEdition, demoArchive, demoArchive2024])
        : request<Edition[]>('/editions'),
  });
export const useEdition = (slug = 'current') =>
  useQuery({
    queryKey: keys.edition(slug),
    refetchInterval: 60000,
    queryFn: () =>
      demoMode
        ? slug === '2027'
          ? Promise.resolve(demoNominationEdition)
          : slug === '2025'
            ? Promise.resolve(demoArchive)
            : slug === '2024'
              ? Promise.resolve(demoArchive2024)
              : slug === 'current' || slug === '2026'
                ? Promise.resolve(demoEdition)
                : Promise.reject(new Error('Edição não encontrada.'))
        : request<Edition>(`/editions/${slug}`),
  });
export const useCategories = (edition?: Edition) =>
  useQuery({
    queryKey: keys.categories(edition?.id ?? ''),
    queryFn: () =>
      demoMode
        ? Promise.resolve(
            demoCategories.map((c) => ({
              ...c,
              edition_id: edition!.id,
              nominees: edition!.status === 'NOMINATIONS_OPEN' ? [] : c.nominees,
            })),
          )
        : request<Category[]>(`/editions/${edition!.id}/categories`),
    enabled: !!edition,
  });
export const useWinners = (slug?: string) =>
  useQuery({
    queryKey: ['winners', slug],
    queryFn: () =>
      demoMode
        ? Promise.resolve(
            !slug
              ? demoAllWinners
              : slug === '2025'
                ? demoWinners
                : slug === '2024'
                  ? demoWinners2024
                  : [],
          )
        : request<Winner[]>(slug ? `/winners/${slug}` : '/hall-of-fame'),
  });
