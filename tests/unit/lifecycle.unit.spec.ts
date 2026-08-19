import { describe, expect, it, vi } from 'vitest';
import { ActorCleaner } from '../../src/test-support/actorCleaner';
import { ActorProvisioner } from '../../src/test-support/actorProvisioner';
import type { AppApi } from '../../src/api/appApi';
import type { TestActor } from '../../src/test-support/testData';

const session = { role: 'user' as const, token: 'token' };
const actor: TestActor = {
  identity: { runId: 'run', project: 'unit', worker: 0, testId: 'cleanup' },
  registrationStartedAt: 0,
  session,
  user: {
    name: 'QA cleanup',
    email: 'qa-run-unit-w0-cleanup@example.com',
    gender: '0',
    password: 'TestPass!123',
    internalAnalyticsConsent: true,
  },
};

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
    const actor = await new ActorProvisioner(api, { delay }).create({
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
      new ActorProvisioner(api, { delay }).create({ runId: 'run', project: 'api', worker: 0, testId: 'failure' }),
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
      new ActorProvisioner(api, { delay }).create({ runId: 'run', project: 'api', worker: 0, testId: 'budget' }),
    ).rejects.toThrow('HTTP 429');
    expect(register).toHaveBeenCalledTimes(2);
    expect(login).toHaveBeenCalledTimes(1);
    expect(delay).toHaveBeenCalledTimes(1);
  });

  it('stops cleanup before tags after a todo delete failure', async () => {
    const order: string[] = [];
    const api = {
      profile: {
        get: vi.fn().mockResolvedValue({
          ok: true,
          status: 200,
          data: { user: { role: 'user', email: actor.user.email } },
        }),
      },
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

    const report = await new ActorCleaner(api).clean(actor);
    expect(order).toEqual(['todo:todo-1']);
    expect(report.errors).toHaveLength(1);
    expect(api.tags.list).not.toHaveBeenCalled();
  });

  it('refuses cleanup when the profile does not match the marked actor', async () => {
    const deleteTodo = vi.fn();
    const deleteTag = vi.fn();
    const api = {
      profile: {
        get: vi.fn().mockResolvedValue({
          ok: true,
          status: 200,
          data: { user: { role: 'user', email: 'real-user@example.com' } },
        }),
      },
      todos: { list: vi.fn(), delete: deleteTodo },
      tags: { list: vi.fn(), delete: deleteTag },
    } as unknown as AppApi;

    const report = await new ActorCleaner(api).clean(actor);

    expect(report.errors[0]?.message).toContain('Cleanup refused');
    expect(deleteTodo).not.toHaveBeenCalled();
    expect(deleteTag).not.toHaveBeenCalled();
  });

  it('repeats page-one cleanup until more than 100 todos are gone', async () => {
    const firstBatch = Array.from({ length: 100 }, (_, index) => ({ _id: `todo-${index}` }));
    const secondBatch = [{ _id: 'todo-100' }];
    const listTodos = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, status: 200, data: { todos: firstBatch, pagination: {} } })
      .mockResolvedValueOnce({ ok: true, status: 200, data: { todos: secondBatch, pagination: {} } })
      .mockResolvedValueOnce({ ok: true, status: 200, data: { todos: [], pagination: {} } });
    const deleteTodo = vi.fn().mockResolvedValue({ ok: true, status: 200, data: {} });
    const api = {
      profile: {
        get: vi.fn().mockResolvedValue({
          ok: true,
          status: 200,
          data: { user: { role: 'user', email: actor.user.email } },
        }),
      },
      todos: { list: listTodos, delete: deleteTodo },
      tags: { list: vi.fn().mockResolvedValue({ ok: true, status: 200, data: { tags: [] } }), delete: vi.fn() },
    } as unknown as AppApi;

    const report = await new ActorCleaner(api).clean(actor);
    expect(report.errors).toEqual([]);
    expect(report.deletedTodos).toBe(101);
    expect(deleteTodo).toHaveBeenCalledTimes(101);
    expect(listTodos).toHaveBeenCalledTimes(3);
  });

  it('retries only a guarded idempotent cleanup delete after Retry-After', async () => {
    const delay = vi.fn().mockResolvedValue(undefined);
    const deleteTodo = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, status: 429, retryAfterMs: 250 })
      .mockResolvedValueOnce({ ok: true, status: 200, data: {} });
    const api = {
      profile: {
        get: vi.fn().mockResolvedValue({
          ok: true,
          status: 200,
          data: { user: { role: 'user', email: actor.user.email } },
        }),
      },
      todos: {
        list: vi
          .fn()
          .mockResolvedValueOnce({ ok: true, status: 200, data: { todos: [{ _id: 'todo-1' }], pagination: {} } })
          .mockResolvedValueOnce({ ok: true, status: 200, data: { todos: [], pagination: {} } }),
        delete: deleteTodo,
      },
      tags: { list: vi.fn().mockResolvedValue({ ok: true, status: 200, data: { tags: [] } }), delete: vi.fn() },
    } as unknown as AppApi;

    const report = await new ActorCleaner(api, { delay }).clean(actor);
    expect(report.errors).toEqual([]);
    expect(delay).toHaveBeenCalledWith(250);
    expect(deleteTodo).toHaveBeenCalledTimes(2);
  });

  it('retries guarded cleanup reads after Retry-After', async () => {
    const delay = vi.fn().mockResolvedValue(undefined);
    const getProfile = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, status: 429, retryAfterMs: 100 })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        data: { user: { role: 'user', email: actor.user.email } },
      });
    const listTodos = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, status: 429, retryAfterMs: 200 })
      .mockResolvedValueOnce({ ok: true, status: 200, data: { todos: [], pagination: {} } });
    const listTags = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, status: 429, retryAfterMs: 300 })
      .mockResolvedValueOnce({ ok: true, status: 200, data: { tags: [] } });
    const api = {
      profile: { get: getProfile },
      todos: { list: listTodos, delete: vi.fn() },
      tags: { list: listTags, delete: vi.fn() },
    } as unknown as AppApi;

    const report = await new ActorCleaner(api, { delay }).clean(actor);

    expect(report.errors).toEqual([]);
    expect(delay.mock.calls).toEqual([[100], [200], [300]]);
    expect(getProfile).toHaveBeenCalledTimes(2);
    expect(listTodos).toHaveBeenCalledTimes(2);
    expect(listTags).toHaveBeenCalledTimes(2);
  });

  it('does not retry a cleanup read without a valid Retry-After', async () => {
    const delay = vi.fn();
    const getProfile = vi.fn().mockResolvedValue({ ok: false, status: 429 });
    const api = { profile: { get: getProfile } } as unknown as AppApi;

    const report = await new ActorCleaner(api, { delay }).clean(actor);

    expect(report.errors[0]?.message).toContain('without a valid Retry-After');
    expect(getProfile).toHaveBeenCalledTimes(1);
    expect(delay).not.toHaveBeenCalled();
  });

  it('fails fast when Retry-After exceeds the setup wait budget', async () => {
    const register = vi.fn().mockResolvedValue({
      ok: false,
      status: 429,
      error: { message: 'limited' },
      retryAfterMs: 60_000,
    });
    const delay = vi.fn();
    const api = { auth: { register } } as unknown as AppApi;

    await expect(
      new ActorProvisioner(api, { delay, maxWaitMs: 30_000 }).create({
        runId: 'run',
        project: 'api',
        worker: 0,
        testId: 'long-wait',
      }),
    ).rejects.toThrow('exceeding');
    expect(delay).not.toHaveBeenCalled();
  });
});
