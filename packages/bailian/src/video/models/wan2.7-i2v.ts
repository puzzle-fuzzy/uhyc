import type { ModelDefinition, VideoSubCategory } from '../types'

// ---------------------------------------------------------------------------
// 万相2.7 图生视频（首帧/首尾帧/视频续写）
// 文档: docs/bailian/万相2.7-图生视频.md
// ---------------------------------------------------------------------------

export const wan27I2v: ModelDefinition<VideoSubCategory> = {
  model: 'wan2.7-i2v-2026-04-25',
  supportedModels: ['wan2.7-i2v-2026-04-25'],
  displayName: '万相2.7 图生视频',
  category: 'video',
  subCategory: 'image-to-video',
  endpoint: '/services/aigc/video-generation/video-synthesis',
  async: true,

  fields: [
    {
      key: 'prompt',
      label: '文本提示词',
      type: 'text',
      group: 'input',
      maxLength: 5000,
      description: '描述期望生成的视频内容，可选。不超过5000个字符',
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
      label: '媒体素材',
      type: 'media',
      group: 'input',
      required: true,
      description:
        '支持三种模式：①首帧生视频（first_frame + 可选 driving_audio）②首尾帧生视频（first_frame + last_frame + 可选 driving_audio）③视频续写（first_clip + 可选 last_frame）。图像格式：JPEG/PNG/BMP/WEBP，240-8000px；音频：wav/mp3，2-30s，≤15MB；视频：mp4/mov，2-10s，≤100MB',
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
      description: '开启后大模型优化 prompt，提升效果但增加耗时',
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
      description: '固定种子可提升结果可复现性',
    },
  ],
}
