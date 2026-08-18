import { AnalyticsEventsSchema } from '../contracts';
import type { HttpTransport } from '../httpTransport';

export class AnalyticsApi {
  constructor(private readonly transport: HttpTransport) {}

  getEvents() {
    return this.transport.send({
      method: 'GET',
      path: '/api/analytics/events',
      schema: AnalyticsEventsSchema,
      authorization: 'analytics-basic',
    });
  }
}
