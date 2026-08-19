import type { BrowserContext } from '@playwright/test';

/** Adds the access key only to the configured application's API routes. */
export async function installFirstPartyApiAccess(
  context: BrowserContext,
  baseUrl: string,
  accessKey: string,
): Promise<void> {
  const apiPattern = `${new URL(baseUrl).origin}/api/**`;
  await context.route(apiPattern, async (route) => {
    await route.fallback({
      headers: { ...route.request().headers(), 'X-Access-Key': accessKey },
    });
  });
}
