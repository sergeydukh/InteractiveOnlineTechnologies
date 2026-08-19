import { test, expect } from '@fixtures';
import { expectFailure, expectSuccess } from '@src/test-support/apiAssertions';
import { createRegistrationData, testRunId, validPngUpload } from '@src/test-support/testData';

test.describe('Auth API', { tag: '@api' }, () => {
  test('registers a user role and rejects invalid credentials and duplicate email', async ({
    api,
    isolatedActor: actor,
  }) => {
    expect(actor.session.role).toBe('user');
    expect(actor.session.token).toBeTruthy();

    const invalidLogin = await api.auth.login({
      email: actor.user.email,
      password: `${actor.user.password}-invalid`,
    });
    expectFailure(invalidLogin, 400);
    expect(invalidLogin.error.message).toBe('Invalid credentials');

    const duplicate = await api.auth.register(actor.user);
    expectFailure(duplicate, 409);
  });

  test('invalidates only the logged-out session', { tag: '@known-defect' }, async ({ api, isolatedActor: actor }) => {
    const additionalLogin = await api.auth.login({ email: actor.user.email, password: actor.user.password });
    expectSuccess(additionalLogin, 200);
    const additionalSession = { role: 'user' as const, token: additionalLogin.data.token };

    const logout = await api.auth.logout(additionalSession);
    expectSuccess(logout, 200);
    expect(logout.status).toBe(200);
    const invalidated = await api.profile.get(additionalSession);
    const originalSession = await api.profile.get(actor.session);
    expectSuccess(originalSession, 200);
    expect(originalSession.status).toBe(200);
    test.fail(true, 'KNOWN-004: logout returns success but the bearer token remains valid.');
    expectFailure(invalidated, 401);
    expect(invalidated.status).toBe(401);
  });

  test('registers with a pre-uploaded profile photo', async ({ api }, testInfo) => {
    const upload = await api.uploads.uploadRegistrationPhoto(validPngUpload('registration-avatar.png'));
    expectSuccess(upload, 201);
    const user = createRegistrationData(
      {
        runId: testRunId(),
        project: testInfo.project.name,
        worker: testInfo.workerIndex,
        testId: `${testInfo.testId.slice(-10)}-photo`,
      },
      { photo: upload.data.fileUrl, gender: '1' },
    );

    expectSuccess(await api.auth.register(user), 201);
    const login = await api.auth.login({ email: user.email, password: user.password });
    expectSuccess(login, 200);
    const profile = await api.profile.get({ role: 'user', token: login.data.token });
    expectSuccess(profile, 200);
    expect(profile.data.user).toMatchObject({ email: user.email, gender: '1', photo: upload.data.fileUrl });
  });
});
