import { Elysia } from 'elysia'
import { cors } from '@elysia/cors'
import { openapi } from '@elysia/openapi'

import { authModule } from './modules/auth'

const app = new Elysia()
  // `credentials: true` lets browsers send the auth cookie cross-origin.
  // Tighten `origin` to your frontend URL(s) in production.
  .use(
    cors({
      credentials: true,
      origin: process.env.CORS_ORIGIN?.split(',') ?? true,
    }),
  )
  .use(
    openapi({
      documentation: {
        info: {
          title: 'uhyc API',
          version: '0.1.0',
          description: 'uhyc backend — accounts & auth.',
        },
      },
    }),
  )
  .get('/', () => 'Hello Elysia')
  .use(authModule)
  .listen(3000)

console.log(
  `🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`,
)

export default app
export type App = typeof app
