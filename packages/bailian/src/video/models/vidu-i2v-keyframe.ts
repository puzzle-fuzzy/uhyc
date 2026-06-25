import type { ModelDefinition } from '../types'
import type { VideoSubCategory } from '../types'

// ---------------------------------------------------------------------------
// Vidu 图生视频（基于首尾帧）
//
// 对应文档: docs/bailian/Vidu/Vidu-图生视频-基于首尾帧.md
// API 端点: POST /api/v1/services/aigc/video-generation/video-synthesis
//
// Q3 Pro / Q3 Turbo / Q2 Pro / Q2 Turbo 四个模型变体。
// 需要 2 张图片（首帧 + 尾帧），prompt 为必填。
// 首尾帧分辨率比值需在 0.8~1.25 之间。
// ---------------------------------------------------------------------------

const BASE_FIELDS_KF = [
  {
    key: 'prompt',
    label: '文本提示词',
    type: 'text' as const,
    group: 'input' as const,
    required: true,
    maxLength: 5000,
    description: '描述期望生成的视频内容（必填）。支持中英文，不超过5000个字符',
  },
  {
    key: 'media',
    label: '首尾帧图片',
    type: 'media' as const,
    group: 'input' as const,
    required: true,
    description: '2 张图片：第1张为首帧，第2张为尾帧。支持 JPG/JPEG/PNG/WEBP，分辨率比值 0.8~1.25，不超过 50MB',
    mediaSlots: [
      { type: 'first_frame' as const, label: '首帧图片', accept: 'image/*', maxCount: 1, maxSizeMB: 50 },
      { type: 'last_frame' as const, label: '尾帧图片', accept: 'image/*', maxCount: 1, maxSizeMB: 50 },
    ],
  },
  {
    key: 'resolution',
    label: '分辨率',
    type: 'select' as const,
    group: 'parameters' as const,
    defaultValue: '720P',
    options: [
      { label: '540P', value: '540P' },
      { label: '720P', value: '720P' },
      { label: '1080P', value: '1080P' },
    ],
  },
  {
    key: 'duration',
    label: '视频时长',
    type: 'range' as const,
    group: 'parameters' as const,
    defaultValue: 5,
    min: 1,
    max: 16,
    description: '单位：秒',
  },
  {
    key: 'watermark',
    label: '添加水印',
    type: 'boolean' as const,
    group: 'parameters' as const,
    defaultValue: false,
    description: '水印位于视频右下角，文案为 "AI生成"',
  },
  {
    key: 'seed',
    label: '随机种子',
    type: 'number' as const,
    group: 'parameters' as const,
    min: 0,
    max: 2147483647,
    description: '固定种子可提升结果可复现性。留空则系统自动生成随机种子',
  },
]

const AUDIO_FIELD_KF = {
  key: 'audio',
  label: '生成音频',
  type: 'boolean' as const,
  group: 'parameters' as const,
  defaultValue: false,
  description: '是否生成背景音乐和音效（仅 Q3 系列支持）',
}

export const viduQ3ProI2vKF: ModelDefinition<VideoSubCategory> = {
  id: 'vidu-q3-pro-i2v-kf',
  model: 'vidu/viduq3-pro_start-end2video',
  supportedModels: ['vidu/viduq3-pro_start-end2video'],
  displayName: 'Vidu Q3 Pro 图生视频（首尾帧）',
  category: 'video',
  subCategory: 'image-to-video',
  endpoint: '/services/aigc/video-generation/video-synthesis',
  async: true,
  pricing: {
    unit: 'per_second',
    quantityKey: 'duration',
    region: 'cn-beijing',
    tiers: [
      { condition: { resolution: '540P' }, price: 0.3125 },
      { condition: { resolution: '720P' }, price: 0.78125 },
      { condition: { resolution: '1080P' }, price: 0.9375 },
    ],
  },
  fields: [
    BASE_FIELDS_KF[0],
    BASE_FIELDS_KF[1],
    AUDIO_FIELD_KF,
    BASE_FIELDS_KF[2],
    { ...BASE_FIELDS_KF[3], min: 1, max: 16 },
    BASE_FIELDS_KF[4],
    BASE_FIELDS_KF[5],
  ],
}

