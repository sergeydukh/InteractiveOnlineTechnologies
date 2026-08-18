import { describe, expect, it } from 'vitest';
import {
  DEFAULT_BASE_URL,
  baseUrl,
  normalizeBaseUrl,
  optionalAccessKey,
  requireE2ESecrets,
} from '../../src/config/environment';

describe('environment', () => {
  it('normalizes configured and default base URLs', () => {
    expect(normalizeBaseUrl(' https://example.test/// ')).toBe('https://example.test');
    expect(normalizeBaseUrl()).toBe(DEFAULT_BASE_URL);
    expect(baseUrl({ BASE_URL: 'https://qa.test/' } as NodeJS.ProcessEnv)).toBe('https://qa.test');
  });

  it('keeps secrets lazy and rejects incomplete E2E configuration', () => {
    expect(optionalAccessKey({})).toBeUndefined();
    expect(() => requireE2ESecrets({ ACCESS_KEY: 'key' })).toThrow('ADMIN_EMAIL');
  });

  it('loads complete secrets without exposing defaults', () => {
    const secrets = requireE2ESecrets({
      ACCESS_KEY: 'application.secret',
      ADMIN_EMAIL: 'admin@example.com',
      ADMIN_PASSWORD: 'password',
    });
    expect(secrets).toMatchObject({ accessKey: 'application.secret', adminEmail: 'admin@example.com' });
  });
});
