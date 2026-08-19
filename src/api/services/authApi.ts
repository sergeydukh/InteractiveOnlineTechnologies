import { LoginSchema, MessageSchema } from '../contracts';
import type { AuthSession } from '../../auth/session';
import type { HttpTransport } from '../httpTransport';

export interface RegistrationData {
  readonly name: string;
  readonly email: string;
  readonly gender: '0' | '1';
  readonly password: string;
  readonly internalAnalyticsConsent: boolean;
  readonly photo?: string;
}

export class AuthApi {
  constructor(private readonly transport: HttpTransport) {}

  register(data: RegistrationData) {
    return this.transport.send({ method: 'POST', path: '/api/auth/register', schema: MessageSchema, data });
  }

  login(credentials: Readonly<{ email: string; password: string }>) {
    return this.transport.send({ method: 'POST', path: '/api/auth/login', schema: LoginSchema, data: credentials });
  }

  logout(session?: AuthSession) {
    return this.transport.send({ method: 'POST', path: '/api/auth/logout', schema: MessageSchema, session, data: {} });
  }
}
