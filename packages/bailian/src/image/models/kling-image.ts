import type { ModelDefinition } from '../../video/types'

// ---------------------------------------------------------------------------
// 可灵-图像生成 (Kling Image Generation)
// 文档: docs/bailian/可灵-图像生成.md
// 异步 API，支持文生图和参考图生图
// ---------------------------------------------------------------------------

type ImageSubCategory = 'text-to-image' | 'image-to-image' | 'reference-to-image'

export const klingImageGen: ModelDefinition<ImageSubCategory> = {
  model: 'kling/kling-v3-image-generation',
  supportedModels: [
    'kling/kling-v3-image-generation',
  ],
  displayName: '可灵 图像生成',
  category: 'image',
  subCategory: 'text-to-image',
  endpoint: '/services/aigc/image-generation/generation',
  async: true,
  pricing: {
    unit: 'per_image',
    quantityKey: 'n',
    region: 'cn-beijing',
    tiers: [
      { condition: {}, price: 0.5 },
    ],
  },

  fields: [
    {
      key: 'prompt',
      label: '文本提示词',
      type: 'text',
      group: 'input',
      required: true,
      maxLength: 2500,
      description: '描述期望生成的图像内容。支持中英文，不超过2500个字符',
    },
    {
      key: 'n',
      label: '生成张数',
      type: 'range',
      group: 'parameters',
      defaultValue: 1,
      min: 1,
      max: 9,
      description: '1~9张，默认1张',
    },
    {
      key: 'aspect_ratio',
      label: '宽高比',
      type: 'select',
      group: 'parameters',
      defaultValue: '16:9',
      options: [
        { label: '16:9', value: '16:9' },
        { label: '9:16', value: '9:16' },
        { label: '1:1', value: '1:1' },
      ],
      description: '输出图像宽高比',
    },
    {
      key: 'resolution',
      label: '分辨率',
      type: 'select',
      group: 'parameters',
      defaultValue: '1k',
      options: [
        { label: '1K', value: '1k' },
        { label: '2K', value: '2k' },
      ],
      description: '输出图像分辨率',
    },
    {
      key: 'watermark',
      label: '添加水印',
      type: 'boolean',
      group: 'parameters',
      defaultValue: false,
      description: '水印位于图像右下角，文案为"可灵AI"',
    },
  ],
}

export const klingOmniImageGen: ModelDefinition<ImageSubCategory> = {
  model: 'kling/kling-v3-omni-image-generation',
  supportedModels: [
    'kling/kling-v3-omni-image-generation',
  ],
  displayName: '可灵 全能图像生成',
  category: 'image',
  subCategory: 'text-to-image',
  endpoint: '/services/aigc/image-generation/generation',
  async: true,
  pricing: {
    unit: 'per_image',
    quantityKey: 'n',
    region: 'cn-beijing',
    tiers: [
      { condition: {}, price: 0.6 },
    ],
  },

  fields: [
    {
      key: 'prompt',
      label: '文本提示词',
      type: 'text',
      group: 'input',
      required: true,
      maxLength: 2500,
      description: '描述期望生成的图像内容。支持中英文，不超过2500个字符',
    },
    {
      key: 'n',
      label: '生成张数',
      type: 'range',
      group: 'parameters',
      defaultValue: 1,
      min: 1,
      max: 9,
      description: '单图模式下 1~9张；组图模式下由 series_amount 控制',
    },
    {
      key: 'aspect_ratio',
      label: '宽高比',
      type: 'select',
      group: 'parameters',
      defaultValue: '16:9',
      options: [
        { label: '16:9', value: '16:9' },
        { label: '9:16', value: '9:16' },
        { label: '1:1', value: '1:1' },
      ],
      description: '输出图像宽高比',
    },
    {
      key: 'resolution',
      label: '分辨率',
      type: 'select',
      group: 'parameters',
      defaultValue: '1k',
      options: [
        { label: '1K', value: '1k' },
        { label: '2K', value: '2k' },
        { label: '4K', value: '4k' },
      ],
      description: '输出图像分辨率。Omni 版支持 4K',
    },
    {
      key: 'watermark',
      label: '添加水印',
      type: 'boolean',
      group: 'parameters',
      defaultValue: false,
      description: '水印位于图像右下角，文案为"可灵AI"',
    },
  ],
}
