// ---------------------------------------------------------------------------
// 百炼 API 错误 → 中文翻译
// ---------------------------------------------------------------------------

/**
 * 已知错误码 → 中文提示
 */
const ERROR_MAP: Record<string, string> = {
  InvalidApiKey: 'API Key 无效或格式错误，请在 .env 中检查 BAILIAN_API_KEY 配置',
  AccessDenied: '当前 API Key 没有权限调用该模型，请确认已在百炼控制台开通对应模型服务',
  Arrearage: '账号欠费，请前往阿里云费用中心充值',
  'Model.AccessDenied': '无权限访问该模型，请在百炼控制台-模型广场申请权限',
  ModelNotFound: '模型不存在或已下线，请检查模型名称是否正确',
  Throttling: '请求过于频繁触发限流，请稍后重试',
  'Throttling.RateQuota': '调用频率超限，请降低请求频率后重试',
  'Throttling.AllocationQuota': '配额不足，请在百炼控制台提升配额',
  InternalError: '百炼服务内部错误，请稍后重试',
  'DataInspectionFailed': '输入内容包含疑似敏感信息，已被内容安全拦截',
  InvalidParameter: '请求参数不合法，请检查参数格式与取值范围',
  BadRequest: '请求格式不正确，请检查请求体',
  UnsupportedOperation: '不支持的操作',
  FlowNotPublished: '工作流未发布，请在百炼控制台发布后再试',
  'InvalidFile.Format': '文件格式不支持',
  'InvalidFile.Size': '文件大小超出限制',
  'InvalidFile.Resolution': '文件分辨率不符合要求',
  'InvalidFile.Duration': '文件时长不符合要求',
  'InvalidFile.AudioLengthError': '音频时长不符合要求',
  'InvalidURL': '文件 URL 无效或无法访问',
  'InvalidImage.Format': '图片格式不支持',
  'InvalidImage.Resolution': '图片分辨率不符合要求',
  'InvalidImage.FileFormat': '图片格式不支持',
  'NOT AUTHORIZED': '无权访问该工作空间，请检查 API Key 和接入地址配置',
}

/**
 * 错误消息中的已知关键词片段 → 中文提示（用于 AccessDenied 等有多种子类的错误）
 */
const MESSAGE_PATTERNS: [RegExp, string][] = [
  [/does not support asynchronous/i, '当前模型不支持异步调用。请确认 API Key 类型是否正确（如 Coding Plan 需使用专属接入地址），或前往百炼控制台检查模型权限'],
  [/does not support synchronous/i, '当前模型不支持同步调用，需要异步模式'],
  [/access denied.*account.*good standing/i, '账号欠费或状态异常，请检查阿里云账户余额'],
  [/model.*not.*exist/i, '模型不存在，请检查模型名称是否正确'],
  [/file.*too large/i, '文件大小超出限制，请压缩后重试'],
  [/download.*fail/i, '文件下载失败，请检查 URL 是否可公开访问'],
  [/image.*resolution.*invalid/i, '图片分辨率不符合模型要求'],
  [/video.*resolution.*invalid/i, '视频分辨率不符合模型要求'],
  [/format.*not supported/i, '文件格式不支持'],
  [/quota.*exceeded/i, '配额不足，请在百炼控制台提升配额或等待配额刷新'],
  [/rate.*limit/i, '请求频率超限，请稍后重试'],
  [/timeout/i, '请求超时，请检查网络连接后重试'],
  [/content.*inappropriate/i, '输入内容包含疑似敏感信息，已被内容安全拦截'],
]

/**
 * 将百炼 API 错误码和消息翻译为中文提示。
 *
 * 匹配顺序：消息关键词 → 错误码 → 原文保留。
 * 消息关键词优先于错误码，因为同一错误码（如 AccessDenied）可能有多种具体原因，
 * 消息文本能提供更精准的判断。
 *
 * 无论是否匹配到已知错误，都会附带原始 message 作为详细原因，方便排查具体问题。
 */
export function translateBailianError(
  code: string,
  message: string,
  requestId?: string,
): string {
  const rid = requestId ? `（请求 ID: ${requestId}）` : ''

  // 优先按消息关键词匹配
  for (const [pattern, hint] of MESSAGE_PATTERNS) {
    if (pattern.test(message)) {
      return `${hint}${rid}`
    }
  }

  // 再按错误码匹配 — 附带原始 message 作为具体原因
  const known = ERROR_MAP[code]
  if (known) {
    const detail = message ? `：${message}` : ''
    return `${known}${detail}${rid}`
  }

  // 未知错误：保留原文
  return `[${code}] ${message}${rid}`
}

/**
 * 从 Bailian API 响应对象中提取错误并翻译。
 */
export function formatBailianError(err: {
  code?: string
  message?: string
  request_id?: string
}): string {
  return translateBailianError(
    err.code || 'UnknownError',
    err.message || '未知错误',
    err.request_id,
  )
}
