import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, UserRound, ArrowRight, ChevronDown, X } from 'lucide-react';
import { Nominee } from '@awards/contracts';
import { demoMode, request } from '../lib/auth';
import { demoMembers } from '../lib/demo';
export function MemberSearch({ onSelect }: { onSelect: (member: Omit<Nominee, 'id'>) => void }) {
  const [q, setQ] = useState('');
  const [debounced, setDebounced] = useState('');
  const [open, setOpen] = useState(false);
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
      <div
        className="search-input"
        onFocus={() => setOpen(true)}
        onBlur={() => window.setTimeout(() => setOpen(false), 120)}
      >
        <Search size={19} aria-hidden="true" />
        <input
          id="member-search"
          value={q}
          onChange={(e) => {
            setQ(e.target.value.slice(0, 32));
            setOpen(true);
          }}
          placeholder="Digite pelo menos 2 caracteres"
          autoComplete="off"
          aria-describedby="search-status"
          aria-controls="member-search-results"
          aria-expanded={open && debounced.length >= 2}
        />
        {q && (
          <button
            className="search-clear"
            type="button"
            aria-label="Limpar busca"
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => {
              setQ('');
              setDebounced('');
              setOpen(false);
            }}
          >
            <X size={17} aria-hidden="true" />
          </button>
        )}
        <ChevronDown
          className={open ? 'search-chevron open' : 'search-chevron'}
          size={18}
          aria-hidden="true"
        />
      </div>
      {open && q.trim() === debounced && debounced.length >= 2 && (
        <div className="search-dropdown">
          <div id="search-status" className="search-status" role="status">
            {results.isFetching
              ? 'Consultando membros…'
              : !results.data?.length && !results.error
                ? 'Nenhum membro encontrado.'
                : ''}
          </div>
          {results.error && (
            <p role="alert" className="error-text">
              {results.error.message}
            </p>
          )}
          <ul id="member-search-results" className="search-results" role="listbox">
            {results.data?.map((m) => (
              <li key={m.discord_user_id}>
                <button
                  type="button"
                  role="option"
                  onClick={() => {
                    onSelect(m);
                    setQ('');
                    setDebounced('');
                    setOpen(false);
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
      )}
    </div>
  );
}
