import { MessageSchema, PaletteSchema, TagResponseSchema, TagsResponseSchema } from '../contracts';
import type { UserSession } from '../../auth/session';
import type { HttpTransport } from '../httpTransport';

export class TagsApi {
  constructor(private readonly transport: HttpTransport) {}

  palette(session?: UserSession) {
    return this.transport.send({ method: 'GET', path: '/api/tags/palette', schema: PaletteSchema, session });
  }

  list(session?: UserSession, search = '') {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    return this.transport.send({
      method: 'GET',
      path: search ? `/api/tags?${params.toString()}` : '/api/tags',
      schema: TagsResponseSchema,
      session,
    });
  }

  create(session: UserSession, data: Readonly<{ name: string; color: string }>) {
    return this.transport.send({ method: 'POST', path: '/api/tags', schema: TagResponseSchema, session, data });
  }

  ensure(session: UserSession, name: string) {
    return this.transport.send({
      method: 'POST',
      path: '/api/tags/ensure',
      schema: TagResponseSchema,
      session,
      data: { name },
    });
  }

  delete(session: UserSession, tagId: string) {
    return this.transport.send({
      method: 'DELETE',
      path: `/api/tags/${tagId}`,
      schema: MessageSchema,
      session,
    });
  }
}
