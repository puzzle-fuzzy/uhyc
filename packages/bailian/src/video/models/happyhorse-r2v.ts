import type { ModelDefinition, VideoSubCategory } from '../types'

// ---------------------------------------------------------------------------
// HappyHorse 参考生视频
// 文档: docs/bailian/HappyHorse-参考生视频.md
// ---------------------------------------------------------------------------

export const happyhorseR2v: ModelDefinition<VideoSubCategory> = {
  model: 'happyhorse-1.1-r2v',
  supportedModels: ['happyhorse-1.1-r2v', 'happyhorse-1.0-r2v'],
  displayName: 'HappyHorse 参考生视频',
  category: 'video',
  subCategory: 'reference-to-video',
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
  refSyntax: 'bracket-en',

  fields: [
    {
      key: 'prompt',
      label: '文本提示词',
      type: 'text',
      group: 'input',
      required: true,
      maxLength: 5000,
      description:
        '描述期望生成的视频内容。用 [Image 1]、[Image 2] 指代 media 数组中的参考图像。不超过5000字符',
    },
    {
      key: 'media',
      label: '参考图像',
      type: 'media',
      group: 'input',
      required: true,
      description:
        '参考图像列表，1~9张。格式：JPEG/JPG/PNG/WEBP，短边≥400px，≤20MB。数组顺序对应 prompt 中 [Image n] 的索引',
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
      key: 'ratio',
      label: '宽高比',
      type: 'select',
      group: 'parameters',
      defaultValue: '16:9',
      options: [
        { label: '16:9', value: '16:9' },
        { label: '9:16', value: '9:16' },
        { label: '1:1', value: '1:1' },
        { label: '4:3', value: '4:3' },
        { label: '3:4', value: '3:4' },
        { label: '4:5', value: '4:5' },
        { label: '5:4', value: '5:4' },
        { label: '9:21', value: '9:21' },
        { label: '21:9', value: '21:9' },
      ],
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
