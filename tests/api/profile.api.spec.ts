import { test, expect } from '@fixtures';
import { expectSuccess } from '@src/test-support/apiAssertions';
import { validPngUpload } from '@src/test-support/testData';

test.describe('Profile API', { tag: '@api' }, () => {
  test('enforces profile and password contracts', async ({ api, isolatedActor: actor }) => {
    const initial = await api.profile.get(actor.session);
    expectSuccess(initial, 200);
    expect(initial.data.user.email).toBe(actor.user.email);

    const updated = await api.profile.update(actor.session, {
      name: 'n'.repeat(120),
      gender: '1',
      internalAnalyticsConsent: false,
    });
    expectSuccess(updated, 200);
    expect(updated.data.user).toMatchObject({
      name: 'n'.repeat(120),
      gender: '1',
      internalAnalyticsConsent: false,
    });

    const mismatch = await api.profile.changePassword(actor.session, 'Password1!', 'Password2!');
    expect(mismatch).toMatchObject({ ok: false, status: 400, error: { message: 'Passwords do not match' } });

    const tooShort = await api.profile.changePassword(actor.session, '12345');
    expect(tooShort).toMatchObject({
      ok: false,
      status: 400,
      error: { message: 'Password must be at least 6 characters' },
    });

    const changed = await api.profile.changePassword(actor.session, 'NewPass!456');
    expectSuccess(changed, 200);
    const newLogin = await api.auth.login({ email: actor.user.email, password: 'NewPass!456' });
    expectSuccess(newLogin, 200);
    const oldLogin = await api.auth.login({ email: actor.user.email, password: actor.user.password });
    expect(oldLogin).toMatchObject({ ok: false, status: 400, error: { message: 'Invalid credentials' } });
  });

  test('rejects a profile name above the UI limit', { tag: '@known-defect' }, async ({ api, isolatedActor: actor }) => {
    const result = await api.profile.update(actor.session, { name: 'n'.repeat(121) });
    test.fail(true, 'KNOWN-002: API accepts 121 characters while the UI limit is 120.');
    expect(result).toMatchObject({ ok: false, status: 400 });
  });

  test('uploads and removes a valid avatar', async ({ api, secondaryResourceActor: actor }) => {
    const uploaded = await api.profile.uploadPhoto(actor.session, validPngUpload('profile-avatar.png'));
    expectSuccess(uploaded, 200);
    expect(uploaded.data.user.photo).toBeTruthy();

    const removed = await api.profile.update(actor.session, { photo: null });
    expectSuccess(removed, 200);
    expect(removed.data.user.photo).toBeFalsy();
  });
});
