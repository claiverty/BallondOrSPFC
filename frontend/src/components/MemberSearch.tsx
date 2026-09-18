import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, UserRound, ArrowRight } from 'lucide-react';
import { Nominee } from '@awards/contracts';
import { demoMode, request } from '../lib/auth';
import { demoMembers } from '../lib/demo';
export function MemberSearch({ onSelect }: { onSelect: (member: Omit<Nominee, 'id'>) => void }) {
  const [q, setQ] = useState('');
  const [debounced, setDebounced] = useState('');
  useEffect(() => {
    const timeout = setTimeout(() => setDebounced(q.trim()), 350);
    return () => clearTimeout(timeout);
  }, [q]);
  const results = useQuery({
    queryKey: ['discord-search', debounced],
    queryFn: () =>
      demoMode
        ? Promise.resolve(
            demoMembers
              .filter((m) => m.display_name.toLowerCase().includes(debounced.toLowerCase()))
              .slice(0, 8),
          )
        : request<Omit<Nominee, 'id'>[]>(
            `/discord/members/search?q=${encodeURIComponent(debounced)}`,
          ),
    enabled: debounced.length >= 2,
    staleTime: 15000,
    retry: false,
  });
  return (
    <div className="member-search">
      <label htmlFor="member-search">Buscar membro do servidor</label>
      <div className="search-input">
        <Search size={19} aria-hidden="true" />
        <input
          id="member-search"
          value={q}
          onChange={(e) => setQ(e.target.value.slice(0, 32))}
          placeholder="Digite pelo menos 2 caracteres"
          autoComplete="off"
          aria-describedby="search-status"
        />
      </div>
      <div id="search-status" role="status">
        {results.isFetching
          ? 'Consultando membros…'
          : debounced.length >= 2 && !results.data?.length && !results.error
            ? 'Nenhum membro encontrado.'
            : ''}
      </div>
      {results.error && (
        <p role="alert" className="error-text">
          {results.error.message}
        </p>
      )}
      <ul className="search-results">
        {q.trim() === debounced &&
          debounced.length >= 2 &&
          results.data?.map((m) => (
            <li key={m.discord_user_id}>
              <button
                type="button"
                onClick={() => {
                  onSelect(m);
                  setQ('');
                }}
              >
                {m.avatar_url ? (
                  <img src={m.avatar_url} alt="" />
                ) : (
                  <UserRound aria-hidden="true" />
                )}
                <span>
                  <strong>{m.display_name}</strong>
                  <small>@{m.username}</small>
                </span>
                <ArrowRight size={18} aria-hidden="true" />
              </button>
            </li>
          ))}
      </ul>
    </div>
  );
}
