import { expect, test } from '@playwright/test';
import { loginAs } from '../helpers/login';
import { users } from '../fixtures/e2e-users';

test.describe('Müşteriler', () => {
  test('Yeni müşteri eklenir, aranır ve detay sayfasına gidilir', async ({ page }) => {
    const name = `E2E Müşteri ${Date.now()}`;
    await loginAs(page, users.admin);
    await page.getByTestId('nav-customers').click();
    await expect(page.getByRole('heading', { name: 'Müşteriler' })).toBeVisible();

    await page.getByTestId('customers-add').click();
    await expect(page.getByTestId('customer-new-modal')).toBeVisible();
    await page.getByTestId('customer-form-name').fill(name);
    await page.getByTestId('customer-form-save').click();
    await expect(page.getByText(name).first()).toBeVisible({ timeout: 10_000 });

    await page.getByTestId('customers-search').fill(name);
    await page.getByText(name).first().click();
    await expect(page.getByTestId('customer-detail-title')).toHaveText(name);
    await expect(page.getByRole('button', { name: /Müşteriler/ })).toBeVisible();
  });

  test('Müşteri detayında borç ve ödeme butonları görünür', async ({ page }) => {
    const name = `E2E Detay ${Date.now()}`;
    await loginAs(page, users.admin);
    await page.getByTestId('nav-customers').click();
    await page.getByTestId('customers-add').click();
    await page.getByTestId('customer-form-name').fill(name);
    await page.getByTestId('customer-form-save').click();
    await page.getByText(name).first().click();
    await expect(page.getByRole('button', { name: '+ Borç Ekle' })).toBeVisible();
    await expect(page.getByRole('button', { name: '+ Ödeme Al' })).toBeVisible();
  });
});
