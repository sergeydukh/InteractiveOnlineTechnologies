export type UserSession = Readonly<{ token: string; role: 'user' }>;
export type AdminSession = Readonly<{ token: string; role: 'admin' }>;
export type AuthSession = UserSession | AdminSession;
