import { describe, expect, it, vi } from 'vitest';
import type { Browser, BrowserContext, Page, Route } from '@playwright/test';
import { AppBrowserContextFactory } from '../../src/test-support/appBrowserContextFactory';
import { AuthRouteStub } from '../../src/test-support/authRouteStub';

describe('browser adapters', () => {
  it('creates an application context with scoped access routing and user storage', async () => {
    const context = { route: vi.fn().mockResolvedValue(undefined) } as unknown as BrowserContext;
    const browser = { newContext: vi.fn().mockResolvedValue(context) } as unknown as Browser;

    const created = await new AppBrowserContextFactory(browser, 'https://qa.example.test', 'application.secret').create(
      { role: 'user', token: 'user-token' },
    );

    expect(created).toBe(context);
    expect(browser.newContext).toHaveBeenCalledWith({
      baseURL: 'https://qa.example.test',
      serviceWorkers: 'block',
      storageState: {
        cookies: [],
        origins: [
          {
            origin: 'https://qa.example.test',
            localStorage: [{ name: 'token', value: 'user-token' }],
          },
        ],
      },
    });
    expect(context.route).toHaveBeenCalledWith('https://qa.example.test/api/**', expect.any(Function));
  });

  it('stubs only POST login and lets other methods fall through', async () => {
    const { page, handler } = routeHarness('GET');
    await new AuthRouteStub(page).rejectLogin('Rejected by test');
    const getRoute = handler();
    await getRoute.callback(getRoute.route);
    expect(getRoute.fallback).toHaveBeenCalledOnce();

    const postRoute = routeHarnessRoute('POST');
    await getRoute.callback(postRoute.route);
    expect(postRoute.fulfill).toHaveBeenCalledWith({
      status: 400,
      contentType: 'application/json',
      body: JSON.stringify({ message: 'Rejected by test' }),
    });
  });
});

function routeHarness(method: string): {
  page: Page;
  handler: () => ReturnType<typeof routeHarnessRoute> & { callback: (route: Route) => Promise<void> };
} {
  let callback: ((route: Route) => Promise<void>) | undefined;
  const page = {
    route: vi.fn().mockImplementation(async (_pattern: string, value: (route: Route) => Promise<void>) => {
      callback = value;
    }),
  } as unknown as Page;
  return {
    page,
    handler: () => {
      if (!callback) throw new Error('Route handler was not installed');
      return { ...routeHarnessRoute(method), callback };
    },
  };
}

function routeHarnessRoute(method: string) {
  const fallback = vi.fn().mockResolvedValue(undefined);
  const fulfill = vi.fn().mockResolvedValue(undefined);
  const route = {
    request: () => ({ method: () => method }),
    fallback,
    fulfill,
  } as unknown as Route;
  return { route, fallback, fulfill };
}
