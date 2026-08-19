import { MessageSchema, TodoResponseSchema, TodosResponseSchema } from '../contracts';
import type { UserSession } from '../../auth/session';
import type { HttpTransport } from '../httpTransport';
import { paginationParams } from '../queryParams';

export interface TodoQuery {
  readonly status?: 'all' | 'active' | 'completed';
  readonly search?: string;
  readonly page?: number;
  readonly limit?: number;
  readonly tagIds?: readonly string[];
}

export class TodosApi {
  constructor(private readonly transport: HttpTransport) {}

  list(session?: UserSession, query: TodoQuery = {}) {
    const params = paginationParams(query);
    params.set('status', query.status ?? 'all');
    params.set('search', query.search ?? '');
    params.set('sort', 'smart');
    for (const id of query.tagIds ?? []) params.append('tagIds', id);
    return this.transport.send({
      method: 'GET',
      path: `/api/todos?${params.toString()}`,
      schema: TodosResponseSchema,
      session,
    });
  }

  create(session: UserSession, data: Readonly<{ title: string; tagIds?: readonly string[] }>) {
    return this.transport.send({ method: 'POST', path: '/api/todos', schema: TodoResponseSchema, session, data });
  }

  update(
    session: UserSession,
    todoId: string,
    data: Readonly<{ title?: string; completed?: boolean; tagIds?: readonly string[] }>,
  ) {
    return this.transport.send({
      method: 'PATCH',
      path: `/api/todos/${todoId}`,
      schema: TodoResponseSchema,
      session,
      data,
    });
  }

  delete(session: UserSession, todoId: string) {
    return this.transport.send({
      method: 'DELETE',
      path: `/api/todos/${todoId}`,
      schema: MessageSchema,
      session,
    });
  }
}
