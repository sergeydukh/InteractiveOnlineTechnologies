import type { Locator, Page, Response } from '@playwright/test';

export class PasswordDialog {
  readonly root: Locator;
  readonly message: Locator;

  constructor(private readonly page: Page) {
    this.root = page.locator('[data-ui="password-modal"]');
    this.message = page.locator('[data-ui="password-form-message"]');
  }

  async open(): Promise<void> {
    if (await this.root.isVisible()) return;
    await this.page.locator('[data-ui="profile-open-password-modal"]').click();
    await this.root.waitFor({ state: 'visible' });
  }

  async submit(newPassword: string, confirmation: string, expectRequest = true): Promise<Response | undefined> {
    await this.open();
    await this.page.locator('[data-ui="profile-new-password"]').fill(newPassword);
    await this.page.locator('[data-ui="profile-confirm-password"]').fill(confirmation);
    const save = this.root.getByRole('button', { name: 'Сохранить пароль' });
    if (!expectRequest) {
      await save.click();
      return undefined;
    }
    const response = this.page.waitForResponse(
      (candidate) => candidate.url().includes('/api/profile/password') && candidate.request().method() === 'POST',
    );
    await save.click();
    return response;
  }

  async cancel(): Promise<void> {
    await this.page.locator('[data-ui="password-modal-cancel"]').click();
    await this.root.waitFor({ state: 'hidden' });
  }

  async close(): Promise<void> {
    await this.page.locator('[data-ui="password-modal-close"]').click();
    await this.root.waitFor({ state: 'hidden' });
  }
}
