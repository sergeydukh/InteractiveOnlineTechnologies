import { test, expect } from '@fixtures';
import { expectFailure } from '@src/test-support/apiAssertions';

test.describe('Auth API', { tag: '@api' }, () => {
  test('registers a user role and rejects invalid credentials and duplicate email', async ({ api, actor }) => {
    expect(actor.session.role).toBe('user');
    expect(actor.session.token).toBeTruthy();

    const invalidLogin = await api.auth.login({
      email: actor.user.email,
      password: `${actor.user.password}-invalid`,
    });
    expectFailure(invalidLogin, 400);
    expect(invalidLogin.error.message).toBe('Invalid credentials');

    const duplicate = await api.auth.register(actor.user);
    expect(duplicate.ok).toBe(false);
    expect(duplicate.status).toBeGreaterThanOrEqual(400);
    expect(duplicate.status).toBeLessThan(500);
  });
});
