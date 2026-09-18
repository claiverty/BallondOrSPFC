import type { Dispatch, SetStateAction } from 'react';
import type { UseQueryResult } from '@tanstack/react-query';
import type {
  Analytics,
  Category,
  Edition,
  EditionStatus,
  Identity,
  Nomination,
} from '@awards/contracts';
export interface Audit {
  id: string;
  action: string;
  reason: string;
  created_at: string;
  actor_id: string;
}
export interface Result {
  category_id: string;
  nominee_id: string;
  category_name: string;
  display_name: string;
  votes_count: number;
  rank: number;
  percentage: number;
}
export interface AdminContext {
  edition: Edition;
  id: string | undefined;
  categories: UseQueryResult<Category[], Error>;
  analytics: UseQueryResult<Analytics, Error>;
  next: EditionStatus | undefined;
  reason: string;
  setReason: Dispatch<SetStateAction<string>>;
  mutation: { isPending: boolean };
  action: (path: string, body?: unknown, method?: string) => void;
  setDuplicate: Dispatch<SetStateAction<boolean>>;
  editCat: Category | null | undefined;
  setEditCat: Dispatch<SetStateAction<Category | null | undefined>>;
  category: Category | undefined;
  setCategoryId: Dispatch<SetStateAction<string>>;
  setMessage: Dispatch<SetStateAction<string>>;
  nominations: UseQueryResult<Nomination[], Error>;
  results: UseQueryResult<Result[], Error>;
  logs: UseQueryResult<Audit[], Error>;
  users: UseQueryResult<
    Array<{ id: string; display_name: string; discord_user_id: string; role: string }>,
    Error
  >;
  auth: { identity: Identity | null };
}
