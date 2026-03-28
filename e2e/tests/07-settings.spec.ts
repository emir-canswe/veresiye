import { expect, test } from '@playwright/test';
import { loginAs, openSettings } from '../helpers/login';
import { E2E_PASSWORD, users } from '../fixtures/e2e-users';

test.describe('Ayarlar ve admin kullanıcı yönetimi', () => {
  test('Ayarlar sayfası hesap sekmesi açılır', async ({ page }) => {
    await loginAs(page, users.admin);
    await openSettings(page);
    await expect(page.getByTestId('settings-tab-hesap')).toBeVisible();
  });

  test('Admin İşletme sekmesini görür', async ({ page }) => {
    await loginAs(page, users.admin);
    await openSettings(page);
    await expect(page.getByTestId('settings-tab-isletme')).toBeVisible();
    await page.getByTestId('settings-tab-isletme').click();
    await expect(page.getByText('İşletme bilgileri')).toBeVisible();
  });

  test('Admin yeni kullanıcı oluşturur', async ({ page }) => {
    const newUser = `e2e_created_${Date.now()}`;
    await loginAs(page, users.admin);
    await openSettings(page);
    await page.getByTestId('settings-tab-kullanicilar').click();
    await expect(page.getByText('Kullanıcı Yönetimi')).toBeVisible();

    await page.getByTestId('settings-add-user').click();
    await expect(page.getByTestId('settings-user-modal')).toBeVisible();
    await page.getByTestId('settings-user-username').fill(newUser);
    await page.getByTestId('settings-user-password').fill(E2E_PASSWORD);
    await page.getByTestId('settings-user-role').selectOption('calisan');
    await page.getByTestId('settings-user-create').click();

    await expect(page.getByText('Kullanıcı oluşturuldu!')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText(newUser).first()).toBeVisible();
  });

  test('Çalışan kullanıcılar sekmesini görmez', async ({ page }) => {
    await loginAs(page, users.calisan);
    await openSettings(page);
    await expect(page.getByTestId('settings-tab-kullanicilar')).toHaveCount(0);
  });

  test('Yedekleme sekmesi: JSON yedeği indirilir', async ({ page }) => {
    await loginAs(page, users.admin);
    await openSettings(page);
    await page.getByTestId('settings-tab-yedek').click();
    await expect(page.getByText('Veri Yedeği İndir')).toBeVisible();

    const dl = page.waitForEvent('download', { timeout: 30_000 });
    await page.getByTestId('settings-backup-download').click();
    const download = await dl;
    expect(download.suggestedFilename().toLowerCase()).toMatch(/\.json$/);
  });
});
