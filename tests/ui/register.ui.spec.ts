import { test, expect } from '@fixtures';
import { createRegistrationData, testRunId } from '@src/test-support/testData';

test.describe('Registration UI', { tag: '@ui' }, () => {
  test('registers a unique user and opens dashboard', async ({ registerPage, page }, testInfo) => {
    const user = createRegistrationData({
      runId: testRunId(),
      project: testInfo.project.name,
      worker: testInfo.workerIndex,
      testId: testInfo.testId.slice(-10),
    });
    const response = await registerPage.register({ ...user, analyticsConsent: true });
    expect(response.ok()).toBe(true);
    await expect(page).toHaveURL(/dashboard\.html/u);
  });

  test('requires analytics consent before sending registration', async ({ registerPage, page }, testInfo) => {
    const user = createRegistrationData({
      runId: testRunId(),
      project: testInfo.project.name,
      worker: testInfo.workerIndex,
      testId: `${testInfo.testId.slice(-10)}-consent`,
    });
    await registerPage.completeForm({ ...user, analyticsConsent: false });
    await registerPage.submit.click();
    const validity = await registerPage.consentValidity();
    expect(validity).toEqual({ valid: false, valueMissing: true });
    await expect(page).toHaveURL(/register\.html/u);
  });
});
