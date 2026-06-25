import type { ModelDefinition } from '../types'
import type { VideoSubCategory } from '../types'

// ---------------------------------------------------------------------------
// 可灵 (Kling) 图生视频（基于首帧 / 首尾帧）
//
// 对应文档: docs/bailian/可灵/可灵-视频生成.md
// API 端点: POST /api/v1/services/aigc/video-generation/video-synthesis
//
// Kling V3 / V3 Omni 两个模型变体。
// 首帧图生视频：media 包含 1 张图片（type=first_frame）。
// 首尾帧图生视频：media 包含 2 张图片（first_frame + last_frame）。
// 使用 mode（pro/std）代替 resolution。
// ---------------------------------------------------------------------------

const BASE_FIELDS_KLING_I2V = [
  {
    key: 'prompt',
    label: '文本提示词',
    type: 'text' as const,
    group: 'input' as const,
    maxLength: 2500,
    description: '描述期望生成的视频内容（可选）。支持中英文，不超过2500个字符',
  },
  {
    key: 'media',
    label: '首帧图片',
    type: 'media' as const,
    group: 'input' as const,
    required: true,
    description: '作为视频首帧的参考图片。支持 JPEG/JPG/PNG（无透明通道），300~8000px，宽高比 1:2.5~2.5:1，不超过 10MB',
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
    description: 'pro=1080P 专业品质，std=720P 标准品质',
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
    description: '是否生成背景音乐和音效',
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

// ---- 首帧模型 ----

export const klingV3I2v: ModelDefinition<VideoSubCategory> = {
  id: 'kling-v3-i2v',
  model: 'kling/kling-v3-video-generation',
  supportedModels: ['kling/kling-v3-video-generation'],
  displayName: '可灵 V3 图生视频（首帧）',
  category: 'video',
  subCategory: 'image-to-video',
  endpoint: '/services/aigc/video-generation/video-synthesis',
  async: true,
  pricing: {
    unit: 'per_second',
    quantityKey: 'duration',
    region: 'cn-beijing',
    tiers: [
      { condition: { mode: 'std' }, price: 0.6 },
      { condition: { mode: 'pro' }, price: 0.8 },
    ],
  },
  fields: BASE_FIELDS_KLING_I2V,
}

export const klingV3OmniI2v: ModelDefinition<VideoSubCategory> = {
  id: 'kling-v3-omni-i2v',
  model: 'kling/kling-v3-omni-video-generation',
  supportedModels: ['kling/kling-v3-omni-video-generation'],
  displayName: '可灵 V3 Omni 图生视频（首帧）',
  category: 'video',
  subCategory: 'image-to-video',
  endpoint: '/services/aigc/video-generation/video-synthesis',
  async: true,
  pricing: {
    unit: 'per_second',
    quantityKey: 'duration',
    region: 'cn-beijing',
    tiers: [
      { condition: { mode: 'std' }, price: 0.6 },
      { condition: { mode: 'pro' }, price: 0.8 },
    ],
  },
  fields: [
    {
      ...BASE_FIELDS_KLING_I2V[0],
      description: '描述期望生成的视频内容（可选）。Omni 模型支持 <<<element_N>>> 和 <<<image_1>>> 语法引用主体和图片',
    },
    BASE_FIELDS_KLING_I2V[1],
    BASE_FIELDS_KLING_I2V[2],
    BASE_FIELDS_KLING_I2V[3],
    BASE_FIELDS_KLING_I2V[4],
    BASE_FIELDS_KLING_I2V[5],
  ],
}

// ---- 首尾帧模型 ----

const KEYFRAME_MEDIA_FIELD = {
  key: 'media',
  label: '首尾帧图片',
  type: 'media' as const,
  group: 'input' as const,
  required: true,
  description: '2 张图片：第1张为首帧(first_frame)，第2张为尾帧(last_frame)。支持 JPEG/JPG/PNG（无透明通道），300~8000px，不超过 10MB',
}

export const klingV3I2vKF: ModelDefinition<VideoSubCategory> = {
  id: 'kling-v3-i2v-kf',
  model: 'kling/kling-v3-video-generation',
  supportedModels: ['kling/kling-v3-video-generation'],
  displayName: '可灵 V3 图生视频（首尾帧）',
  category: 'video',
  subCategory: 'image-to-video',
  endpoint: '/services/aigc/video-generation/video-synthesis',
  async: true,
  pricing: {
    unit: 'per_second',
    quantityKey: 'duration',
    region: 'cn-beijing',
    tiers: [
      { condition: { mode: 'std' }, price: 0.6 },
      { condition: { mode: 'pro' }, price: 0.8 },
    ],
  },
  fields: [
    BASE_FIELDS_KLING_I2V[0],
    KEYFRAME_MEDIA_FIELD,
    BASE_FIELDS_KLING_I2V[2],
    BASE_FIELDS_KLING_I2V[3],
    BASE_FIELDS_KLING_I2V[4],
    BASE_FIELDS_KLING_I2V[5],
  ],
}

export const klingV3OmniI2vKF: ModelDefinition<VideoSubCategory> = {
  id: 'kling-v3-omni-i2v-kf',
  model: 'kling/kling-v3-omni-video-generation',
  supportedModels: ['kling/kling-v3-omni-video-generation'],
  displayName: '可灵 V3 Omni 图生视频（首尾帧）',
  category: 'video',
  subCategory: 'image-to-video',
  endpoint: '/services/aigc/video-generation/video-synthesis',
  async: true,
  pricing: {
    unit: 'per_second',
    quantityKey: 'duration',
    region: 'cn-beijing',
    tiers: [
      { condition: { mode: 'std' }, price: 0.6 },
      { condition: { mode: 'pro' }, price: 0.8 },
    ],
  },
  fields: [
    {
      ...BASE_FIELDS_KLING_I2V[0],
      description: '描述期望生成的视频内容（可选）。Omni 模型支持 <<<element_N>>> 语法引用主体',
    },
    KEYFRAME_MEDIA_FIELD,
    BASE_FIELDS_KLING_I2V[2],
    BASE_FIELDS_KLING_I2V[3],
    BASE_FIELDS_KLING_I2V[4],
    BASE_FIELDS_KLING_I2V[5],
  ],
}
