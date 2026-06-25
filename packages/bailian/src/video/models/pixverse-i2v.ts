import type { ModelDefinition } from '../types'
import type { VideoSubCategory } from '../types'

// ---------------------------------------------------------------------------
// PixVerse（爱诗）图生视频（基于首帧）
//
// 对应文档: docs/bailian/爱诗/爱诗-图生视频-基于首帧.md
// API 端点: POST /api/v1/services/aigc/video-generation/video-synthesis
//
// C1 / V6 / V5.6 三个模型变体。
// 使用 apiKey: 'size' 将前端的 resolution 映射为 API 的 size 参数。
// media type 为 image_url（非 image）。
// ---------------------------------------------------------------------------

const RESOLUTION_OPTIONS_I2V = [
  { label: '360P (640*360)', value: '360P' },
  { label: '540P (1024*576)', value: '540P' },
  { label: '720P (1280*720)', value: '720P' },
  { label: '1080P (1920*1080)', value: '1080P' },
]

const BASE_FIELDS_PV_I2V = [
  {
    key: 'prompt',
    label: '文本提示词',
    type: 'text' as const,
    group: 'input' as const,
    maxLength: 5000,
    description: '描述期望生成的视频内容（可选）。C1/V6 不超过5000字符，V5.6 不超过2048字符',
  },
  {
    key: 'media',
    label: '首帧图片',
    type: 'media' as const,
    group: 'input' as const,
    required: true,
    description: '作为视频首帧的参考图片。支持 JPG/PNG/WEBP，各维度不超过10000px，不超过 20MB',
  },
  {
    key: 'resolution',
    label: '分辨率',
    type: 'select' as const,
    group: 'parameters' as const,
    apiKey: 'size',
    required: true,
    defaultValue: '720P',
    options: RESOLUTION_OPTIONS_I2V,
    description: '选择分辨率后将自动映射为对应的 size 参数（默认 16:9 画幅）',
  },
  {
    key: 'duration',
    label: '视频时长',
    type: 'range' as const,
    group: 'parameters' as const,
    required: true,
    defaultValue: 5,
    min: 1,
    max: 15,
    description: '单位：秒。C1/V6: [1,15]; V5.6: 5/8/10 (360P/540P/720P) 或 5/8 (1080P)',
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

export const pixverseC1I2v: ModelDefinition<VideoSubCategory> = {
  id: 'pixverse-c1-i2v',
  model: 'pixverse/pixverse-c1-it2v',
  supportedModels: ['pixverse/pixverse-c1-it2v'],
  displayName: 'PixVerse C1 图生视频（首帧）',
  category: 'video',
  subCategory: 'image-to-video',
  endpoint: '/services/aigc/video-generation/video-synthesis',
  async: true,
  pricing: {
    unit: 'per_second',
    quantityKey: 'duration',
    region: 'cn-beijing',
    tiers: [
      { condition: { resolution: '360P' }, price: 0.18 },
      { condition: { resolution: '540P' }, price: 0.24 },
      { condition: { resolution: '720P' }, price: 0.3 },
      { condition: { resolution: '1080P' }, price: 0.56 },
    ],
  },
  fields: BASE_FIELDS_PV_I2V,
}

export const pixverseV6I2v: ModelDefinition<VideoSubCategory> = {
  id: 'pixverse-v6-i2v',
  model: 'pixverse/pixverse-v6-it2v',
  supportedModels: ['pixverse/pixverse-v6-it2v'],
  displayName: 'PixVerse V6 图生视频（首帧）',
  category: 'video',
  subCategory: 'image-to-video',
  endpoint: '/services/aigc/video-generation/video-synthesis',
  async: true,
  pricing: {
    unit: 'per_second',
    quantityKey: 'duration',
    region: 'cn-beijing',
    tiers: [
      { condition: { resolution: '360P' }, price: 0.15 },
      { condition: { resolution: '540P' }, price: 0.21 },
      { condition: { resolution: '720P' }, price: 0.27 },
      { condition: { resolution: '1080P' }, price: 0.53 },
    ],
  },
  fields: [
    ...BASE_FIELDS_PV_I2V,
    {
      key: 'shot_type',
      label: '镜头模式',
      type: 'select' as const,
      group: 'parameters' as const,
      defaultValue: 'single',
      options: [
        { label: '单镜头', value: 'single' },
        { label: '多镜头/智能分镜', value: 'multi' },
      ],
      description: 'V6 支持多镜头智能分镜',
    },
  ],
}

export const pixverseV56I2v: ModelDefinition<VideoSubCategory> = {
  id: 'pixverse-v56-i2v',
  model: 'pixverse/pixverse-v5.6-it2v',
  supportedModels: ['pixverse/pixverse-v5.6-it2v'],
  displayName: 'PixVerse V5.6 图生视频（首帧）',
  category: 'video',
  subCategory: 'image-to-video',
  endpoint: '/services/aigc/video-generation/video-synthesis',
  async: true,
  pricing: {
    unit: 'per_second',
    quantityKey: 'duration',
    region: 'cn-beijing',
    tiers: [
      { condition: { resolution: '360P' }, price: 0.21 },
      { condition: { resolution: '540P' }, price: 0.21 },
      { condition: { resolution: '720P' }, price: 0.27 },
      { condition: { resolution: '1080P' }, price: 0.44 },
    ],
  },
  fields: [
    { ...BASE_FIELDS_PV_I2V[0], maxLength: 2048 },
    BASE_FIELDS_PV_I2V[1],
    BASE_FIELDS_PV_I2V[2],
    { ...BASE_FIELDS_PV_I2V[3], description: '单位：秒。360P/540P/720P 可选择 5/8/10s，1080P 可选择 5/8s' },
    BASE_FIELDS_PV_I2V[4],
    BASE_FIELDS_PV_I2V[5],
    BASE_FIELDS_PV_I2V[6],
  ],
}
