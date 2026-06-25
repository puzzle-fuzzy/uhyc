import {
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core'

/**
 * User role. `user` is the default for new sign-ups; `admin` is reserved for
 * elevated permissions (RBAC hooks can be layered on later).
 */
export const userRole = pgEnum('user_role', ['user', 'admin'])

/**
 * Account table backing login / registration.
 *
 * `password` stores a bcrypt hash (see AuthService). Never select this column
 * into API responses — always project it out via `toUserResponse`.
 */
export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  username: varchar('username', { length: 50 }).notNull().unique(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  password: varchar('password', { length: 255 }).notNull(),
  avatar: varchar('avatar', { length: 512 }),
  role: userRole('role').notNull().default('user'),
  lastLoginAt: timestamp('last_login_at', { withTimezone: true, mode: 'date' }),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' })
    .defaultNow()
    .notNull(),
})

export type User = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert

// ---------------------------------------------------------------------------
// 生成任务（Generate）
// ---------------------------------------------------------------------------

/** 任务状态，与 @uhyc/bailian 的 TASK_STATUS 对齐 */
export const taskStatus = pgEnum('task_status', [
  'PENDING',
  'RUNNING',
  'SUCCEEDED',
  'FAILED',
  'CANCELED',
  'UNKNOWN',
])

/** 生成历史记录主表：每条任务 = 一条历史记录 */
export const generationTasks = pgTable(
  'generation_tasks',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    bailianTaskId: varchar('bailian_task_id', { length: 128 }),
    createRequestId: varchar('create_request_id', { length: 128 }),
    category: varchar('category', { length: 20 }).notNull(),
    subCategory: varchar('sub_category', { length: 40 }).notNull(),
    model: varchar('model', { length: 60 }).notNull(),
    params: jsonb('params').notNull(),
    status: taskStatus('status').notNull().default('PENDING'),
    errorMessage: text('error_message'),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' })
      .defaultNow()
      .notNull(),
  },
  (t) => ({
    userIdCreatedIdx: index('gen_tasks_user_created_idx').on(t.userId, t.createdAt),
    bailianTaskIdUniq: uniqueIndex('gen_tasks_bailian_uniq').on(t.bailianTaskId),
  }),
)

/** 文件明细表：一个任务可产多个文件 */
export const generationTaskFiles = pgTable('generation_task_files', {
  id: uuid('id').defaultRandom().primaryKey(),
  taskId: uuid('task_id')
    .notNull()
    .references(() => generationTasks.id, { onDelete: 'cascade' }),
  kind: varchar('kind', { length: 30 }).notNull(),
  sourceUrl: varchar('source_url', { length: 1024 }),
  storagePath: varchar('storage_path', { length: 255 }).notNull(),
  mimeType: varchar('mime_type', { length: 100 }),
  sizeBytes: integer('size_bytes'),
  originalFilename: varchar('original_filename', { length: 255 }),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' })
    .defaultNow()
    .notNull(),
})

export type GenerationTask = typeof generationTasks.$inferSelect
export type NewGenerationTask = typeof generationTasks.$inferInsert
export type GenerationTaskFile = typeof generationTaskFiles.$inferSelect

// ---------------------------------------------------------------------------
// 创造力任务（Creativity）
// ---------------------------------------------------------------------------

export const creativityTasks = pgTable('creativity_tasks', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  videoUrl: text('video_url').notNull(),
  status: taskStatus('status').notNull().default('PENDING'),
  step: integer('step').notNull().default(0),
  asrResult: jsonb('asr_result'),
  scriptResult: text('script_result'),
  mergedResult: text('merged_result'),
  errorMessage: text('error_message'),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' })
    .defaultNow()
    .notNull(),
})

export type CreativityTask = typeof creativityTasks.$inferSelect
export type NewCreativityTask = typeof creativityTasks.$inferInsert

/** Aggregated table map for convenient imports / drizzle-typebox utilities. */
export const table = {
  users,
  generationTasks,
  generationTaskFiles,
  creativityTasks,
} as const
