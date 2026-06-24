import type { ModelDefinition } from '../../video/types'

// ---------------------------------------------------------------------------
// 千问-文生图 (Qwen-Image Text-to-Image)
// 文档: docs/bailian/千问-文生图.md
// 同步 API，一次请求直接返回图像
// ---------------------------------------------------------------------------

type ImageSubCategory = 'text-to-image' | 'image-to-image' | 'reference-to-image'

export const qwenTextToImage: ModelDefinition<ImageSubCategory> = {
  model: 'qwen-image-2.0-pro',
  supportedModels: [
    'qwen-image-2.0-pro',
    'qwen-image-2.0-pro-2026-04-22',
    'qwen-image-2.0-pro-2026-03-03',
    'qwen-image-2.0',
    'qwen-image-2.0-2026-03-03',
    'qwen-image-max',
    'qwen-image-max-2025-12-30',
    'qwen-image-plus',
    'qwen-image-plus-2026-01-09',
    'qwen-image',
  ],
  displayName: '千问 文生图',
  category: 'image',
  subCategory: 'text-to-image',
  endpoint: '/services/aigc/multimodal-generation/generation',
  async: false,

  fields: [
    {
      key: 'prompt',
      label: '文本提示词',
      type: 'text',
      group: 'input',
      required: true,
      maxLength: 5000,
      description:
        '描述期望生成的图像内容、风格和构图。2.0系列上限1300 Token，其他800 Token',
    },
    {
      key: 'negative_prompt',
      label: '反向提示词',
      type: 'text',
      group: 'parameters',
      maxLength: 500,
      description: '描述不希望在图像中出现的内容',
    },
    {
      key: 'size',
      label: '输出分辨率',
      type: 'text',
      group: 'parameters',
      defaultValue: '2048*2048',
      description:
        '格式为 宽*高。2.0系列：总像素512*512~2048*2048，默认2048*2048。max/plus系列: 1664*928等固定比例',
    },
    {
      key: 'n',
      label: '生成张数',
      type: 'range',
      group: 'parameters',
      defaultValue: 1,
      min: 1,
      max: 6,
      description: '2.0系列 1-6张；max/plus系列固定1',
    },
    {
      key: 'prompt_extend',
      label: 'Prompt 智能改写',
      type: 'boolean',
      group: 'parameters',
      defaultValue: true,
      description: '开启后模型优化 prompt',
    },
    {
      key: 'watermark',
      label: '添加水印',
      type: 'boolean',
      group: 'parameters',
      defaultValue: false,
      description: '添加 "Qwen-Image" 水印',
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
