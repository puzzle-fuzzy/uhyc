import type { ModelDefinition } from '../types'
import type { VideoSubCategory } from '../types'

// ---------------------------------------------------------------------------
// 可灵 (Kling) 参考生视频（仅 Omni）
//
// 对应文档: docs/bailian/视频生成/可灵/可灵-视频生成.md
// API 端点: POST /api/v1/services/aigc/video-generation/video-synthesis
//
// 仅 kling/kling-v3-omni-video-generation 支持参考生视频。
// 媒体组合：feature（特征参考视频）、refer（参考图片）、first_frame（首帧图片）。
// prompt 支持 <<<element_N>>> / <<<image_N>>> / <<<video_N>>> 引用语法。
// ---------------------------------------------------------------------------

export const klingV3OmniR2v: ModelDefinition<VideoSubCategory> = {
  id: 'kling-v3-omni-r2v',
  model: 'kling/kling-v3-omni-video-generation',
  supportedModels: ['kling/kling-v3-omni-video-generation'],
  displayName: '可灵 V3 Omni 参考生视频',
  category: 'video',
  subCategory: 'reference-to-video',
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
      key: 'prompt',
      label: '文本提示词',
      type: 'text' as const,
      group: 'input' as const,
      maxLength: 2500,
      description:
        '描述期望生成的视频内容。支持 <<<element_N>>> / <<<image_N>>> / <<<video_N>>> 语法引用媒体素材中的主体、图片和视频',
    },
    {
      key: 'media',
      label: '参考素材',
      type: 'media' as const,
      group: 'input' as const,
      required: true,
      description:
        '媒体素材组合规则：仅 feature 时需 1 个视频；仅 refer 时参考图+主体 ≤7；feature+refer 时需 1 视频且参考图+主体 ≤4；feature+first_frame 时需 1 视频+1 首帧',
      mediaSlots: [
        {
          type: 'feature' as const,
          label: '特征参考视频',
          accept: 'video/*',
          maxCount: 1,
          maxSizeMB: 200,
          maxDurationSec: 10,
        },
        {
          type: 'refer' as const,
          label: '参考图片',
          accept: 'image/*',
          maxCount: 7,
          maxSizeMB: 10,
        },
        {
          type: 'first_frame' as const,
          label: '首帧图片',
          accept: 'image/*',
          maxCount: 1,
          maxSizeMB: 10,
        },
      ],
    },
    {
      key: 'element_list',
      label: '主体列表',
      type: 'multi-text' as const,
      group: 'input' as const,
      description: 'JSON 数组 [{element_id: number}]，引用预注册的主体 ID。可从可灵主体列表获取',
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
      description: '参考生视频（feature / feature+refer / refer）场景必须设置宽高比',
    },
    {
      key: 'duration',
      label: '视频时长',
      type: 'range' as const,
      group: 'parameters' as const,
      defaultValue: 5,
      min: 3,
      max: 15,
      description: '单位：秒，取值范围 [3, 15]。传入视频时上限为 10 秒',
    },
    {
      key: 'audio',
      label: '生成音频',
      type: 'boolean' as const,
      group: 'parameters' as const,
      defaultValue: false,
      description: '传入视频（feature）时只能设为 false',
    },
    {
      key: 'watermark',
      label: '添加水印',
      type: 'boolean' as const,
      group: 'parameters' as const,
      defaultValue: false,
      description: '水印位于视频右下角，文案为 "可灵AI"',
    },
  ],
}
