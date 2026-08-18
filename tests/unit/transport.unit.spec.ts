import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { HttpTransport, parseRetryAfter } from '../../src/api/httpTransport';
import { ApiContractError } from '../../src/api/result';
import type { APIRequestContext } from '@playwright/test';

describe('HttpTransport', () => {
  it('injects access key and bearer authorization centrally', async () => {
    const { context, fetch } = fakeContext(200, { value: 'ok' });
    const transport = new HttpTransport(context, { accessKey: 'access-key' });
    const result = await transport.send({
      method: 'GET',
      path: '/resource',
      schema: z.object({ value: z.string() }),
      session: { role: 'user', token: 'session-token' },
    });

    expect(result).toEqual({ ok: true, status: 200, data: { value: 'ok' } });
    expect(fetch).toHaveBeenCalledWith(
      '/resource',
      expect.objectContaining({
        headers: expect.objectContaining({ 'X-Access-Key': 'access-key', Authorization: 'Bearer session-token' }),
      }),
    );
  });

  it('supports Basic Auth and intentionally missing access key', async () => {
    const { context, fetch } = fakeContext(200, []);
    const transport = new HttpTransport(context, {
      analyticsCredentials: { username: 'reader', password: 'secret' },
    });
    await transport.send({
      method: 'GET',
      path: '/events',
      schema: z.array(z.unknown()),
      authorization: 'analytics-basic',
    });
    const options = fetch.mock.calls[0][1];
    expect(options.headers).not.toHaveProperty('X-Access-Key');
    expect(options.headers.Authorization).toBe(`Basic ${Buffer.from('reader:secret').toString('base64')}`);
  });

  it('returns a typed failure and exposes only parsed Retry-After metadata', async () => {
    const { context } = fakeContext(429, { message: 'Too many requests' }, { 'retry-after': '2' });
    const result = await new HttpTransport(context, {}).send({
      method: 'POST',
      path: '/setup',
      schema: z.object({}),
    });
    expect(result).toEqual({
      ok: false,
      status: 429,
      error: { message: 'Too many requests' },
      retryAfterMs: 2_000,
    });
  });

  it('fails fast when a successful response violates its contract', async () => {
    const { context } = fakeContext(200, { unexpected: true });
    await expect(
      new HttpTransport(context, {}).send({
        method: 'GET',
        path: '/contract',
        schema: z.object({ value: z.string() }),
      }),
    ).rejects.toBeInstanceOf(ApiContractError);
  });

  it('parses seconds, dates and invalid Retry-After values', () => {
    expect(parseRetryAfter('1')).toBe(1_000);
    expect(parseRetryAfter(new Date(Date.now() + 2_000).toUTCString())).toBeGreaterThanOrEqual(0);
    expect(parseRetryAfter('invalid')).toBeUndefined();
  });
});

function fakeContext(status: number, body: unknown, headers: Record<string, string> = {}) {
  const fetch = vi.fn().mockResolvedValue({
    status: () => status,
    ok: () => status >= 200 && status < 300,
    text: () => Promise.resolve(JSON.stringify(body)),
    headers: () => headers,
  });
  return { fetch, context: { fetch } as unknown as APIRequestContext };
}
