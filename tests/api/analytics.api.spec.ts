import { test, expect } from '@fixtures';
import { expectSuccess } from '@src/test-support/apiAssertions';

test.describe('Analytics API', { tag: '@api' }, () => {
  test('returns runtime-valid events from the last 24 hours', async ({ api }) => {
    const result = await api.analytics.getEvents();
    expectSuccess(result, 200);
    const earliest = Date.now() - 24 * 60 * 60 * 1_000 - 60_000;
    const latest = Date.now() + 60_000;

    for (const event of result.data) {
      expect(Date.parse(event.timestamp)).toBeGreaterThanOrEqual(earliest);
      expect(Date.parse(event.timestamp)).toBeLessThanOrEqual(latest);
    }
  });
});
