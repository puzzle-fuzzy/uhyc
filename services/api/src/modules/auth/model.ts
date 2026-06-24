import { t } from 'elysia'

/** Request body for POST /auth/register. */
export const SignUpBody = t.Object({
  username: t.String({ minLength: 3, maxLength: 50 }),
  email: t.String({ format: 'email' }),
  password: t.String({ minLength: 8, maxLength: 72 }),
})

/** Request body for POST /auth/login. Accepts username OR email in one field. */
export const SignInBody = t.Object({
  emailOrUsername: t.String({ minLength: 3 }),
  password: t.String(),
})

/** Public user shape (no password hash) used for responses. */
export const UserResponse = t.Object({
  id: t.String(),
  username: t.String(),
  email: t.String(),
  avatar: t.Union([t.String(), t.Null()]),
  role: t.Union([t.Literal('user'), t.Literal('admin')]),
  lastLoginAt: t.Union([t.String(), t.Null()]),
})

/** Authenticated response: the public user + a short-lived JWT. */
export const AuthResponse = t.Object({
  user: UserResponse,
})

/** Standard error envelope. */
export const ErrorResponse = t.Object({
  error: t.String(),
})

export type SignUpBody = typeof SignUpBody.static
export type SignInBody = typeof SignInBody.static
export type UserResponse = typeof UserResponse.static
export type AuthResponse = typeof AuthResponse.static
