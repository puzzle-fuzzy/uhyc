import type { ModelDefinition } from '../../video/types'

// ---------------------------------------------------------------------------
// 千问-图像编辑 (Qwen-Image Editing / Image-to-Image)
// 文档: docs/bailian/千问-图像编辑.md
// 同步 API
// ---------------------------------------------------------------------------

type ImageSubCategory = 'text-to-image' | 'image-to-image' | 'reference-to-image'

export const qwenImageEdit: ModelDefinition<ImageSubCategory> = {
  model: 'qwen-image-2.0-pro',
  supportedModels: [
    'qwen-image-2.0-pro',
    'qwen-image-2.0-pro-2026-04-22',
    'qwen-image-2.0-pro-2026-03-03',
    'qwen-image-2.0',
    'qwen-image-2.0-2026-03-03',
    'qwen-image-edit-max',
    'qwen-image-edit-max-2026-01-16',
    'qwen-image-edit-plus',
    'qwen-image-edit-plus-2025-12-15',
    'qwen-image-edit-plus-2025-10-30',
    'qwen-image-edit',
  ],
  displayName: '千问 图像编辑',
  category: 'image',
  subCategory: 'image-to-image',
  endpoint: '/services/aigc/multimodal-generation/generation',
  async: false,
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
      key: 'images',
      label: '输入图像',
      type: 'media',
      group: 'input',
      required: true,
      description:
        '输入 1-3 张图像。格式：JPG/JPEG/PNG/BMP/TIFF/WEBP/GIF（仅首帧），建议 384-3072px，≤10MB。支持公网URL、OSS临时URL或Base64',
    },
    {
      key: 'prompt',
      label: '编辑指令',
      type: 'text',
      group: 'input',
      required: true,
      maxLength: 5000,
      description:
        '描述编辑意图。qwen-image-2.0 系列上限 1300 Token，其他模型 800 Token',
    },
    {
      key: 'n',
      label: '生成张数',
      type: 'range',
      group: 'parameters',
      defaultValue: 1,
      min: 1,
      max: 6,
      description: '除 qwen-image-edit 仅支持1张外，其余支持 1-6 张',
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
      type: 'select',
      group: 'parameters',
      options: [
        { label: '1:1　2048×2048', value: '2048*2048' },
        { label: '1:1　1024×1024', value: '1024*1024' },
        { label: '16:9　1920×1080', value: '1920*1080' },
        { label: '9:16　1080×1920', value: '1080*1920' },
        { label: '3:2　1536×1024', value: '1536*1024' },
        { label: '2:3　1024×1536', value: '1024*1536' },
      ],
      description: '输出图像分辨率。2.0系列总像素 512*512~2048*2048；edit-max/plus系列宽高 [512,2048]。qwen-image-edit 不支持指定',
    },
    {
      key: 'prompt_extend',
      label: 'Prompt 智能改写',
      type: 'boolean',
      group: 'parameters',
      defaultValue: true,
      description: '开启后模型优化 prompt（qwen-image-edit 不支持）',
    },
    {
      key: 'watermark',
      label: '添加水印',
      type: 'boolean',
      group: 'parameters',
      defaultValue: false,
      description: '是否在图像右下角添加 "Qwen-Image" 水印',
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
