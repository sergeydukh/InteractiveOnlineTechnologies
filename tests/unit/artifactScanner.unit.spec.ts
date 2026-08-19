import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { afterEach, describe, expect, it } from 'vitest';

interface Secret {
  readonly name: string;
  readonly value: string;
}

interface ArtifactScannerModule {
  configuredSecrets(env?: NodeJS.ProcessEnv): Secret[];
  scanArtifacts(targets: string[], secrets: Secret[]): Array<{ file: string; secretName: string }>;
}

const require = createRequire(__filename);
const scanner = require('../../scripts/scan-artifacts.cjs') as ArtifactScannerModule;
const temporaryDirectories: string[] = [];

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) fs.rmSync(directory, { recursive: true, force: true });
});

describe('artifact scanner', () => {
  it('ignores missing and placeholder secrets', () => {
    expect(scanner.configuredSecrets({ ACCESS_KEY: '', ADMIN_EMAIL: 'short' })).toEqual([]);
  });

  it('reports the secret name and file without returning the value', () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'qa-artifacts-'));
    temporaryDirectories.push(directory);
    const artifact = path.join(directory, 'report.html');
    fs.writeFileSync(artifact, 'request header: application.secret-value');

    const findings = scanner.scanArtifacts([directory], [{ name: 'ACCESS_KEY', value: 'application.secret-value' }]);

    expect(findings).toEqual([{ file: artifact, secretName: 'ACCESS_KEY' }]);
    expect(JSON.stringify(findings)).not.toContain('application.secret-value');
  });
});
