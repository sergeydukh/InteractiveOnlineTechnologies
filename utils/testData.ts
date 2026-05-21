import path from "path";
import os from "os";
import fs from "fs";

export type TestUserData = {
  name: string;
  email: string;
  gender: '0' | '1';
  password: string;
  internalAnalyticsConsent: boolean;
};

export function uniqueId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function uniqueEmail(prefix = 'qa-user'): string {
  return `${uniqueId(prefix)}@example.com`;
}

export function createTestUser(overrides: Partial<TestUserData> = {}): TestUserData {
  const id = uniqueId('user');
  return {
    name: `QA ${id}`,
    email: `${id}@example.com`,
    gender: '0',
    password: 'TestPass!123',
    internalAnalyticsConsent: true,
    ...overrides,
  };
}

export function uniqueTodoTitle(): string {
  return `Todo ${uniqueId('item')}`;
}

export function uniqueTagName(): string {
  return `tag-${uniqueId('label')}`.slice(0, 38);
}

export function createTempAvatar(): string {
  const tmpFile = path.join(os.tmpdir(), `test-avatar-${Date.now()}.png`);
  const pngBytes = Buffer.from(
      '89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000a4944415408d7636000000002000193e583610000000049454e44ae426082',
      'hex',
  );
  fs.writeFileSync(tmpFile, pngBytes);
  return tmpFile;
}

export function removeFileIfExists(filePath: string): void {
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
}
