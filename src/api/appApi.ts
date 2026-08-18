import type { APIRequestContext } from '@playwright/test';
import { HttpTransport, type TransportOptions } from './httpTransport';
import { AdminApi } from './services/adminApi';
import { AnalyticsApi } from './services/analyticsApi';
import { AuthApi } from './services/authApi';
import { ProfileApi } from './services/profileApi';
import { TagsApi } from './services/tagsApi';
import { TodosApi } from './services/todosApi';

export class AppApi {
  readonly auth: AuthApi;
  readonly profile: ProfileApi;
  readonly todos: TodosApi;
  readonly tags: TagsApi;
  readonly admin: AdminApi;
  readonly analytics: AnalyticsApi;

  constructor(request: APIRequestContext, options: TransportOptions) {
    const transport = new HttpTransport(request, options);
    this.auth = new AuthApi(transport);
    this.profile = new ProfileApi(transport);
    this.todos = new TodosApi(transport);
    this.tags = new TagsApi(transport);
    this.admin = new AdminApi(transport);
    this.analytics = new AnalyticsApi(transport);
  }
}
