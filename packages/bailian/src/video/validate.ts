import type { FieldMeta, ModelDefinition, ValidationResult, ValidationError } from './types'

// ---------------------------------------------------------------------------
// 参数校验 — 基于 ModelDefinition.fields 的运行时校验
// ---------------------------------------------------------------------------

/**
 * 校验用户输入参数是否符合模型定义的约束。
 * 前端和后端均可调用。
 */
export function validateParams(
  definition: ModelDefinition,
  params: Record<string, unknown>,
): ValidationResult {
  const errors: ValidationError[] = []

  for (const field of definition.fields) {
    const value = params[field.key]

    // --- 必填检查 ---
    if (field.required && (value === undefined || value === null || value === '')) {
      errors.push({ field: field.key, message: `${field.label} 为必填项` })
      continue
    }

    // 可选字段且未填写 → 跳过
    if (value === undefined || value === null || value === '') continue

    // --- 类型检查 ---
    switch (field.type) {
      case 'text': {
        if (typeof value !== 'string') {
          errors.push({ field: field.key, message: `${field.label} 必须为文本` })
          break
        }
        if (field.maxLength && value.length > field.maxLength) {
          errors.push({
            field: field.key,
            message: `${field.label} 不能超过 ${field.maxLength} 个字符（当前 ${value.length}）`,
          })
        }
        break
      }

      case 'number':
      case 'range': {
        if (typeof value !== 'number') {
          errors.push({ field: field.key, message: `${field.label} 必须为数字` })
          break
        }
        if (field.min !== undefined && value < field.min) {
          errors.push({
            field: field.key,
            message: `${field.label} 最小值为 ${field.min}`,
          })
        }
        if (field.max !== undefined && value > field.max) {
          errors.push({
            field: field.key,
            message: `${field.label} 最大值为 ${field.max}`,
          })
        }
        break
      }

      case 'boolean': {
        if (typeof value !== 'boolean') {
          errors.push({ field: field.key, message: `${field.label} 必须为布尔值` })
        }
        break
      }

      case 'select': {
        if (field.options && !field.options.some((o) => o.value === value)) {
          errors.push({
            field: field.key,
            message: `${field.label} 的值 "${value}" 不在可选项中`,
          })
        }
        break
      }
    }
  }

  return { valid: errors.length === 0, errors }
}

/**
 * 从用户填写的原始参数中提取合法的子集。
 * 只保留 ModelDefinition 中声明过的 key，过滤掉未声明的。
 */
export function sanitizeParams(
  definition: ModelDefinition,
  params: Record<string, unknown>,
): Record<string, unknown> {
  const validKeys = new Set(definition.fields.map((f) => f.key))
  const result: Record<string, unknown> = {}

  for (const key of validKeys) {
    if (key in params) {
      result[key] = params[key]
    }
  }

  return result
}

/**
 * 合并默认值：用户未填写的可选字段使用默认值填充。
 */
export function applyDefaults(
  definition: ModelDefinition,
  params: Record<string, unknown>,
): Record<string, unknown> {
  const result: Record<string, unknown> = {}

  for (const field of definition.fields) {
    const value = params[field.key]
    if (value !== undefined && value !== null && value !== '') {
      result[field.key] = value
    } else if (field.defaultValue !== undefined) {
      result[field.key] = field.defaultValue
    }
  }

  return result
}
