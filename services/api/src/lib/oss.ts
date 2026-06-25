import OSS from 'ali-oss'

let client: OSS | null = null

/** OSS 是否已配置（环境变量齐全） */
export function isOSSConfigured(): boolean {
  return !!(
    process.env.OSS_REGION &&
    process.env.OSS_ACCESS_KEY_ID &&
    process.env.OSS_ACCESS_KEY_SECRET &&
    process.env.OSS_BUCKET
  )
}

function getOSSClient(): OSS {
  if (!client) {
    if (!isOSSConfigured()) {
      throw new Error(
        'OSS not configured. Set OSS_REGION, OSS_ACCESS_KEY_ID, OSS_ACCESS_KEY_SECRET, OSS_BUCKET.',
      )
    }
    client = new OSS({
      region: process.env.OSS_REGION!,
      accessKeyId: process.env.OSS_ACCESS_KEY_ID!,
      accessKeySecret: process.env.OSS_ACCESS_KEY_SECRET!,
      bucket: process.env.OSS_BUCKET!,
    })
  }
  return client
}

/**
 * 上传 Buffer 到 OSS。
 * @returns 可直接访问的公开 URL
 */
export async function uploadBuffer(
  key: string,
  buffer: Buffer | Uint8Array,
  mimeType?: string,
): Promise<string> {
  const result = await getOSSClient().put(key, buffer, {
    mime: mimeType || 'application/octet-stream',
  })
  return result.url
}

/**
 * 根据原始 OSS URL 和媒体类型，返回缩略图 URL。
 * - 图片: OSS 图片处理 resize 到宽度 400
 * - 视频: OSS 视频截图 第 1 秒、宽度 400、jpg 格式
 */
export function getThumbnailUrl(
  originalUrl: string,
  mimeType: string,
): string | null {
  if (!isOSSConfigured()) return null

  if (mimeType.startsWith('image/')) {
    return `${originalUrl}?x-oss-process=image/resize,w_400`
  }
  if (mimeType.startsWith('video/')) {
    return `${originalUrl}?x-oss-process=video/snapshot,t_1000,f_jpg,w_400`
  }
  return null
}

/**
 * 生成 OSS object key。
 * @param category 类别（uploads / tasks）
 * @param ref     userId 或 taskId
 * @param ext     文件扩展名（不含点号）
 *
 * 最终路径: [{OSS_UPLOAD_PREFIX}/]{category}/{ref}/{uuid}.{ext}
 */
export function generateKey(category: string, ref: string, ext: string): string {
  const uuid = crypto.randomUUID()
  const parts = process.env.OSS_UPLOAD_PREFIX
    ? [process.env.OSS_UPLOAD_PREFIX, category, ref, `${uuid}.${ext}`]
    : [category, ref, `${uuid}.${ext}`]
  return parts.join('/')
}
