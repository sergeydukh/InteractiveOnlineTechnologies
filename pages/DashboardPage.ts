import { Page, Locator, Response } from '@playwright/test';
import { BasePage } from '@pages/BasePage';

const TODO_ACTION_RETRY_DELAYS_MS = [2000, 5000, 10000, 20000];

export class DashboardPage extends BasePage {
  readonly logoutButton: Locator;
  readonly todoInput: Locator;
  readonly addTodoButton: Locator;
  readonly todosList: Locator;
  readonly emptyState: Locator;
  readonly loadingMessage: Locator;
  readonly filterAll: Locator;
  readonly filterActive: Locator;
  readonly filterCompleted: Locator;
  readonly toggleTagsSidebarButton: Locator;
  readonly tagsSidebar: Locator;
  readonly tagNameInput: Locator;
  readonly tagCreateControls: Locator;
  readonly tagColorGrid: Locator;
  readonly tagsList: Locator;
  readonly deleteTodoModal: Locator;
  readonly confirmDeleteButton: Locator;
  readonly cancelDeleteButton: Locator;

  constructor(page: Page) {
    super(page);
    this.logoutButton = page.locator('[data-ui="logout-button"]');
    this.todoInput = page.locator('[data-ui="todo-input"]');
    this.addTodoButton = page.locator('[data-ui="add-todo-button"]');
    this.todosList = page.locator('[data-ui="todos-list"]');
    this.emptyState = page.locator('[data-ui="empty-state"]');
    this.loadingMessage = page.locator('[data-ui="loading-message"]');
    this.filterAll = page.locator('[data-filter="all"]');
    this.filterActive = page.locator('[data-filter="active"]');
    this.filterCompleted = page.locator('[data-filter="completed"]');
    this.toggleTagsSidebarButton = page.locator('[data-ui="toggle-tags-sidebar-button"]');
    this.tagsSidebar = page.locator('[data-ui="tags-sidebar"]');
    this.tagNameInput = page.locator('[data-ui="tag-name-input"]');
    this.tagCreateControls = page.locator('[data-ui="tag-create-controls"]');
    this.tagColorGrid = page.locator('[data-ui="tag-color-grid"]');
    this.tagsList = page.locator('[data-ui="tags-list"]');
    this.deleteTodoModal = page.locator('[data-ui="delete-todo-modal"]');
    this.confirmDeleteButton = page.locator('[data-ui="confirm-delete-todo-button"]');
    this.cancelDeleteButton = page.locator('[data-ui="cancel-delete-todo-button"]');
  }

  async goto(): Promise<void> {
    await this.page.goto('/dashboard.html');
  }

  private async retryTodoAction(
    action: () => Promise<void>,
    predicate: (response: Response) => boolean,
  ): Promise<Response> {
    for (let attempt = 0; attempt <= TODO_ACTION_RETRY_DELAYS_MS.length; attempt += 1) {
      const responsePromise = this.page.waitForResponse(predicate);
      await action();
      const response = await responsePromise;

      if (response.ok()) {
        return response;
      }

      if (response.status() !== 429 || attempt === TODO_ACTION_RETRY_DELAYS_MS.length) {
        throw new Error(`UI action API ${response.status()} ${response.url()}: ${await response.text()}`);
      }

      await this.page.waitForTimeout(TODO_ACTION_RETRY_DELAYS_MS[attempt]);
    }

    throw new Error('UI action API exhausted retry attempts');
  }

  async addTodo(text: string): Promise<void> {
    await this.retryTodoAction(
      async () => {
        await this.todoInput.fill(text);
        await this.addTodoButton.click();
      },
      r => r.url().includes('/api/todos') && r.request().method() === 'POST',
    );
  }

  async waitForTodoVisible(title: string): Promise<void> {
    await this.todosList.getByRole('listitem').filter({ hasText: title }).first().waitFor({ state: 'visible' });
  }

  getTodoItem(title: string): Locator {
    return this.todosList.getByRole('listitem').filter({ hasText: title }).first();
  }

  getTodoTitle(title: string): Locator {
    return this.getTodoItem(title).getByRole('button', { name: 'Редактировать заметку' });
  }

  async completeTodo(title: string): Promise<void> {
    const item = this.getTodoItem(title);
    await this.retryTodoAction(
      () => item.getByRole('checkbox').check(),
      r => r.url().includes('/api/todos/') && r.request().method() === 'PATCH',
    );
  }

  async deleteTodo(title: string): Promise<void> {
    const deleteBtn = this.page.getByRole('button', { name: `Удалить заметку ${title}` });
    await this.retryTodoAction(
      async () => {
        if (!(await this.deleteTodoModal.isVisible())) {
          await deleteBtn.click();
          await this.deleteTodoModal.waitFor({ state: 'visible' });
        }
        await this.confirmDeleteButton.click();
      },
      r => r.url().includes('/api/todos/') && r.request().method() === 'DELETE',
    );
  }

  async editTodo(title: string, newTitle: string): Promise<void> {
    const item = this.getTodoItem(title);
    await this.retryTodoAction(
      async () => {
        const editInput = this.page.getByLabel('Редактирование заметки и тегов');
        if (!(await editInput.isVisible())) {
          await item.getByRole('button', { name: 'Редактировать заметку' }).dblclick();
          await editInput.waitFor({ state: 'visible' });
        }
        await editInput.fill(newTitle);
        await editInput.press('Enter');
      },
      r => r.url().includes('/api/todos/') && r.request().method() === 'PATCH',
    );
  }

  async openTagsSidebar(): Promise<void> {
    await this.toggleTagsSidebarButton.click();
    await this.tagsSidebar.waitFor({ state: 'visible' });
  }

  async createTag(tagName: string): Promise<void> {
    await this.openTagsSidebar();
    await this.tagNameInput.fill(tagName);
    await this.tagCreateControls.waitFor({ state: 'visible' });
    await this.tagColorGrid.getByRole('radio').first().click();
    await Promise.all([
      this.page.waitForResponse(r => r.url().includes('/api/tags') && r.request().method() === 'POST'),
      this.page.locator('[data-ui="tag-form"] button[type="submit"]').click(),
    ]);
    await this.tagsList.getByText(tagName, { exact: false }).waitFor({ state: 'visible' });
  }

  async selectTag(tagName: string): Promise<void> {
    await this.tagsList.getByText(`#${tagName}`, { exact: false }).click();
  }

  async logout(): Promise<void> {
    await Promise.all([
      this.page.waitForResponse(r => r.url().includes('/api/auth/logout') && r.request().method() === 'POST'),
      this.logoutButton.click(),
    ]);
  }
}
