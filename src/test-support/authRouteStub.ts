import type { Page } from '@playwright/test';

export class AuthRouteStub {
  constructor(private readonly page: Page) {}

  async rejectLogin(message = 'Invalid credentials'): Promise<void> {
    await this.page.route('**/api/auth/login', async (route) => {
      if (route.request().method() !== 'POST') return route.fallback();
      await route.fulfill({ status: 400, contentType: 'application/json', body: JSON.stringify({ message }) });
    });
  }
}
