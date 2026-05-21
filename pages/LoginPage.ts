import { Page, Locator } from '@playwright/test';
import { BasePage } from './BasePage';

export class LoginPage extends BasePage {
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly submitButton: Locator;
  readonly registerLink: Locator;

  constructor(page: Page) {
    super(page);
    this.emailInput = page.locator('[data-ui="login-email"]');
    this.passwordInput = page.locator('[data-ui="login-password"]');
    this.submitButton = page.getByRole('button', { name: 'Войти' });
    this.registerLink = page.getByRole('link', { name: 'Зарегистрироваться' });
  }

  async goto(): Promise<void> {
    await this.page.goto('/index.html');
  }

  async login(email: string, password: string): Promise<void> {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.submitButton.click();
  }
}
