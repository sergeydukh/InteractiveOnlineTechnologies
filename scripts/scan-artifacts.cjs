#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
require('dotenv').config({ quiet: true });

const SECRET_NAMES = [
  'ACCESS_KEY',
  'ADMIN_EMAIL',
  'ADMIN_PASSWORD',
  'ANALYTICS_BASIC_USER',
  'ANALYTICS_BASIC_PASSWORD',
];

function configuredSecrets(env = process.env) {
  return SECRET_NAMES.flatMap((name) => {
    const value = env[name]?.trim();
    return value && value.length >= 6 ? [{ name, value }] : [];
  });
}

function filesBelow(target) {
  if (!fs.existsSync(target)) return [];
  const stats = fs.statSync(target);
  if (stats.isFile()) return [target];
  if (!stats.isDirectory()) return [];
  return fs.readdirSync(target, { withFileTypes: true }).flatMap((entry) => filesBelow(path.join(target, entry.name)));
}

function scanArtifacts(targets, secrets) {
  const findings = [];
  for (const file of targets.flatMap(filesBelow)) {
    const contents = fs.readFileSync(file);
    for (const secret of secrets) {
      if (contents.includes(Buffer.from(secret.value))) findings.push({ file, secretName: secret.name });
    }
  }
  return findings;
}

function main() {
  const targets = process.argv.slice(2);
  const secrets = configuredSecrets();
  if (targets.length === 0) throw new Error('Provide one or more artifact files or directories to scan.');
  if (secrets.length === 0) {
    console.log('Artifact scan skipped: no configured secrets.');
    return;
  }
  const findings = scanArtifacts(targets, secrets);
  if (findings.length === 0) {
    console.log(`Artifact scan passed for ${targets.length} target(s).`);
    return;
  }
  for (const finding of findings) {
    console.error(`Secret ${finding.secretName} found in ${path.relative(process.cwd(), finding.file)}.`);
  }
  process.exitCode = 1;
}

if (require.main === module) main();

module.exports = { configuredSecrets, filesBelow, scanArtifacts };
