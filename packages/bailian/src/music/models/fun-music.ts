import type { ModelDefinition } from '../../video/types'

// ---------------------------------------------------------------------------
// Fun-Music 音乐生成
// 文档: docs/bailian/FunMusic-音乐生成.md
// 同步 API，返回音频 OSS URL
// ---------------------------------------------------------------------------

type MusicSubCategory = 'text-to-music'

const BASE_FIELDS = [
  {
    key: 'prompt',
    label: '提示词',
    type: 'text' as const,
    group: 'input' as const,
    maxLength: 2000,
    description: '描述期望的音乐风格、情绪和场景。与 lyrics 二选一',
  },
  {
    key: 'lyrics',
    label: '歌词',
    type: 'text' as const,
    group: 'input' as const,
    maxLength: 2000,
    description: '歌词内容。与 prompt 二选一。非流式中文 5~350 字，英文 5~2000 字符',
  },
  {
    key: 'gender',
    label: '演唱声音',
    type: 'select' as const,
    group: 'input' as const,
    defaultValue: 'female',
    options: [
      { label: '女声', value: 'female' },
      { label: '男声', value: 'male' },
    ],
    description: '演唱声音的性别',
  },
  {
    key: 'format',
    label: '音频格式',
    type: 'select' as const,
    group: 'input' as const,
    defaultValue: 'mp3',
    options: [
      { label: 'MP3', value: 'mp3' },
      { label: 'WAV', value: 'wav' },
    ],
    description: '音频编码格式',
  },
  {
    key: 'enable_aigc_watermark',
    label: 'AIGC 水印',
    type: 'boolean' as const,
    group: 'input' as const,
    defaultValue: false,
    description: '在音频末尾追加摩尔斯电码音频信号，标识为 AI 生成',
  },
]

export const funMusicV1: ModelDefinition<MusicSubCategory> = {
  id: 'fun-music-v1',
  model: 'fun-music-v1',
  supportedModels: [
    'fun-music-v1',
    'fun-music-preview',
  ],
  displayName: 'Fun-Music 音乐生成',
  category: 'music',
  subCategory: 'text-to-music',
  endpoint: '/services/audio/music/generation',
  async: false,
  pricing: {
    unit: 'per_second',
    quantityKey: 'duration',
    region: 'cn-beijing',
    tiers: [
      { condition: {}, price: 0.1 },
    ],
  },
  fields: BASE_FIELDS,
}
