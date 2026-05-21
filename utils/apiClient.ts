import { APIRequestContext, APIResponse, expect } from '@playwright/test';
import { getAnalyticsBasicAuthHeader, getSecrets } from '@utils/secrets';
import { TestUserData } from '@utils/testData';
import type { AdminUser, AnalyticsEvent, LoginResponse, Pagination, Tag, Todo, User } from '@utils/apiTypes';

type HttpMethod = 'GET' | 'POST' | 'PATCH' | 'DELETE';

type ApiRequestOptions = Omit<NonNullable<Parameters<APIRequestContext['fetch']>[1]>, 'method'>;

const RATE_LIMIT_RETRY_DELAYS_MS = [2000, 5000, 10000, 20000, 30000, 45000];

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export class ApiClient {
  constructor(private readonly request: APIRequestContext) {}

  private authHeaders(token: string): Record<string, string> {
    return { Authorization: `Bearer ${token}` };
  }

  private analyticsHeaders(): Record<string, string> {
    return { Authorization: getAnalyticsBasicAuthHeader() };
  }

  private async requestJson<T>(method: HttpMethod, url: string, options?: ApiRequestOptions): Promise<T> {
    for (let attempt = 0; attempt <= RATE_LIMIT_RETRY_DELAYS_MS.length; attempt += 1) {
      const response = await this.request.fetch(url, { ...options, method });

      if (response.ok()) {
        return response.json() as Promise<T>;
      }

      if (response.status() !== 429 || attempt === RATE_LIMIT_RETRY_DELAYS_MS.length) {
        throw new Error(`API ${response.status()} ${response.url()}: ${await response.text()}`);
      }

      await delay(RATE_LIMIT_RETRY_DELAYS_MS[attempt]);
    }

    throw new Error(`API ${method} ${url}: exhausted retry attempts`);
  }

  register(user: TestUserData): Promise<{ message: string }> {
    return this.requestJson<{ message: string }>('POST', '/api/auth/register', { data: user });
  }

  login(email: string, password: string): Promise<LoginResponse> {
    return this.requestJson<LoginResponse>('POST', '/api/auth/login', { data: { email, password } });
  }

  rawLogin(email: string, password: string): Promise<APIResponse> {
    return this.request.post('/api/auth/login', { data: { email, password } });
  }

  logout(token: string): Promise<{ message?: string }> {
    return this.requestJson<{ message?: string }>('POST', '/api/auth/logout', {
      headers: this.authHeaders(token),
      data: {},
    });
  }

  getProfile(token: string): Promise<{ message: string; user: User }> {
    return this.requestJson<{ message: string; user: User }>('GET', '/api/profile', {
      headers: this.authHeaders(token),
    });
  }

  updateProfile(
    token: string,
    data: { name?: string; gender?: '0' | '1'; photo?: string | null; internalAnalyticsConsent?: boolean },
  ): Promise<{ message: string; user: User }> {
    return this.requestJson<{ message: string; user: User }>('PATCH', '/api/profile', {
      headers: this.authHeaders(token),
      data,
    });
  }

  changePassword(token: string, newPassword: string, confirmPassword = newPassword): Promise<{ message: string }> {
    return this.requestJson<{ message: string }>('POST', '/api/profile/password', {
      headers: this.authHeaders(token),
      data: { newPassword, confirmPassword },
    });
  }

  rawChangePassword(token: string, newPassword: string, confirmPassword: string): Promise<APIResponse> {
    return this.request.post('/api/profile/password', {
      headers: this.authHeaders(token),
      data: { newPassword, confirmPassword },
    });
  }

  listTodos(
    token: string,
    query: { status?: 'all' | 'active' | 'completed'; search?: string; page?: number; limit?: number; tagIds?: string[] } = {},
  ): Promise<{ todos: Todo[]; pagination: Pagination }> {
    const params = new URLSearchParams({
      status: query.status ?? 'all',
      search: query.search ?? '',
      page: String(query.page ?? 1),
      limit: String(query.limit ?? 5),
      sort: 'smart',
    });
    for (const tagId of query.tagIds ?? []) {
      params.append('tagIds', tagId);
    }
    return this.requestJson<{ todos: Todo[]; pagination: Pagination }>('GET', `/api/todos?${params.toString()}`, {
      headers: this.authHeaders(token),
    });
  }

  createTodo(token: string, data: { title: string; tagIds?: string[] }): Promise<{ todo: Todo }> {
    return this.requestJson<{ todo: Todo }>('POST', '/api/todos', {
      headers: this.authHeaders(token),
      data,
    });
  }

  updateTodo(token: string, todoId: string, data: { title?: string; completed?: boolean; tagIds?: string[] }): Promise<{ todo: Todo }> {
    return this.requestJson<{ todo: Todo }>('PATCH', `/api/todos/${todoId}`, {
      headers: this.authHeaders(token),
      data,
    });
  }

  deleteTodo(token: string, todoId: string): Promise<{ message: string }> {
    return this.requestJson<{ message: string }>('DELETE', `/api/todos/${todoId}`, {
      headers: this.authHeaders(token),
    });
  }

  getTagPalette(token: string): Promise<{ colors: string[] }> {
    return this.requestJson<{ colors: string[] }>('GET', '/api/tags/palette', {
      headers: this.authHeaders(token),
    });
  }

  listTags(token: string, search = ''): Promise<{ tags: Tag[] }> {
    const params = new URLSearchParams();
    if (search) {
      params.set('search', search);
    }
    return this.requestJson<{ tags: Tag[] }>('GET', `/api/tags?${params.toString()}`, {
      headers: this.authHeaders(token),
    });
  }

  createTag(token: string, data: { name: string; color: string }): Promise<{ tag: Tag }> {
    return this.requestJson<{ tag: Tag }>('POST', '/api/tags', {
      headers: this.authHeaders(token),
      data,
    });
  }

  deleteTag(token: string, tagId: string): Promise<{ message: string }> {
    return this.requestJson<{ message: string }>('DELETE', `/api/tags/${tagId}`, {
      headers: this.authHeaders(token),
    });
  }

  async adminLogin(): Promise<LoginResponse> {
    const { adminEmail, adminPassword } = getSecrets();
    const response = await this.login(adminEmail, adminPassword);
    expect(response.role).toBe('admin');
    return response;
  }

  adminOverview(token: string, query: { search?: string; page?: number; limit?: number } = {}): Promise<{ users: AdminUser[]; pagination: Pagination }> {
    const params = new URLSearchParams({
      page: String(query.page ?? 1),
      limit: String(query.limit ?? 5),
    });
    if (query.search) {
      params.set('search', query.search);
    }
    return this.requestJson<{ users: AdminUser[]; pagination: Pagination }>('GET', `/api/admin/overview?${params.toString()}`, {
      headers: this.authHeaders(token),
    });
  }

  getAnalyticsEvents(): Promise<AnalyticsEvent[]> {
    return this.requestJson<AnalyticsEvent[]>('GET', '/api/analytics/events', {
      headers: this.analyticsHeaders(),
    });
  }

  async waitForAnalyticsEvent(
    predicate: (event: AnalyticsEvent) => boolean,
    options: { timeout?: number; message?: string } = {},
  ): Promise<AnalyticsEvent> {
    let matchedEvent: AnalyticsEvent | undefined;

    await expect
      .poll(
        async () => {
          const events = await this.getAnalyticsEvents();
          matchedEvent = events.find(predicate);
          return Boolean(matchedEvent);
        },
        {
          intervals: [500, 1000, 2000],
          timeout: options.timeout ?? 15000,
          message: options.message ?? 'Expected analytics event to appear',
        },
      )
      .toBe(true);

    return matchedEvent as AnalyticsEvent;
  }
}
