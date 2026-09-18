import type { AdminContext } from './types';
export function UsersPanel({
  action,
  users,
  auth,
}: Pick<AdminContext, 'action' | 'users' | 'auth'>) {
  return (
    <section className="admin-panel">
      <p>Somente super_admin pode alterar funções. A própria função não pode ser alterada.</p>
      {users.data?.map((u) => (
        <div className="admin-list-row" key={u.id}>
          <div>
            <strong>{u.display_name}</strong>
            <small>{u.discord_user_id}</small>
          </div>
          <select
            aria-label={`Função de ${u.display_name}`}
            value={u.role}
            disabled={auth.identity?.role !== 'super_admin' || auth.identity.id === u.id}
            onChange={(e) => action(`/admin/users/${u.id}/role`, { role: e.target.value }, 'PATCH')}
          >
            <option value="user">Membro</option>
            <option value="admin">Admin</option>
            <option value="super_admin">Super admin</option>
          </select>
        </div>
      ))}
      {!users.data?.length && <p className="empty">Membros aparecem após o primeiro login.</p>}
    </section>
  );
}
