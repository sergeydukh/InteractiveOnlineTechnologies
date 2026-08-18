import { describe, expect, it, vi } from 'vitest';
import { ActorCleaner } from '../../src/test-support/actorCleaner';
import { ActorProvisioner } from '../../src/test-support/actorProvisioner';
import type { AppApi } from '../../src/api/appApi';

const session = { role: 'user' as const, token: 'token' };

describe('actor lifecycle', () => {
  it('retries setup once only after a 429 with Retry-After', async () => {
    const register = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, status: 429, error: { message: 'limited' }, retryAfterMs: 250 })
      .mockResolvedValueOnce({ ok: true, status: 200, data: { message: 'created' } });
    const login = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      data: { token: 'token', role: 'user', message: 'ok' },
    });
    const delay = vi.fn().mockResolvedValue(undefined);
    const api = { auth: { register, login } } as unknown as AppApi;
    const actor = await new ActorProvisioner(api, delay).create({
      runId: 'run',
      project: 'api',
      worker: 0,
      testId: 'retry',
    });

    expect(register).toHaveBeenCalledTimes(2);
    expect(delay).toHaveBeenCalledWith(250);
    expect(actor.session).toEqual(session);
  });

  it('does not retry non-429 setup failures', async () => {
    const register = vi.fn().mockResolvedValue({ ok: false, status: 400, error: { message: 'bad request' } });
    const delay = vi.fn();
    const api = { auth: { register } } as unknown as AppApi;
    await expect(
      new ActorProvisioner(api, delay).create({ runId: 'run', project: 'api', worker: 0, testId: 'failure' }),
    ).rejects.toThrow('HTTP 400');
    expect(register).toHaveBeenCalledTimes(1);
    expect(delay).not.toHaveBeenCalled();
  });

  it('shares one retry budget across registration and login', async () => {
    const register = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, status: 429, error: { message: 'limited' }, retryAfterMs: 250 })
      .mockResolvedValueOnce({ ok: true, status: 201, data: { message: 'created' } });
    const login = vi.fn().mockResolvedValue({
      ok: false,
      status: 429,
      error: { message: 'limited again' },
      retryAfterMs: 500,
    });
    const delay = vi.fn().mockResolvedValue(undefined);
    const api = { auth: { register, login } } as unknown as AppApi;

    await expect(
      new ActorProvisioner(api, delay).create({ runId: 'run', project: 'api', worker: 0, testId: 'budget' }),
    ).rejects.toThrow('HTTP 429');
    expect(register).toHaveBeenCalledTimes(2);
    expect(login).toHaveBeenCalledTimes(1);
    expect(delay).toHaveBeenCalledTimes(1);
  });

  it('cleans todos before tags and continues after a delete failure', async () => {
    const order: string[] = [];
    const api = {
      todos: {
        list: vi.fn().mockResolvedValue({
          ok: true,
          status: 200,
          data: { todos: [{ _id: 'todo-1' }, { _id: 'todo-2' }], pagination: {} },
        }),
        delete: vi.fn().mockImplementation(async (_session, id: string) => {
          order.push(`todo:${id}`);
          return id === 'todo-1'
            ? { ok: false, status: 500, error: { message: 'failed' } }
            : { ok: true, status: 200, data: {} };
        }),
      },
      tags: {
        list: vi.fn().mockResolvedValue({ ok: true, status: 200, data: { tags: [{ _id: 'tag-1' }] } }),
        delete: vi.fn().mockImplementation(async (_session, id: string) => {
          order.push(`tag:${id}`);
          return { ok: false, status: 404, error: { message: 'already absent' } };
        }),
      },
    } as unknown as AppApi;

    const errors = await new ActorCleaner(api).clean(session);
    expect(order).toEqual(['todo:todo-1', 'todo:todo-2', 'tag:tag-1']);
    expect(errors).toHaveLength(1);
  });
});
