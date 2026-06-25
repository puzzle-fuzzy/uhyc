import type { ModelDefinition } from '../types'
import type { VideoSubCategory } from '../types'

// ---------------------------------------------------------------------------
// PixVerse（爱诗）参考生视频
//
// 对应文档: docs/bailian/爱诗/爱诗-参考生视频.md
// API 端点: POST /api/v1/services/aigc/video-generation/video-synthesis
//
// C1 / V6 / V5.6 三个模型变体。
// 支持 1-7 张参考图片，每张图可选 ref_name（通过 @ref_name 在 prompt 中引用）。
// 使用 size 直接作为参数（有更多画幅选项，不通过 resolution 映射）。
// ---------------------------------------------------------------------------

const SIZE_OPTIONS = [
  // 360P
  { label: '360P 16:9 (640*360)', value: '640*360' },
  { label: '360P 4:3 (640*480)', value: '640*480' },
  { label: '360P 1:1 (640*640)', value: '640*640' },
  { label: '360P 9:16 (360*640)', value: '360*640' },
  // 540P
  { label: '540P 16:9 (1024*576)', value: '1024*576' },
  { label: '540P 4:3 (1024*768)', value: '1024*768' },
  { label: '540P 1:1 (1024*1024)', value: '1024*1024' },
  { label: '540P 9:16 (576*1024)', value: '576*1024' },
  // 720P
  { label: '720P 16:9 (1280*720)', value: '1280*720' },
  { label: '720P 1:1 (960*960)', value: '960*960' },
  { label: '720P 9:16 (720*1280)', value: '720*1280' },
  // 1080P
  { label: '1080P 16:9 (1920*1080)', value: '1920*1080' },
  { label: '1080P 1:1 (1440*1440)', value: '1440*1440' },
  { label: '1080P 9:16 (1080*1920)', value: '1080*1920' },
]

const BASE_FIELDS_PV_R2V = [
  {
    key: 'prompt',
    label: '文本提示词',
    type: 'text' as const,
    group: 'input' as const,
    required: true,
    maxLength: 5000,
    description: '描述期望生成的视频内容（必填）。C1 不超过5000字符，V6/V5.6 不超过2048字符。支持 @ref_name 语法引用参考图片，如 "@人物1 坐在椅子上"',
  },
  {
    key: 'media',
    label: '参考图片',
    type: 'media' as const,
    group: 'input' as const,
    required: true,
    description: '1~7 张参考图片。支持 JPG/PNG/WEBP，各维度不超过10000px，不超过 20MB。每张图可设置 ref_name 用于 prompt 引用',
  },
  {
    key: 'size',
    label: '输出尺寸',
    type: 'select' as const,
    group: 'parameters' as const,
    required: true,
    defaultValue: '1280*720',
    options: SIZE_OPTIONS,
    description: '输出视频的宽高。不同模型支持的选项略有差异',
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

export const pixverseC1R2v: ModelDefinition<VideoSubCategory> = {
  model: 'pixverse/pixverse-c1-r2v',
  supportedModels: ['pixverse/pixverse-c1-r2v'],
  displayName: 'PixVerse C1 参考生视频',
  category: 'video',
  subCategory: 'reference-to-video',
  endpoint: '/services/aigc/video-generation/video-synthesis',
  async: true,
  pricing: {
    unit: 'per_second',
    quantityKey: 'duration',
    region: 'cn-beijing',
    // PixVerse R2V pricing: simplified to be conditioned on resolution tier via size
    tiers: [
      { condition: { resolution: '360P' }, price: 0.18 },
      { condition: { resolution: '540P' }, price: 0.24 },
      { condition: { resolution: '720P' }, price: 0.3 },
      { condition: { resolution: '1080P' }, price: 0.56 },
    ],
  },
  fields: BASE_FIELDS_PV_R2V,
}

export const pixverseV6R2v: ModelDefinition<VideoSubCategory> = {
  model: 'pixverse/pixverse-v6-r2v',
  supportedModels: ['pixverse/pixverse-v6-r2v'],
  displayName: 'PixVerse V6 参考生视频',
  category: 'video',
  subCategory: 'reference-to-video',
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
    { ...BASE_FIELDS_PV_R2V[0], maxLength: 2048 },
    BASE_FIELDS_PV_R2V[1],
    BASE_FIELDS_PV_R2V[2],
    BASE_FIELDS_PV_R2V[3],
    BASE_FIELDS_PV_R2V[4],
    BASE_FIELDS_PV_R2V[5],
    BASE_FIELDS_PV_R2V[6],
  ],
}

export const pixverseV56R2v: ModelDefinition<VideoSubCategory> = {
  model: 'pixverse/pixverse-v5.6-r2v',
  supportedModels: ['pixverse/pixverse-v5.6-r2v'],
  displayName: 'PixVerse V5.6 参考生视频',
  category: 'video',
  subCategory: 'reference-to-video',
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
    { ...BASE_FIELDS_PV_R2V[0], maxLength: 2048 },
    BASE_FIELDS_PV_R2V[1],
    BASE_FIELDS_PV_R2V[2],
    { ...BASE_FIELDS_PV_R2V[3], description: '单位：秒。360P/540P/720P 可选择 5/8/10s，1080P 可选择 5/8s' },
    BASE_FIELDS_PV_R2V[4],
    BASE_FIELDS_PV_R2V[5],
    BASE_FIELDS_PV_R2V[6],
  ],
}
