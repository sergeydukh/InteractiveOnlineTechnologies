import type { AppApi } from '../api/appApi';
import type { UserSession } from '../domain/session';

export class ActorCleaner {
  constructor(private readonly api: AppApi) {}

  async clean(session: UserSession): Promise<Error[]> {
    const errors: Error[] = [];
    const todos = await this.api.todos.list(session, { limit: 100 });
    if (todos.ok) {
      for (const todo of todos.data.todos) {
        const result = await this.api.todos.delete(session, todo._id);
        if (!result.ok && result.status !== 404) {
          errors.push(new Error(`Todo ${todo._id} cleanup failed with HTTP ${result.status}`));
        }
      }
    } else {
      errors.push(new Error(`Todo cleanup listing failed with HTTP ${todos.status}`));
    }

    const tags = await this.api.tags.list(session);
    if (tags.ok) {
      for (const tag of tags.data.tags) {
        const result = await this.api.tags.delete(session, tag._id);
        if (!result.ok && result.status !== 404) {
          errors.push(new Error(`Tag ${tag._id} cleanup failed with HTTP ${result.status}`));
        }
      }
    } else {
      errors.push(new Error(`Tag cleanup listing failed with HTTP ${tags.status}`));
    }
    return errors;
  }
}
