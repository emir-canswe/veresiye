import { expect, type Page } from '@playwright/test';
import { BasePage } from './base-page';
import { E2E_PASSWORD } from '../fixtures/e2e-users';

export class LoginPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  async goto(): Promise<void> {
    await this.page.goto('/');
    await expect(this.page.getByTestId('login-submit')).toBeVisible();
  }

  async fillCredentials(username: string, password: string = E2E_PASSWORD): Promise<void> {
    await this.page.getByTestId('login-username').fill(username);
    await this.page.getByTestId('login-password').fill(password);
  }

  async submitLogin(): Promise<void> {
    await this.page.getByTestId('login-submit').click();
  }

  async openRegister(): Promise<void> {
    await this.page.getByTestId('login-open-register').click();
    await expect(this.page.getByTestId('register-submit')).toBeVisible();
  }

  async register(username: string, password: string): Promise<void> {
    await this.page.getByTestId('register-username').fill(username);
    await this.page.getByTestId('register-password').fill(password);
    await this.page.getByTestId('register-password-confirm').fill(password);
    await this.page.getByTestId('register-submit').click();
  }

  async expectLoginError(): Promise<void> {
    await expect(this.page.getByText(/Kullanıcı adı veya şifre hatalı/)).toBeVisible();
  }

  async expectRegisterPasswordError(): Promise<void> {
    await expect(this.page.getByText(/Şifreler eşleşmiyor/)).toBeVisible();
  }
}
