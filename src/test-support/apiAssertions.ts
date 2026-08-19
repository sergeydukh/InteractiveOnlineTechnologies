import { expect } from '@playwright/test';
import type { ApiResult } from '../api/result';

export function expectSuccess<T>(
  result: ApiResult<T>,
  status: number,
): asserts result is Extract<ApiResult<T>, { ok: true }> {
  expect(result.status).toBe(status);
  expect(result.ok).toBe(true);
}

export function expectFailure<T>(
  result: ApiResult<T>,
  status: number,
): asserts result is Extract<ApiResult<T>, { ok: false }> {
  expect(result.status).toBe(status);
  expect(result.ok).toBe(false);
}
