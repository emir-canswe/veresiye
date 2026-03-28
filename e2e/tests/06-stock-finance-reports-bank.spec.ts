import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { expect, test } from '@playwright/test';
import { loginAs } from '../helpers/login';
import { users } from '../fixtures/e2e-users';

test.describe('Stok, gelir-gider, raporlar, banka ekstre', () => {
  test('Stok: yeni ürün eklenir', async ({ page }) => {
    const product = `E2E Ürün ${Date.now()}`;
    await loginAs(page, users.admin);
    await page.getByTestId('nav-stock').click();
    await expect(page.getByRole('heading', { name: 'Stok Yönetimi' })).toBeVisible();

    await page.getByTestId('stock-add-product').click();
    await expect(page.getByTestId('stock-product-modal')).toBeVisible();
    await page.getByTestId('stock-product-name').fill(product);
    await page.getByTestId('stock-product-save').click();
    await expect(page.getByText(product).first()).toBeVisible({ timeout: 10_000 });
  });

  test('Gelir/Gider: yeni gelir kaydı', async ({ page }) => {
    await loginAs(page, users.admin);
    await page.getByTestId('nav-finance').click();
    await expect(page.getByRole('heading', { name: 'Gelir / Gider' })).toBeVisible();

    await page.getByTestId('finance-add').click();
    await expect(page.getByTestId('finance-modal')).toBeVisible();
    await page.getByTestId('finance-type').selectOption('gelir');
    await page.getByTestId('finance-amount').fill('999');
    await page.getByTestId('finance-category').fill('E2E Gelir');
    await page.getByTestId('finance-save').click();
    await expect(page.getByText('E2E Gelir').first()).toBeVisible({ timeout: 10_000 });
  });

  test('Raporlar: PDF ve Excel indirmesi tetiklenir', async ({ page }) => {
    await loginAs(page, users.admin);
    await page.getByTestId('nav-reports').click();
    await expect(page.getByRole('heading', { name: 'Raporlar' })).toBeVisible();

    const pdfWait = page.waitForEvent('download', { timeout: 20_000 });
    await page.getByTestId('reports-pdf').click();
    const pdf = await pdfWait;
    expect(pdf.suggestedFilename().toLowerCase()).toMatch(/\.pdf$/);

    const xlsxWait = page.waitForEvent('download', { timeout: 20_000 });
    await page.getByTestId('reports-excel').click();
    const xlsx = await xlsxWait;
    expect(xlsx.suggestedFilename().toLowerCase()).toMatch(/\.xlsx$/);
  });

  test('Muhasebeci gelir/gider ve raporlara erişir', async ({ page }) => {
    await loginAs(page, users.muhasebeci);
    await page.getByTestId('nav-finance').click();
    await expect(page.getByRole('heading', { name: 'Gelir / Gider' })).toBeVisible();
    await page.getByTestId('nav-reports').click();
    await expect(page.getByRole('heading', { name: 'Raporlar' })).toBeVisible();
  });

  test('Akıllı ödeme: CSV ekstre yüklenir', async ({ page }) => {
    await loginAs(page, users.admin);
    await page.getByTestId('nav-bank').click();
    await expect(page.getByRole('heading', { name: 'Akıllı Ödeme' })).toBeVisible();

    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'veresiye-e2e-'));
    const csvPath = path.join(dir, 'ekstre.csv');
    fs.writeFileSync(
      csvPath,
      'tarih,gonderen,iban,tutar,aciklama\n01.01.2024,E2E Test,TR330006100519786457841326,150.00,E2E CSV'
    );

    const [uploadRes] = await Promise.all([
      page.waitForResponse(
        (r) => r.url().includes('/bank/upload') && r.request().method() === 'POST',
        { timeout: 30_000 }
      ),
      page.getByTestId('bank-upload-input').setInputFiles(csvPath),
    ]);
    expect(uploadRes.ok(), `upload status ${uploadRes.status()}`).toBeTruthy();
    await expect(page.getByRole('heading', { name: 'Akıllı Ödeme' })).toBeVisible();
  });
});
