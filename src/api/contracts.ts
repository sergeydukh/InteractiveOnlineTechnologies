import { z } from 'zod';

export const ApiErrorSchema = z
  .object({
    message: z.string().optional(),
    error: z.string().optional(),
  })
  .loose()
  .refine((value) => Boolean(value.message ?? value.error), { message: 'API error body has no message' })
  .transform((value) => ({ ...value, message: value.message ?? value.error! }));

export const MessageSchema = z.object({ message: z.string().optional() }).loose();

export const LoginSchema = z
  .object({
    message: z.string().optional(),
    token: z.string().min(1),
    role: z.enum(['user', 'admin']),
  })
  .loose();

export const UserSchema = z
  .object({
    _id: z.string(),
    name: z.string(),
    email: z.email(),
    gender: z.union([z.literal('0'), z.literal('1')]),
    role: z.enum(['user', 'admin']),
    photo: z.string().nullish(),
    internalAnalyticsConsent: z.boolean(),
  })
  .loose();

export const TagSchema = z.object({ _id: z.string(), name: z.string(), color: z.string() }).loose();

export const TodoSchema = z
  .object({
    _id: z.string(),
    title: z.string(),
    completed: z.boolean(),
    tagIds: z.array(z.string()).default([]),
    tags: z.array(TagSchema).default([]),
  })
  .loose();

export const PaginationSchema = z
  .object({
    page: z.number().int().positive(),
    limit: z.number().int().positive(),
    total: z.number().int().nonnegative(),
    totalPages: z.number().int().nonnegative(),
  })
  .loose();

export const ProfileSchema = z.object({ message: z.string().optional(), user: UserSchema }).loose();
export const TodoResponseSchema = z.object({ todo: TodoSchema }).loose();
export const TodosResponseSchema = z.object({ todos: z.array(TodoSchema), pagination: PaginationSchema }).loose();
export const TagResponseSchema = z.object({ tag: TagSchema }).loose();
export const TagsResponseSchema = z.object({ tags: z.array(TagSchema) }).loose();
export const PaletteSchema = z.object({ colors: z.array(z.string()).min(1) }).loose();
export const FileUploadSchema = z.object({ fileUrl: z.string().min(1) }).loose();

export const AnalyticsEventTypeSchema = z.enum([
  'register',
  'login',
  'logout',
  'photoUpload',
  'todoCreate',
  'todoComplete',
  'todoEdit',
  'todoDelete',
  'passwordChangeSuccess',
  'passwordChangeFailed',
  'analyticsConsentChange',
]);
export const AnalyticsEventSchema = z
  .object({
    type: AnalyticsEventTypeSchema,
    status: z.enum(['success', 'failed']).optional(),
    timestamp: z.iso.datetime({ offset: true }),
    email: z.string().optional(),
    name: z.string().optional(),
    gender: z.union([z.literal(0), z.literal(1), z.literal('0'), z.literal('1')]).optional(),
    fileName: z.string().optional(),
    reason: z.string().optional(),
    analyticsConsent: z.boolean().optional(),
  })
  .loose();

export const AnalyticsEventsSchema = z.array(AnalyticsEventSchema);

export const AdminUserSchema = z
  .object({
    name: z.string(),
    email: z.string(),
    todos: z
      .array(z.object({ id: z.string().optional(), title: z.string(), completed: z.boolean() }).loose())
      .optional(),
    events: z.array(z.unknown()).optional(),
  })
  .loose();

export const AdminOverviewSchema = z.object({ users: z.array(AdminUserSchema), pagination: PaginationSchema }).loose();

export type ApiErrorBody = z.infer<typeof ApiErrorSchema>;
export type LoginResponse = z.infer<typeof LoginSchema>;
export type User = z.infer<typeof UserSchema>;
export type Todo = z.infer<typeof TodoSchema>;
export type Tag = z.infer<typeof TagSchema>;
export type AnalyticsEventType = z.infer<typeof AnalyticsEventTypeSchema>;
export type AnalyticsEvent = z.infer<typeof AnalyticsEventSchema>;
export type AdminOverview = z.infer<typeof AdminOverviewSchema>;
