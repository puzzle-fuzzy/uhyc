import { Elysia, t } from 'elysia'

import { authPlugin, AUTH_COOKIE, AUTH_COOKIE_OPTIONS } from '../../plugins/jwt'
import { AuthService, isStatusReturn } from './service'
import { AuthResponse, ErrorResponse, SignInBody, SignUpBody } from './model'

/**
 * Auth controller. One Elysia instance = one controller, mounted under /auth.
 * All routes use the authPlugin so `jwt` and the `isAuth` macro are available.
 */
export const authModule = new Elysia({ prefix: '/auth' })
  .use(authPlugin)
  .model({
    signUpBody: SignUpBody,
    signInBody: SignInBody,
    authResponse: AuthResponse,
    errorResponse: ErrorResponse,
  })
  .post(
    '/register',
    async ({ body, jwt, cookie: { [AUTH_COOKIE]: auth } }) => {
      const result = await AuthService.register(body)

      // Service returned an error status (e.g. duplicate user).
      if (isStatusReturn(result)) return result

      const token = await jwt.sign({
        sub: result.user.id,
        role: result.user.role,
      })
      auth.set({ value: token, ...AUTH_COOKIE_OPTIONS })

      return result
    },
    {
      body: 'signUpBody',
      response: { 200: 'authResponse', 409: 'errorResponse' },
      detail: { summary: 'Register a new account' },
    },
  )
  .post(
    '/login',
    async ({ body, jwt, cookie: { [AUTH_COOKIE]: auth } }) => {
      const result = await AuthService.login(body)

      if (isStatusReturn(result)) return result

      const token = await jwt.sign({
        sub: result.user.id,
        role: result.user.role,
      })
      auth.set({ value: token, ...AUTH_COOKIE_OPTIONS })

      return result
    },
    {
      body: 'signInBody',
      response: { 200: 'authResponse', 401: 'errorResponse' },
      detail: { summary: 'Login with username/email + password' },
    },
  )
  .post(
    '/logout',
    ({ cookie: { [AUTH_COOKIE]: auth } }) => {
      auth.remove()
      return { ok: true }
    },
    {
      response: { 200: t.Object({ ok: t.Boolean() }) },
      detail: { summary: 'Clear the auth cookie' },
    },
  )
  .get(
    '/me',
    async ({ currentUser }) => {
      const result = await AuthService.getProfile(currentUser.id)
      if (isStatusReturn(result)) return result
      return result
    },
    {
      isAuth: true,
      response: { 200: 'authResponse', 401: 'errorResponse', 404: 'errorResponse' },
      detail: { summary: 'Get the currently authenticated user' },
    },
  )
