import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/unit/**/*.unit.spec.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/api/**/*.ts', 'src/config/**/*.ts', 'src/test-support/**/*.ts'],
      exclude: ['src/api/services/**/*.ts', 'src/test-support/apiAssertions.ts', 'src/test-support/authApiStub.ts'],
    },
  },
});
