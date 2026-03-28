import { expect, test } from '@playwright/test';
import { loginAs } from '../helpers/login';
import { users } from '../fixtures/e2e-users';

/**
 * Çalışan ve muhasebeci için tipik günlük akışlar (borç/ödeme sayfaları URL ile).
 */
test.describe('Çalışan ve muhasebeci ek senaryolar', () => {
  test('Çalışan borçlar sayfasına erişir', async ({ page }) => {
    await loginAs(page, users.calisan);
    await page.goto('/debts');
    await expect(page.getByRole('heading', { name: 'Borçlar' })).toBeVisible();
  });

  test('Çalışan ödemeler sayfasına erişir', async ({ page }) => {
    await loginAs(page, users.calisan);
    await page.goto('/payments');
    await expect(page.getByRole('heading', { name: 'Ödemeler' })).toBeVisible();
  });

  test('Muhasebeci borç/ödeme listesi URL ile engellenmez (sayfa açılır)', async ({ page }) => {
    await loginAs(page, users.muhasebeci);
    await page.goto('/debts');
    await expect(page.getByRole('heading', { name: 'Borçlar' })).toBeVisible();
    await page.goto('/payments');
    await expect(page.getByRole('heading', { name: 'Ödemeler' })).toBeVisible();
  });
});
