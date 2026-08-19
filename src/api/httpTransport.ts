import type { APIRequestContext } from '@playwright/test';
import type { z } from 'zod';
import { ApiErrorSchema } from './contracts';
import { ApiContractError, ApiNetworkError, type ApiResult } from './result';
import type { AuthSession } from '../auth/session';
import type { UploadFile } from './fileUpload';

export type HttpMethod = 'GET' | 'POST' | 'PATCH' | 'DELETE';

export interface TransportOptions {
  readonly accessKey?: string;
  readonly analyticsCredentials?: Readonly<{ username: string; password: string }>;
}

interface ApiRequestBase<T> {
  readonly method: HttpMethod;
  readonly path: string;
  readonly schema: z.ZodType<T>;
}

type ApiAuthorization =
  | { readonly session?: AuthSession; readonly authorization?: never }
  | { readonly session?: never; readonly authorization: 'analytics-basic' };

type ApiBody =
  | { readonly data?: unknown; readonly multipart?: never }
  | { readonly data?: never; readonly multipart: Record<string, string | number | boolean | UploadFile> };

export type ApiRequest<T> = ApiRequestBase<T> & ApiAuthorization & ApiBody;

export class HttpTransport {
  constructor(
    private readonly request: APIRequestContext,
    private readonly options: TransportOptions,
  ) {}

  async send<T>(request: ApiRequest<T>): Promise<ApiResult<T>> {
    if (!request.path.startsWith('/api/')) throw new Error(`API path must start with /api/: ${request.path}`);
    let response;
    try {
      response = await this.request.fetch(request.path, {
        method: request.method,
        headers: this.headers(request),
        data: request.data,
        multipart: request.multipart,
      });
    } catch (error) {
      throw new ApiNetworkError(request.path, { cause: error });
    }
    const body = await parseJson(response.status(), request.path, await response.text());

    if (response.ok()) {
      try {
        return { ok: true, status: response.status(), data: request.schema.parse(body) };
      } catch (error) {
        throw new ApiContractError(request.path, response.status(), { cause: error });
      }
    }

    try {
      const retryAfterMs = parseRetryAfter(response.headers()['retry-after']);
      return {
        ok: false,
        status: response.status(),
        error: ApiErrorSchema.parse(body),
        ...(retryAfterMs === undefined ? {} : { retryAfterMs }),
      };
    } catch (error) {
      throw new ApiContractError(request.path, response.status(), { cause: error });
    }
  }

  private headers<T>(request: ApiRequest<T>): Record<string, string> {
    const headers: Record<string, string> = { Accept: 'application/json' };
    if (this.options.accessKey) headers['X-Access-Key'] = this.options.accessKey;
    if (request.authorization === 'analytics-basic' && this.options.analyticsCredentials) {
      const { username, password } = this.options.analyticsCredentials;
      headers.Authorization = `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`;
    } else if (request.session) {
      headers.Authorization = `Bearer ${request.session.token}`;
    }
    return headers;
  }
}

async function parseJson(status: number, path: string, raw: string): Promise<unknown> {
  if (!raw.trim()) return {};
  try {
    return JSON.parse(raw) as unknown;
  } catch (error) {
    throw new ApiContractError(path, status, { cause: error });
  }
}

export function parseRetryAfter(value?: string): number | undefined {
  if (!value) return undefined;
  const seconds = Number(value);
  if (Number.isFinite(seconds) && seconds >= 0) return seconds * 1_000;
  const date = Date.parse(value);
  if (Number.isNaN(date)) return undefined;
  return Math.max(date - Date.now(), 0);
}
