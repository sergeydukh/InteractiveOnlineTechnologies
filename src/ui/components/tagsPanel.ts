import type { Locator, Page, Response } from '@playwright/test';

export class TagsPanel {
  readonly root: Locator;
  readonly toggle: Locator;
  readonly name: Locator;
  readonly colors: Locator;
  readonly list: Locator;
  readonly closeButton: Locator;

  constructor(private readonly page: Page) {
    this.root = page.locator('[data-ui="tags-sidebar"]');
    this.toggle = page.locator('[data-ui="toggle-tags-sidebar-button"]');
    this.name = page.locator('[data-ui="tag-name-input"]');
    this.colors = page.locator('[data-ui="tag-color-grid"]');
    this.list = page.locator('[data-ui="tags-list"]');
    this.closeButton = page.locator('[data-ui="close-tags-sidebar-button"]');
  }

  async open(): Promise<void> {
    if (await this.root.isVisible()) return;
    await this.toggle.click();
    await this.root.waitFor({ state: 'visible' });
  }

  async create(name: string): Promise<Response> {
    await this.open();
    await this.name.fill(name);
    await this.page.locator('[data-ui="tag-create-controls"]').waitFor({ state: 'visible' });
    await this.colors.getByRole('radio').first().click();
    const response = this.page.waitForResponse(
      (candidate) => candidate.url().includes('/api/tags') && candidate.request().method() === 'POST',
    );
    await this.page.locator('[data-ui="tag-form"] button[type="submit"]').click();
    await this.list.getByText(name, { exact: false }).waitFor({ state: 'visible' });
    return response;
  }

  async select(name: string): Promise<void> {
    await this.list.getByText(`#${name}`, { exact: false }).click();
  }

  async close(): Promise<void> {
    await this.closeButton.click();
    await this.root.waitFor({ state: 'hidden' });
  }

  async search(value: string): Promise<Response> {
    await this.open();
    const response = this.page.waitForResponse(
      (candidate) => candidate.url().includes('/api/tags?') && candidate.request().method() === 'GET',
    );
    await this.name.fill(value);
    return response;
  }

  async delete(name: string): Promise<Response> {
    await this.open();
    const response = this.page.waitForResponse(
      (candidate) => candidate.url().includes('/api/tags/') && candidate.request().method() === 'DELETE',
    );
    await this.page.getByRole('button', { name: `Удалить тег ${name}` }).click();
    return response;
  }
}
