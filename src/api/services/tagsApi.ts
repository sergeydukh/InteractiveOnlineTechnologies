import { MessageSchema, PaletteSchema, TagResponseSchema, TagsResponseSchema } from '../contracts';
import type { UserSession } from '../../domain/session';
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
      path: `/api/tags?${params.toString()}`,
      schema: TagsResponseSchema,
      session,
    });
  }

  create(session: UserSession, data: Readonly<{ name: string; color: string }>) {
    return this.transport.send({ method: 'POST', path: '/api/tags', schema: TagResponseSchema, session, data });
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
