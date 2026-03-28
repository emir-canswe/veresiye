import { expect, type Page } from '@playwright/test';
import { E2E_PASSWORD } from '../fixtures/e2e-users';

export async function loginAs(page: Page, username: string, password: string = E2E_PASSWORD): Promise<void> {
  await page.goto('/');
  await page.getByTestId('login-username').fill(username);
  await page.getByTestId('login-password').fill(password);
  await page.getByTestId('login-submit').click();
  await expect(page.getByTestId('nav-dashboard')).toBeVisible({ timeout: 20_000 });
}

export async function logout(page: Page): Promise<void> {
  await page.getByTestId('user-menu-trigger').click();
  await page.getByTestId('user-logout').click();
  await expect(page.getByTestId('login-submit')).toBeVisible({ timeout: 10_000 });
}

export async function openSettings(page: Page): Promise<void> {
  await page.getByTestId('user-menu-trigger').click();
  await page.getByTestId('nav-settings').click();
  await expect(page.getByRole('heading', { name: 'Ayarlar' })).toBeVisible();
}
