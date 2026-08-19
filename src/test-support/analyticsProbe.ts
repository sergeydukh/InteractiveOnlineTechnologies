import type { AnalyticsEvent } from '../api/contracts';
import type { AnalyticsApi } from '../api/services/analyticsApi';
import { requireSuccess } from '../api/result';

type Delay = (milliseconds: number) => Promise<void>;

export class AnalyticsProbe {
  constructor(
    private readonly analytics: AnalyticsApi,
    private readonly delay: Delay = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds)),
  ) {}

  async waitFor(
    predicate: (event: AnalyticsEvent) => boolean,
    timeoutMs = 15_000,
    intervalMs = 500,
  ): Promise<AnalyticsEvent> {
    const deadline = Date.now() + timeoutMs;
    do {
      const events = requireSuccess(await this.analytics.getEvents(), 'Read analytics events');
      const event = events.find(predicate);
      if (event) return event;
      await this.delay(Math.min(intervalMs, Math.max(deadline - Date.now(), 0)));
    } while (Date.now() < deadline);
    throw new Error('Expected analytics event did not appear before the observation deadline.');
  }

  async observeAbsence(
    predicate: (event: AnalyticsEvent) => boolean,
    observationMs = 3_000,
    intervalMs = 500,
  ): Promise<boolean> {
    const deadline = Date.now() + observationMs;
    do {
      const events = requireSuccess(await this.analytics.getEvents(), 'Read analytics events');
      if (events.some(predicate)) return false;
      await this.delay(Math.min(intervalMs, Math.max(deadline - Date.now(), 0)));
    } while (Date.now() < deadline);
    return true;
  }

  async waitForAll(
    predicates: ReadonlyArray<(event: AnalyticsEvent) => boolean>,
    timeoutMs = 20_000,
    intervalMs = 500,
  ): Promise<AnalyticsEvent[]> {
    const deadline = Date.now() + timeoutMs;
    do {
      const events = requireSuccess(await this.analytics.getEvents(), 'Read analytics events');
      if (predicates.every((predicate) => events.some(predicate))) return events;
      await this.delay(Math.min(intervalMs, Math.max(deadline - Date.now(), 0)));
    } while (Date.now() < deadline);
    throw new Error('Expected analytics events did not all appear before the observation deadline.');
  }
}
