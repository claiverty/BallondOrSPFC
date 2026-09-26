import { ApiRequestError } from './auth';

type SelectedMember = {
  discord_user_id?: string;
  display_name: string;
  username?: string;
};

export function nominationErrorMessage(error: unknown, selected: SelectedMember[]): string {
  if (!(error instanceof Error)) return '';
  if (!(error instanceof ApiRequestError) || !error.memberDiscordUserId) return error.message;
  const member = selected.find((item) => item.discord_user_id === error.memberDiscordUserId);
  const label = member
    ? `${member.display_name}${member.username ? ` (@${member.username})` : ` (ID ${error.memberDiscordUserId})`}`
    : `ID ${error.memberDiscordUserId}`;
  return `Não foi possível indicar ${label}: ${error.message}`;
}
