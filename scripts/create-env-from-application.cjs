#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { getBaseUrl } = require('../config/appConfig');

const BASE_URL = getBaseUrl();
const ENV_PATH = process.env.ENV_PATH || path.join(process.cwd(), '.env');
const ORDERED_KEYS = [
  'ACCESS_KEY',
  'ADMIN_EMAIL',
  'ADMIN_PASSWORD',
  'ANALYTICS_BASIC_USER',
  'ANALYTICS_BASIC_PASSWORD',
];

function parseSecretValue(value) {
  const trimmed = value.trim();
  const quote = trimmed[0];

  if ((quote === '"' || quote === "'") && trimmed.endsWith(quote)) {
    return trimmed.slice(1, -1);
  }

  return trimmed;
}

function parseEnv(raw) {
  const result = {};

  for (const line of raw.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const separatorIndex = trimmed.indexOf('=');
    if (separatorIndex === -1) continue;

    const key = trimmed.slice(0, separatorIndex).trim();
    const value = trimmed.slice(separatorIndex + 1);
    result[key] = parseSecretValue(value);
  }

  return result;
}

function formatEnvValue(value) {
  if (/^[A-Za-z0-9_.@:+/-]+$/.test(value)) {
    return value;
  }

  return `'${value.replace(/'/g, "'\\''")}'`;
}

function stringifyEnv(values) {
  const ordered = ORDERED_KEYS.filter(key => values[key] !== undefined);
  const rest = Object.keys(values)
    .filter(key => !ORDERED_KEYS.includes(key))
    .sort();

  return [...ordered, ...rest]
    .map(key => `${key}=${formatEnvValue(values[key])}`)
    .join('\n')
    .concat('\n');
}

async function main() {
  const fullName = process.argv.slice(2).join(' ').trim() || (process.env.APPLICANT_FULL_NAME || '').trim();

  if (!fullName) {
    throw new Error('Provide full name as CLI args or APPLICANT_FULL_NAME env variable.');
  }

  const response = await fetch(`${BASE_URL}/api/applications`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fullName }),
  });
  const body = await response.json().catch(async () => ({ message: await response.text() }));

  if (!response.ok) {
    throw new Error(`Application request failed (${response.status}): ${body.message || JSON.stringify(body)}`);
  }

  if (!body.accessKey || !body.adminEmail || !body.adminPassword) {
    throw new Error('Application response does not include accessKey, adminEmail, and adminPassword.');
  }

  const existing = fs.existsSync(ENV_PATH) ? parseEnv(fs.readFileSync(ENV_PATH, 'utf-8')) : {};
  const next = {
    ...existing,
    ACCESS_KEY: body.accessKey,
    ADMIN_EMAIL: body.adminEmail,
    ADMIN_PASSWORD: body.adminPassword,
  };

  if (process.env.ANALYTICS_BASIC_USER) {
    next.ANALYTICS_BASIC_USER = process.env.ANALYTICS_BASIC_USER;
  }

  if (process.env.ANALYTICS_BASIC_PASSWORD) {
    next.ANALYTICS_BASIC_PASSWORD = process.env.ANALYTICS_BASIC_PASSWORD;
  }

  fs.mkdirSync(path.dirname(ENV_PATH), { recursive: true });
  fs.writeFileSync(ENV_PATH, stringifyEnv(next));

  const displayPath = path.relative(process.cwd(), ENV_PATH) || ENV_PATH;
  console.log(`Created/updated ${displayPath} for "${fullName}".`);
  console.log('Stored ACCESS_KEY, ADMIN_EMAIL, and ADMIN_PASSWORD. Secret values are not printed.');
}

main().catch(error => {
  console.error(error.message);
  process.exit(1);
});
