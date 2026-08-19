import type { Locator, Page, Response } from '@playwright/test';

export class AdminPage {
  readonly email: Locator;
  readonly password: Locator;
  readonly submit: Locator;
  readonly panel: Locator;
  readonly users: Locator;
  readonly search: Locator;
  readonly logoutButton: Locator;
  readonly pagination: Locator;
  readonly eventModal: Locator;
  readonly eventJson: Locator;

  constructor(readonly page: Page) {
    this.email = page.locator('[data-ui="admin-email"]');
    this.password = page.locator('[data-ui="admin-password"]');
    this.submit = page.getByRole('button', { name: 'Войти' });
    this.panel = page.locator('[data-ui="admin-panel"]');
    this.users = page.locator('[data-ui="admin-users"]');
    this.search = page.locator('[data-ui="admin-user-search"]');
    this.logoutButton = page.locator('[data-ui="admin-logout"]');
    this.pagination = page.locator('[data-ui="admin-pagination"]');
    this.eventModal = page.locator('[data-ui="admin-json-modal"]');
    this.eventJson = page.locator('[data-ui="admin-json-modal-code"]');
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

  async openFirstEventJson(): Promise<void> {
    await this.users.getByRole('button', { name: 'Показать JSON' }).first().click();
    await this.eventModal.waitFor({ state: 'visible' });
  }

  async closeEventJson(): Promise<void> {
    await this.eventModal.locator('[data-ui="admin-json-modal-close"]').click();
    await this.eventModal.waitFor({ state: 'hidden' });
  }

  async goToNextPage(): Promise<Response> {
    const response = this.page.waitForResponse(
      (candidate) => candidate.url().includes('/api/admin/overview') && candidate.url().includes('page='),
    );
    await this.pagination.locator('[data-ui="admin-page-next"]').click();
    return response;
  }
}
