import { test as base } from '@playwright/test';
import { AppApi } from '../api/appApi';
import { requireSuccess } from '../api/result';
import { baseUrl, requireAnalyticsCredentials, requireE2ESecrets } from '../config/environment';
import { adminSessionFrom, retrySetupOnce } from '../test-support/actorProvisioner';
import type { ApiFixtures, ApiWorkerFixtures } from './types';

export const apiTest = base.extend<ApiFixtures, ApiWorkerFixtures>({
  workerApi: [
    async ({ playwright }, use) => {
      const secrets = requireE2ESecrets();
      const request = await playwright.request.newContext({ baseURL: baseUrl() });
      try {
        await use(
          new AppApi(request, {
            accessKey: secrets.accessKey,
            analyticsCredentials:
              secrets.analyticsBasicUser && secrets.analyticsBasicPassword
                ? requireAnalyticsCredentials(secrets)
                : undefined,
          }),
        );
      } finally {
        await request.dispose();
      }
    },
    { scope: 'worker' },
  ],

  adminSession: [
    async ({ workerApi }, use) => {
      const secrets = requireE2ESecrets();
      const result = await retrySetupOnce(() =>
        workerApi.auth.login({ email: secrets.adminEmail, password: secrets.adminPassword }),
      );
      await use(adminSessionFrom(requireSuccess(result, 'Admin login')));
    },
    { scope: 'worker', timeout: 45_000 },
  ],

  api: async ({ request }, use) => {
    const secrets = requireE2ESecrets();
    await use(
      new AppApi(request, {
        accessKey: secrets.accessKey,
        analyticsCredentials:
          secrets.analyticsBasicUser && secrets.analyticsBasicPassword
            ? requireAnalyticsCredentials(secrets)
            : undefined,
      }),
    );
  },

  apiVariants: async ({ request }, use) => {
    const secrets = requireE2ESecrets();
    await use({
      withoutAccessKey: new AppApi(request, {
        analyticsCredentials:
          secrets.analyticsBasicUser && secrets.analyticsBasicPassword
            ? requireAnalyticsCredentials(secrets)
            : undefined,
      }),
      malformedAccessKey: new AppApi(request, { accessKey: 'malformed-key' }),
      withoutAnalyticsBasic: new AppApi(request, { accessKey: secrets.accessKey }),
    });
  },

  // Playwright requires an object pattern even when a fixture has no dependencies.
  // eslint-disable-next-line no-empty-pattern
  adminCredentials: async ({}, use) => {
    const secrets = requireE2ESecrets();
    await use({ email: secrets.adminEmail, password: secrets.adminPassword });
  },
});
