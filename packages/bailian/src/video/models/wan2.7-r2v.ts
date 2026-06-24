import type { ModelDefinition, VideoSubCategory } from '../types'

// ---------------------------------------------------------------------------
// 万相2.7 参考生视频
// 文档: docs/bailian/万相2.7-参考生视频.md
// ---------------------------------------------------------------------------

export const wan27R2v: ModelDefinition<VideoSubCategory> = {
  model: 'wan2.7-r2v',
  supportedModels: ['wan2.7-r2v'],
  displayName: '万相2.7 参考生视频',
  category: 'video',
  subCategory: 'reference-to-video',
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

  fields: [
    {
      key: 'prompt',
      label: '文本提示词',
      type: 'text',
      group: 'input',
      required: true,
      maxLength: 5000,
      description:
        '描述期望生成的视频内容。用"图1/图2"（中文）或"Image 1/Image 2"（英文）指代参考图像，用"视频1/视频2"指代参考视频。不超过5000个字符',
    },
    {
      key: 'negative_prompt',
      label: '反向提示词',
      type: 'text',
      group: 'input',
      maxLength: 500,
      description: '描述不希望在视频中看到的内容',
    },
    {
      key: 'media',
      label: '参考素材',
      type: 'media',
      group: 'input',
      required: true,
      description:
        '参考图像+参考视频+可选首帧。参考图像/视频 ≤5个，至少传1个。支持 reference_image（图片）、reference_video（视频，1-30s）、first_frame（首帧，最多1张）。每个素材可附带 reference_voice 音频（wav/mp3，1-10s）指定音色',
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
      description: '仅在不传首帧图像时生效；传入首帧则自动跟随首帧宽高比',
      options: [
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
      defaultValue: 5,
      min: 2,
      max: 15,
      description: '单位：秒。不含视频素材时 [2,15]，含视频素材时 [2,10]',
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
