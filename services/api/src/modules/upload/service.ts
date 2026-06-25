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

/** 上传文件大小上限 */
const MAX_FILE_SIZE: Record<string, number> = {
  image: 20 * 1024 * 1024, // 20 MB
  video: 100 * 1024 * 1024, // 100 MB
  default: 50 * 1024 * 1024, // 50 MB fallback
}

/** 单次请求最大上传文件数 */
const MAX_FILES_PER_REQUEST = 10

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

    // 校验文件大小
    const category = file.type.startsWith('image/')
      ? 'image'
      : file.type.startsWith('video/')
        ? 'video'
        : 'default'
    const maxSize = MAX_FILE_SIZE[category]
    if (file.size > maxSize) {
      const maxMB = (maxSize / 1024 / 1024).toFixed(0)
      return status(400, {
        error: `文件过大，${category === 'image' ? '图片' : '视频'}文件不超过 ${maxMB}MB`,
      })
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
