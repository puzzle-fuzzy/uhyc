import bcrypt from 'bcryptjs'
import { and, eq, or } from 'drizzle-orm'
import { status } from 'elysia'

import { db, table, type User } from '@uhyc/db'
import type { SignInBody, SignUpBody, UserResponse } from './model'

const BCRYPT_ROUNDS = 12

/** Strip sensitive columns before returning a user to the client. */
function toUserResponse(user: User): UserResponse {
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    avatar: user.avatar,
    role: user.role,
    lastLoginAt: user.lastLoginAt ? user.lastLoginAt.toISOString() : null,
  }
}

/**
 * Auth business logic, decoupled from Elysia. Methods accept plain data and
 * either return `{ user }` on success or an Elysia `status(...)` value on error
 * (we return errors rather than throwing, per the MVC service convention).
 */
export abstract class AuthService {
  static async register(input: SignUpBody) {
    // Check for an existing username OR email in one query.
    const [existing] = await db
      .select({ id: table.users.id })
      .from(table.users)
      .where(
        or(
          eq(table.users.username, input.username),
          eq(table.users.email, input.email),
        ),
      )
      .limit(1)

    if (existing) {
      return status(409, { error: 'Username or email already in use' })
    }

    const passwordHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS)

    const [created] = await db
      .insert(table.users)
      .values({
        username: input.username,
        email: input.email,
        password: passwordHash,
      })
      .returning()

    return { user: toUserResponse(created) }
  }

  static async login(input: SignInBody) {
    const [row] = await db
      .select()
      .from(table.users)
      .where(
        or(
          eq(table.users.email, input.emailOrUsername),
          eq(table.users.username, input.emailOrUsername),
        ),
      )
      .limit(1)

    if (!row) {
      return status(401, { error: 'Invalid credentials' })
    }

    const ok = await bcrypt.compare(input.password, row.password)
    if (!ok) {
      return status(401, { error: 'Invalid credentials' })
    }

    const [updated] = await db
      .update(table.users)
      .set({ lastLoginAt: new Date() })
      .where(eq(table.users.id, row.id))
      .returning()

    return { user: toUserResponse(updated) }
  }

  static async getProfile(id: string) {
    const [row] = await db
      .select()
      .from(table.users)
      .where(and(eq(table.users.id, id)))
      .limit(1)

    if (!row) {
      return status(404, { error: 'User not found' })
    }

    return { user: toUserResponse(row) }
  }
}
