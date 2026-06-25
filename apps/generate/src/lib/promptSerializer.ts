import type { MediaItem, RefSyntax } from '../types'

/** prompt 序列化后的一个 token：纯文本或对某素材的引用 */
export type PromptToken =
  | { kind: 'text'; text: string }
  | { kind: 'ref'; itemId: string }

/**
 * 给素材列表计算显示编号（label），填充到每个 item 的副本。
 * - cn-prefixed：图按出现顺序 图1/图2，视频按出现顺序 视频1/视频2（分别计数）
 * - bracket-en：仅图，[Image 1]/[Image 2]
 */
export function computeLabels(
  items: MediaItem[],
  refSyntax: RefSyntax,
): MediaItem[] {
  let imgIdx = 0
  let vidIdx = 0
  return items.map((it) => {
    let label: string

    // 只有参考类型的素材需要编号（用于 prompt 引用）
    // 其他类型（first_frame、driving_audio 等）不参与 prompt 引用编号
    if (it.type === 'reference_video') {
      vidIdx += 1
      label = refSyntax === 'cn-prefixed' ? `视频${vidIdx}` : `Video ${vidIdx}`
    } else if (
      it.type === 'reference_image' ||
      it.type === 'refer' ||
      it.type === 'first_frame' ||
      it.type === 'last_frame'
    ) {
      // reference_image / refer：在 prompt 中通过图N 引用
      // first_frame / last_frame：按 API 约定也按图编号（用于 r2v 首帧联合控制）
      imgIdx += 1
      label =
        refSyntax === 'cn-prefixed'
          ? `图${imgIdx}`
          : `[Image ${imgIdx}]`
    } else {
      // 音频（driving_audio, reference_voice）、视频编辑的 video/base/feature 等
      // 不参与 prompt 引用编号，保持空 label
      label = ''
    }
    return { ...it, label }
  })
}

/**
 * 把 token 序列 + 素材列表序列化成 prompt 字符串 + 有序 media[]。
 * - media[] 顺序 = 素材在 prompt 中首次出现的顺序（与 bailian 数组顺序一致）
 * - 编号按 media[] 顺序重新计算（保证 prompt 里的 N 与数组下标对齐）
 */
export function serializePrompt(
  tokens: PromptToken[],
  items: MediaItem[],
  refSyntax: RefSyntax,
): { prompt: string; media: MediaItem[] } {
  // 1. 收集被引用的素材，按首次出现顺序去重
  const referencedIds: string[] = []
  const seen = new Set<string>()
  for (const t of tokens) {
    if (t.kind === 'ref' && !seen.has(t.itemId)) {
      seen.add(t.itemId)
      referencedIds.push(t.itemId)
    }
  }
  const byId = new Map(items.map((i) => [i.id, i]))
  const orderedMedia = referencedIds
    .map((id) => byId.get(id))
    .filter((m): m is MediaItem => Boolean(m))

  // 2. 按首次出现顺序重新编号（保证 N 与数组下标对齐）
  const labeled = computeLabels(orderedMedia, refSyntax)
  const labelById = new Map(labeled.map((m) => [m.id, m.label]))

  // 3. 拼 prompt 字符串
  let prompt = ''
  for (const t of tokens) {
    if (t.kind === 'text') {
      prompt += t.text
    } else {
      prompt += labelById.get(t.itemId) ?? ''
    }
  }

  return { prompt, media: labeled }
}
