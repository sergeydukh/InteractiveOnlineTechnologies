import type { Locator, Page, Response } from '@playwright/test';
import { TagsPanel } from '../components/tagsPanel';
import { TodoList } from '../components/todoList';

export class DashboardPage {
  readonly todos: TodoList;
  readonly tags: TagsPanel;
  readonly logoutButton: Locator;

  constructor(readonly page: Page) {
    this.todos = new TodoList(page);
    this.tags = new TagsPanel(page);
    this.logoutButton = page.locator('[data-ui="logout-button"]');
  }

  async open(): Promise<void> {
    await this.page.goto('/dashboard.html');
  }

  async logout(): Promise<Response> {
    const response = this.page.waitForResponse(
      (candidate) => candidate.url().includes('/api/auth/logout') && candidate.request().method() === 'POST',
    );
    await this.logoutButton.click();
    return response;
  }
}
