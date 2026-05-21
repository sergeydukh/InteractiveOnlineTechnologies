export type UserRole = 'user' | 'admin';

export type LoginResponse = {
  message: string;
  token: string;
  role: UserRole;
};

export type User = {
  _id: string;
  name: string;
  email: string;
  gender: '0' | '1';
  role: UserRole;
  photo?: string;
  internalAnalyticsConsent: boolean;
};

export type Tag = {
  _id: string;
  name: string;
  color: string;
};

export type Todo = {
  _id: string;
  title: string;
  completed: boolean;
  tagIds: string[];
  tags: Tag[];
};

export type Pagination = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export type AdminUser = {
  name: string;
  email: string;
  todos?: Array<{ id?: string; title: string; completed: boolean }>;
  events?: unknown[];
};

export type AnalyticsEventType =
  | 'register'
  | 'login'
  | 'logout'
  | 'photoUpload'
  | 'todoCreate'
  | 'todoComplete'
  | 'todoEdit'
  | 'todoDelete'
  | 'passwordChangeSuccess'
  | 'passwordChangeFailed'
  | 'analyticsConsentChange';

export type AnalyticsEvent = {
  type: AnalyticsEventType | string;
  status?: 'success' | 'failed';
  timestamp: string;
  email?: string;
  name?: string;
  gender?: 0 | 1 | '0' | '1';
  fileName?: string;
  reason?: string;
  analyticsConsent?: boolean;
  applicationId?: string;
};
