import { Link2, ShieldCheck } from 'lucide-react';
import { useState } from 'react';
import { MemberSearch } from '../../components/MemberSearch';
import type { AdminContext } from './types';

export function MembersPanel({
  action,
  auth,
  members,
  setMessage,
}: Pick<AdminContext, 'action' | 'auth' | 'members' | 'setMessage'>) {
  const [memberId, setMemberId] = useState<string | null>(null);
  const [reason, setReason] = useState('');
  const selected = members.data?.find((member) => member.id === memberId);

  const close = () => {
    setMemberId(null);
    setReason('');
  };

  return (
    <section className="admin-panel member-link-panel">
      <div className="panel-heading">
        <div>
          <h2>Perfis da comunidade</h2>
          <p>
            Vincule cada registro histórico ao perfil correto do servidor. Vitórias e indicações
            continuam no mesmo perfil.
          </p>
        </div>
      </div>
      {auth.identity?.role !== 'super_admin' && (
        <p className="error-text">Somente o super admin pode vincular perfis.</p>
      )}
      {members.data?.map((member) => (
        <div className="admin-list-row member-link-row" key={member.id}>
          {member.avatar_url ? (
            <img src={member.avatar_url} alt="" />
          ) : (
            <div className="avatar-fallback" />
          )}
          <div>
            <strong>{member.display_name}</strong>
            <small>@{member.username}</small>
            <span className={member.is_linked ? 'link-status linked' : 'link-status'}>
              {member.is_linked ? 'Perfil oficial vinculado' : 'Aguardando vínculo'}
            </span>
          </div>
          <span className="member-wins">
            {member.wins} vitória{member.wins === 1 ? '' : 's'}
          </span>
          <button
            className="button button-small"
            disabled={auth.identity?.role !== 'super_admin'}
            onClick={() => {
              setMessage('');
              setMemberId(member.id);
              setReason('');
            }}
          >
            {member.is_linked ? <ShieldCheck size={16} /> : <Link2 size={16} />}
            {member.is_linked ? 'Atualizar vínculo' : 'Vincular Discord'}
          </button>
        </div>
      ))}
      {!members.data?.length && <p className="empty">Nenhum perfil histórico para vincular.</p>}
      {selected && (
        <div className="member-link-form">
          <div className="panel-heading">
            <div>
              <h3>Vincular {selected.display_name}</h3>
              <p>Busque a pessoa no Discord e escolha o perfil correto.</p>
            </div>
            <button className="text-button" onClick={close}>
              Cancelar
            </button>
          </div>
          <label>
            Motivo do vínculo
            <input
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder="Ex.: perfil confirmado pela administração"
            />
          </label>
          <MemberSearch
            onSelect={(discordMember) => {
              if (reason.trim().length < 3) {
                setMessage('Informe o motivo antes de vincular o perfil.');
                return;
              }
              action(
                `/admin/members/${selected.id}/link`,
                { discord_user_id: discordMember.discord_user_id, reason },
                'PATCH',
              );
              close();
            }}
          />
        </div>
      )}
    </section>
  );
}
