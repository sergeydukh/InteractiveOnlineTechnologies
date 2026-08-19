import type { Locator, Page } from '@playwright/test';
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

  async logout(): Promise<void> {
    // A login response can arrive before dashboard.js attaches its DOMContentLoaded handlers.
    await this.page.waitForLoadState('domcontentloaded');
    await Promise.all([this.page.waitForURL(/index\.html/u), this.logoutButton.click()]);
  }
}
