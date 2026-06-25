import type { ModelDefinition } from '../types'
import type { VideoSubCategory } from '../types'

// ---------------------------------------------------------------------------
// PixVerse（爱诗）文生视频
//
// 对应文档: docs/bailian/爱诗/爱诗-文生视频.md
// API 端点: POST /api/v1/services/aigc/video-generation/video-synthesis
//
// 使用 apiKey: 'size' 将前端的 resolution 字段映射为 API 的 size 参数，
// 值使用像素尺寸（如 1280*720），与 API 文档一致。
// C1 / V6 / V5.6 三个模型变体。V6 支持 shot_type（多镜头）。
// ---------------------------------------------------------------------------

/** 分辨率选项：每档分辨率 × 常用宽高比 → API size 像素值 */
const SIZE_OPTIONS_T2V = [
  // 360P
  { label: '360P 16:9 (640*360)', value: '640*360' },
  { label: '360P 9:16 (360*640)', value: '360*640' },
  { label: '360P 1:1 (640*640)', value: '640*640' },
  // 540P
  { label: '540P 16:9 (1024*576)', value: '1024*576' },
  { label: '540P 9:16 (576*1024)', value: '576*1024' },
  { label: '540P 1:1 (1024*1024)', value: '1024*1024' },
  // 720P
  { label: '720P 16:9 (1280*720)', value: '1280*720' },
  { label: '720P 9:16 (720*1280)', value: '720*1280' },
  { label: '720P 1:1 (960*960)', value: '960*960' },
  // 1080P
  { label: '1080P 16:9 (1920*1080)', value: '1920*1080' },
  { label: '1080P 9:16 (1080*1920)', value: '1080*1920' },
  { label: '1080P 1:1 (1440*1440)', value: '1440*1440' },
]

const BASE_FIELDS_PV_T2V = [
  {
    key: 'prompt',
    label: '文本提示词',
    type: 'text' as const,
    group: 'input' as const,
    required: true,
    maxLength: 5000,
    description: '描述期望生成的视频内容。支持中英文，C1/V6 不超过5000字符，V5.6 不超过2048字符',
  },
  {
    key: 'resolution',
    label: '输出尺寸',
    type: 'select' as const,
    group: 'parameters' as const,
    apiKey: 'size',
    required: true,
    defaultValue: '1280*720',
    options: SIZE_OPTIONS_T2V,
    description: '选择输出视频的像素尺寸与宽高比。映射为 API 的 size 参数',
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
    description: '单位：秒',
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

export const pixverseC1T2v: ModelDefinition<VideoSubCategory> = {
  id: 'pixverse-c1-t2v',
  model: 'pixverse/pixverse-c1-t2v',
  supportedModels: ['pixverse/pixverse-c1-t2v'],
  displayName: 'PixVerse C1 文生视频',
  category: 'video',
  subCategory: 'text-to-video',
  endpoint: '/services/aigc/video-generation/video-synthesis',
  async: true,
  pricing: {
    unit: 'per_second',
    quantityKey: 'duration',
    region: 'cn-beijing',
    // 条件匹配 16:9 默认像素值；非默认画幅按首个 tier 计价
    tiers: [
      { condition: { resolution: '640*360' }, price: 0.18 },
      { condition: { resolution: '1024*576' }, price: 0.24 },
      { condition: { resolution: '1280*720' }, price: 0.3 },
      { condition: { resolution: '1920*1080' }, price: 0.56 },
    ],
  },
  fields: BASE_FIELDS_PV_T2V,
}

export const pixverseV6T2v: ModelDefinition<VideoSubCategory> = {
  id: 'pixverse-v6-t2v',
  model: 'pixverse/pixverse-v6-t2v',
  supportedModels: ['pixverse/pixverse-v6-t2v'],
  displayName: 'PixVerse V6 文生视频',
  category: 'video',
  subCategory: 'text-to-video',
  endpoint: '/services/aigc/video-generation/video-synthesis',
  async: true,
  pricing: {
    unit: 'per_second',
    quantityKey: 'duration',
    region: 'cn-beijing',
    tiers: [
      { condition: { resolution: '640*360' }, price: 0.15 },
      { condition: { resolution: '1024*576' }, price: 0.21 },
      { condition: { resolution: '1280*720' }, price: 0.27 },
      { condition: { resolution: '1920*1080' }, price: 0.53 },
    ],
  },
  fields: [
    ...BASE_FIELDS_PV_T2V,
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
      description: 'V6 支持多镜头智能分镜，可生成含有多个场景切换的视频',
    },
  ],
}

export const pixverseV56T2v: ModelDefinition<VideoSubCategory> = {
  id: 'pixverse-v56-t2v',
  model: 'pixverse/pixverse-v5.6-t2v',
  supportedModels: ['pixverse/pixverse-v5.6-t2v'],
  displayName: 'PixVerse V5.6 文生视频',
  category: 'video',
  subCategory: 'text-to-video',
  endpoint: '/services/aigc/video-generation/video-synthesis',
  async: true,
  pricing: {
    unit: 'per_second',
    quantityKey: 'duration',
    region: 'cn-beijing',
    tiers: [
      { condition: { resolution: '640*360' }, price: 0.21 },
      { condition: { resolution: '1024*576' }, price: 0.21 },
      { condition: { resolution: '1280*720' }, price: 0.27 },
      { condition: { resolution: '1920*1080' }, price: 0.44 },
    ],
  },
  fields: [
    {
      ...BASE_FIELDS_PV_T2V[0],
      maxLength: 2048,
    },
    BASE_FIELDS_PV_T2V[1],
    {
      ...BASE_FIELDS_PV_T2V[2],
      description: '单位：秒。360P/540P/720P 可选择 5/8/10s，1080P 可选择 5/8s',
    },
    BASE_FIELDS_PV_T2V[3],
    BASE_FIELDS_PV_T2V[4],
    BASE_FIELDS_PV_T2V[5],
  ],
}
