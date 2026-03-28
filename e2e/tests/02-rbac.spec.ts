import { expect, test } from '@playwright/test';
import { AppShellPage } from '../page-objects/app-shell.page';
import { loginAs } from '../helpers/login';
import { users } from '../fixtures/e2e-users';

test.describe('Rol tabanlı menü ve sayfa erişimi', () => {
  test('Admin tüm ana menü öğelerini görür', async ({ page }) => {
    await loginAs(page, users.admin);
    const shell = new AppShellPage(page);
    await shell.expectNavVisible(
      'nav-dashboard',
      'nav-customers',
      'nav-stock',
      'nav-finance',
      'nav-bank',
      'nav-reports'
    );
  });

  test('Çalışan Gelir/Gider ve Raporlar menüsünü görmez', async ({ page }) => {
    await loginAs(page, users.calisan);
    const shell = new AppShellPage(page);
    await shell.expectNavVisible('nav-dashboard', 'nav-customers', 'nav-stock', 'nav-bank');
    await shell.expectNavHidden('nav-finance', 'nav-reports');
  });

  test('Çalışan /finance URL ile gidince Erişim Yok', async ({ page }) => {
    await loginAs(page, users.calisan);
    await page.goto('/finance');
    await expect(page.getByRole('heading', { name: 'Erişim Yok' })).toBeVisible();
  });

  test('Çalışan /reports URL ile gidince Erişim Yok', async ({ page }) => {
    await loginAs(page, users.calisan);
    await page.goto('/reports');
    await expect(page.getByRole('heading', { name: 'Erişim Yok' })).toBeVisible();
  });

  test('Muhasebeci Müşteri, Stok ve Akıllı Ödeme menüsünü görmez', async ({ page }) => {
    await loginAs(page, users.muhasebeci);
    const shell = new AppShellPage(page);
    await shell.expectNavVisible('nav-dashboard', 'nav-finance', 'nav-reports');
    await shell.expectNavHidden('nav-customers', 'nav-stock', 'nav-bank');
  });

  test('Muhasebeci /customers URL ile gidince Erişim Yok', async ({ page }) => {
    await loginAs(page, users.muhasebeci);
    await page.goto('/customers');
    await expect(page.getByRole('heading', { name: 'Erişim Yok' })).toBeVisible();
  });

  test('Muhasebeci /stock URL ile gidince Erişim Yok', async ({ page }) => {
    await loginAs(page, users.muhasebeci);
    await page.goto('/stock');
    await expect(page.getByRole('heading', { name: 'Erişim Yok' })).toBeVisible();
  });

  test('Muhasebeci /bank URL ile gidince Erişim Yok', async ({ page }) => {
    await loginAs(page, users.muhasebeci);
    await page.goto('/bank');
    await expect(page.getByRole('heading', { name: 'Erişim Yok' })).toBeVisible();
  });
});