export const viduQ3TurboI2vKF: ModelDefinition<VideoSubCategory> = {
  id: 'vidu-q3-turbo-i2v-kf',
  model: 'vidu/viduq3-turbo_start-end2video',
  supportedModels: ['vidu/viduq3-turbo_start-end2video'],
  displayName: 'Vidu Q3 Turbo 图生视频（首尾帧）',
  category: 'video',
  subCategory: 'image-to-video',
  endpoint: '/services/aigc/video-generation/video-synthesis',
  async: true,
  pricing: {
    unit: 'per_second',
    quantityKey: 'duration',
    region: 'cn-beijing',
    tiers: [
      { condition: { resolution: '540P' }, price: 0.25 },
      { condition: { resolution: '720P' }, price: 0.375 },
      { condition: { resolution: '1080P' }, price: 0.4375 },
    ],
  },
  fields: [
    BASE_FIELDS_KF[0],
    BASE_FIELDS_KF[1],
    AUDIO_FIELD_KF,
    BASE_FIELDS_KF[2],
    { ...BASE_FIELDS_KF[3], min: 1, max: 16 },
    BASE_FIELDS_KF[4],
    BASE_FIELDS_KF[5],
  ],
}

export const viduQ2ProI2vKF: ModelDefinition<VideoSubCategory> = {
  id: 'vidu-q2-pro-i2v-kf',
  model: 'vidu/viduq2-pro_start-end2video',
  supportedModels: ['vidu/viduq2-pro_start-end2video'],
  displayName: 'Vidu Q2 Pro 图生视频（首尾帧）',
  category: 'video',
  subCategory: 'image-to-video',
  endpoint: '/services/aigc/video-generation/video-synthesis',
  async: true,
  pricing: {
    unit: 'per_second',
    quantityKey: 'duration',
    region: 'cn-beijing',
    tiers: [
      { condition: { resolution: '540P' }, price: 0.15625 },
      { condition: { resolution: '720P' }, price: 0.34375 },
      { condition: { resolution: '1080P' }, price: 0.71875 },
    ],
  },
  fields: [
    BASE_FIELDS_KF[0],
    BASE_FIELDS_KF[1],
    BASE_FIELDS_KF[2],
    { ...BASE_FIELDS_KF[3], min: 1, max: 10 },
    BASE_FIELDS_KF[4],
    BASE_FIELDS_KF[5],
  ],
}

export const viduQ2TurboI2vKF: ModelDefinition<VideoSubCategory> = {
  id: 'vidu-q2-turbo-i2v-kf',
  model: 'vidu/viduq2-turbo_start-end2video',
  supportedModels: ['vidu/viduq2-turbo_start-end2video'],
  displayName: 'Vidu Q2 Turbo 图生视频（首尾帧）',
  category: 'video',
  subCategory: 'image-to-video',
  endpoint: '/services/aigc/video-generation/video-synthesis',
  async: true,
  pricing: {
    unit: 'per_second',
    quantityKey: 'duration',
    region: 'cn-beijing',
    tiers: [
      { condition: { resolution: '540P' }, price: 0.0875 },
      { condition: { resolution: '720P' }, price: 0.25 },
      { condition: { resolution: '1080P' }, price: 0.46875 },
    ],
  },
  fields: [
    BASE_FIELDS_KF[0],
    BASE_FIELDS_KF[1],
    BASE_FIELDS_KF[2],
    { ...BASE_FIELDS_KF[3], min: 1, max: 10 },
    BASE_FIELDS_KF[4],
    BASE_FIELDS_KF[5],
  ],
}
