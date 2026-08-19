import type { Locator, Page, Response } from '@playwright/test';

export class LoginPage {
  readonly email: Locator;
  readonly password: Locator;
  readonly submit: Locator;
  readonly registerLink: Locator;
  readonly error: Locator;

  constructor(readonly page: Page) {
    this.email = page.locator('[data-ui="login-email"]');
    this.password = page.locator('[data-ui="login-password"]');
    this.submit = page.getByRole('button', { name: 'Войти' });
    this.registerLink = page.getByRole('link', { name: 'Зарегистрироваться' });
    this.error = page.locator('[role="alert"], [data-ui="login-error"]');
  }

  async open(): Promise<void> {
    await this.page.goto('/index.html');
  }

  async login(email: string, password: string): Promise<Response> {
    await this.email.fill(email);
    await this.password.fill(password);
    const response = this.page.waitForResponse(
      (candidate) => candidate.url().includes('/api/auth/login') && candidate.request().method() === 'POST',
    );
    await this.submit.click();
    return response;
  }
}
