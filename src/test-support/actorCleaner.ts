import type { AppApi } from '../api/appApi';
import type { TestActor } from './testData';

type Delay = (milliseconds: number) => Promise<void>;

export interface CleanupReport {
  readonly trustedActor: boolean;
  readonly deletedTodos: number;
  readonly deletedTags: number;
  readonly errors: Error[];
}

interface ActorCleanerOptions {
  readonly delay?: Delay;
  readonly now?: () => number;
  readonly maxDurationMs?: number;
  readonly maxTodoPasses?: number;
  readonly retryAttempts?: number;
}

const defaultDelay: Delay = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

export class ActorCleaner {
  private readonly delay: Delay;
  private readonly now: () => number;
  private readonly maxDurationMs: number;
  private readonly maxTodoPasses: number;
  private readonly retryAttempts: number;

  constructor(
    private readonly api: AppApi,
    options: ActorCleanerOptions = {},
  ) {
    this.delay = options.delay ?? defaultDelay;
    this.now = options.now ?? Date.now;
    this.maxDurationMs = options.maxDurationMs ?? 30_000;
    this.maxTodoPasses = options.maxTodoPasses ?? 100;
    this.retryAttempts = options.retryAttempts ?? 4;
  }

  async clean(actor: TestActor): Promise<CleanupReport> {
    const report = mutableReport();
    const deadline = this.now() + this.maxDurationMs;
    const profile = await this.retryRateLimitedRead(
      () => this.api.profile.get(actor.session),
      'Cleanup profile guard',
      deadline,
      report.errors,
    );
    if (!profile) return report;
    if (!profile.ok) {
      report.errors.push(new Error(`Cleanup profile guard failed with HTTP ${profile.status}`));
      return report;
    }
    if (
      profile.data.user.role !== 'user' ||
      profile.data.user.email !== actor.user.email ||
      !/^qa-[a-z0-9-]+@example\.com$/u.test(profile.data.user.email)
    ) {
      report.errors.push(new Error(`Cleanup refused for untrusted actor ${profile.data.user.email}`));
      return report;
    }
    report.trustedActor = true;

    for (let pass = 1; pass <= this.maxTodoPasses; pass += 1) {
      if (this.now() >= deadline) {
        report.errors.push(new Error('Todo cleanup exceeded its total time budget.'));
        return report;
      }
      const todos = await this.retryRateLimitedRead(
        () => this.api.todos.list(actor.session, { limit: 100 }),
        'Todo cleanup listing',
        deadline,
        report.errors,
      );
      if (!todos) return report;
      if (!todos.ok) {
        report.errors.push(new Error(`Todo cleanup listing failed with HTTP ${todos.status}`));
        return report;
      }
      if (todos.data.todos.length === 0) break;

      for (const todo of todos.data.todos) {
        const deleted = await this.deleteWithRateLimit(
          () => this.api.todos.delete(actor.session, todo._id),
          `Todo ${todo._id}`,
          deadline,
          report.errors,
        );
        if (!deleted) return report;
        report.deletedTodos += 1;
      }

      if (pass === this.maxTodoPasses) {
        report.errors.push(new Error(`Todo cleanup exceeded ${this.maxTodoPasses} pagination passes.`));
        return report;
      }
    }

    const tags = await this.retryRateLimitedRead(
      () => this.api.tags.list(actor.session),
      'Tag cleanup listing',
      deadline,
      report.errors,
    );
    if (!tags) return report;
    if (!tags.ok) {
      report.errors.push(new Error(`Tag cleanup listing failed with HTTP ${tags.status}`));
      return report;
    }
    for (const tag of tags.data.tags) {
      const deleted = await this.deleteWithRateLimit(
        () => this.api.tags.delete(actor.session, tag._id),
        `Tag ${tag._id}`,
        deadline,
        report.errors,
      );
      if (!deleted) return report;
      report.deletedTags += 1;
    }
    return report;
  }

  private async deleteWithRateLimit(
    operation: () => Promise<{ ok: boolean; status: number; retryAfterMs?: number }>,
    label: string,
    deadline: number,
    errors: Error[],
  ): Promise<boolean> {
    const result = await this.retryRateLimited(operation, label, deadline, errors);
    if (!result) return false;
    if (result.ok || result.status === 404) return true;
    errors.push(new Error(`${label} cleanup failed with HTTP ${result.status}`));
    return false;
  }

  private async retryRateLimitedRead<T extends { ok: boolean; status: number; retryAfterMs?: number }>(
    operation: () => Promise<T>,
    label: string,
    deadline: number,
    errors: Error[],
  ): Promise<T | undefined> {
    return this.retryRateLimited(operation, label, deadline, errors);
  }

  private async retryRateLimited<T extends { ok: boolean; status: number; retryAfterMs?: number }>(
    operation: () => Promise<T>,
    label: string,
    deadline: number,
    errors: Error[],
  ): Promise<T | undefined> {
    for (let attempt = 1; attempt <= this.retryAttempts; attempt += 1) {
      if (this.now() >= deadline) {
        errors.push(new Error(`${label} cleanup exceeded its total time budget.`));
        return undefined;
      }
      const result = await operation();
      if (result.status !== 429) return result;
      if (result.retryAfterMs === undefined) {
        errors.push(new Error(`${label} cleanup received HTTP 429 without a valid Retry-After header.`));
        return undefined;
      }
      if (attempt === this.retryAttempts) {
        errors.push(new Error(`${label} cleanup remained rate-limited after ${this.retryAttempts} attempts.`));
        return undefined;
      }
      const remainingMs = Math.max(deadline - this.now(), 0);
      if (result.retryAfterMs > remainingMs) {
        errors.push(new Error(`${label} cleanup Retry-After exceeds the remaining time budget.`));
        return undefined;
      }
      await this.delay(result.retryAfterMs);
    }
    return undefined;
  }
}

function mutableReport(): {
  trustedActor: boolean;
  deletedTodos: number;
  deletedTags: number;
  errors: Error[];
} {
  return { trustedActor: false, deletedTodos: 0, deletedTags: 0, errors: [] };
}
