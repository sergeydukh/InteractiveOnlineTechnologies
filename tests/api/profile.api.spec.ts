import { test, expect } from '../../fixtures';

test.describe('API: profile', { tag: '@api' }, () => {
  test('reads and updates profile for a unique user', async ({ api, testUser }) => {
    const profile = await api.getProfile(testUser.token);
    expect(profile.user.email).toBe(testUser.email);

    const updated = await api.updateProfile(testUser.token, {
      name: `${testUser.name} API`,
      gender: '1',
      internalAnalyticsConsent: false,
    });

    expect(updated.user.name).toContain('API');
    expect(updated.user.gender).toBe('1');
    expect(updated.user.internalAnalyticsConsent).toBe(false);
  });

  test('changes password and rejects mismatched confirmation', async ({ api, testUser }) => {
    const mismatch = await api.rawChangePassword(testUser.token, 'Password1!', 'Password2!');
    const mismatchBody = (await mismatch.json()) as { message: string };

    expect(mismatch.status()).toBeLessThan(500);
    expect(mismatch.status()).toBe(400);
    expect(mismatchBody.message).toBe('Passwords do not match');

    await api.changePassword(testUser.token, 'ApiPass!456');
    const login = await api.login(testUser.email, 'ApiPass!456');
    expect(login.token).toBeTruthy();
  });
});
