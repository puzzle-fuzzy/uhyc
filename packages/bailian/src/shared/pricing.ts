import type { ModelPricing } from '../video/types'

// ---------------------------------------------------------------------------
// 价格计算
// ---------------------------------------------------------------------------

/**
 * 根据用户选择的参数计算预估价格（元）。
 *
 * calcPrice 工作原理：
 * 1. 遍历 pricing.tiers，找到第一个匹配所有 condition 的档位
 * 2. 从 params 中取 quantityKey（如 duration、n）作为乘数
 * 3. 返回 `档位单价 × 数量`
 *
 * @param pricing  模型定价定义
 * @param params   用户填写的参数（key-value）
 * @returns        预估总价（元）
 */
export function calcPrice(
  pricing: ModelPricing,
  params: Record<string, unknown>,
): number {
  // 1. 匹配档位
  const tier =
    pricing.tiers.find((t) =>
      Object.entries(t.condition).every(([k, v]) => params[k] === v),
    ) ?? pricing.tiers[0]!

  // 2. 取数量
  const raw = params[pricing.quantityKey]
  const quantity = typeof raw === 'number' ? raw : Number(raw) || 1

  // 3. 计算总价
  return Math.round(tier.price * quantity * 10000) / 10000
}

/**
 * 获取模型在默认档位下的单价。
 */
export function getDefaultUnitPrice(pricing: ModelPricing): number {
  return pricing.tiers[0]?.price ?? 0
}
