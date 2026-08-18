import type { ApiErrorBody } from './contracts';

export type ApiResult<T> =
  | { readonly ok: true; readonly status: number; readonly data: T }
  | {
      readonly ok: false;
      readonly status: number;
      readonly error: ApiErrorBody;
      readonly retryAfterMs?: number;
    };

export class ApiContractError extends Error {
  constructor(
    readonly path: string,
    readonly status: number,
    options?: ErrorOptions,
  ) {
    super(`API contract mismatch for ${path} (${status})`, options);
    this.name = 'ApiContractError';
  }
}

export function requireSuccess<T>(result: ApiResult<T>, operation: string): T {
  if (!result.ok) {
    throw new Error(`${operation} failed with HTTP ${result.status}: ${result.error.message}`);
  }
  return result.data;
}
