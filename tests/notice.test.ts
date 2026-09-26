import { describe, expect, it } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { Notice } from '../frontend/src/components/ui';

describe('Discord invitation notice', () => {
  it('renders the fixed server invite as a clickable link', () => {
    const html = renderToStaticMarkup(
      createElement(Notice, {
        message: 'Entre no discord.gg/saopaulo com a conta usada no login para poder votar.',
      }),
    );
    expect(html).toContain('href="https://discord.gg/saopaulo"');
    expect(html).toContain('>discord.gg/saopaulo</a>');
    expect(html).toContain('para poder votar.');
  });
});
