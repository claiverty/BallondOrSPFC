import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DiscordMemberNotFoundException, DiscordService } from '../backend/src/discord/discord';

describe('Discord member lookup', () => {
  beforeEach(() => {
    Object.assign(process.env, {
      DATABASE_URL: 'postgresql://test:test@localhost/test',
      DATABASE_SSL: 'false',
      SUPABASE_URL: 'https://test.supabase.co',
      SUPABASE_ANON_KEY: 'test-anon-key',
      SUPABASE_SERVICE_ROLE_KEY: 'test-service-key',
      DISCORD_BOT_TOKEN: 'test-bot-token',
      DISCORD_GUILD_ID: '123456789012345678',
      WEB_ORIGIN: 'http://localhost:5173',
    });
  });
  afterEach(() => vi.unstubAllGlobals());

  it('identifies a missing member without treating a guild configuration error as missing membership', async () => {
    const discord = new DiscordService();
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce(
          new Response(JSON.stringify({ code: 10007, message: 'Unknown Member' }), { status: 404 }),
        ),
    );
    await expect(discord.member('123456789012345679')).rejects.toBeInstanceOf(
      DiscordMemberNotFoundException,
    );

    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce(
          new Response(JSON.stringify({ code: 10004, message: 'Unknown Guild' }), { status: 404 }),
        ),
    );
    await expect(discord.member('123456789012345679')).rejects.toMatchObject({ status: 503 });
  });
});
