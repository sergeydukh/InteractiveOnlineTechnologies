import 'dotenv/config';
import { defineConfig, devices } from '@playwright/test';
import { baseUrl, optionalAccessKey } from './src/config/environment';

const isCI = Boolean(process.env.CI);
const accessKey = optionalAccessKey();

export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  workers: 1,
  timeout: 180000,

  retries: isCI ? 1 : 0,

  reporter: [
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
    ['junit', { outputFile: 'test-results/junit.xml' }],
    ['list'],
  ],

  use: {
    baseURL: baseUrl(),
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'on-first-retry',
  },

  projects: [
    {
      name: 'api',
      testMatch: /.*\.api\.spec\.ts/,
    },
    {
      name: 'smoke',
      testMatch: /.*\.smoke\.spec\.ts/,
      use: {
        ...devices['Desktop Chrome'],
        extraHTTPHeaders: accessKey ? { 'X-Access-Key': accessKey } : undefined,
      },
    },
    {
      name: 'smoke-firefox',
      testMatch: /.*\.smoke\.spec\.ts/,
      use: {
        ...devices['Desktop Firefox'],
        extraHTTPHeaders: accessKey ? { 'X-Access-Key': accessKey } : undefined,
      },
    },
    {
      name: 'smoke-webkit',
      testMatch: /.*\.smoke\.spec\.ts/,
      use: {
        ...devices['Desktop Safari'],
        extraHTTPHeaders: accessKey ? { 'X-Access-Key': accessKey } : undefined,
      },
    },
    {
      name: 'ui',
      testMatch: /.*\.ui\.spec\.ts/,
      use: {
        ...devices['Desktop Chrome'],
        extraHTTPHeaders: accessKey ? { 'X-Access-Key': accessKey } : undefined,
      },
    },
    {
      name: 'integration',
      testMatch: /.*\.integration\.spec\.ts/,
      use: {
        ...devices['Desktop Chrome'],
        extraHTTPHeaders: accessKey ? { 'X-Access-Key': accessKey } : undefined,
      },
    },
  ],

  outputDir: 'test-results/',
});
