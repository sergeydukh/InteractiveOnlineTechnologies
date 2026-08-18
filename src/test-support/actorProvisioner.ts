import type { AppApi } from '../api/appApi';
import type { ApiResult } from '../api/result';
import { requireSuccess } from '../api/result';
import type { LoginResponse } from '../api/contracts';
import type { RegistrationData } from '../api/services/authApi';
import type { TestActor, TestIdentity } from './testData';
import { createRegistrationData } from './testData';

type Delay = (milliseconds: number) => Promise<void>;
const defaultDelay: Delay = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

export class ActorProvisioner {
  constructor(
    private readonly api: AppApi,
    private readonly delay: Delay = defaultDelay,
  ) {}

  async create(identity: TestIdentity, overrides: Partial<RegistrationData> = {}): Promise<TestActor> {
    const user = createRegistrationData(identity, overrides);
    const retry = new SetupRetryBudget(this.delay);
    const registration = await retry.run(() => this.api.auth.register(user));
    requireSuccess(registration, `Register ${user.email}`);

    const loginResult = await retry.run(() => this.api.auth.login({ email: user.email, password: user.password }));
    const login = requireSuccess(loginResult, `Login ${user.email}`);
    if (login.role !== 'user') throw new Error(`Expected user role for ${user.email}, received ${login.role}`);

    return { user, identity, session: { token: login.token, role: 'user' } };
  }
}

export async function retrySetupOnce<T>(
  operation: () => Promise<ApiResult<T>>,
  delay: Delay = defaultDelay,
): Promise<ApiResult<T>> {
  return new SetupRetryBudget(delay).run(operation);
}

class SetupRetryBudget {
  private consumed = false;

  constructor(private readonly delay: Delay) {}

  async run<T>(operation: () => Promise<ApiResult<T>>): Promise<ApiResult<T>> {
    const first = await operation();
    if (first.ok || first.status !== 429 || this.consumed) return first;
    if (first.retryAfterMs === undefined) {
      throw new Error('Rate-limited setup response did not include a valid Retry-After header.');
    }
    this.consumed = true;
    await this.delay(first.retryAfterMs);
    return operation();
  }
}

export function adminSessionFrom(login: LoginResponse) {
  if (login.role !== 'admin') throw new Error(`Expected admin role, received ${login.role}`);
  return { token: login.token, role: 'admin' as const };
}
