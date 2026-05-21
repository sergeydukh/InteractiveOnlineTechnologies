import * as fs from 'fs';
import * as path from 'path';

export interface Secrets {
  accessKey: string;
  adminEmail: string;
  adminPassword: string;
  analyticsBasicUser?: string;
  analyticsBasicPassword?: string;
}

type RawSecrets = Record<string, string | undefined>;

const DEFAULT_ENV_PATH = path.join(process.cwd(), '.env');
const DEFAULT_LEGACY_SECRETS_PATH = path.join(process.cwd(), 'sicret.json');

let cachedSecrets: Secrets | null = null;

function parseSecretValue(value: string): string {
  const trimmed = value.trim();
  const quote = trimmed[0];

  if ((quote === '"' || quote === "'") && trimmed.endsWith(quote)) {
    return trimmed.slice(1, -1);
  }

  return trimmed;
}

function parseKeyValueLines(raw: string): RawSecrets {
  const result: RawSecrets = {};

  for (const line of raw.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const equalsIndex = trimmed.indexOf('=');
    const colonIndex = trimmed.indexOf(':');
    const separatorIndex =
      equalsIndex === -1 ? colonIndex : colonIndex === -1 ? equalsIndex : Math.min(equalsIndex, colonIndex);

    if (separatorIndex === -1) continue;

    const key = trimmed.slice(0, separatorIndex).trim();
    const value = trimmed.slice(separatorIndex + 1);
    result[key] = parseSecretValue(value);
  }

  return result;
}

function parseSecretsFile(raw: string): RawSecrets {
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    return Object.fromEntries(
      Object.entries(parsed).map(([key, value]) => [key, value === undefined ? undefined : String(value)]),
    );
  } catch {
    return parseKeyValueLines(raw);
  }
}

function readSecretsFile(filePath: string): RawSecrets {
  if (!fs.existsSync(filePath)) return {};

  return parseSecretsFile(fs.readFileSync(filePath, 'utf-8'));
}

function normalizeSecrets(raw: RawSecrets): Secrets {
  return {
    accessKey: raw.ACCESS_KEY ?? raw['X-Access-Key'] ?? '',
    adminEmail: raw.ADMIN_EMAIL ?? raw.loginadmin ?? '',
    adminPassword: raw.ADMIN_PASSWORD ?? raw.passAdmin ?? '',
    analyticsBasicUser: raw.ANALYTICS_BASIC_USER ?? raw.analyticsBasicUser,
    analyticsBasicPassword: raw.ANALYTICS_BASIC_PASSWORD ?? raw.analyticsBasicPassword,
  };
}

export function getSecrets(): Secrets {
  if (cachedSecrets) return cachedSecrets;

  const envPath = process.env.ENV_PATH ?? DEFAULT_ENV_PATH;
  const legacySecretsPath = process.env.SECRETS_PATH ?? DEFAULT_LEGACY_SECRETS_PATH;
  const rawSecrets: RawSecrets = {
    ...readSecretsFile(legacySecretsPath),
    ...readSecretsFile(envPath),
    ...(process.env as RawSecrets),
  };

  cachedSecrets = normalizeSecrets(rawSecrets);

  const required: (keyof Pick<Secrets, 'accessKey' | 'adminEmail' | 'adminPassword'>)[] = [
    'accessKey',
    'adminEmail',
    'adminPassword',
  ];
  for (const field of required) {
    if (!cachedSecrets[field]) {
      throw new Error(
        `Missing required secret field: "${field}". Provide .env variables ACCESS_KEY, ADMIN_EMAIL, and ADMIN_PASSWORD.`,
      );
    }
  }

  return cachedSecrets;
}

export function getAnalyticsBasicAuthHeader(): string {
  const secrets = getSecrets();

  if (!secrets.analyticsBasicUser || !secrets.analyticsBasicPassword) {
    throw new Error(
      'Missing analytics Basic Auth credentials. Provide ANALYTICS_BASIC_USER and ANALYTICS_BASIC_PASSWORD via env or .env.',
    );
  }

  return `Basic ${Buffer.from(`${secrets.analyticsBasicUser}:${secrets.analyticsBasicPassword}`).toString('base64')}`;
}
