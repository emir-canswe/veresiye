import { expect, type Page } from '@playwright/test';
import { BasePage } from './base-page';

export class AppShellPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  async expectNavVisible(...testIds: string[]): Promise<void> {
    for (const id of testIds) {
      await expect(this.page.getByTestId(id)).toBeVisible();
    }
  }

  async expectNavHidden(...testIds: string[]): Promise<void> {
    for (const id of testIds) {
      await expect(this.page.getByTestId(id)).toHaveCount(0);
    }
  }

  async goToCustomers(): Promise<void> {
    await this.page.getByTestId('nav-customers').click();
    await expect(this.page.getByRole('heading', { name: 'Müşteriler' })).toBeVisible();
  }

  async goToDashboard(): Promise<void> {
    await this.page.getByTestId('nav-dashboard').click();
    await expect(this.page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
  }
}
