import { baseUrl, requireE2ESecrets } from '../config/environment';
import { AppBrowserContextFactory } from '../test-support/appBrowserContextFactory';
import { AuthRouteStub } from '../test-support/authRouteStub';
import { installFirstPartyApiAccess } from '../test-support/firstPartyApiAccess';
import { actorTest } from './actor.fixture';
import type { BrowserFixtures } from './types';

export const browserTest = actorTest.extend<BrowserFixtures>({
  page: async ({ context }, use) => {
    const secrets = requireE2ESecrets();
    await installFirstPartyApiAccess(context, baseUrl(), secrets.accessKey);
    const page = await context.newPage();
    try {
      await use(page);
    } finally {
      await page.close();
    }
  },

  appContextFactory: async ({ browser }, use) => {
    const secrets = requireE2ESecrets();
    await use(new AppBrowserContextFactory(browser, baseUrl(), secrets.accessKey));
  },

  authRouteStub: async ({ page }, use) => {
    await use(new AuthRouteStub(page));
  },
});
