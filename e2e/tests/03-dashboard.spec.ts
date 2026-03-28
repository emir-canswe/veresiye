import { expect, test } from '@playwright/test';
import { loginAs } from '../helpers/login';
import { users } from '../fixtures/e2e-users';

test.describe('Dashboard', () => {
  test('Admin dashboard başlığı ve özet içerik yüklenir', async ({ page }) => {
    await loginAs(page, users.admin);
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
    await expect(page.getByText('Finansal durumunuza genel bakış')).toBeVisible();
  });

  test('Muhasebeci dashboard erişebilir', async ({ page }) => {
    await loginAs(page, users.muhasebeci);
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
  });
});
