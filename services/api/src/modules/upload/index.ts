import { existsSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { extname, join, resolve } from 'node:path'
import { Elysia, t } from 'elysia'

import { authPlugin } from '../../plugins/jwt'
import { UploadService, isStatusReturn } from './service'

/** 本地存储目录（与服务.ts 保持一致） */
const UPLOAD_DIR = resolve(process.env.STORAGE_DIR || './storage', 'uploads')

function mimeByExt(ext: string): string {
  switch (ext.toLowerCase()) {
    case '.jpg':
    case '.jpeg':
      return 'image/jpeg'
    case '.png':
      return 'image/png'
    case '.gif':
      return 'image/gif'
    case '.webp':
      return 'image/webp'
    case '.mp4':
      return 'video/mp4'
    case '.mov':
      return 'video/quicktime'
    case '.webm':
      return 'video/webm'
    default:
      return 'application/octet-stream'
  }
}

export const uploadModule = new Elysia({ prefix: '/upload' })
  .use(authPlugin)

  // 文件上传
  .post(
    '/',
    async ({ body, currentUser }) => {
      const file = (body as Record<string, unknown>).file as File | undefined
      if (!file) {
        return { error: '缺少 file 字段' }
      }
      const result = await UploadService.upload(currentUser.id, file)
      if (isStatusReturn(result)) return result
      return result
    },
    {
      isAuth: true,
      detail: { summary: 'Upload a reference image or video' },
    },
  )

  // 本地存储的素材文件（OSS fallback）
  .get(
    '/file/:userId/:filename',
    async ({ params, set }) => {
      const safeUser = params.userId.replace(/[^a-zA-Z0-9-]/g, '')
      const safeName = params.filename.replace(/[^a-zA-Z0-9._-]/g, '')
      const abs = join(UPLOAD_DIR, safeUser, safeName)
      if (!existsSync(abs)) {
        set.status = 404
        return { error: 'Not found' }
      }
      const buf = await readFile(abs)
      set.headers['content-type'] = mimeByExt(extname(abs))
      return buf
    },
    { detail: { summary: 'Serve an uploaded file (OSS fallback)' } },
  )
