import { test, expect } from '@fixtures';
import { expectSuccess } from '@src/test-support/apiAssertions';

test.describe('Profile API', { tag: '@api' }, () => {
  test('enforces profile and password contracts', { tag: '@known-defect' }, async ({ api, actor }) => {
    const initial = await api.profile.get(actor.session);
    expectSuccess(initial);
    expect(initial.data.user.email).toBe(actor.user.email);

    const updated = await api.profile.update(actor.session, {
      name: 'n'.repeat(120),
      gender: '1',
      internalAnalyticsConsent: false,
    });
    expectSuccess(updated);
    expect(updated.data.user).toMatchObject({
      name: 'n'.repeat(120),
      gender: '1',
      internalAnalyticsConsent: false,
    });

    const mismatch = await api.profile.changePassword(actor.session, 'Password1!', 'Password2!');
    expect(mismatch).toMatchObject({ ok: false, status: 400 });

    const tooShort = await api.profile.changePassword(actor.session, '12345');
    expect(tooShort.ok).toBe(false);

    const changed = await api.profile.changePassword(actor.session, 'NewPass!456');
    expectSuccess(changed);
    const newLogin = await api.auth.login({ email: actor.user.email, password: 'NewPass!456' });
    expectSuccess(newLogin);
    const oldLogin = await api.auth.login({ email: actor.user.email, password: actor.user.password });
    expect(oldLogin.ok).toBe(false);

    const result = await api.profile.update(actor.session, { name: 'n'.repeat(121) });
    expectSuccess(result);
    expect(result.data.user.name).toHaveLength(121);
  });
});
