import type { ModelDefinition } from '../types'
import type { VideoSubCategory } from '../types'

// ---------------------------------------------------------------------------
// 可灵 (Kling) 视频编辑（仅 Omni）
//
// 对应文档: docs/bailian/视频生成/可灵/可灵-视频生成.md
// API 端点: POST /api/v1/services/aigc/video-generation/video-synthesis
//
// 仅 kling/kling-v3-omni-video-generation 支持视频编辑。
// 媒体组合：base（待编辑视频，必填）+ refer（参考图片，可选）。
// 宽高比跟随输入视频，无需设置 aspect_ratio。
// ---------------------------------------------------------------------------

export const klingV3OmniVideoEdit: ModelDefinition<VideoSubCategory> = {
  id: 'kling-v3-omni-video-edit',
  model: 'kling/kling-v3-omni-video-generation',
  supportedModels: ['kling/kling-v3-omni-video-generation'],
  displayName: '可灵 V3 Omni 视频编辑',
  category: 'video',
  subCategory: 'video-editing',
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
        '描述期望的视频编辑效果。支持 <<<element_N>>> / <<<image_N>>> / <<<video_N>>> 语法引用媒体素材',
    },
    {
      key: 'media',
      label: '媒体素材',
      type: 'media' as const,
      group: 'input' as const,
      required: true,
      description:
        '媒体组合规则：仅 base 时需 1 个视频；base+refer 时需 1 视频且参考图+主体 ≤4',
      mediaSlots: [
        {
          type: 'base' as const,
          label: '待编辑视频',
          accept: 'video/*',
          maxCount: 1,
          maxSizeMB: 200,
          maxDurationSec: 10,
        },
        {
          type: 'refer' as const,
          label: '参考图片',
          accept: 'image/*',
          maxCount: 4,
          maxSizeMB: 10,
        },
      ],
    },
    {
      key: 'element_list',
      label: '主体列表',
      type: 'multi-text' as const,
      group: 'input' as const,
      description: 'JSON 数组 [{element_id: number}]，引用预注册的主体 ID',
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
      max: 10,
      description: '单位：秒。传入视频时取值范围 [3, 10]',
    },
    {
      key: 'audio',
      label: '生成音频',
      type: 'boolean' as const,
      group: 'parameters' as const,
      defaultValue: false,
      description: '传入视频时只能设为 false',
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
