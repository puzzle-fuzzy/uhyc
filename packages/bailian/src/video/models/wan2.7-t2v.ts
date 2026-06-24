import type { ModelDefinition } from '../types'
import type { VideoSubCategory } from '../types'

// ---------------------------------------------------------------------------
// 万相 2.7 文生视频
//
// 对应文档: docs/bailian/万相2.7-文生视频.md
// API 端点: POST /api/v1/services/aigc/video-generation/video-synthesis
//
// 与 HappyHorse 关键差异:
//   - 支持 negative_prompt（反向提示词）
//   - 支持 audio_url（自定义音频）
//   - 支持 prompt_extend（Prompt 智能改写）
//   - ratio 选项更少（5 种 vs 9 种）
//   - duration 范围 [2,15] vs [3,15]
//   - watermark 默认 false，"AI生成" vs "Happy Horse"
// ---------------------------------------------------------------------------

export const wan27T2v: ModelDefinition<VideoSubCategory> = {
  model: 'wan2.7-t2v',
  supportedModels: ['wan2.7-t2v'],
  displayName: '万相 2.7 文生视频',
  category: 'video',
  subCategory: 'text-to-video',
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
      description: '描述期望生成的视频内容。支持中英文，不超过5000个字符',
    },
    {
      key: 'negative_prompt',
      label: '反向提示词',
      type: 'text',
      group: 'input',
      maxLength: 500,
      description: '描述不希望在视频画面中看到的内容，用于排除特定元素',
    },
    {
      key: 'audio_url',
      label: '音频文件 URL',
      type: 'text',
      group: 'input',
      description:
        '自定义音频文件链接。支持 wav/mp3，时长 2～30s，不超过 15MB。不提供则自动生成背景音乐',
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
      description: '单位：秒，取值范围 [2, 15]',
    },
    {
      key: 'prompt_extend',
      label: 'Prompt 智能改写',
      type: 'boolean',
      group: 'parameters',
      defaultValue: true,
      description:
        '开启后使用大模型对输入 prompt 进行智能改写，提升短 prompt 生成效果，但会增加耗时',
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
      description:
        '固定种子可提升结果可复现性。留空则系统自动生成随机种子',
    },
  ],
}
