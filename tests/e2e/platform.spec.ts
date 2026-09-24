import { test, expect } from '@playwright/test';
test('brand loader gates the first opening without replaying on section navigation', async ({
  page,
}) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  const loader = page.locator('.app-loading-screen');
  const homeHeading = page.getByRole('heading', { name: /Ballon d’Or.*SÃO PAULO/ });

  await expect(loader).toBeVisible();
  await expect(homeHeading).not.toBeVisible();
  await expect(homeHeading).toBeVisible();
  await expect(loader).toHaveCount(0);

  const historyLink = page.locator('nav.main-nav').getByRole('link', { name: 'Histórico' });
  if (!(await historyLink.isVisible())) {
    await page.getByRole('button', { name: 'Abrir menu' }).click();
  }
  await historyLink.click();
  await expect(page).toHaveURL(/\/history$/);
  await expect(page.locator('.app-loading-screen')).toHaveCount(0);
  await expect(
    page.getByRole('heading', { name: 'Anos que ficam. Histórias que inspiram.' }),
  ).toBeVisible();
});

test('home, navigation and mobile layout', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /Ballon d’Or.*SÃO PAULO/ })).toBeVisible();
  await expect(page.locator('.award-hero-cta')).toHaveText(/Votar agora/);
  await expect(page.locator('.award-hero-cta')).toHaveAttribute('href', '/2026/vote');
  await expect(page.locator('nav.main-nav a').filter({ hasText: 'Votação' })).toHaveCount(1);
  await expect(page.locator('nav.main-nav a').filter({ hasText: 'Votação' })).toHaveAttribute(
    'href',
    '/2026/vote',
  );
  await page.goto('/2027');
  await expect(page.locator('.award-hero-cta')).toHaveText(/Indicar candidatos/);
  await expect(page.locator('.award-hero-cta')).toHaveAttribute('href', '/2027/nominations');
  await expect(page.locator('nav.main-nav a').filter({ hasText: 'Indicação' })).toHaveAttribute(
    'href',
    '/2027/nominations',
  );
  await page.goto('/2025');
  await expect(page.locator('nav.main-nav a').filter({ hasText: 'Vencedores' })).toHaveAttribute(
    'href',
    '/2025/winners',
  );
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.goto('/2026/vote');
  await expect(page.getByRole('heading', { name: 'Membro do Ano', exact: true })).toBeVisible();
});
test('history shows only current and closed editions in descending order', async ({ page }) => {
  await page.goto('/history');
  await expect(page.locator('.history-year')).toHaveText(['2026', '2025', '2024']);
  await expect(page.getByText('2027', { exact: true })).toHaveCount(0);
});
test('edition schedule opens the themed calendar and accepts a local time', async ({ page }) => {
  await page.goto('/admin/edition');
  const field = page.getByRole('group', { name: 'Início das indicações' });
  await field.getByRole('button').first().click();
  const picker = page.getByRole('dialog', {
    name: 'Selecionar data e hora: Início das indicações',
  });
  await expect(picker).toBeVisible();
  await expect(picker).toHaveAttribute('aria-modal', 'true');
  await expect(picker.getByRole('heading', { name: /2026/ })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  const bounds = await picker.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    return {
      top: rect.top,
      right: rect.right,
      bottom: rect.bottom,
      centerX: rect.left + rect.width / 2,
      centerY: rect.top + rect.height / 2,
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
    };
  });
  expect(bounds.top).toBeGreaterThanOrEqual(0);
  expect(bounds.right).toBeLessThanOrEqual(bounds.viewportWidth);
  expect(bounds.bottom).toBeLessThanOrEqual(bounds.viewportHeight);
  expect(Math.abs(bounds.centerX - bounds.viewportWidth / 2)).toBeLessThan(2);
  expect(Math.abs(bounds.centerY - bounds.viewportHeight / 2)).toBeLessThan(2);
  const timeInput = picker.getByRole('textbox', { name: 'Horário' });
  await expect(timeInput).toHaveAttribute('placeholder', 'HH:MM');
  await timeInput.fill('25:75');
  await expect(picker.getByRole('button', { name: 'Concluir' })).toBeDisabled();
  await timeInput.fill('07:30');
  await expect(picker.getByRole('button', { name: 'Concluir' })).toBeEnabled();
  await expect(field.getByRole('button', { name: /horário 07:30/ })).toBeVisible();
  await picker.getByRole('button', { name: 'Concluir' }).click();
  await expect(picker).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
test('voting preserves selections, shows review and never records a demo vote', async ({
  page,
}) => {
  await page.goto('/2026/vote');
  await page.getByRole('button', { name: /Theus Selecionar/ }).click();
  await page.getByRole('button', { name: 'Próxima categoria' }).click();
  await page.getByRole('button', { name: /Claiverty Selecionar/ }).click();
  await page.reload();
  await expect(page.getByRole('button', { name: /Theus Selecionado/ })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  for (let i = 0; i < 6; i++) {
    await page.locator('.nominee-card').first().click();
    await page
      .getByRole('button', { name: i === 5 ? 'Revisar votos' : 'Próxima categoria' })
      .click();
  }
  await expect(page.getByRole('heading', { name: 'Revise suas escolhas.' })).toBeVisible();
  await expect(page.locator('.vote-review>div')).toHaveCount(6);
  await page.getByRole('button', { name: 'Concluir preview' }).click();
  await expect(
    page.getByRole('status').filter({ hasText: 'Nenhum voto foi registrado' }),
  ).toBeVisible();
});
test('required categories cannot be skipped and keyboard selection works', async ({ page }) => {
  await page.goto('/2026/vote');
  await page.getByRole('button', { name: 'Próxima categoria' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Selecione um indicado' })).toBeVisible();
  const card = page.locator('.nominee-card').first();
  await card.focus();
  await page.keyboard.press('Enter');
  await expect(card).toHaveAttribute('aria-pressed', 'true');
});
test('admin preview and archive stay isolated from live actions', async ({ page }) => {
  await page.goto('/admin/categories');
  await expect(page.getByRole('heading', { name: 'Categorias', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Nova categoria', exact: true }).click();
  await expect(page.getByLabel('Máximo de indicados')).toHaveValue('5');
  await page.goto('/admin/results');
  await expect(
    page.getByRole('heading', { name: 'Votação por categoria', exact: true }),
  ).toBeVisible();
  await expect(page.locator('.results-chart-card')).toHaveCount(6);
  await page.goto('/admin/media?edition=00000000-0000-4000-8000-000000000002');
  await expect(
    page.getByRole('heading', { name: 'Artes dos vencedores', exact: true }),
  ).toBeVisible();
  await expect(page.locator('.media-winner-card')).toHaveCount(6);
  await expect(page.getByLabel('Enviar arte para Theus, Membro do Ano')).toBeEnabled();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.goto('/2025/winners');
  await expect(page).toHaveURL(/\/2025\/winners$/);
  await expect(page.getByRole('heading', { name: 'Eles fizeram história.' })).toBeVisible();
  await expect(page.locator('.winner-category-section')).toHaveCount(6);
  await expect(page.locator('.winner-category-section').first()).toContainText('Membro do Ano');
  await expect(page.locator('.winner-podium')).toHaveCount(6);
  await expect(page.locator('.winner-podium').first().locator('.winner-card')).toHaveCount(3);
  await expect(page.locator('.winner-podium').first().locator('.winner-rank')).toHaveText([
    '2º lugar',
    '1º lugar',
    '3º lugar',
  ]);
  await expect(page.locator('.winner-card')).toHaveCount(18);
  await expect(page.locator('.winner-percentage')).toHaveCount(18);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
test('demo artwork upload appears in Hall da Fama and can be removed', async ({ page }) => {
  await page.goto('/admin/media?edition=00000000-0000-4000-8000-000000000002');
  await page.getByLabel('Enviar arte para Theus, Membro do Ano').setInputFiles({
    name: 'arte-teste.png',
    mimeType: 'image/png',
    buffer: Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScL/nwAAAABJRU5ErkJggg==',
      'base64',
    ),
  });
  await expect(page.getByLabel('Trocar arte para Theus, Membro do Ano')).toBeEnabled();
  await page.reload();
  await expect(page.getByLabel('Trocar arte para Theus, Membro do Ano')).toBeEnabled();
  await page.goto('/hall-of-fame');
  const winner = page.getByRole('link', { name: 'Theus, @theus, Membro do Ano' });
  await expect(winner.locator('img')).toHaveAttribute('src', /^blob:/);
  await page.goto('/admin/media?edition=00000000-0000-4000-8000-000000000002');
  await page
    .getByRole('button', {
      name: 'Remover arte personalizada de Theus, Membro do Ano',
    })
    .click();
  await expect(page.getByLabel('Enviar arte para Theus, Membro do Ano')).toBeEnabled();
});
test('trajectory opens as a dialog from cards and direct profile links', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/hall-of-fame');
  await page.locator('.winner-card').first().click();
  const dialog = page.getByRole('dialog', { name: 'Trajetória do membro' });
  await expect(dialog).toBeVisible();
  await expect(dialog.locator('.profile-heading')).toBeVisible();
  await expect(page).toHaveURL(/\/hall-of-fame\?member=/);
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  await expect(page).toHaveURL(/\/hall-of-fame$/);
  await page.goto('/members/900000000000000003');
  await expect(page).toHaveURL(/\/hall-of-fame\?member=900000000000000003$/);
  await expect(dialog).toBeVisible();
  await dialog.getByRole('button', { name: 'Fechar trajetória' }).click();
  await expect(dialog).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('small screens keep the full podium and compact trajectory label', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 720 });
  await page.goto('/2025/winners');
  const firstCategory = page.locator('.winner-podium').first();
  await expect(firstCategory.locator('.winner-card')).toHaveCount(3);
  await expect(firstCategory.locator('.winner-card--rank-2 .winner-rank')).toHaveText('2º lugar');
  await expect(firstCategory.locator('.winner-card--rank-1 .winner-rank')).toHaveText('1º lugar');
  await expect(firstCategory.locator('.winner-card--rank-3 .winner-rank')).toHaveText('3º lugar');
  await expect(
    firstCategory.locator('.winner-card--rank-1 .winner-trajectory-short'),
  ).toBeVisible();
  await expect(firstCategory.locator('.winner-card--rank-1 .winner-percentage')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('nominations search, manual fallback and category navigation work', async ({ page }) => {
  await page.goto('/2027/nominations');
  await expect(page.getByRole('heading', { name: 'Indicação', exact: true })).toBeVisible();
  await page.getByLabel('Buscar membro do servidor').fill('clai');
  await page.getByRole('option', { name: /Claiverty @claiverty/ }).click();
  await expect(page.locator('.chosen-members')).toContainText('Claiverty');
  await page.getByRole('button', { name: 'Staff do Ano', exact: true }).click();
  await page.getByRole('button', { name: 'Não encontrou? Indicar manualmente' }).click();
  await page.getByLabel('Nome para revisão').fill('Participante de exemplo');
  await page.getByRole('button', { name: 'Adicionar sugestão' }).click();
  await expect(page.locator('.chosen-members')).toContainText('precisa ser associada ao Discord');
  await page.getByRole('button', { name: 'Membro do Ano', exact: true }).click();
  await expect(page.locator('.chosen-members')).toContainText('Claiverty');
  await page.getByRole('button', { name: 'Enviar indicações' }).click();
  await expect(
    page.getByRole('status').filter({ hasText: 'não envia indicações reais' }),
  ).toBeVisible();
});
