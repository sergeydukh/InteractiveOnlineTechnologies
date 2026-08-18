import { MessageSchema, ProfileSchema } from '../contracts';
import type { UserSession } from '../../domain/session';
import type { HttpTransport } from '../httpTransport';

export interface ProfileUpdate {
  readonly name?: string;
  readonly gender?: '0' | '1';
  readonly photo?: string | null;
  readonly internalAnalyticsConsent?: boolean;
}

export class ProfileApi {
  constructor(private readonly transport: HttpTransport) {}

  get(session?: UserSession) {
    return this.transport.send({ method: 'GET', path: '/api/profile', schema: ProfileSchema, session });
  }

  update(session: UserSession, data: ProfileUpdate) {
    return this.transport.send({ method: 'PATCH', path: '/api/profile', schema: ProfileSchema, session, data });
  }

  changePassword(session: UserSession, newPassword: string, confirmPassword = newPassword) {
    return this.transport.send({
      method: 'POST',
      path: '/api/profile/password',
      schema: MessageSchema,
      session,
      data: { newPassword, confirmPassword },
    });
  }
}
