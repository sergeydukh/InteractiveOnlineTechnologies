import { test, expect } from '../../fixtures';
import { createTestUser } from '../../utils/testData';

test.describe('API: auth', { tag: '@api' }, () => {
  test('registers, logs in and logs out a unique user', async ({ api }) => {
    const user = createTestUser();

    await api.register(user);
    const login = await api.login(user.email, user.password);
    expect(login.role).toBe('user');
    expect(login.token).toBeTruthy();

    await api.logout(login.token);
  });

  test('rejects invalid login credentials', async ({ api }) => {
    const response = await api.rawLogin('missing-user@example.com', 'wrong-password');
    const body = (await response.json()) as { message: string };

    expect(response.status()).toBeLessThan(500);
    expect(response.status()).toBe(400);
    expect(body.message).toBe('Invalid credentials');
  });
});
