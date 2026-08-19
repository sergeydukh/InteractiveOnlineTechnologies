import { describe, expect, it, vi } from 'vitest';
import type { BrowserContext, Route } from '@playwright/test';
import { installFirstPartyApiAccess } from '../../src/test-support/firstPartyApiAccess';

describe('installFirstPartyApiAccess', () => {
  it('installs an exact-origin API route and preserves existing headers', async () => {
    let handler: ((route: Route) => Promise<void>) | undefined;
    const context = {
      route: vi.fn().mockImplementation(async (_pattern: string, callback: (route: Route) => Promise<void>) => {
        handler = callback;
      }),
    } as unknown as BrowserContext;
    await installFirstPartyApiAccess(context, 'https://qa.example.test/base', 'application.secret');

    expect(context.route).toHaveBeenCalledWith('https://qa.example.test/api/**', expect.any(Function));
    const fallbackRequest = vi.fn();
    const route = {
      request: () => ({ headers: () => ({ accept: 'application/json' }) }),
      fallback: fallbackRequest,
    } as unknown as Route;
    await handler?.(route);

    expect(fallbackRequest).toHaveBeenCalledWith({
      headers: { accept: 'application/json', 'X-Access-Key': 'application.secret' },
    });
  });
});
