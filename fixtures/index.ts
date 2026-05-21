import { test as base, BrowserContext, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { LoginPage } from '@pages/LoginPage';
import { RegisterPage } from '@pages/RegisterPage';
import { DashboardPage } from '@pages/DashboardPage';
import { ProfilePage } from '@pages/ProfilePage';
import { AdminPage } from '@pages/AdminPage';
import { getBaseUrl } from '@config/appConfig';
import { getSecrets } from '@utils/secrets';
import { ApiClient } from '@utils/apiClient';
import { createTestUser, TestUserData } from '@utils/testData';

const AUTH_STATE_FILE = path.join(__dirname, '..', '.auth', 'user.json');
const AUTH_META_FILE = path.join(__dirname, '..', '.auth', 'user.meta.json');
const BASE_URL = getBaseUrl();

type AuthenticatedUser = TestUserData & {
  token: string;
};

type AuthMeta = {
  accessKey?: string;
  user?: Partial<AuthenticatedUser>;
};

let cachedTestUser: AuthenticatedUser | null = null;
let cachedTestUserPromise: Promise<AuthenticatedUser> | null = null;

type AppFixtures = {
  api: ApiClient;
  testUser: AuthenticatedUser;
  loginPage: LoginPage;
  registerPage: RegisterPage;
  sharedDashboardPage: DashboardPage;
  sharedProfilePage: ProfilePage;
  uniqueDashboardPage: DashboardPage;
  uniqueProfilePage: ProfilePage;
  adminPage: AdminPage;
};

function storageStateForToken(token: string) {
  return {
    cookies: [],
    origins: [
      {
        origin: BASE_URL,
        localStorage: [{ name: 'token', value: token }],
      },
    ],
  };
}

function readAuthMeta(): AuthMeta {
  if (!fs.existsSync(AUTH_META_FILE)) return {};

  try {
    return JSON.parse(fs.readFileSync(AUTH_META_FILE, 'utf-8')) as AuthMeta;
  } catch {
    return {};
  }
}

function getGlobalSetupTestUser(): AuthenticatedUser | null {
  const meta = readAuthMeta();
  const user = meta.user;

  if (
    meta.accessKey !== getSecrets().accessKey ||
    !user?.name ||
    !user.email ||
    !user.gender ||
    !user.password ||
    user.internalAnalyticsConsent === undefined ||
    !user.token
  ) {
    return null;
  }

  return user as AuthenticatedUser;
}

async function createAuthenticatedTestUser(api: ApiClient): Promise<AuthenticatedUser> {
  const user = createTestUser();
  await api.register(user);
  const login = await api.login(user.email, user.password);
  expect(login.role).toBe('user');
  return { ...user, token: login.token };
}

async function getCachedTestUser(api: ApiClient): Promise<AuthenticatedUser> {
  if (cachedTestUser) return cachedTestUser;

  const globalSetupUser = getGlobalSetupTestUser();
  if (globalSetupUser) {
    cachedTestUser = globalSetupUser;
    return globalSetupUser;
  }

  cachedTestUserPromise ??= createAuthenticatedTestUser(api)
    .then(user => {
      cachedTestUser = user;
      return user;
    })
    .catch(error => {
      cachedTestUserPromise = null;
      throw error;
    });

  return cachedTestUserPromise;
}

export const test = base.extend<AppFixtures>({
  api: async ({ request }, use) => {
    await use(new ApiClient(request));
  },

  testUser: async ({ api }, use) => {
    await use(await getCachedTestUser(api));
  },

  loginPage: async ({ page }, use) => {
    const lp = new LoginPage(page);
    await lp.goto();
    await use(lp);
  },

  registerPage: async ({ page }, use) => {
    const rp = new RegisterPage(page);
    await rp.goto();
    await use(rp);
  },

  sharedDashboardPage: async ({ browser }, use) => {
    const secrets = getSecrets();
    const context: BrowserContext = await browser.newContext({
      storageState: AUTH_STATE_FILE,
      baseURL: BASE_URL,
      extraHTTPHeaders: { 'X-Access-Key': secrets.accessKey },
    });
    const page = await context.newPage();
    await page.goto('/dashboard.html');
    await page.waitForURL('**/dashboard.html');
    await page.locator('[data-ui="todo-input"], [data-ui="add-todo-button"]').first().waitFor({ state: 'visible' });
    await use(new DashboardPage(page));
    await context.close();
  },

  sharedProfilePage: async ({ browser }, use) => {
    const secrets = getSecrets();
    const context: BrowserContext = await browser.newContext({
      storageState: AUTH_STATE_FILE,
      baseURL: BASE_URL,
      extraHTTPHeaders: { 'X-Access-Key': secrets.accessKey },
    });
    const page = await context.newPage();
    await page.goto('/profile.html');
    await use(new ProfilePage(page));
    await context.close();
  },

  uniqueDashboardPage: async ({ browser, testUser }, use) => {
    const secrets = getSecrets();
    const context = await browser.newContext({
      storageState: storageStateForToken(testUser.token),
      baseURL: BASE_URL,
      extraHTTPHeaders: { 'X-Access-Key': secrets.accessKey },
    });
    const page = await context.newPage();
    await page.goto('/dashboard.html');
    await page.waitForURL('**/dashboard.html');
    await page.locator('[data-ui="todo-input"], [data-ui="add-todo-button"]').first().waitFor({ state: 'visible' });
    await use(new DashboardPage(page));
    await context.close();
  },

  uniqueProfilePage: async ({ browser, testUser }, use) => {
    const secrets = getSecrets();
    const context = await browser.newContext({
      storageState: storageStateForToken(testUser.token),
      baseURL: BASE_URL,
      extraHTTPHeaders: { 'X-Access-Key': secrets.accessKey },
    });
    const page = await context.newPage();
    await page.goto('/profile.html');
    await use(new ProfilePage(page));
    await context.close();
  },

  adminPage: async ({ page }, use) => {
    const { adminEmail, adminPassword } = getSecrets();
    const ap = new AdminPage(page);
    await ap.goto();
    await ap.login(adminEmail, adminPassword);
    await use(ap);
  },
});

export { expect };
