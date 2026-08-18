import { test, expect } from '@fixtures';
import { expectSuccess } from '@src/test-support/apiAssertions';
import { AnalyticsProbe } from '@src/test-support/analyticsProbe';

test.describe('Analytics consent integration', { tag: '@integration' }, () => {
  test('stops and resumes business event recording with consent', async ({ api, actor }) => {
    const probe = new AnalyticsProbe(api.analytics);
    const initialTitle = `analytics-on-${Date.now()}`;
    expectSuccess(await api.todos.create(actor.session, { title: initialTitle }), 201);
    const initial = await probe.waitFor((event) => event.type === 'todoCreate' && event.email === actor.user.email);
    expect(initial.status).toBe('success');

    expectSuccess(await api.profile.update(actor.session, { internalAnalyticsConsent: false }));
    const disabledAt = Date.now();
    expectSuccess(await api.todos.create(actor.session, { title: `analytics-off-${disabledAt}` }), 201);
    const remainedAbsent = await probe.observeAbsence(
      (event) =>
        event.type === 'todoCreate' && event.email === actor.user.email && Date.parse(event.timestamp) >= disabledAt,
    );
    expect(remainedAbsent).toBe(true);

    expectSuccess(await api.profile.update(actor.session, { internalAnalyticsConsent: true }));
    const enabledAt = Date.now();
    expectSuccess(await api.todos.create(actor.session, { title: `analytics-restored-${enabledAt}` }), 201);
    await probe.waitFor(
      (event) =>
        event.type === 'todoCreate' && event.email === actor.user.email && Date.parse(event.timestamp) >= enabledAt,
    );

    const consentEvent = await probe.waitFor(
      (event) =>
        event.type === 'analyticsConsentChange' && event.email === actor.user.email && event.analyticsConsent === true,
    );
    expect(consentEvent.analyticsConsent).toBe(true);
  });
});
