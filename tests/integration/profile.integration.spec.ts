import { test, expect } from '@fixtures';
import { expectSuccess } from '@src/test-support/apiAssertions';

test.describe('Profile UI and API integration', { tag: '@integration' }, () => {
  test('persists editable fields and keeps email read-only', async ({ api, isolatedActor: actor, profilePage }) => {
    const name = `Integrated ${Date.now()}`;
    await expect(profilePage.email).toHaveValue(actor.user.email);
    await expect(profilePage.email).not.toBeEditable();
    expect((await profilePage.save({ name, gender: '1', consent: false })).ok()).toBe(true);

    const result = await api.profile.get(actor.session);
    expectSuccess(result, 200);
    expect(result.data.user).toMatchObject({
      name,
      email: actor.user.email,
      gender: '1',
      internalAnalyticsConsent: false,
    });
  });
});
