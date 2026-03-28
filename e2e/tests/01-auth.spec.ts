import { expect, test } from '@playwright/test';
import { LoginPage } from '../page-objects/login.page';
import { loginAs, logout } from '../helpers/login';
import { E2E_PASSWORD, users } from '../fixtures/e2e-users';

test.describe('Kimlik doğrulama', () => {
  test('Yanlış şifre ile giriş reddedilir', async ({ page }) => {
    const login = new LoginPage(page);
    await login.goto();
    await login.fillCredentials(users.admin, 'yanlis_sifre_12345');
    await login.submitLogin();
    await login.expectLoginError();
  });

  test('Admin ile başarılı giriş ve çıkış', async ({ page }) => {
    await loginAs(page, users.admin);
    await expect(page.getByText('Tahsilat').first()).toBeVisible();
    await logout(page);
  });

  test('Kayıt: şifre tekrarı uyuşmazsa hata', async ({ page }) => {
    const login = new LoginPage(page);
    await login.goto();
    await login.openRegister();
    await page.getByTestId('register-username').fill('x');
    await page.getByTestId('register-password').fill('secret12');
    await page.getByTestId('register-password-confirm').fill('secret34');
    await page.getByTestId('register-submit').click();
    await login.expectRegisterPasswordError();
  });

  test('Kayıt: yeni kullanıcı oluşturulur ve giriş formuna döner', async ({ page }) => {
    const u = `e2e_ui_${Date.now()}`;
    const login = new LoginPage(page);
    await login.goto();
    await login.openRegister();
    await login.register(u, 'E2EUiPass1');
    await expect(page.getByTestId('login-submit')).toBeVisible();
    await login.fillCredentials(u, 'E2EUiPass1');
    await login.submitLogin();
    await expect(page.getByTestId('nav-dashboard')).toBeVisible({ timeout: 20_000 });
  });
});
