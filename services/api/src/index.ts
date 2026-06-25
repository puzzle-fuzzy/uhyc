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

// ---------------------------------------------------------------------------
// 启动时关键环境变量校验
// ---------------------------------------------------------------------------

function validateEnv(): void {
  const checks: { key: string; defaults: string[] }[] = [
    { key: 'JWT_SECRET', defaults: ['dev-secret-change-me', 'change-me-in-prod'] },
    { key: 'BAILIAN_API_KEY', defaults: ['replace-with-real-key'] },
  ]

  const warnings: string[] = []
  const errors: string[] = []

  for (const { key, defaults } of checks) {
    const v = process.env[key]
    if (!v) {
      errors.push(`${key} 未设置`)
    } else if (defaults.includes(v)) {
      if (process.env.NODE_ENV === 'production') {
        errors.push(`${key} 仍在使用默认值 "${v}"，请替换为真实值`)
      } else {
        warnings.push(`${key} 仍在使用默认值 "${v}"`)
      }
    }
  }

  if (warnings.length > 0) {
    console.warn('[uhyc] ⚠ 环境变量警告（开发环境可忽略）：')
    for (const w of warnings) console.warn(`  ⚠ ${w}`)
  }

  if (errors.length > 0) {
    console.error('[uhyc] 环境变量校验失败：')
    for (const e of errors) console.error(`  ✗ ${e}`)
    console.error('[uhyc] 请在 .env 文件中配置后再启动。')
    process.exit(1)
  }

  console.log('[uhyc] 环境变量校验通过')
}

validateEnv()

// ---------------------------------------------------------------------------
// 安全响应头
// ---------------------------------------------------------------------------

/**
 * 添加安全相关 HTTP 响应头。
 *
 * CSP 允许加载来自任意域名的媒体资源（图片/视频/音频），
 * 因为百炼返回的任务结果 URL 域名不固定。
 */
const SECURITY_HEADERS: Record<string, string> = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'Content-Security-Policy': [
    "default-src 'self'",
    "img-src * data: blob:",
    "media-src * blob:",
    "script-src 'self' 'unsafe-inline'",
    "style-src 'self' 'unsafe-inline'",
    "connect-src 'self'",
    "frame-src 'none'",
    "object-src 'none'",
  ].join('; '),
}

const securityHeaders = new Elysia({ name: 'security-headers' }).onRequest(
  ({ set }) => {
    for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
      set.headers[key] = value
    }
  },
)

// ---------------------------------------------------------------------------
// App
// ---------------------------------------------------------------------------

const app = new Elysia()
  .use(securityHeaders)
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
