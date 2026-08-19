import type { AuthSession } from '../auth/session';

export function storageStateFor(baseUrl: string, session: AuthSession) {
  const key = session.role === 'admin' ? 'adminToken' : 'token';
  return {
    cookies: [],
    origins: [{ origin: baseUrl, localStorage: [{ name: key, value: session.token }] }],
  };
}
