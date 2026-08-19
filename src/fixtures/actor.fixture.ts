import type { TestInfo } from '@playwright/test';
import { ActorCleaner, type CleanupReport } from '../test-support/actorCleaner';
import { ActorProvisioner } from '../test-support/actorProvisioner';
import { testRunId, type TestActor, type TestIdentity } from '../test-support/testData';
import type { AppApi } from '../api/appApi';
import { apiTest } from './api.fixture';
import type { ActorFixtures, ActorWorkerFixtures } from './types';

const actorFixtureTimeoutMs = 45_000;

export const actorTest = apiTest.extend<ActorFixtures, ActorWorkerFixtures>({
  sharedResourceActor: [
    async ({ workerApi }, use, workerInfo) => {
      await use(await new ActorProvisioner(workerApi).create(workerIdentity(workerInfo, 'resource-actor')));
    },
    { scope: 'worker', timeout: actorFixtureTimeoutMs },
  ],

  sharedSecondaryResourceActor: [
    async ({ workerApi }, use, workerInfo) => {
      await use(await new ActorProvisioner(workerApi).create(workerIdentity(workerInfo, 'secondary-resource-actor')));
    },
    { scope: 'worker', timeout: actorFixtureTimeoutMs },
  ],

  sharedAnalyticsActor: [
    async ({ workerApi }, use, workerInfo) => {
      await use(await new ActorProvisioner(workerApi).create(workerIdentity(workerInfo, 'analytics-actor')));
    },
    { scope: 'worker', timeout: actorFixtureTimeoutMs },
  ],

  readOnlyActor: [
    async ({ workerApi }, use, workerInfo) => {
      const identity = workerIdentity(workerInfo, 'readonly-smoke');
      const actor = await new ActorProvisioner(workerApi).create(identity, { name: `Read Only ${identity.runId}` });
      await use(actor);
    },
    { scope: 'worker', timeout: actorFixtureTimeoutMs },
  ],

  resourceActor: [
    async ({ api, sharedResourceActor }, use, testInfo) => useSharedActor(api, sharedResourceActor, use, testInfo),
    { timeout: actorFixtureTimeoutMs },
  ],

  secondaryResourceActor: [
    async ({ api, sharedSecondaryResourceActor }, use, testInfo) =>
      useSharedActor(api, sharedSecondaryResourceActor, use, testInfo),
    { timeout: actorFixtureTimeoutMs },
  ],

  analyticsActor: [
    async ({ api, sharedAnalyticsActor }, use, testInfo) => useSharedActor(api, sharedAnalyticsActor, use, testInfo),
    { timeout: actorFixtureTimeoutMs },
  ],

  isolatedActor: [
    async ({ api }, use, testInfo) => useIsolatedActor(api, identityFor(testInfo, 'isolated'), use, testInfo),
    { timeout: actorFixtureTimeoutMs },
  ],
});

async function useSharedActor(
  api: AppApi,
  actor: TestActor,
  use: (actor: TestActor) => Promise<void>,
  testInfo: TestInfo,
): Promise<void> {
  assertClean(await new ActorCleaner(api).clean(actor), 'Shared actor pre-test cleanup');
  try {
    await use(actor);
  } finally {
    await handleCleanup(await new ActorCleaner(api).clean(actor), testInfo);
  }
}

async function useIsolatedActor(
  api: AppApi,
  identity: TestIdentity,
  use: (actor: TestActor) => Promise<void>,
  testInfo: TestInfo,
): Promise<void> {
  const actor = await new ActorProvisioner(api).create(identity);
  try {
    await use(actor);
  } finally {
    await handleCleanup(await new ActorCleaner(api).clean(actor), testInfo);
  }
}

async function handleCleanup(report: CleanupReport, testInfo: TestInfo): Promise<void> {
  if (report.errors.length === 0) return;
  const details = report.errors.map((error) => error.message).join('\n');
  if (testInfo.status === testInfo.expectedStatus) throw new AggregateError(report.errors, details);
  await testInfo.attach('cleanup-errors.txt', { body: details, contentType: 'text/plain' });
}

function assertClean(report: CleanupReport, operation: string): void {
  if (report.errors.length > 0) throw new AggregateError(report.errors, operation);
}

function identityFor(testInfo: TestInfo, suffix: string): TestIdentity {
  return {
    runId: testRunId(),
    project: testInfo.project.name,
    worker: testInfo.workerIndex,
    testId: `${testInfo.testId.slice(-10)}-${suffix}`,
  };
}

function workerIdentity(workerInfo: { project: { name: string }; workerIndex: number }, testId: string): TestIdentity {
  return { runId: testRunId(), project: workerInfo.project.name, worker: workerInfo.workerIndex, testId };
}
