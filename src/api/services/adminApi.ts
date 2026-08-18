import { AdminOverviewSchema } from '../contracts';
import type { AuthSession } from '../../domain/session';
import type { HttpTransport } from '../httpTransport';

export interface AdminQuery {
  readonly search?: string;
  readonly page?: number;
  readonly limit?: number;
}

export class AdminApi {
  constructor(private readonly transport: HttpTransport) {}

  getOverview(session?: AuthSession, query: AdminQuery = {}) {
    const params = new URLSearchParams({ page: String(query.page ?? 1), limit: String(query.limit ?? 5) });
    if (query.search) params.set('search', query.search);
    return this.transport.send({
      method: 'GET',
      path: `/api/admin/overview?${params.toString()}`,
      schema: AdminOverviewSchema,
      session,
    });
  }
}
