import type { Browser, BrowserContext } from '@playwright/test';
import type { AuthSession } from '../auth/session';
import { storageStateFor } from './storageState';
import { installFirstPartyApiAccess } from './firstPartyApiAccess';

export class AppBrowserContextFactory {
  constructor(
    private readonly browser: Browser,
    private readonly baseUrl: string,
    private readonly accessKey: string,
  ) {}

  async create(session?: AuthSession): Promise<BrowserContext> {
    const context = await this.browser.newContext({
      baseURL: this.baseUrl,
      serviceWorkers: 'block',
      ...(session ? { storageState: storageStateFor(this.baseUrl, session) } : {}),
    });
    await installFirstPartyApiAccess(context, this.baseUrl, this.accessKey);
    return context;
  }
}
