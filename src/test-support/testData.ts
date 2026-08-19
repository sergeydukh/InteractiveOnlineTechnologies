import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type { RegistrationData } from '../api/services/authApi';
import type { UserSession } from '../auth/session';
import type { UploadFile } from '../api/fileUpload';

export interface TestIdentity {
  readonly runId: string;
  readonly project: string;
  readonly worker: number;
  readonly testId: string;
}

export interface TestActor {
  readonly user: RegistrationData;
  session: UserSession;
  readonly identity: TestIdentity;
  readonly registrationStartedAt: number;
}

export function testRunId(env: NodeJS.ProcessEnv = process.env): string {
  return sanitize(env.TEST_RUN_ID ?? env.GITHUB_SHA?.slice(0, 10) ?? `local-${Date.now()}`);
}

export function createRegistrationData(
  identity: TestIdentity,
  overrides: Partial<RegistrationData> = {},
): RegistrationData {
  const unique = crypto.randomBytes(3).toString('hex');
  const marker = sanitize(`${identity.runId}-${identity.project}-w${identity.worker}-${identity.testId}`).slice(0, 44);
  const localPart = `qa-${marker}-${unique}`.slice(0, 60);
  return {
    name: `QA ${marker}`.slice(0, 120),
    email: `${localPart}@example.com`,
    gender: '0',
    password: 'TestPass!123',
    internalAnalyticsConsent: true,
    ...overrides,
  };
}

export function uniqueTodoTitle(identity: TestIdentity): string {
  return `Todo ${sanitize(identity.testId).slice(0, 40)} ${Date.now()}`;
}

export function uniqueTagName(identity: TestIdentity): string {
  return `tag-${sanitize(identity.testId).slice(0, 18)}-${crypto.randomBytes(2).toString('hex')}`.slice(0, 40);
}

export function createTempAvatar(extension: 'png' | 'txt' = 'png'): string {
  const file = path.join(os.tmpdir(), `qa-avatar-${crypto.randomUUID()}.${extension}`);
  const content =
    extension === 'png'
      ? Buffer.from(
          '89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000a4944415408d7636000000002000193e583610000000049454e44ae426082',
          'hex',
        )
      : Buffer.from('not an image');
  fs.writeFileSync(file, content);
  return file;
}

export function validPngUpload(name = 'avatar.png'): UploadFile {
  return {
    name,
    mimeType: 'image/png',
    buffer: Buffer.from(
      '89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000a4944415408d7636000000002000193e583610000000049454e44ae426082',
      'hex',
    ),
  };
}

export function removeTempFile(file: string): void {
  if (fs.existsSync(file)) fs.unlinkSync(file);
}

function sanitize(value: string): string {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9-]+/gu, '-')
      .replace(/^-|-$/gu, '') || 'test'
  );
}
