import { ReactNode } from 'react';
import { AlertCircle, ArrowUpRight, Check } from 'lucide-react';
import { Link, useLocation, type LinkProps } from 'react-router-dom';
import { Nominee } from '@awards/contracts';

export function RouteLoadingPlaceholder({ label = 'Carregando conteúdo…' }: { label?: string }) {
  return (
    <div className="page state state-loading-placeholder" role="status" aria-live="polite">
      <span className="state-loading-line" aria-hidden="true" />
      <span className="sr-only">{label}</span>
    </div>
  );
}

export function State({
  loading,
  error,
  children,
}: {
  loading?: boolean;
  error?: Error | null;
  children: ReactNode;
}) {
  if (loading) return <RouteLoadingPlaceholder />;

  if (error)
    return (
      <div className="page state" role="alert">
        <AlertCircle aria-hidden="true" />
        <h1>Não foi possível carregar</h1>
        <p>{error.message}</p>
        <button className="button" onClick={() => location.reload()}>
          Tentar novamente
        </button>
      </div>
    );
  return <>{children}</>;
}
export function PageHeading({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  children?: ReactNode;
}) {
  return (
    <div className="page-heading">
      <span className="eyebrow">{eyebrow}</span>
      <h1>{title}</h1>
      {description && <p>{description}</p>}
      {children}
    </div>
  );
}
export function MemberLink({
  memberId,
  children,
  ...props
}: Omit<LinkProps, 'to'> & { memberId: string }) {
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  params.set('member', memberId);
  return (
    <Link
      {...props}
      to={{ pathname: location.pathname, search: `?${params.toString()}`, hash: location.hash }}
    >
      {children}
    </Link>
  );
}
export function NomineeCard({
  nominee,
  selected,
  onSelect,
}: {
  nominee: Nominee;
  selected?: boolean;
  onSelect?: () => void;
}) {
  const content = (
    <>
      <div className="nominee-photo">
        {nominee.avatar_url ? (
          <img src={nominee.avatar_url} alt="" loading="lazy" width="360" height="440" />
        ) : (
          <div className="avatar-fallback">{nominee.display_name.slice(0, 2)}</div>
        )}
        {onSelect && (
          <span className="select-indicator">
            {selected ? <Check size={18} aria-hidden="true" /> : <span />}
          </span>
        )}
      </div>
      <div className="nominee-caption">
        <h3>{nominee.display_name}</h3>
        <span>{onSelect ? (selected ? 'Selecionado' : 'Selecionar') : `@${nominee.username}`}</span>
        {!onSelect && <ArrowUpRight size={18} aria-hidden="true" />}
      </div>
    </>
  );
  return onSelect ? (
    <button
      type="button"
      className={`nominee-card ${selected ? 'selected' : ''}`}
      aria-pressed={!!selected}
      onClick={onSelect}
    >
      {content}
    </button>
  ) : (
    <MemberLink className="nominee-card" memberId={nominee.discord_user_id}>
      {content}
    </MemberLink>
  );
}
export function Notice({ message }: { message: string }) {
  const invite = 'discord.gg/saopaulo';
  const inviteAt = message.indexOf(invite);
  return (
    <div className="notice" role="status">
      <AlertCircle size={18} aria-hidden="true" />
      {inviteAt < 0 ? (
        message
      ) : (
        <span>
          {message.slice(0, inviteAt)}
          <a href="https://discord.gg/saopaulo" target="_blank" rel="noopener noreferrer">
            {invite}
          </a>
          {message.slice(inviteAt + invite.length)}
        </span>
      )}
    </div>
  );
}
