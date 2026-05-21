import { Page, Locator } from '@playwright/test';
import { BasePage } from './BasePage';

export interface RegisterData {
  name: string;
  email: string;
  gender: 'male' | 'female';
  password: string;
  analyticsConsent?: boolean;
}

export class RegisterPage extends BasePage {
  readonly nameInput: Locator;
  readonly emailInput: Locator;
  readonly genderSelect: Locator;
  readonly passwordInput: Locator;
  readonly photoInput: Locator;
  readonly analyticsConsentCheckbox: Locator;
  readonly submitButton: Locator;
  readonly loginLink: Locator;

  constructor(page: Page) {
    super(page);
    this.nameInput = page.locator('[data-ui="register-name"]');
    this.emailInput = page.locator('[data-ui="register-email"]');
    this.genderSelect = page.locator('[data-ui="register-gender"]');
    this.passwordInput = page.locator('[data-ui="register-password"]');
    this.photoInput = page.locator('[data-ui="register-photo"]');
    this.analyticsConsentCheckbox = page.locator('[data-ui="register-analytics-consent"]');
    this.submitButton = page.getByRole('button', { name: 'Зарегистрироваться' });
    this.loginLink = page.getByRole('link', { name: /Уже зарегистрированы\? Войти/ });
  }

  async goto(): Promise<void> {
    await this.page.goto('/register.html');
  }

  async register(data: RegisterData): Promise<void> {
    await this.nameInput.fill(data.name);
    await this.emailInput.fill(data.email);
    if (data.gender) {
      await this.genderSelect.selectOption(data.gender === 'male' ? '0' : '1');
    }
    await this.passwordInput.fill(data.password);
    if (data.analyticsConsent !== false) {
      await this.analyticsConsentCheckbox.check();
    }
    await this.submitButton.click();
  }
}
