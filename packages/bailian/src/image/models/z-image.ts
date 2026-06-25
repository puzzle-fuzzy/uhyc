import type { ModelDefinition } from '../../video/types'

// ---------------------------------------------------------------------------
// Z-Image 文生图 (Z-Image Turbo Text-to-Image)
// 文档: docs/bailian/文生图Z-Image.md
// 同步 API，轻量快速
// ---------------------------------------------------------------------------

type ImageSubCategory = 'text-to-image' | 'image-to-image' | 'reference-to-image'

export const zImageTurbo: ModelDefinition<ImageSubCategory> = {
  model: 'z-image-turbo',
  supportedModels: [
    'z-image-turbo',
  ],
  displayName: 'Z-Image 轻量文生图',
  category: 'image',
  subCategory: 'text-to-image',
  endpoint: '/services/aigc/multimodal-generation/generation',
  async: false,
  pricing: {
    unit: 'per_image',
    quantityKey: 'n',
    region: 'cn-beijing',
    tiers: [
      { condition: {}, price: 0.1 },
    ],
  },

  fields: [
    {
      key: 'prompt',
      label: '文本提示词',
      type: 'text',
      group: 'input',
      required: true,
      maxLength: 800,
      description: '描述期望生成的图像内容。支持中英文，不超过800个字符',
    },
    {
      key: 'size',
      label: '输出分辨率',
      type: 'text',
      group: 'parameters',
      defaultValue: '1024*1536',
      description: '格式为 宽*高。总像素 512*512~2048*2048，推荐 1024*1024~1536*1536。默认 1024*1536',
    },
    {
      key: 'prompt_extend',
      label: '智能改写提示词',
      type: 'boolean',
      group: 'parameters',
      defaultValue: false,
      description: '开启后使用大模型优化提示词，价格更高',
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
