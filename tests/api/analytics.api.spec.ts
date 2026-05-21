import { test, expect } from '../../fixtures';
import type { AnalyticsEvent } from '@utils/apiTypes';
import { getBaseUrl } from '../../config/appConfig';
import { getAnalyticsBasicAuthHeader } from '@utils/secrets';

const BASE_URL = getBaseUrl();

function expectAnalyticsEventShape(event: AnalyticsEvent): void {
  expect(typeof event.type).toBe('string');
  expect(event.type.length).toBeGreaterThan(0);
  expect(typeof event.timestamp).toBe('string');
  expect(Number.isNaN(Date.parse(event.timestamp))).toBe(false);

  if (event.status !== undefined) {
    expect(['success', 'failed']).toContain(event.status);
  }

  if (event.email !== undefined) {
    expect(typeof event.email).toBe('string');
  }

  if (event.name !== undefined) {
    expect(typeof event.name).toBe('string');
  }

  if (event.gender !== undefined) {
    expect(['0', '1', 0, 1]).toContain(event.gender);
  }

  if (event.fileName !== undefined) {
    expect(typeof event.fileName).toBe('string');
  }

  if (event.reason !== undefined) {
    expect(typeof event.reason).toBe('string');
  }

  if (event.analyticsConsent !== undefined) {
    expect(typeof event.analyticsConsent).toBe('boolean');
  }
}

test.describe('API: analytics events', () => {
  test('returns last 24h events with valid authorization', async ({ api }) => {
    const events = await api.getAnalyticsEvents();

    expect(Array.isArray(events)).toBe(true);
    for (const event of events.slice(0, 10)) {
      expectAnalyticsEventShape(event);
    }
  });

  test('requires both X-Access-Key and Basic Auth', async ({ request }) => {
    const missingBasicAuth = await request.get('/api/analytics/events');
    expect(missingBasicAuth.status()).toBe(401);

    const missingAccessKey = await fetch(`${BASE_URL}/api/analytics/events`, {
      headers: {
        Authorization: getAnalyticsBasicAuthHeader(),
      },
    });
    expect(missingAccessKey.status).toBe(401);
  });
});
