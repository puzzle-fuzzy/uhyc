import type { ModelDefinition, VideoSubCategory } from '../types'

// ---------------------------------------------------------------------------
// HappyHorse 图生视频（基于首帧）
// 文档: docs/bailian/HappyHorse-图生视频-基于首帧.md
// ---------------------------------------------------------------------------

export const happyhorseI2v: ModelDefinition<VideoSubCategory> = {
  id: 'happyhorse-i2v',
  model: 'happyhorse-1.1-i2v',
  supportedModels: ['happyhorse-1.1-i2v', 'happyhorse-1.0-i2v'],
  displayName: 'HappyHorse 图生视频',
  category: 'video',
  subCategory: 'image-to-video',
  endpoint: '/services/aigc/video-generation/video-synthesis',
  async: true,
  pricing: {
    unit: 'per_second',
    quantityKey: 'duration',
    region: 'cn-beijing',
    tiers: [
      { condition: { resolution: '720P' }, price: 0.9 },
      { condition: { resolution: '1080P' }, price: 1.2 },
    ],
  },

  fields: [
    {
      key: 'media',
      label: '首帧图像',
      type: 'media',
      group: 'input',
      required: true,
      description:
        '输入首帧图像（有且仅有1张）。格式：JPEG/JPG/PNG/WEBP，分辨率宽高≥300px，宽高比 1:2.5~2.5:1，≤20MB。支持公网URL或Base64',
      mediaSlots: [
        { type: 'first_frame' as const, label: '首帧图片', accept: 'image/*', maxCount: 1, maxSizeMB: 20 },
      ],
    },
    {
      key: 'prompt',
      label: '文本提示词',
      type: 'text',
      group: 'input',
      maxLength: 5000,
      description: '描述期望生成的视频内容，可选。支持任何语言，不超过5000个非中文字符或2500个中文字符',
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
      description: '输出视频宽高比自动跟随输入首帧图像',
    },
    {
      key: 'duration',
      label: '视频时长',
      type: 'range',
      group: 'parameters',
      defaultValue: 5,
      min: 3,
      max: 15,
      description: '单位：秒，取值范围 [3, 15]',
    },
    {
      key: 'watermark',
      label: '添加水印',
      type: 'boolean',
      group: 'parameters',
      defaultValue: false,
      description: '水印位于视频右下角，文案为 "Happy Horse"',
    },
    {
      key: 'seed',
      label: '随机种子',
      type: 'number',
      group: 'parameters',
      min: 0,
      max: 2147483647,
      description: '固定种子可提升结果可复现性。留空则系统自动生成',
    },
  ],
}
