import { describe, expect, it } from 'vitest';
import { createRegistrationData, testRunId } from '../../src/test-support/testData';
import { storageStateFor } from '../../src/test-support/storageState';

describe('test data and sessions', () => {
  const identity = { runId: 'run-123', project: 'api', worker: 2, testId: 'creates a todo' };

  it('marks unique users with run and test metadata within field limits', () => {
    const first = createRegistrationData(identity);
    const second = createRegistrationData(identity);
    expect(first.email).not.toBe(second.email);
    expect(first.email).toContain('run-123');
    expect(first.name.length).toBeLessThanOrEqual(120);
  });

  it('prefers an explicit run id', () => {
    expect(testRunId({ TEST_RUN_ID: ' Deploy SHA ' })).toBe('deploy-sha');
  });

  it('builds role-specific storage state', () => {
    const user = storageStateFor('https://qa.test', { role: 'user', token: 'user-token' });
    const admin = storageStateFor('https://qa.test', { role: 'admin', token: 'admin-token' });
    expect(user.origins[0].localStorage).toEqual([{ name: 'token', value: 'user-token' }]);
    expect(admin.origins[0].localStorage).toEqual([{ name: 'adminToken', value: 'admin-token' }]);
  });
});
