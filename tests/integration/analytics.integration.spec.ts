import { test, expect } from '@fixtures';
import { expectSuccess } from '@src/test-support/apiAssertions';
import { AnalyticsProbe } from '@src/test-support/analyticsProbe';
import { validPngUpload } from '@src/test-support/testData';
import type { AnalyticsEvent, AnalyticsEventType } from '@src/api/contracts';

function after(
  type: AnalyticsEventType,
  email: string,
  timestamp: number,
  extra: (event: AnalyticsEvent) => boolean = () => true,
): (event: AnalyticsEvent) => boolean {
  return (event) =>
    event.type === type && event.email === email && Date.parse(event.timestamp) >= timestamp && extra(event);
}

// Analytics timestamps may be serialized without milliseconds, so capture the beginning of the current second.
function beforeAction(): number {
  return Math.floor(Date.now() / 1_000) * 1_000;
}

test.describe('Analytics consent integration', { tag: '@integration' }, () => {
  test('records the documented user and todo lifecycle events', async ({ api, analyticsActor: actor }) => {
    const probe = new AnalyticsProbe(api.analytics);
    const email = actor.user.email;
    const todoTitle = `analytics-lifecycle-${Date.now()}`;
    const todoCreatedAt = beforeAction();
    const created = await api.todos.create(actor.session, { title: todoTitle });
    expectSuccess(created, 201);
    const todoCompletedAt = beforeAction();
    expectSuccess(await api.todos.update(actor.session, created.data.todo._id, { completed: true }), 200);
    const todoEditedAt = beforeAction();
    expectSuccess(await api.todos.update(actor.session, created.data.todo._id, { title: `${todoTitle}-edited` }), 200);
    const todoDeletedAt = beforeAction();
    expectSuccess(await api.todos.delete(actor.session, created.data.todo._id), 200);
    const photoUploadedAt = beforeAction();
    expectSuccess(await api.profile.uploadPhoto(actor.session, validPngUpload('analytics-avatar.png')), 200);

    const failedLoginAt = beforeAction();
    const invalidLogin = await api.auth.login({ email: actor.user.email, password: 'wrong-analytics-password' });
    expect(invalidLogin).toMatchObject({ ok: false, status: 400 });
    const successfulLoginAt = beforeAction();
    const extraLogin = await api.auth.login({ email: actor.user.email, password: actor.user.password });
    expectSuccess(extraLogin, 200);
    const logoutAt = beforeAction();
    expectSuccess(await api.auth.logout({ role: 'user', token: extraLogin.data.token }), 200);

    const failedPasswordAt = beforeAction();
    expect(await api.profile.changePassword(actor.session, 'Password1!', 'Password2!')).toMatchObject({
      ok: false,
      status: 400,
    });
    const successfulPasswordAt = beforeAction();
    expectSuccess(await api.profile.changePassword(actor.session, 'AnalyticsPass!456'), 200);
    const refreshed = await api.auth.login({ email: actor.user.email, password: 'AnalyticsPass!456' });
    expectSuccess(refreshed, 200);
    actor.session = { role: 'user', token: refreshed.data.token };

    const events = await probe.waitForAll([
      after('register', email, actor.registrationStartedAt),
      after('login', email, successfulLoginAt, (event) => event.status === 'success'),
      after('login', email, failedLoginAt, (event) => event.status === 'failed'),
      after('logout', email, logoutAt),
      after('photoUpload', email, photoUploadedAt),
      after('todoCreate', email, todoCreatedAt),
      after('todoComplete', email, todoCompletedAt),
      after('todoEdit', email, todoEditedAt),
      after('todoDelete', email, todoDeletedAt),
      after('passwordChangeSuccess', email, successfulPasswordAt),
      after('passwordChangeFailed', email, failedPasswordAt),
    ]);

    const own = events.filter((event) => event.email === email);
    const registration = own.find((event) => event.type === 'register');
    expect(registration?.name).toBe(actor.user.name);
    expect([0, '0']).toContain(registration?.gender);
    expect(own.find((event) => event.type === 'login' && event.status === 'failed')?.reason).toBeTruthy();
    expect(own.find((event) => event.type === 'photoUpload')?.fileName).toMatch(/^photo-\d+-\d+\.png$/u);
    expect(own.find((event) => event.type === 'passwordChangeFailed')?.reason).toBeTruthy();
    for (const type of ['todoCreate', 'todoComplete', 'todoEdit', 'todoDelete'] as const) {
      expect(own.find((event) => event.type === type)?.status).toBe('success');
    }
  });

  test('stops and resumes business event recording with consent', async ({ api, analyticsActor: actor }) => {
    const probe = new AnalyticsProbe(api.analytics);
    const initialTitle = `analytics-on-${Date.now()}`;
    const initialCreatedAt = beforeAction();
    expectSuccess(await api.todos.create(actor.session, { title: initialTitle }), 201);
    const initial = await probe.waitFor(after('todoCreate', actor.user.email, initialCreatedAt));
    expect(initial.status).toBe('success');

    const consentDisabledAt = beforeAction();
    expectSuccess(await api.profile.update(actor.session, { internalAnalyticsConsent: false }), 200);
    await probe.waitFor(
      after('analyticsConsentChange', actor.user.email, consentDisabledAt, (event) => event.analyticsConsent === false),
    );
    const disabledMutationAt = beforeAction();
    expectSuccess(await api.todos.create(actor.session, { title: `analytics-off-${disabledMutationAt}` }), 201);
    const remainedAbsent = await probe.observeAbsence(after('todoCreate', actor.user.email, disabledMutationAt), 5_000);
    expect(remainedAbsent).toBe(true);

    const consentEnabledAt = beforeAction();
    expectSuccess(await api.profile.update(actor.session, { internalAnalyticsConsent: true }), 200);
    const consentEvent = await probe.waitFor(
      after('analyticsConsentChange', actor.user.email, consentEnabledAt, (event) => event.analyticsConsent === true),
    );
    expect(consentEvent.analyticsConsent).toBe(true);

    const restoredMutationAt = beforeAction();
    expectSuccess(await api.todos.create(actor.session, { title: `analytics-restored-${restoredMutationAt}` }), 201);
    await probe.waitFor(after('todoCreate', actor.user.email, restoredMutationAt));
  });
});
