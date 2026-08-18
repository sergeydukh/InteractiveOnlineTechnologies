import type { Locator, Page, Response } from '@playwright/test';

export class AdminPage {
  readonly email: Locator;
  readonly password: Locator;
  readonly submit: Locator;
  readonly panel: Locator;
  readonly users: Locator;
  readonly search: Locator;
  readonly logoutButton: Locator;

  constructor(readonly page: Page) {
    this.email = page.locator('[data-ui="admin-email"]');
    this.password = page.locator('[data-ui="admin-password"]');
    this.submit = page.getByRole('button', { name: 'Войти' });
    this.panel = page.locator('[data-ui="admin-panel"]');
    this.users = page.locator('[data-ui="admin-users"]');
    this.search = page.locator('[data-ui="admin-user-search"]');
    this.logoutButton = page.locator('[data-ui="admin-logout"]');
  }

  async open(): Promise<void> {
    await this.page.goto('/admin.html');
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

  async searchFor(email: string): Promise<Response> {
    const response = this.page.waitForResponse(
      (candidate) => candidate.url().includes('/api/admin/overview') && candidate.url().includes('search='),
    );
    await this.search.fill(email);
    return response;
  }

  async logout(): Promise<Response> {
    const response = this.page.waitForResponse(
      (candidate) => candidate.url().includes('/api/auth/logout') && candidate.request().method() === 'POST',
    );
    await this.logoutButton.click();
    return response;
  }
}
