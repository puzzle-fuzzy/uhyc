import type { ModelDefinition } from '../../video/types'

// ---------------------------------------------------------------------------
// 千问-图像翻译 (Qwen-MT-Image / Reference-to-Image)
// 文档: docs/bailian/千问-图像翻译.md
// 异步 API（仅北京地域）
// ---------------------------------------------------------------------------

type ImageSubCategory = 'text-to-image' | 'image-to-image' | 'reference-to-image'

export const qwenImageTranslation: ModelDefinition<ImageSubCategory> = {
  model: 'qwen-mt-image',
  supportedModels: ['qwen-mt-image'],
  displayName: '千问 图像翻译',
  category: 'image',
  subCategory: 'reference-to-image',
  endpoint: '/services/aigc/image2image/image-synthesis',
  async: true,
  pricing: {
    unit: 'per_image',
    quantityKey: 'n',
    region: 'cn-beijing',
    tiers: [
      { condition: {}, price: 0.003 },
    ],
  },

  fields: [
    {
      key: 'image_url',
      label: '输入图像',
      type: 'text',
      group: 'input',
      required: true,
      description:
        '图像公网URL。格式：JPG/JPEG/PNG/BMP/PNM/PPM/TIFF/WEBP，宽高 15-8192px，宽高比 1:10~10:1，≤100MB。不支持中文URL',
    },
    {
      key: 'source_lang',
      label: '源语种',
      type: 'select',
      group: 'input',
      required: true,
      description: '源语言。支持 auto（自动检测）或语种编码（如 zh/en/ja/ko）。至少一项为中文或英文',
      options: [
        { label: '自动检测', value: 'auto' },
        { label: '简体中文', value: 'zh' },
        { label: '英文', value: 'en' },
        { label: '日语', value: 'ja' },
        { label: '韩语', value: 'ko' },
        { label: '俄语', value: 'ru' },
        { label: '西班牙语', value: 'es' },
        { label: '法语', value: 'fr' },
        { label: '葡萄牙语', value: 'pt' },
        { label: '意大利语', value: 'it' },
        { label: '德语', value: 'de' },
        { label: '越南语', value: 'vi' },
      ],
    },
    {
      key: 'target_lang',
      label: '目标语种',
      type: 'select',
      group: 'input',
      required: true,
      description: '目标语言。至少一项为中文或英文',
      options: [
        { label: '简体中文', value: 'zh' },
        { label: '英文', value: 'en' },
        { label: '日语', value: 'ja' },
        { label: '韩语', value: 'ko' },
        { label: '俄语', value: 'ru' },
        { label: '西班牙语', value: 'es' },
        { label: '法语', value: 'fr' },
        { label: '葡萄牙语', value: 'pt' },
        { label: '意大利语', value: 'it' },
        { label: '越南语', value: 'vi' },
        { label: '马来语', value: 'ms' },
        { label: '泰语', value: 'th' },
        { label: '印尼语', value: 'id' },
        { label: '阿拉伯语', value: 'ar' },
      ],
    },
    {
      key: 'domainHint',
      label: '领域提示',
      type: 'text',
      group: 'parameters',
      maxLength: 500,
      description: '用英文描述使用场景和译文风格，使翻译更贴合领域需求。建议不超过200个英文单词',
    },
    {
      key: 'imageSegment',
      label: '跳过主体文字',
      type: 'boolean',
      group: 'parameters',
      defaultValue: false,
      description: '开启后不翻译图像主体（如人物、商品、Logo）上的文字',
    },
  ],
}
