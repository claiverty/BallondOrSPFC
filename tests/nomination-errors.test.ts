import { describe, expect, it } from 'vitest';
import { ApiRequestError } from '../frontend/src/lib/auth';
import { nominationErrorMessage } from '../frontend/src/lib/nomination-errors';

describe('Nomination errors', () => {
  it('names the exact selected member returned by the API', () => {
    const error = new ApiRequestError('O membro não possui o cargo exigido.', '123456789012345678');
    expect(
      nominationErrorMessage(error, [
        { discord_user_id: '123456789012345679', display_name: 'Bia', username: 'bia' },
        { discord_user_id: '123456789012345678', display_name: 'Thais', username: 'thais' },
      ]),
    ).toBe('Não foi possível indicar Thais (@thais): O membro não possui o cargo exigido.');
  });

  it('falls back to the canonical Discord ID when the selected member is unavailable', () => {
    const error = new ApiRequestError('Busque outro membro.', '123456789012345678');
    expect(nominationErrorMessage(error, [])).toBe(
      'Não foi possível indicar ID 123456789012345678: Busque outro membro.',
    );
  });
});
