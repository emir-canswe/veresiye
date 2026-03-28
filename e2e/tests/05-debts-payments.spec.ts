import { expect, test } from '@playwright/test';
import { AuthAction } from '../backend/actions/auth.action';
import { loginAs } from '../helpers/login';
import { users } from '../fixtures/e2e-users';

test.describe('Borçlar ve ödemeler sayfaları', () => {
  test('Borç kaydı oluşturulur', async ({ page, request }) => {
    const auth = new AuthAction(request);
    const { id: customerId } = await auth.createCustomer(`E2E Borç ${Date.now()}`);

    await loginAs(page, users.admin);
    await page.goto('/debts');
    await expect(page.getByRole('heading', { name: 'Borçlar' })).toBeVisible();

    await page.getByTestId('debts-add').click();
    await expect(page.getByTestId('debt-modal')).toBeVisible();
    await page.getByTestId('debt-customer').selectOption(String(customerId));
    await page.getByTestId('debt-amount').fill('250.5');
    await page.getByTestId('debt-category').fill('E2E');
    await page.getByTestId('debt-save').click();
    await expect(page.getByText('E2E').first()).toBeVisible({ timeout: 10_000 });
  });

  test('Ödeme kaydı oluşturulur', async ({ page, request }) => {
    const auth = new AuthAction(request);
    const { id: customerId } = await auth.createCustomer(`E2E Ödeme ${Date.now()}`);

    await loginAs(page, users.admin);
    await page.goto('/payments');
    await expect(page.getByRole('heading', { name: 'Ödemeler' })).toBeVisible();

    await page.getByTestId('payments-add').click();
    await expect(page.getByTestId('payment-modal')).toBeVisible();
    await page.getByTestId('payment-customer').selectOption(String(customerId));
    await page.getByTestId('payment-amount').fill('100');
    await page.getByTestId('payment-method').selectOption('nakit');
    await page.getByTestId('payment-save').click();
    await expect(page.getByText('💵 Nakit').first()).toBeVisible({ timeout: 10_000 });
  });
});
