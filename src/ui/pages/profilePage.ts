import type { Locator, Page, Response } from '@playwright/test';
import { PasswordDialog } from '../components/passwordDialog';

export class ProfilePage {
  readonly passwordDialog: PasswordDialog;
  readonly name: Locator;
  readonly email: Locator;
  readonly male: Locator;
  readonly female: Locator;
  readonly consent: Locator;
  readonly avatar: Locator;
  readonly photoInput: Locator;

  constructor(readonly page: Page) {
    this.passwordDialog = new PasswordDialog(page);
    this.name = page.locator('[data-ui="profile-name"]');
    this.email = page.locator('[data-ui="profile-email"]');
    this.male = page.locator('[data-ui="profile-gender-male"]');
    this.female = page.locator('[data-ui="profile-gender-female"]');
    this.consent = page.locator('[data-ui="profile-analytics-consent"]');
    this.avatar = page.locator('[data-ui="profile-avatar"]');
    this.photoInput = page.locator('[data-ui="profile-photo-input"]');
  }

  async open(): Promise<void> {
    await this.page.goto('/profile.html');
  }

  async save(data: Readonly<{ name?: string; gender?: '0' | '1'; consent?: boolean }>): Promise<Response> {
    if (data.name !== undefined) await this.name.fill(data.name);
    if (data.gender === '0') await this.male.check();
    if (data.gender === '1') await this.female.check();
    if (data.consent !== undefined) await this.consent.setChecked(data.consent);
    const response = this.page.waitForResponse(
      (candidate) => candidate.url().includes('/api/profile') && candidate.request().method() === 'PATCH',
    );
    await this.page.locator('[data-ui="profile-submit"]').click();
    return response;
  }

  async upload(file: string): Promise<Response> {
    const response = this.page.waitForResponse(
      (candidate) => candidate.url().includes('/api/profile/photo') && candidate.request().method() === 'POST',
    );
    await this.photoInput.setInputFiles(file);
    return response;
  }

  async removeAvatar(): Promise<Response> {
    const response = this.page.waitForResponse(
      (candidate) => candidate.url().includes('/api/profile') && candidate.request().method() === 'PATCH',
    );
    await this.page.locator('[data-ui="profile-remove-photo-button"]').click();
    return response;
  }
}
