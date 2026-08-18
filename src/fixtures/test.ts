import {
  test as base,
  expect,
  type APIRequestContext,
  type Browser,
  type BrowserContext,
  type TestInfo,
} from '@playwright/test';
import { AppApi } from '../api/appApi';
import { baseUrl, requireAnalyticsCredentials, requireE2ESecrets } from '../config/environment';
import type { AdminSession } from '../domain/session';
import { ActorCleaner } from '../test-support/actorCleaner';
import { ActorProvisioner, adminSessionFrom, retrySetupOnce } from '../test-support/actorProvisioner';
import { requireSuccess } from '../api/result';
import { storageStateFor } from '../test-support/storageState';
import { testRunId, type TestActor, type TestIdentity } from '../test-support/testData';
import { AuthApiStub } from '../test-support/authApiStub';
import { AdminPage } from '../ui/pages/adminPage';
import { DashboardPage } from '../ui/pages/dashboardPage';
import { LoginPage } from '../ui/pages/loginPage';
import { ProfilePage } from '../ui/pages/profilePage';
import { RegisterPage } from '../ui/pages/registerPage';

interface ApiVariants {
  readonly withoutAccessKey: AppApi;
  readonly malformedAccessKey: AppApi;
  readonly withoutAnalyticsBasic: AppApi;
}

interface TestFixtures {
  api: AppApi;
  apiVariants: ApiVariants;
  actor: TestActor;
  secondaryActor: TestActor;
  loginPage: LoginPage;
  registerPage: RegisterPage;
  dashboardPage: DashboardPage;
  profilePage: ProfilePage;
  readOnlyDashboardPage: DashboardPage;
  readOnlyProfilePage: ProfilePage;
  adminPage: AdminPage;
  authApiStub: AuthApiStub;
}

interface WorkerFixtures {
  readOnlyActor: TestActor;
  adminSession: AdminSession;
}

// Back-to-back runs can receive a Retry-After close to the environment's 15-minute rate-limit window.
const provisioningTimeoutMs = 1_000_000;

