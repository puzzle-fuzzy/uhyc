import { pgEnum, pgTable, timestamp, uuid, varchar } from 'drizzle-orm/pg-core'

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

/** Aggregated table map for convenient imports / drizzle-typebox utilities. */
export const table = {
  users,
} as const

export type User = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert
