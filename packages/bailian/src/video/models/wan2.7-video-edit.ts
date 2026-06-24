import type { ModelDefinition, VideoSubCategory } from '../types'

// ---------------------------------------------------------------------------
// 万相2.7 视频编辑
// 文档: docs/bailian/万相2.7-视频编辑.md
// ---------------------------------------------------------------------------

export const wan27VideoEdit: ModelDefinition<VideoSubCategory> = {
  model: 'wan2.7-videoedit',
  supportedModels: ['wan2.7-videoedit'],
  displayName: '万相2.7 视频编辑',
  category: 'video',
  subCategory: 'video-editing',
  endpoint: '/services/aigc/video-generation/video-synthesis',
  async: true,
  pricing: {
    unit: 'per_second',
    quantityKey: 'duration',
    region: 'cn-beijing',
    tiers: [
      { condition: { resolution: '720P' }, price: 0.6 },
      { condition: { resolution: '1080P' }, price: 1.0 },
    ],
  },
  refSyntax: 'cn-prefixed',

  fields: [
    {
      key: 'prompt',
      label: '编辑指令',
      type: 'text',
      group: 'input',
      maxLength: 5000,
      description: '描述对视频的编辑意图。不超过5000个字符',
    },
    {
      key: 'negative_prompt',
      label: '反向提示词',
      type: 'text',
      group: 'input',
      maxLength: 500,
      description: '描述不希望在视频画面中出现的内容',
    },
    {
      key: 'media',
      label: '视频与参考图像',
      type: 'media',
      group: 'input',
      required: true,
      description:
        '必传1个视频（mp4/mov，2-10s，240-4096px，≤100MB）+ 可选0~4张参考图像（JPEG/PNG/BMP/WEBP，240-8000px，≤20MB）',
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
      description: '不传则自动跟随输入视频宽高比',
      options: [
        { label: '跟随输入视频', value: '' },
        { label: '16:9', value: '16:9' },
        { label: '9:16', value: '9:16' },
        { label: '1:1', value: '1:1' },
        { label: '4:3', value: '4:3' },
        { label: '3:4', value: '3:4' },
      ],
    },
    {
      key: 'duration',
      label: '视频时长',
      type: 'range',
      group: 'parameters',
      defaultValue: 0,
      min: 0,
      max: 10,
      description: '0=跟随输入视频时长。设置 [2,10] 则从0秒截取至指定长度',
    },
    {
      key: 'audio_setting',
      label: '声音设置',
      type: 'select',
      group: 'parameters',
      defaultValue: 'auto',
      options: [
        { label: '自动（由模型智能判断）', value: 'auto' },
        { label: '保留输入视频原声', value: 'origin' },
      ],
    },
    {
      key: 'prompt_extend',
      label: 'Prompt 智能改写',
      type: 'boolean',
      group: 'parameters',
      defaultValue: true,
      description: '开启后大模型优化 prompt',
    },
    {
      key: 'watermark',
      label: '添加水印',
      type: 'boolean',
      group: 'parameters',
      defaultValue: false,
      description: '水印位于视频右下角，文案为 "AI生成"',
    },
    {
      key: 'seed',
      label: '随机种子',
      type: 'number',
      group: 'parameters',
      min: 0,
      max: 2147483647,
    },
  ],
}
