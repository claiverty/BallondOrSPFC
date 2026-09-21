import { test, expect } from '@playwright/test';
test('home, navigation and mobile layout', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /Ballon d’Or.*SÃO PAULO/ })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.goto('/2026/vote');
  await expect(page.getByRole('heading', { name: 'Membro do Ano', exact: true })).toBeVisible();
});
test('history shows only current and closed editions in descending order', async ({ page }) => {
  await page.goto('/history');
  await expect(page.locator('.history-year')).toHaveText(['2026', '2025', '2024']);
  await expect(page.getByText('2027', { exact: true })).toHaveCount(0);
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
  await page.goto('/2025/winners');
  await expect(page).toHaveURL(/\/hall-of-fame$/);
  await expect(page.getByRole('heading', { name: 'Hall da Fama.' })).toBeVisible();
  await expect(page.locator('.winner-card')).toHaveCount(9);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
test('reduced motion and member pages render without browser errors', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/hall-of-fame');
  await page.locator('.winner-card').first().click();
  await expect(page.locator('.profile-heading')).toBeVisible();
  expect(errors).toEqual([]);
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
  await expect(page.locator('.chosen-members')).toContainText(
    'precisa ser associada ao Discord',
  );
  await page.getByRole('button', { name: 'Membro do Ano', exact: true }).click();
  await expect(page.locator('.chosen-members')).toContainText('Claiverty');
  await page.getByRole('button', { name: 'Enviar indicações' }).click();
  await expect(
    page.getByRole('status').filter({ hasText: 'não envia indicações reais' }),
  ).toBeVisible();
});
