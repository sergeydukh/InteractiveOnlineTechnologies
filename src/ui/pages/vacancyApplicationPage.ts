import type { Locator, Page } from '@playwright/test';

export class VacancyApplicationPage {
  readonly fullName: Locator;
  readonly submit: Locator;
  readonly result: Locator;

  constructor(readonly page: Page) {
    this.fullName = page.locator('[data-ui="vacancy-full-name"]');
    this.submit = page.getByRole('button', { name: 'Получить ключ доступа' });
    this.result = page.locator('[data-ui="vacancy-result"]');
  }

  async open(): Promise<void> {
    await this.page.goto('/vacancy-application.html');
  }

  validity(): Promise<{ valid: boolean; valueMissing: boolean }> {
    return this.fullName.evaluate((element) => {
      if (!(element instanceof HTMLInputElement)) throw new Error('Full name must be an input element.');
      return { valid: element.validity.valid, valueMissing: element.validity.valueMissing };
    });
  }
}
