import { describe, expect, it, vi } from 'vitest';
import { AdminApi } from '../../src/api/services/adminApi';
import { ProfileApi } from '../../src/api/services/profileApi';
import { TagsApi } from '../../src/api/services/tagsApi';
import { TodosApi } from '../../src/api/services/todosApi';
import { UploadsApi } from '../../src/api/services/uploadsApi';
import type { HttpTransport } from '../../src/api/httpTransport';
import type { APIRequestContext } from '@playwright/test';
import { AppApi } from '../../src/api/appApi';
import { AuthApi } from '../../src/api/services/authApi';
import { AnalyticsApi } from '../../src/api/services/analyticsApi';
import { validPngUpload } from '../../src/test-support/testData';

const session = { role: 'user' as const, token: 'token' };

describe('domain API services', () => {
  it('composes focused domain services without exposing the transport', () => {
    const api = new AppApi({} as APIRequestContext, { accessKey: 'application.secret' });

    expect(api.auth).toBeInstanceOf(AuthApi);
    expect(api.analytics).toBeInstanceOf(AnalyticsApi);
    expect(api.todos).toBeInstanceOf(TodosApi);
    expect(api.tags).toBeInstanceOf(TagsApi);
    expect(api.profile).toBeInstanceOf(ProfileApi);
    expect(api.admin).toBeInstanceOf(AdminApi);
    expect(api.uploads).toBeInstanceOf(UploadsApi);
  });

  it('serializes todo filters and repeated tag ids', async () => {
    const { transport, send } = fakeTransport();
    await new TodosApi(transport).list(session, {
      status: 'completed',
      search: 'edited title',
      page: 2,
      limit: 10,
      tagIds: ['tag-a', 'tag-b'],
    });

    const request = send.mock.calls[0][0];
    expect(request.path).toContain('status=completed');
    expect(request.path).toContain('search=edited+title');
    expect(request.path).toContain('page=2');
    expect(request.path).toContain('tagIds=tag-a&tagIds=tag-b');
  });

  it('keeps admin query serialization inside AdminApi', async () => {
    const { transport, send } = fakeTransport();
    await new AdminApi(transport).getOverview({ role: 'admin', token: 'admin' }, { search: 'qa@example.com', page: 3 });

    expect(send.mock.calls[0][0].path).toBe('/api/admin/overview?page=3&limit=5&search=qa%40example.com');
  });

  it('uses typed tag ensure and upload endpoints', async () => {
    const { transport, send } = fakeTransport();
    const file = validPngUpload();
    await new TagsApi(transport).ensure(session, 'created-inline');
    await new UploadsApi(transport).uploadRegistrationPhoto(file);
    await new ProfileApi(transport).uploadPhoto(session, file);

    expect(send.mock.calls.map(([request]) => request.path)).toEqual([
      '/api/tags/ensure',
      '/api/upload/photo',
      '/api/profile/photo',
    ]);
    expect(send.mock.calls[1][0].multipart).toEqual({ photo: file });
    expect(send.mock.calls[2][0].session).toBe(session);
  });

  it('maps each domain operation to its documented HTTP method and path', async () => {
    const { transport, send } = fakeTransport();
    const auth = new AuthApi(transport);
    const analytics = new AnalyticsApi(transport);
    const profile = new ProfileApi(transport);
    const tags = new TagsApi(transport);
    const todos = new TodosApi(transport);

    await auth.register({
      name: 'QA',
      email: 'qa@example.com',
      gender: '0',
      password: 'Password1!',
      internalAnalyticsConsent: true,
    });
    await auth.login({ email: 'qa@example.com', password: 'Password1!' });
    await auth.logout(session);
    await analytics.getEvents();
    await profile.get(session);
    await profile.update(session, { name: 'Updated' });
    await profile.changePassword(session, 'Password2!');
    await tags.palette(session);
    await tags.list(session, 'search');
    await tags.create(session, { name: 'tag', color: '#fff' });
    await tags.delete(session, 'tag-id');
    await todos.create(session, { title: 'todo' });
    await todos.update(session, 'todo-id', { completed: true });
    await todos.delete(session, 'todo-id');

    expect(send.mock.calls.map(([request]) => `${request.method} ${request.path}`)).toEqual([
      'POST /api/auth/register',
      'POST /api/auth/login',
      'POST /api/auth/logout',
      'GET /api/analytics/events',
      'GET /api/profile',
      'PATCH /api/profile',
      'POST /api/profile/password',
      'GET /api/tags/palette',
      'GET /api/tags?search=search',
      'POST /api/tags',
      'DELETE /api/tags/tag-id',
      'POST /api/todos',
      'PATCH /api/todos/todo-id',
      'DELETE /api/todos/todo-id',
    ]);
  });
});

function fakeTransport() {
  const send = vi.fn().mockResolvedValue({ ok: true, status: 200, data: {} });
  return { send, transport: { send } as unknown as HttpTransport };
}
