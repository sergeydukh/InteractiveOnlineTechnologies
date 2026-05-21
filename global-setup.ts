import { FullConfig } from '@playwright/test';
import { getBaseUrl } from '@config/appConfig';
import { getSecrets } from '@utils/secrets';
import { createTestUser } from '@utils/testData';
import * as fs from 'fs';
import * as path from 'path';

const BASE_URL = getBaseUrl();
const AUTH_FILE = path.join(__dirname, '.auth', 'user.json');
const AUTH_META_FILE = path.join(__dirname, '.auth', 'user.meta.json');
const RATE_LIMIT_RETRY_DELAYS_MS = [2000, 5000, 10000, 20000, 30000, 45000];

type AuthMeta = {
  accessKey?: string;
  user?: ReturnType<typeof createTestUser> & {
    token: string;
  };
};

function readAuthMeta(): AuthMeta {
  if (!fs.existsSync(AUTH_META_FILE)) return {};

  try {
    return JSON.parse(fs.readFileSync(AUTH_META_FILE, 'utf-8')) as AuthMeta;
  } catch {
    return {};
  }
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchWithRateLimitRetry(url: string, init: RequestInit): Promise<Response> {
  for (let attempt = 0; attempt <= RATE_LIMIT_RETRY_DELAYS_MS.length; attempt += 1) {
    const response = await fetch(url, init);

    if (response.status !== 429 || attempt === RATE_LIMIT_RETRY_DELAYS_MS.length) {
      return response;
    }

    await delay(RATE_LIMIT_RETRY_DELAYS_MS[attempt]);
  }

  throw new Error(`[global-setup] Exhausted rate limit retry attempts for ${url}`);
}

export default async function globalSetup(_config: FullConfig): Promise<void> {
  const secrets = getSecrets();
  const authDir = path.dirname(AUTH_FILE);

  if (!fs.existsSync(authDir)) fs.mkdirSync(authDir, { recursive: true });

  if (fs.existsSync(AUTH_FILE)) {
    const ageMs = Date.now() - fs.statSync(AUTH_FILE).mtimeMs;
    const meta = readAuthMeta();
    if (ageMs < 50 * 60 * 1000 && meta.accessKey === secrets.accessKey) {
      console.log('[global-setup] Reusing cached auth state (age: ' + Math.round(ageMs / 1000) + 's)');
      return;
    }
  }

  const user = createTestUser({ name: `Smoke Shared ${Date.now()}` });

  const registerResponse = await fetchWithRateLimitRetry(`${BASE_URL}/api/auth/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Access-Key': secrets.accessKey,
    },
    body: JSON.stringify(user),
  });

  if (!registerResponse.ok) {
    const body = await registerResponse.text();
    throw new Error(`[global-setup] Shared user registration failed (${registerResponse.status}): ${body}`);
  }

  const loginResponse = await fetchWithRateLimitRetry(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Access-Key': secrets.accessKey,
    },
    body: JSON.stringify({ email: user.email, password: user.password }),
  });

  if (!loginResponse.ok) {
    const body = await loginResponse.text();
    throw new Error(`[global-setup] Shared user login failed (${loginResponse.status}): ${body}`);
  }

  const { token } = (await loginResponse.json()) as { token: string };

  const storageState = {
    cookies: [],
    origins: [
      {
        origin: BASE_URL,
        localStorage: [{ name: 'token', value: token }],
      },
    ],
  };

  fs.writeFileSync(AUTH_FILE, JSON.stringify(storageState, null, 2));
  fs.writeFileSync(AUTH_META_FILE, JSON.stringify({ accessKey: secrets.accessKey, user: { ...user, token } }, null, 2));
  console.log('[global-setup] Auth state saved to', AUTH_FILE);
}
