import { existsSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { extname, join, resolve } from 'node:path'
import { Elysia } from 'elysia'
import { cors } from '@elysia/cors'
import { openapi } from '@elysia/openapi'

import { authModule } from './modules/auth'
import { generateModule } from './modules/generate'
import { uploadModule } from './modules/upload'
import { creativityModule } from './modules/creativity'

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
  .use(generateModule)
  .use(uploadModule)
  .use(creativityModule)
  .get(
    '/generate/storage/:taskId/:filename',
    async ({ params, set }) => {
      const dir = resolve(process.env.STORAGE_DIR || './storage')
      // Sanitize path components to prevent traversal.
      const safeTaskId = params.taskId.replace(/[^a-zA-Z0-9-]/g, '')
      const safeName = params.filename.replace(/[^a-zA-Z0-9._-]/g, '')
      const abs = join(dir, safeTaskId, safeName)
      if (!existsSync(abs)) {
        set.status = 404
        return { error: 'Not found' }
      }
      const buf = await readFile(abs)
      set.headers['content-type'] = mimeByExt(extname(abs))
      return buf
    },
    { detail: { summary: 'Serve a downloaded task artifact' } },
  )
  .listen(3000)

console.log(
  `🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`,
)

function mimeByExt(ext: string): string {
  switch (ext.toLowerCase()) {
    case '.mp4':
      return 'video/mp4'
    case '.png':
      return 'image/png'
    case '.jpg':
    case '.jpeg':
      return 'image/jpeg'
    case '.mp3':
      return 'audio/mpeg'
    case '.wav':
      return 'audio/wav'
    case '.json':
      return 'application/json'
    case '.txt':
      return 'text/plain'
    case '.srt':
      return 'application/x-subrip'
    default:
      return 'application/octet-stream'
  }
}

export default app
export type App = typeof app
