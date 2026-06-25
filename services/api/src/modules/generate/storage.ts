import { exists } from 'node:fs/promises'
import { mkdir, writeFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'

/** 存储根目录（相对 cwd）。可用 STORAGE_DIR 环境变量覆盖。 */
export const STORAGE_DIR = resolve(process.env.STORAGE_DIR || './storage')

/** 任务目录：storage/<taskId>/ */
export function taskDir(taskId: string): string {
  return join(STORAGE_DIR, taskId)
}

/** 从 URL 取末段文件名（百炼返回的 hash.后缀）。 */
export function filenameFromUrl(url: string): string {
  const u = new URL(url)
  const last = u.pathname.split('/').filter(Boolean).pop()
  return last || `file-${Date.now()}`
}

/**
 * 下载一个远程文件到本地任务目录。
 * @returns 写入的相对路径、元数据及原始 buffer（用于 OSS 上传）。
 */
export async function downloadToTaskDir(
  taskId: string,
  sourceUrl: string,
): Promise<{
  storagePath: string
  mimeType: string | null
  sizeBytes: number | null
  originalFilename: string
  buffer: Uint8Array
}> {
  const res = await fetch(sourceUrl)
  if (!res.ok) {
    throw new Error(`download failed: HTTP ${res.status} for ${sourceUrl}`)
  }

  const originalFilename = filenameFromUrl(sourceUrl)
  const absDir = taskDir(taskId)
  if (!(await exists(absDir))) {
    await mkdir(absDir, { recursive: true })
  }

  const absPath = join(absDir, originalFilename)
  const bytes = new Uint8Array(await res.arrayBuffer())
  await writeFile(absPath, bytes)

  // 相对路径（用于 DB 存储 + 静态服务拼接）。统一用 / 分隔符，避免 Windows 反斜杠破坏 URL。
  const storagePath = `storage/${taskId}/${originalFilename}`

  return {
    storagePath,
    mimeType: res.headers.get('content-type'),
    sizeBytes: bytes.byteLength,
    originalFilename,
    buffer: bytes,
  }
}

/** 解析 video 领域成功响应中的产物 URL（百炼返回 output.video_url）。 */
export function extractVideoResultUrl(queryOutput: unknown): string | null {
  if (typeof queryOutput !== 'object' || queryOutput === null) return null
  const url = (queryOutput as Record<string, unknown>).video_url
  return typeof url === 'string' ? url : null
}
