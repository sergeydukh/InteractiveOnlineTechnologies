import type { Locator, Page, Response } from '@playwright/test';

export interface UiRegistrationData {
  readonly name: string;
  readonly email: string;
  readonly gender: '0' | '1';
  readonly password: string;
  readonly analyticsConsent: boolean;
}

export class RegisterPage {
  readonly name: Locator;
  readonly email: Locator;
  readonly gender: Locator;
  readonly password: Locator;
  readonly photo: Locator;
  readonly analyticsConsent: Locator;
  readonly submit: Locator;
  readonly error: Locator;

  constructor(readonly page: Page) {
    this.name = page.locator('[data-ui="register-name"]');
    this.email = page.locator('[data-ui="register-email"]');
    this.gender = page.locator('[data-ui="register-gender"]');
    this.password = page.locator('[data-ui="register-password"]');
    this.photo = page.locator('[data-ui="register-photo"]');
    this.analyticsConsent = page.locator('[data-ui="register-analytics-consent"]');
    this.submit = page.getByRole('button', { name: 'Зарегистрироваться' });
    this.error = page.locator('[role="alert"], [data-ui="register-error"]');
  }

  async open(): Promise<void> {
    await this.page.goto('/register.html');
  }

  async completeForm(data: UiRegistrationData): Promise<void> {
    await this.name.fill(data.name);
    await this.email.fill(data.email);
    await this.gender.selectOption(data.gender);
    await this.password.fill(data.password);
    await this.analyticsConsent.setChecked(data.analyticsConsent);
  }

  async register(data: UiRegistrationData): Promise<Response> {
    await this.completeForm(data);
    const response = this.page.waitForResponse(
      (candidate) => candidate.url().includes('/api/auth/register') && candidate.request().method() === 'POST',
    );
    await this.submit.click();
    return response;
  }

  consentValidity(): Promise<{ valid: boolean; valueMissing: boolean }> {
    return this.analyticsConsent.evaluate((element) => {
      if (!(element instanceof HTMLInputElement)) throw new Error('Consent must be an input element.');
      return { valid: element.validity.valid, valueMissing: element.validity.valueMissing };
    });
  }
}
