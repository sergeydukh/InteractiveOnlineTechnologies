import { AdminOverviewSchema } from '../contracts';
import type { AuthSession } from '../../auth/session';
import type { HttpTransport } from '../httpTransport';
import { paginationParams } from '../queryParams';

export interface AdminQuery {
  readonly search?: string;
  readonly page?: number;
  readonly limit?: number;
}

export class AdminApi {
  constructor(private readonly transport: HttpTransport) {}

  getOverview(session?: AuthSession, query: AdminQuery = {}) {
    const params = paginationParams(query);
    if (query.search) params.set('search', query.search);
    return this.transport.send({
      method: 'GET',
      path: `/api/admin/overview?${params.toString()}`,
      schema: AdminOverviewSchema,
      session,
    });
  }
}
