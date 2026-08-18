import type { Locator, Page, Response } from '@playwright/test';

export class TodoList {
  readonly input: Locator;
  readonly addButton: Locator;
  readonly root: Locator;
  readonly filterAll: Locator;
  readonly filterActive: Locator;
  readonly filterCompleted: Locator;
  readonly deleteDialog: Locator;

  constructor(private readonly page: Page) {
    this.input = page.locator('[data-ui="todo-input"]');
    this.addButton = page.locator('[data-ui="add-todo-button"]');
    this.root = page.locator('[data-ui="todos-list"]');
    this.filterAll = page.locator('[data-filter="all"]');
    this.filterActive = page.locator('[data-filter="active"]');
    this.filterCompleted = page.locator('[data-filter="completed"]');
    this.deleteDialog = page.locator('[data-ui="delete-todo-modal"]');
  }

  item(title: string): Locator {
    return this.root.getByRole('listitem').filter({ hasText: title });
  }

  async create(title: string): Promise<Response> {
    await this.input.fill(title);
    const response = this.mutation('POST', '/api/todos', () => this.addButton.click());
    await this.item(title).waitFor({ state: 'visible' });
    return response;
  }

  async complete(title: string): Promise<Response> {
    return this.mutation('PATCH', '/api/todos/', () => this.item(title).getByRole('checkbox').check());
  }

  async edit(title: string, replacement: string): Promise<Response> {
    const item = this.item(title);
    await item.getByRole('button', { name: 'Редактировать заметку' }).dblclick();
    const editor = this.page.getByLabel('Редактирование заметки и тегов');
    await editor.fill(replacement);
    const response = this.mutation('PATCH', '/api/todos/', () => editor.press('Enter'));
    await this.item(replacement).waitFor({ state: 'visible' });
    return response;
  }

  async openDelete(title: string): Promise<void> {
    await this.page.getByRole('button', { name: `Удалить заметку ${title}` }).click();
    await this.deleteDialog.waitFor({ state: 'visible' });
  }

  async cancelDelete(): Promise<void> {
    await this.page.locator('[data-ui="cancel-delete-todo-button"]').click();
    await this.deleteDialog.waitFor({ state: 'hidden' });
  }

  async confirmDelete(): Promise<Response> {
    const response = this.mutation('DELETE', '/api/todos/', () =>
      this.page.locator('[data-ui="confirm-delete-todo-button"]').click(),
    );
    await this.deleteDialog.waitFor({ state: 'hidden' });
    return response;
  }

  private async mutation(method: string, path: string, action: () => Promise<void>): Promise<Response> {
    const response = this.page.waitForResponse(
      (candidate) => candidate.url().includes(path) && candidate.request().method() === method,
    );
    await action();
    return response;
  }
}
