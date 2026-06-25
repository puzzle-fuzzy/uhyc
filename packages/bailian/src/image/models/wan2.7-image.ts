import type { ModelDefinition } from '../../video/types'

// ---------------------------------------------------------------------------
// 万相2.7 图像生成与编辑
// 文档: docs/bailian/万相-图像生成与编辑2.7.md
// 支持同步和异步两种调用方式；此处使用同步模式（multimodal-generation）
// ---------------------------------------------------------------------------

type ImageSubCategory = 'text-to-image' | 'image-to-image' | 'reference-to-image'

const COMMON_FIELDS = [
  {
    key: 'prompt',
    label: '文本提示词',
    type: 'text' as const,
    group: 'input' as const,
    required: true,
    maxLength: 5000,
    description: '描述期望生成的图像内容。支持中英文，不超过5000个字符',
  },
  {
    key: 'size',
    label: '输出分辨率',
    type: 'select' as const,
    group: 'parameters' as const,
    defaultValue: '2K',
    options: [
      { label: '1K', value: '1K' },
      { label: '2K', value: '2K' },
      { label: '4K', value: '4K' },
    ],
    description: '输出分辨率。wan2.7-image-pro 支持 1K/2K/4K；wan2.7-image 支持 1K/2K',
  },
  {
    key: 'n',
    label: '生成张数',
    type: 'range' as const,
    group: 'parameters' as const,
    defaultValue: 1,
    min: 1,
    max: 4,
    description: '生成图像数量 1~4 张。组图模式时最大 12 张',
  },
  {
    key: 'thinking_mode',
    label: '思考模式',
    type: 'boolean' as const,
    group: 'parameters' as const,
    defaultValue: false,
    description: '开启后增强推理以提升出图质量，但增加耗时。开启时生成张数（n）固定为 1',
  },
  {
    key: 'watermark',
    label: '添加水印',
    type: 'boolean' as const,
    group: 'parameters' as const,
    defaultValue: false,
    description: '水印位于图片右下角，文案为"AI生成"',
  },
  {
    key: 'seed',
    label: '随机种子',
    type: 'number' as const,
    group: 'parameters' as const,
    min: 0,
    max: 2147483647,
    description: '固定种子可提升结果可复现性',
  },
]

export const wan27ImagePro: ModelDefinition<ImageSubCategory> = {
  model: 'wan2.7-image-pro',
  supportedModels: [
    'wan2.7-image-pro',
  ],
  displayName: '万相2.7 图像生成 Pro',
  category: 'image',
  subCategory: 'text-to-image',
  endpoint: '/services/aigc/multimodal-generation/generation',
  async: false,
  pricing: {
    unit: 'per_image',
    quantityKey: 'n',
    region: 'cn-beijing',
    tiers: [
      { condition: {}, price: 0.4 },
    ],
  },
  fields: COMMON_FIELDS,
}

export const wan27Image: ModelDefinition<ImageSubCategory> = {
  model: 'wan2.7-image',
  supportedModels: [
    'wan2.7-image',
  ],
  displayName: '万相2.7 图像生成',
  category: 'image',
  subCategory: 'text-to-image',
  endpoint: '/services/aigc/multimodal-generation/generation',
  async: false,
  pricing: {
    unit: 'per_image',
    quantityKey: 'n',
    region: 'cn-beijing',
    tiers: [
      { condition: {}, price: 0.2 },
    ],
  },
  fields: COMMON_FIELDS,
}
