import { exists } from 'node:fs/promises'
import { mkdir, writeFile } from 'node:fs/promises'
import { extname, join, resolve } from 'node:path'
import { status } from 'elysia'

import { generateKey, getThumbnailUrl, isOSSConfigured, uploadBuffer } from '../../lib/oss'

export type StatusReturn = ReturnType<typeof status>
export const isStatusReturn = (v: unknown): v is StatusReturn =>
  typeof v === 'object' && v !== null && 'code' in v && 'response' in v

/** 本地存储目录（存放上传素材的 fallback） */
const UPLOAD_DIR = resolve(process.env.STORAGE_DIR || './storage', 'uploads')

const ALLOWED_PREFIXES = ['image/', 'video/']

/**
 * Upload business logic.
 * - OSS 已配置 → 上传到 OSS，返回 OSS 公开 URL
 * - OSS 未配置 → 存本地磁盘，返回本地 URL（开发用 fallback）
 */
export abstract class UploadService {
  static async upload(userId: string, file: File) {
    // 校验类型
    const typeOk = ALLOWED_PREFIXES.some((p) => file.type.startsWith(p))
    if (!typeOk) {
      return status(400, { error: '只允许上传图片或视频文件' })
    }

    const ext = (extname(file.name) || '.bin').replace(/^\./, '')
    const buffer = Buffer.from(await file.arrayBuffer())
    const key = generateKey('uploads', userId, ext)

    let url: string

    if (isOSSConfigured()) {
      url = await uploadBuffer(key, buffer, file.type)
    } else {
      // 本地 fallback
      const localDir = join(UPLOAD_DIR, userId)
      if (!(await exists(localDir))) {
        await mkdir(localDir, { recursive: true })
      }
      const localPath = join(localDir, key.split('/').pop()!)
      await writeFile(localPath, buffer)
      url = `/api/upload/file/${userId}/${key.split('/').pop()}`
    }

    const thumbnail = getThumbnailUrl(url, file.type)
    return { url, thumbnail, key, filename: file.name }
  }
}
