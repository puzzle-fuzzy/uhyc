import { Elysia, status, t } from 'elysia'
import { jwt } from '@elysia/jwt'

const AUTH_COOKIE = 'auth'

/**
 * Auth plugin.
 *
 * - Registers a `jwt` helper (`sign` / `verify`) bound to `JWT_SECRET`.
 * - Exposes an `isAuth` macro: attach `{ isAuth: true }` to any route to require
 *   a valid auth cookie. On success it injects `currentUser` ({ id, role })
 *   into the route's context; on failure it returns 401.
 */
export const authPlugin = new Elysia({ name: 'auth' })
  .use(
    jwt({
      name: 'jwt',
      secret: process.env.JWT_SECRET || 'dev-secret-change-me',
      // Typed payload so sign/verify are type-checked.
      schema: t.Object({
        sub: t.String(),
        role: t.Union([t.Literal('user'), t.Literal('admin')]),
      }),
      exp: '7d',
    }),
  )
  .macro({
    isAuth: {
      resolve: async ({ cookie, jwt }) => {
        const token = cookie[AUTH_COOKIE].value
        const payload = token ? await jwt.verify(token) : false

        if (!payload) {
          return status(401, { error: 'Unauthorized' })
        }

        // Inject the authenticated principal into downstream routes.
        return {
          currentUser: { id: payload.sub, role: payload.role },
        }
      },
    },
  })

/** Cookie options shared by login / register / logout. */
export const AUTH_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
  maxAge: 7 * 24 * 60 * 60, // 7 days, mirrors JWT exp
}

export { AUTH_COOKIE }
