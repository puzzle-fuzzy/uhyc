import type { ModelDefinition, VideoSubCategory } from '../types'

// ---------------------------------------------------------------------------
// HappyHorse 视频编辑
// 文档: docs/bailian/HappyHorse-视频编辑.md
// ---------------------------------------------------------------------------

export const happyhorseVideoEdit: ModelDefinition<VideoSubCategory> = {
  id: 'happyhorse-video-edit',
  model: 'happyhorse-1.0-video-edit',
  supportedModels: ['happyhorse-1.0-video-edit'],
  displayName: 'HappyHorse 视频编辑',
  category: 'video',
  subCategory: 'video-editing',
  endpoint: '/services/aigc/video-generation/video-synthesis',
  async: true,
  pricing: {
    unit: 'per_second',
    quantityKey: 'duration',
    region: 'cn-beijing',
    tiers: [
      { condition: { resolution: '720P' }, price: 0.9 },
      { condition: { resolution: '1080P' }, price: 1.6 },
    ],
  },
  refSyntax: 'bracket-en',

  fields: [
    {
      key: 'prompt',
      label: '编辑指令',
      type: 'text',
      group: 'input',
      required: true,
      maxLength: 5000,
      description: '描述对视频的编辑意图（风格变换、局部替换等）。不超过5000个字符',
    },
    {
      key: 'media',
      label: '视频与参考图像',
      type: 'media',
      group: 'input',
      required: true,
      description:
        '必传1个视频（MP4/MOV，3~60s，≤100MB）+ 可选0~5张参考图像（JPEG/JPG/PNG/WEBP，≤20MB）。输出视频3~15秒',
      mediaSlots: [
        { type: 'video' as const, label: '待编辑视频', accept: 'video/*', maxCount: 1, maxSizeMB: 100 },
        { type: 'reference_image' as const, label: '参考图片', accept: 'image/*', maxCount: 5, maxSizeMB: 20 },
      ],
    },
    {
      key: 'resolution',
      label: '分辨率',
      type: 'select',
      group: 'parameters',
      defaultValue: '1080P',
      options: [
        { label: '720P', value: '720P' },
        { label: '1080P', value: '1080P' },
      ],
    },
    {
      key: 'audio_setting',
      label: '声音控制',
      type: 'select',
      group: 'parameters',
      defaultValue: 'auto',
      options: [
        { label: '自动（由模型控制）', value: 'auto' },
        { label: '保留原始声音', value: 'origin' },
      ],
    },
    {
      key: 'watermark',
      label: '添加水印',
      type: 'boolean',
      group: 'parameters',
      defaultValue: true,
      description: '水印位于视频右下角，文案为 "Happy Horse"',
    },
    {
      key: 'seed',
      label: '随机种子',
      type: 'number',
      group: 'parameters',
      min: 0,
      max: 2147483647,
      description: '固定种子可提升结果可复现性',
    },
  ],
}
