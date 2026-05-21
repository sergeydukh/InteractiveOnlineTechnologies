import { test, expect } from '@fixtures';
import { getBaseUrl } from '@config/appConfig';

const BASE_URL = getBaseUrl();

test.describe('API: security', { tag: '@api' }, () => {
  test('protected API rejects auth requests without X-Access-Key', async () => {
    const response = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'missing-access-key@example.com',
        password: 'irrelevant-password',
      }),
    });

    expect(response.status).toBe(401);
    expect(response.ok).toBe(false);
  });
});
