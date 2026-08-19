export const DEFAULT_BASE_URL = 'https://qa-a.recruitment.mediamarslab.com';

export interface E2ESecrets {
  readonly accessKey: string;
  readonly adminEmail: string;
  readonly adminPassword: string;
  readonly analyticsBasicUser?: string;
  readonly analyticsBasicPassword?: string;
}

export function normalizeBaseUrl(value?: string): string {
  return (value?.trim() || DEFAULT_BASE_URL).replace(/\/+$/u, '');
}

export function baseUrl(env: NodeJS.ProcessEnv = process.env): string {
  return normalizeBaseUrl(env.BASE_URL);
}

export function optionalAccessKey(env: NodeJS.ProcessEnv = process.env): string | undefined {
  return nonBlank(env.ACCESS_KEY);
}

export function requireE2ESecrets(env: NodeJS.ProcessEnv = process.env): E2ESecrets {
  const accessKey = required(env, 'ACCESS_KEY');
  const adminEmail = required(env, 'ADMIN_EMAIL');
  const adminPassword = required(env, 'ADMIN_PASSWORD');

  return {
    accessKey,
    adminEmail,
    adminPassword,
    analyticsBasicUser: nonBlank(env.ANALYTICS_BASIC_USER),
    analyticsBasicPassword: nonBlank(env.ANALYTICS_BASIC_PASSWORD),
  };
}

export function requireAnalyticsCredentials(secrets: E2ESecrets): Readonly<{ username: string; password: string }> {
  if (!secrets.analyticsBasicUser || !secrets.analyticsBasicPassword) {
    throw new Error('ANALYTICS_BASIC_USER and ANALYTICS_BASIC_PASSWORD are required for analytics tests.');
  }
  return { username: secrets.analyticsBasicUser, password: secrets.analyticsBasicPassword };
}

function required(env: NodeJS.ProcessEnv, name: string): string {
  const value = nonBlank(env[name]);
  if (!value) throw new Error(`${name} is required for remote E2E tests.`);
  return value;
}

function nonBlank(value?: string): string | undefined {
  const normalized = value?.trim();
  return normalized ? normalized : undefined;
}
