import type { ModelDefinition } from '../types'
import type { VideoSubCategory } from '../types'

// ---------------------------------------------------------------------------
// 可灵 (Kling) 文生视频
//
// 对应文档: docs/bailian/可灵/可灵-视频生成.md
// API 端点: POST /api/v1/services/aigc/video-generation/video-synthesis
//
// Kling V3 / V3 Omni 两个模型变体。
// 使用 mode（pro/std）代替 resolution，aspect_ratio 代替 ratio。
// Omni 支持更多功能（参考视频、视频编辑），此处为基础文生视频。
// ---------------------------------------------------------------------------

const BASE_FIELDS_KLING_T2V = [
  {
    key: 'prompt',
    label: '文本提示词',
    type: 'text' as const,
    group: 'input' as const,
    required: true,
    maxLength: 2500,
    description: '描述期望生成的视频内容。支持中英文，不超过2500个字符',
  },
  {
    key: 'mode',
    label: '生成模式',
    type: 'select' as const,
    group: 'parameters' as const,
    defaultValue: 'pro',
    options: [
      { label: '专业版 (1080P)', value: 'pro' },
      { label: '标准版 (720P)', value: 'std' },
    ],
    description: 'pro=1080P 专业品质，std=720P 标准品质。影响价格',
  },
  {
    key: 'aspect_ratio',
    label: '宽高比',
    type: 'select' as const,
    group: 'parameters' as const,
    defaultValue: '16:9',
    options: [
      { label: '16:9', value: '16:9' },
      { label: '9:16', value: '9:16' },
      { label: '1:1', value: '1:1' },
    ],
  },
  {
    key: 'duration',
    label: '视频时长',
    type: 'range' as const,
    group: 'parameters' as const,
    defaultValue: 5,
    min: 3,
    max: 15,
    description: '单位：秒，取值范围 [3, 15]',
  },
  {
    key: 'audio',
    label: '生成音频',
    type: 'boolean' as const,
    group: 'parameters' as const,
    defaultValue: false,
    description: '是否生成背景音乐和音效。有声视频价格高于无声视频',
  },
  {
    key: 'watermark',
    label: '添加水印',
    type: 'boolean' as const,
    group: 'parameters' as const,
    defaultValue: false,
    description: '水印位于视频右下角，文案为 "可灵AI"',
  },
]

export const klingV3T2v: ModelDefinition<VideoSubCategory> = {
  id: 'kling-v3-t2v',
  model: 'kling/kling-v3-video-generation',
  supportedModels: ['kling/kling-v3-video-generation'],
  displayName: '可灵 V3 文生视频',
  category: 'video',
  subCategory: 'text-to-video',
  endpoint: '/services/aigc/video-generation/video-synthesis',
  async: true,
  pricing: {
    unit: 'per_second',
    quantityKey: 'duration',
    region: 'cn-beijing',
    // Pricing conditioned on mode: std=720P, pro=1080P (silent video prices)
    tiers: [
      { condition: { mode: 'std' }, price: 0.6 },
      { condition: { mode: 'pro' }, price: 0.8 },
    ],
  },
  fields: BASE_FIELDS_KLING_T2V,
}

export const klingV3OmniT2v: ModelDefinition<VideoSubCategory> = {
  id: 'kling-v3-omni-t2v',
  model: 'kling/kling-v3-omni-video-generation',
  supportedModels: ['kling/kling-v3-omni-video-generation'],
  displayName: '可灵 V3 Omni 文生视频',
  category: 'video',
  subCategory: 'text-to-video',
  endpoint: '/services/aigc/video-generation/video-synthesis',
  async: true,
  pricing: {
    unit: 'per_second',
    quantityKey: 'duration',
    region: 'cn-beijing',
    // Omni silent video (no reference video) pricing
    tiers: [
      { condition: { mode: 'std' }, price: 0.6 },
      { condition: { mode: 'pro' }, price: 0.8 },
    ],
  },
  fields: [
    {
      ...BASE_FIELDS_KLING_T2V[0],
      description: '描述期望生成的视频内容。支持中英文，不超过2500个字符。Omni 模型支持 <<<element_N>>> 语法引用主体',
    },
    ...BASE_FIELDS_KLING_T2V.slice(1),
  ],
}
