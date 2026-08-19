import type { AppApi } from '../api/appApi';
import type { ApiResult } from '../api/result';
import { requireSuccess } from '../api/result';
import type { LoginResponse } from '../api/contracts';
import type { RegistrationData } from '../api/services/authApi';
import type { TestActor, TestIdentity } from './testData';
import { createRegistrationData } from './testData';

type Delay = (milliseconds: number) => Promise<void>;
const defaultDelay: Delay = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));
export const setupWaitBudgetMs = 30_000;

interface SetupRetryOptions {
  readonly delay?: Delay;
  readonly now?: () => number;
  readonly maxWaitMs?: number;
}

export class ActorProvisioner {
  private readonly options: Required<SetupRetryOptions>;

  constructor(
    private readonly api: AppApi,
    options: SetupRetryOptions = {},
  ) {
    this.options = {
      delay: options.delay ?? defaultDelay,
      now: options.now ?? Date.now,
      maxWaitMs: options.maxWaitMs ?? setupWaitBudgetMs,
    };
  }

  async create(identity: TestIdentity, overrides: Partial<RegistrationData> = {}): Promise<TestActor> {
    const user = createRegistrationData(identity, overrides);
    const retry = new SetupRetryBudget(this.options);
    const registrationStartedAt = Math.floor(Date.now() / 1_000) * 1_000;
    const registration = await retry.run(() => this.api.auth.register(user));
    requireSuccess(registration, `Register ${user.email}`);

    const loginResult = await retry.run(() => this.api.auth.login({ email: user.email, password: user.password }));
    const login = requireSuccess(loginResult, `Login ${user.email}`);
    if (login.role !== 'user') throw new Error(`Expected user role for ${user.email}, received ${login.role}`);

    return { user, identity, registrationStartedAt, session: { token: login.token, role: 'user' } };
  }
}

export async function retrySetupOnce<T>(
  operation: () => Promise<ApiResult<T>>,
  options: SetupRetryOptions = {},
): Promise<ApiResult<T>> {
  return new SetupRetryBudget({
    delay: options.delay ?? defaultDelay,
    now: options.now ?? Date.now,
    maxWaitMs: options.maxWaitMs ?? setupWaitBudgetMs,
  }).run(operation);
}

class SetupRetryBudget {
  private consumed = false;
  private readonly deadline: number;

  constructor(private readonly options: Required<SetupRetryOptions>) {
    this.deadline = options.now() + options.maxWaitMs;
  }

  async run<T>(operation: () => Promise<ApiResult<T>>): Promise<ApiResult<T>> {
    const first = await operation();
    if (first.ok || first.status !== 429 || this.consumed) return first;
    if (first.retryAfterMs === undefined) {
      throw new Error('Rate-limited setup response did not include a valid Retry-After header.');
    }
    const remainingMs = Math.max(this.deadline - this.options.now(), 0);
    if (first.retryAfterMs > remainingMs) {
      throw new Error(
        `Rate-limited setup requires ${first.retryAfterMs}ms, exceeding the remaining ${remainingMs}ms wait budget.`,
      );
    }
    this.consumed = true;
    await this.options.delay(first.retryAfterMs);
    return operation();
  }
}

export function adminSessionFrom(login: LoginResponse) {
  if (login.role !== 'admin') throw new Error(`Expected admin role, received ${login.role}`);
  return { token: login.token, role: 'admin' as const };
}
