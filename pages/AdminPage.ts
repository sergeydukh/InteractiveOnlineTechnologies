import { Page, Locator } from '@playwright/test';
import { BasePage } from './BasePage';

export class AdminPage extends BasePage {
  // Login section
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly submitButton: Locator;
  readonly loginError: Locator;

  readonly adminPanel: Locator;
  readonly userSearchInput: Locator;
  readonly usersContainer: Locator;
  readonly adminLogoutButton: Locator;
  readonly pagination: Locator;

  constructor(page: Page) {
    super(page);
    this.emailInput = page.locator('[data-ui="admin-email"]');
    this.passwordInput = page.locator('[data-ui="admin-password"]');
    this.submitButton = page.getByRole('button', { name: 'Войти' });
    this.loginError = page.locator('[data-ui="admin-login-error"]');

    this.adminPanel = page.locator('[data-ui="admin-panel"]');
    this.userSearchInput = page.locator('[data-ui="admin-user-search"]');
    this.usersContainer = page.locator('[data-ui="admin-users"]');
    this.adminLogoutButton = page.locator('[data-ui="admin-logout"]');
    this.pagination = page.locator('[data-ui="admin-pagination"]');
  }

  async goto(): Promise<void> {
    await this.page.goto('/admin.html');
  }

  async login(email: string, password: string): Promise<void> {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await Promise.all([
      this.page.waitForResponse(r => r.url().includes('/api/auth/login') && r.request().method() === 'POST'),
      this.submitButton.click(),
    ]);
  }

  async searchUser(emailQuery: string): Promise<void> {
    const responsePromise = this.page.waitForResponse(r =>
      r.url().includes('/api/admin/overview') &&
      r.url().includes('search=') &&
      r.request().method() === 'GET',
    );
    await this.userSearchInput.fill(emailQuery);
    await responsePromise;
  }
}