export const test = base.extend<TestFixtures, WorkerFixtures>({
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

  apiVariants: async ({ playwright }, use) => {
    const secrets = requireE2ESecrets();
    const contexts = await Promise.all([
      playwright.request.newContext({ baseURL: baseUrl() }),
      playwright.request.newContext({ baseURL: baseUrl() }),
      playwright.request.newContext({ baseURL: baseUrl() }),
    ]);
    await use({
      withoutAccessKey: new AppApi(contexts[0], {
        analyticsCredentials:
          secrets.analyticsBasicUser && secrets.analyticsBasicPassword
            ? requireAnalyticsCredentials(secrets)
            : undefined,
      }),
      malformedAccessKey: new AppApi(contexts[1], { accessKey: 'malformed-key' }),
      withoutAnalyticsBasic: new AppApi(contexts[2], { accessKey: secrets.accessKey }),
    });
    await Promise.all(contexts.map((context) => context.dispose()));
  },

  readOnlyActor: [
    async ({ playwright }, use, workerInfo) => {
      const { api, request } = await workerApi(playwright.request, false);
      const identity: TestIdentity = {
        runId: testRunId(),
        project: workerInfo.project.name,
        worker: workerInfo.workerIndex,
        testId: 'readonly-smoke',
      };
      const actor = await new ActorProvisioner(api).create(identity, { name: `Read Only ${identity.runId}` });
      await use(actor);
      await request.dispose();
    },
    { scope: 'worker', timeout: provisioningTimeoutMs },
  ],

  adminSession: [
    async ({ playwright }, use) => {
      const { api, request, secrets } = await workerApi(playwright.request, false);
      const result = await retrySetupOnce(() =>
        api.auth.login({ email: secrets.adminEmail, password: secrets.adminPassword }),
      );
      const login = requireSuccess(result, 'Admin login');
      await use(adminSessionFrom(login));
      await request.dispose();
    },
    { scope: 'worker', timeout: provisioningTimeoutMs },
  ],

  actor: [
    async ({ api }, use, testInfo) => useActor(api, identityFor(testInfo, 'primary'), use, testInfo),
    { timeout: provisioningTimeoutMs },
  ],
  secondaryActor: [
    async ({ api }, use, testInfo) => useActor(api, identityFor(testInfo, 'secondary'), use, testInfo),
    { timeout: provisioningTimeoutMs },
  ],

  loginPage: async ({ page }, use) => {
    const model = new LoginPage(page);
    await model.open();
    await use(model);
  },

  registerPage: async ({ page }, use) => {
    const model = new RegisterPage(page);
    await model.open();
    await use(model);
  },

  authApiStub: async ({ page }, use) => {
    await use(new AuthApiStub(page));
  },

  dashboardPage: async ({ browser, actor }, use) => {
    const { context, page } = await authenticatedPage(browser, actor);
    const model = new DashboardPage(page);
    await model.open();
    await use(model);
    await context.close();
  },

  profilePage: async ({ browser, actor }, use) => {
    const { context, page } = await authenticatedPage(browser, actor);
    const model = new ProfilePage(page);
    await model.open();
    await use(model);
    await context.close();
  },

  readOnlyDashboardPage: async ({ browser, readOnlyActor }, use) => {
    const { context, page } = await authenticatedPage(browser, readOnlyActor);
    const model = new DashboardPage(page);
    await model.open();
    await use(model);
    await context.close();
  },

  readOnlyProfilePage: async ({ browser, readOnlyActor }, use) => {
    const { context, page } = await authenticatedPage(browser, readOnlyActor);
    const model = new ProfilePage(page);
    await model.open();
    await use(model);
    await context.close();
  },

  adminPage: async ({ browser, adminSession }, use) => {
    const secrets = requireE2ESecrets();
    const context = await browser.newContext({
      baseURL: baseUrl(),
      extraHTTPHeaders: { 'X-Access-Key': secrets.accessKey },
      storageState: storageStateFor(baseUrl(), adminSession),
    });
    const model = new AdminPage(await context.newPage());
    await model.open();
    await use(model);
    await context.close();
  },
});

async function workerApi(
  requestFactory: { newContext(options: { baseURL: string }): Promise<APIRequestContext> },
  analytics: boolean,
) {
  const secrets = requireE2ESecrets();
  const request = await requestFactory.newContext({ baseURL: baseUrl() });
  return {
    request,
    secrets,
    api: new AppApi(request, {
      accessKey: secrets.accessKey,
      analyticsCredentials: analytics ? requireAnalyticsCredentials(secrets) : undefined,
    }),
  };
}

async function useActor(
  api: AppApi,
  identity: TestIdentity,
  use: (actor: TestActor) => Promise<void>,
  testInfo: TestInfo,
): Promise<void> {
  const actor = await new ActorProvisioner(api).create(identity);
  await use(actor);
  const errors = await new ActorCleaner(api).clean(actor.session);
  if (errors.length === 0) return;
  const details = errors.map((error) => error.message).join('\n');
  if (testInfo.status === testInfo.expectedStatus) {
    throw new AggregateError(errors, `Actor resource cleanup failed:\n${details}`);
  }
  await testInfo.attach('cleanup-errors.txt', { body: details, contentType: 'text/plain' });
}

function identityFor(testInfo: TestInfo, suffix: string): TestIdentity {
  return {
    runId: testRunId(),
    project: testInfo.project.name,
    worker: testInfo.workerIndex,
    testId: `${testInfo.testId.slice(-10)}-${suffix}`,
  };
}

async function authenticatedPage(browser: Browser, actor: TestActor) {
  const secrets = requireE2ESecrets();
  const context: BrowserContext = await browser.newContext({
    baseURL: baseUrl(),
    extraHTTPHeaders: { 'X-Access-Key': secrets.accessKey },
    storageState: storageStateFor(baseUrl(), actor.session),
  });
  return { context, page: await context.newPage() };
}

export { expect };
