# Prompt @ Mention Editor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为 `apps/generate` 的 prompt 输入区增加 `@` 提及参考素材能力——用户在富文本里打 `@` 弹出已上传的参考图/视频缩略图，选中后插入可视化 chip；提交时 chip 按模型家族的引用语法（`图1`/`[Image 1]`）序列化进 prompt，对应素材组成 `media[]`。自制实现，零新依赖。

**Architecture:** 后端在 bailian `ModelDefinition` 加 `refSyntax` 字段（`'bracket-en'` | `'cn-prefixed'`），catalog 透传。前端：模型有 `refSyntax` 时，DynamicForm 把 prompt+media 两字段交给一个复合渲染区（`ReferenceAssets` 多素材上传 + `PromptEditor` contentEditable @ 编辑器）；提交时纯函数 `serializePrompt` 把 chip 序列化成 prompt 字符串 + media[]。后端逻辑零改动（media[] 本就符合 bailian）。

**Tech Stack:** React 19 + contentEditable + 自制 @ 触发（零 npm 依赖），`@uhyc/bailian` schema 扩展，bun test 单测序列化纯函数。

参考 spec：`docs/superpowers/specs/2026-06-25-prompt-mention-editor-design.md`

---

## 文件结构总览

**新增/修改 — bailian 包：**
- `packages/bailian/src/video/types.ts` — `ModelDefinition` 加 `refSyntax` 字段
- `packages/bailian/src/video/models/happyhorse-r2v.ts` — 补 `refSyntax: 'bracket-en'`
- `packages/bailian/src/video/models/happyhorse-video-edit.ts` — 补 `refSyntax: 'bracket-en'`
- `packages/bailian/src/video/models/wan2.7-r2v.ts` — 补 `refSyntax: 'cn-prefixed'`
- `packages/bailian/src/video/models/wan2.7-video-edit.ts` — 补 `refSyntax: 'cn-prefixed'`
- `packages/bailian/src/index.ts` — 导出 `RefSyntax` 类型

**新增/修改 — 前端：**
- `apps/generate/src/types.ts` — 加 `RefSyntax` / `MediaItem`
- `apps/generate/src/lib/promptSerializer.ts` — 【新】纯函数：chip 序列化 + 编号计算
- `apps/generate/src/lib/promptSerializer.test.ts` — 【新】序列化单测
- `apps/generate/src/components/ReferenceAssets.tsx` — 【新】多素材区
- `apps/generate/src/components/PromptEditor.tsx` — 【新】contentEditable @ 编辑器
- `apps/generate/src/components/DynamicForm.tsx` — 改：refSyntax 模型走复合渲染
- `apps/generate/src/App.css` — 加 chip/素材网格/@浮层样式

**新增/修改 — 后端测试：**
- `services/api/tests/generate/catalog.test.ts` — 加 refSyntax 透传断言

---

## Task 1: bailian schema 加 `refSyntax` 字段

**Files:**
- Modify: `packages/bailian/src/video/types.ts`
- Modify: `packages/bailian/src/index.ts`

- [ ] **Step 1: 在 `ModelDefinition` 加 `refSyntax` 字段**

打开 `packages/bailian/src/video/types.ts`，在 `ModelDefinition` 接口的 `pricing: ModelPricing` 字段**之后**（`}` 之前）追加：

```ts
  /** prompt 中参考素材的引用语法风格，决定 chip 序列化格式。
   *  存在时表示该模型支持多素材（r2v/video-edit），前端启用 @ 编辑器。
   *  - 'bracket-en'：chip → `[Image N]`（仅图片）
   *  - 'cn-prefixed'：chip → `图N` / `视频N`（图/视频分别计数）
   */
  refSyntax?: 'bracket-en' | 'cn-prefixed'
```

- [ ] **Step 2: 导出 RefSyntax 类型**

在 `packages/bailian/src/video/types.ts` 文件末尾（`ValidationResult` 接口之后）追加：

```ts
/** prompt 中参考素材的引用语法风格 */
export type RefSyntax = 'bracket-en' | 'cn-prefixed'
```

- [ ] **Step 3: 从 bailian 顶层导出 RefSyntax**

打开 `packages/bailian/src/index.ts`，在 `export type { ... } from './video/types'` 这块（约 16-24 行）的类型导出列表里，把 `RefSyntax` 加进去。找到这一段：

```ts
export type {
  FieldType,
  FieldGroup,
  FieldMeta,
  Category,
  ModelDefinition,
  ValidationError,
  ValidationResult,
} from './video/types'
```

改为（加 `RefSyntax`）：

```ts
export type {
  FieldType,
  FieldGroup,
  FieldMeta,
  Category,
  ModelDefinition,
  RefSyntax,
  ValidationError,
  ValidationResult,
} from './video/types'
```

- [ ] **Step 4: typecheck bailian 包**

Run:
```bash
cd packages/bailian && bunx tsc --noEmit
```
Expected: 无错误（exit 0）。

- [ ] **Step 5: Commit**

```bash
git add packages/bailian/src/video/types.ts packages/bailian/src/index.ts
git commit -m "feat(bailian): add refSyntax field to ModelDefinition"
```

---

## Task 2: 给 4 个模型补 refSyntax 值

**Files:**
- Modify: `packages/bailian/src/video/models/happyhorse-r2v.ts`
- Modify: `packages/bailian/src/video/models/happyhorse-video-edit.ts`
- Modify: `packages/bailian/src/video/models/wan2.7-r2v.ts`
- Modify: `packages/bailian/src/video/models/wan2.7-video-edit.ts`

- [ ] **Step 1: happyhorse-r2v 补 bracket-en**

打开 `packages/bailian/src/video/models/happyhorse-r2v.ts`，在 `pricing: { ... }` 对象的闭合 `},` **之后**、`fields: [` **之前**，加一行：

```ts
  refSyntax: 'bracket-en',
```

（即把 `async: true,` 后面的 `pricing: {...}` 块结束后插入这一行。）

- [ ] **Step 2: happyhorse-video-edit 补 bracket-en**

打开 `packages/bailian/src/video/models/happyhorse-video-edit.ts`，用同样的方式在 `pricing: { ... },` 之后、`fields: [` 之前加：

```ts
  refSyntax: 'bracket-en',
```

- [ ] **Step 3: wan2.7-r2v 补 cn-prefixed**

打开 `packages/bailian/src/video/models/wan2.7-r2v.ts`，在 `pricing: { ... },` 之后、`fields: [` 之前加：

```ts
  refSyntax: 'cn-prefixed',
```

- [ ] **Step 4: wan2.7-video-edit 补 cn-prefixed**

打开 `packages/bailian/src/video/models/wan2.7-video-edit.ts`，在 `pricing: { ... },` 之后、`fields: [` 之前加：

```ts
  refSyntax: 'cn-prefixed',
```

- [ ] **Step 5: typecheck 验证**

Run:
```bash
cd packages/bailian && bunx tsc --noEmit
```
Expected: exit 0。

- [ ] **Step 6: 后端测试确认无回归**

Run:
```bash
cd services/api && bun test 2>&1 | tail -5
```
Expected: 29 pass, 0 fail。

- [ ] **Step 7: Commit**

```bash
git add packages/bailian/src/video/models/
git commit -m "feat(bailian): set refSyntax on r2v and video-edit models"
```

---

## Task 3: 后端 catalog 测试加 refSyntax 断言

**Files:**
- Modify: `services/api/tests/generate/catalog.test.ts`

- [ ] **Step 1: 在 catalog 测试加 refSyntax 透传断言**

打开 `services/api/tests/generate/catalog.test.ts`，在文件末尾（最后一个 `it(...)` 之后、`describe` 闭合 `})` 之前）追加一个测试。同时给 `CatalogBody` 接口的 model 加 `refSyntax`。

先找到 `interface CatalogBody` 定义（约文件顶部），把 video 那行的模型类型补上 `refSyntax`：

```ts
interface CatalogBody {
  video: Record<
    string,
    { model: string; refSyntax?: string; fields: { key: string; required?: boolean }[] }[]
  >
  image: Record<string, unknown[]>
  music: Record<string, unknown[]>
}
```

然后在 `describe('GET /generate/catalog', () => { ... })` 末尾加测试：

```ts
  it('surfaces refSyntax for r2v and video-edit models', async () => {
    const res = await api.generate.catalog.get()
    const cat = res.data as CatalogBody
    const wanR2v = cat.video['reference-to-video'].find(
      (m) => m.model === 'wan2.7-r2v',
    )
    expect(wanR2v).toBeDefined()
    expect(wanR2v!.refSyntax).toBe('cn-prefixed')

    const hhR2v = cat.video['reference-to-video'].find(
      (m) => m.model === 'happyhorse-1.1-r2v',
    )
    expect(hhR2v).toBeDefined()
    expect(hhR2v!.refSyntax).toBe('bracket-en')
  })
```

- [ ] **Step 2: 跑 catalog 测试**

Run:
```bash
cd services/api && bun test tests/generate/catalog.test.ts 2>&1 | tail -8
```
Expected: 4 pass（原 3 + 新 1），0 fail。

- [ ] **Step 3: 全量回归**

Run:
```bash
cd services/api && bun test 2>&1 | tail -5
```
Expected: 30 pass, 0 fail。

- [ ] **Step 4: Commit**

```bash
git add services/api/tests/generate/catalog.test.ts
git commit -m "test(api): assert refSyntax surfaced in catalog"
```

---

## Task 4: 前端类型扩展

**Files:**
- Modify: `apps/generate/src/types.ts`

- [ ] **Step 1: 加 RefSyntax 和 MediaItem 类型**

打开 `apps/generate/src/types.ts`，在文件末尾追加：

```ts
/** prompt 中参考素材的引用语法风格（镜像 bailian） */
export type RefSyntax = 'bracket-en' | 'cn-prefixed'

/** 一个参考素材（参考素材区的产物，也是 media[] 的元素） */
export interface MediaItem {
  /** 前端临时 id */
  id: string
  /** bailian 类型 */
  type: 'reference_image' | 'reference_video' | 'first_frame'
  /** 上传后的 URL（现阶段本地 blob，OSS 后接） */
  url: string
  /** 显示编号，如 "图1" / "视频1" / "[Image 1]"（按 refSyntax 生成） */
  label: string
  /** 本地预览缩略图 URL（视频用占位） */
  thumbnail?: string
}
```

- [ ] **Step 2: 给 ModelDefinition 加 refSyntax 字段**

在同一文件找到 `export interface ModelDefinition {`，在 `endpoint: string` 之后、闭合 `}` 之前加：

```ts
  refSyntax?: RefSyntax
```

- [ ] **Step 3: typecheck**

Run:
```bash
cd apps/generate && bunx tsc -b
```
Expected: exit 0。

- [ ] **Step 4: Commit**

```bash
git add apps/generate/src/types.ts
git commit -m "feat(generate): add RefSyntax and MediaItem types"
```

---

## Task 5: 序列化纯函数 + 单测（TDD）

**Files:**
- Create: `apps/generate/src/lib/promptSerializer.ts`
- Create: `apps/generate/src/lib/promptSerializer.test.ts`

- [ ] **Step 1: 写失败测试**

创建 `apps/generate/src/lib/promptSerializer.test.ts`：

```ts
import { describe, expect, it } from 'bun:test'
import { computeLabels, serializePrompt, type PromptToken } from './promptSerializer'
import type { MediaItem, RefSyntax } from '../types'

function img(id: string): MediaItem {
  return { id, type: 'reference_image', url: 'u', label: '' }
}
function vid(id: string): MediaItem {
  return { id, type: 'reference_video', url: 'u', label: '' }
}

describe('computeLabels', () => {
  it('cn-prefixed: images and videos counted separately', () => {
    const items = [img('a'), vid('b'), img('c')]
    const labeled = computeLabels(items, 'cn-prefixed')
    expect(labeled[0].label).toBe('图1')
    expect(labeled[1].label).toBe('视频1')
    expect(labeled[2].label).toBe('图2')
  })

  it('bracket-en: images only, [Image N] format', () => {
    const items = [img('a'), img('b')]
    const labeled = computeLabels(items, 'bracket-en')
    expect(labeled[0].label).toBe('[Image 1]')
    expect(labeled[1].label).toBe('[Image 2]')
  })
})

describe('serializePrompt', () => {
  it('cn-prefixed: text + image/video chips → prompt string + ordered media[]', () => {
    const tokens: PromptToken[] = [
      { kind: 'text', text: '让' },
      { kind: 'ref', itemId: 'a' },
      { kind: 'text', text: '在' },
      { kind: 'ref', itemId: 'b' },
      { kind: 'text', text: '里玩耍' },
    ]
    const items = [img('a'), vid('b')]
    const { prompt, media } = serializePrompt(tokens, items, 'cn-prefixed')
    expect(prompt).toBe('让图1在视频1里玩耍')
    expect(media.map((m) => m.type)).toEqual(['reference_image', 'reference_video'])
  })

  it('bracket-en: chips → [Image N]', () => {
    const tokens: PromptToken[] = [
      { kind: 'ref', itemId: 'a' },
      { kind: 'text', text: '和' },
      { kind: 'ref', itemId: 'b' },
    ]
    const items = [img('a'), img('b')]
    const { prompt, media } = serializePrompt(tokens, items, 'bracket-en')
    expect(prompt).toBe('[Image 1]和[Image 2]')
    expect(media).toHaveLength(2)
  })

  it('media[] follows first-appearance order in prompt', () => {
    const tokens: PromptToken[] = [
      { kind: 'ref', itemId: 'b' },
      { kind: 'text', text: '前' },
      { kind: 'ref', itemId: 'a' },
    ]
    const items = [img('a'), img('b')]
    const { media } = serializePrompt(tokens, items, 'bracket-en')
    // b appears first in prompt → first in media[]
    expect(media[0].id).toBe('b')
    expect(media[1].id).toBe('a')
    // but label numbering follows media[] order: b=[Image 1], a=[Image 2]
  })

  it('repeated reference keeps same label', () => {
    const tokens: PromptToken[] = [
      { kind: 'ref', itemId: 'a' },
      { kind: 'ref', itemId: 'a' },
    ]
    const items = [img('a')]
    const { prompt, media } = serializePrompt(tokens, items, 'cn-prefixed')
    expect(prompt).toBe('图1图1')
    expect(media).toHaveLength(1)
  })
})
```

- [ ] **Step 2: 跑测试确认失败**

Run:
```bash
cd apps/generate && bun test src/lib/promptSerializer.test.ts 2>&1 | tail -6
```
Expected: FAIL（模块不存在）。

- [ ] **Step 3: 实现纯函数**

创建 `apps/generate/src/lib/promptSerializer.ts`：

```ts
import type { MediaItem, RefSyntax } from '../types'

/** prompt 序列化后的一个 token：纯文本或对某素材的引用 */
export type PromptToken =
  | { kind: 'text'; text: string }
  | { kind: 'ref'; itemId: string }

/**
 * 给素材列表计算显示编号（label），原地填充到每个 item。
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
    if (it.type === 'reference_video') {
      vidIdx += 1
      label = refSyntax === 'cn-prefixed' ? `视频${vidIdx}` : it.label
    } else {
      imgIdx += 1
      label =
        refSyntax === 'cn-prefixed'
          ? `图${imgIdx}`
          : `[Image ${imgIdx}]`
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
```

- [ ] **Step 4: 跑测试确认通过**

Run:
```bash
cd apps/generate && bun test src/lib/promptSerializer.test.ts 2>&1 | tail -6
```
Expected: 6 pass, 0 fail。

- [ ] **Step 5: typecheck**

Run:
```bash
cd apps/generate && bunx tsc -b
```
Expected: exit 0。

- [ ] **Step 6: Commit**

```bash
git add apps/generate/src/lib/
git commit -m "feat(generate): add prompt serializer with ref-aware numbering"
```

---

## Task 6: ReferenceAssets 组件（多素材区）

**Files:**
- Create: `apps/generate/src/components/ReferenceAssets.tsx`

- [ ] **Step 1: 写组件**

创建 `apps/generate/src/components/ReferenceAssets.tsx`：

```tsx
import { useRef } from 'react'
import type { MediaItem, RefSyntax } from '../types'
import { computeLabels } from '../lib/promptSerializer'

interface ReferenceAssetsProps {
  /** 当前素材列表（即 params.media） */
  items: MediaItem[]
  refSyntax: RefSyntax
  /** 允许上传视频（仅 cn-prefixed） */
  allowVideo: boolean
  onChange: (items: MediaItem[]) => void
}

let idSeq = 0
function nextId(): string {
  idSeq += 1
  return `media-${Date.now()}-${idSeq}`
}

export function ReferenceAssets({
  items,
  refSyntax,
  allowVideo,
  onChange,
}: ReferenceAssetsProps) {
  const fileImg = useRef<HTMLInputElement>(null)
  const fileVid = useRef<HTMLInputElement>(null)

  const labeled = computeLabels(items, refSyntax)

  function addFiles(files: FileList | null, type: MediaItem['type']) {
    if (!files) return
    const added: MediaItem[] = []
    for (const f of Array.from(files)) {
      added.push({
        id: nextId(),
        type,
        url: URL.createObjectURL(f),
        label: '',
        thumbnail: type === 'reference_video' ? undefined : URL.createObjectURL(f),
      })
    }
    onChange([...items, ...added])
  }

  function remove(id: string) {
    onChange(items.filter((i) => i.id !== id))
  }

  return (
    <div className="gen-refassets">
      <div className="gen-refassets__actions">
        <button
          type="button"
          className="gen-refassets__add"
          onClick={() => fileImg.current?.click()}
        >
          + 添加图片
        </button>
        {allowVideo && (
          <button
            type="button"
            className="gen-refassets__add"
            onClick={() => fileVid.current?.click()}
          >
            + 添加视频
          </button>
        )}
        <input
          ref={fileImg}
          type="file"
          accept="image/*"
          multiple
          className="gen-upload__input"
          onChange={(e) => addFiles(e.target.files, 'reference_image')}
        />
        <input
          ref={fileVid}
          type="file"
          accept="video/*"
          multiple
          className="gen-upload__input"
          onChange={(e) => addFiles(e.target.files, 'reference_video')}
        />
      </div>

      {labeled.length === 0 ? (
        <p className="gen-refassets__empty">还没有参考素材</p>
      ) : (
        <div className="gen-refassets__grid">
          {labeled.map((it) => (
            <div className="gen-refassets__item" key={it.id}>
              <span className="gen-refassets__label">{it.label}</span>
              {it.thumbnail ? (
                <img src={it.thumbnail} alt={it.label} className="gen-refassets__thumb" />
              ) : (
                <div className="gen-refassets__thumb gen-refassets__thumb--video">
                  视频
                </div>
              )}
              <button
                type="button"
                className="gen-refassets__remove"
                onClick={() => remove(it.id)}
                aria-label={`移除 ${it.label}`}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: typecheck**

Run:
```bash
cd apps/generate && bunx tsc -b
```
Expected: exit 0。

- [ ] **Step 3: Commit**

```bash
git add apps/generate/src/components/ReferenceAssets.tsx
git commit -m "feat(generate): add ReferenceAssets multi-upload component"
```

---

## Task 7: PromptEditor 组件（contentEditable @ 编辑器）

**Files:**
- Create: `apps/generate/src/components/PromptEditor.tsx`

- [ ] **Step 1: 写组件**

创建 `apps/generate/src/components/PromptEditor.tsx`：

```tsx
import { useEffect, useRef, useState } from 'react'
import type { MediaItem, RefSyntax } from '../types'
import { computeLabels, type PromptToken } from '../lib/promptSerializer'

interface PromptEditorProps {
  /** 已上传的参考素材（候选源） */
  items: MediaItem[]
  refSyntax: RefSyntax
  /** 当前 token 序列（受控） */
  tokens: PromptToken[]
  onChange: (tokens: PromptToken[]) => void
  placeholder?: string
  maxLength?: number
}

export function PromptEditor({
  items,
  refSyntax,
  tokens,
  onChange,
  placeholder,
  maxLength,
}: PromptEditorProps) {
  const rootRef = useRef<HTMLDivElement>(null)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [pickerPos, setPickerPos] = useState<{ top: number; left: number } | null>(null)

  const labeled = computeLabels(items, refSyntax)

  // 受控 → DOM：tokens 变化时重建内容（chip 用 data-item-id 标记）
  useEffect(() => {
    const root = rootRef.current
    if (!root) return
    // 避免重置光标：仅当结构不同时重建。简单实现：每次重建。
    root.innerHTML = ''
    for (const t of tokens) {
      if (t.kind === 'text') {
        root.appendChild(document.createTextNode(t.text))
      } else {
        const item = labeled.find((i) => i.id === t.itemId)
        const chip = document.createElement('span')
        chip.className =
          'gen-chip' +
          (item?.type === 'reference_video' ? ' gen-chip--video' : '')
        chip.setAttribute('contenteditable', 'false')
        chip.dataset.itemId = t.itemId
        chip.textContent = item?.label ?? '?'
        root.appendChild(chip)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tokens, items])

  // 从 DOM 读回 tokens
  function readTokens(): PromptToken[] {
    const root = rootRef.current
    if (!root) return []
    const out: PromptToken[] = []
    for (const node of Array.from(root.childNodes)) {
      if (node.nodeType === Node.TEXT_NODE) {
        const text = node.textContent ?? ''
        if (text) out.push({ kind: 'text', text })
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        const el = node as HTMLElement
        const itemId = el.dataset.itemId
        if (itemId) out.push({ kind: 'ref', itemId })
      }
    }
    return out
  }

  function handleInput() {
    onChange(readTokens())
    detectAtTrigger()
  }

  function detectAtTrigger() {
    const sel = window.getSelection()
    if (!sel || sel.rangeCount === 0) return
    const range = sel.getRangeAt(0)
    const node = range.startContainer
    if (node.nodeType !== Node.TEXT_NODE) {
      setPickerOpen(false)
      return
    }
    const text = node.textContent ?? ''
    const before = text.slice(0, range.startOffset)
    const atIdx = before.lastIndexOf('@')
    if (atIdx !== -1 && before.slice(atIdx + 1).length === 0) {
      // 光标紧接 @
      const rect = range.getBoundingClientRect()
      const rootRect = rootRef.current!.getBoundingClientRect()
      setPickerPos({ top: rect.bottom - rootRect.top + 4, left: rect.left - rootRect.left })
      setPickerOpen(true)
    } else {
      setPickerOpen(false)
    }
  }

  function insertChip(item: MediaItem) {
    const sel = window.getSelection()
    if (!sel || sel.rangeCount === 0) return
    const range = sel.getRangeAt(0)
    // 删除触发用的 @
    const node = range.startContainer
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent ?? ''
      const offset = range.startOffset
      if (text[offset - 1] === '@') {
        ;(node as Text).deleteData(offset - 1, 1)
      }
    }
    // 插入 chip 节点 + 一个空格文本节点（便于继续输入）
    const chip = document.createElement('span')
    chip.className =
      'gen-chip' +
      (item.type === 'reference_video' ? ' gen-chip--video' : '')
    chip.setAttribute('contenteditable', 'false')
    chip.dataset.itemId = item.id
    chip.textContent = item.label
    range.insertNode(chip)
    const space = document.createTextNode('\u00A0')
    chip.after(space)
    // 光标移到空格后
    range.setStartAfter(space)
    range.collapse(true)
    sel.removeAllRanges()
    sel.addRange(range)
    setPickerOpen(false)
    onChange(readTokens())
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (pickerOpen && (e.key === 'Escape')) {
      e.preventDefault()
      setPickerOpen(false)
    }
  }

  return (
    <div className="gen-prompteditor">
      <div
        ref={rootRef}
        className="gen-prompteditor__input"
        contentEditable
        suppressContentEditableWarning
        role="textbox"
        onInput={handleInput}
        onKeyDown={handleKeyDown}
        onBlur={() => setPickerOpen(false)}
        data-placeholder={placeholder ?? ''}
      />
      {pickerOpen && (
        <div
          className="gen-promptpicker"
          style={pickerPos ? { top: pickerPos.top, left: pickerPos.left } : undefined}
        >
          {labeled.length === 0 ? (
            <p className="gen-promptpicker__empty">请先上传参考素材</p>
          ) : (
            labeled.map((it) => (
              <button
                key={it.id}
                type="button"
                className="gen-promptpicker__item"
                onMouseDown={(e) => {
                  e.preventDefault() // 不让失焦
                  insertChip(it)
                }}
              >
                {it.thumbnail ? (
                  <img src={it.thumbnail} alt="" className="gen-promptpicker__thumb" />
                ) : (
                  <span className="gen-promptpicker__thumb gen-promptpicker__thumb--video">视频</span>
                )}
                <span>{it.label}</span>
              </button>
            ))
          )}
        </div>
      )}
      {maxLength && (
        <p className="gen-prompteditor__hint">
          提示词中用 {refSyntax === 'cn-prefixed' ? '图1 / 视频1' : '[Image 1]'} 指代参考素材
        </p>
      )}
    </div>
  )
}
```

- [ ] **Step 2: typecheck**

Run:
```bash
cd apps/generate && bunx tsc -b
```
Expected: exit 0。

- [ ] **Step 3: Commit**

```bash
git add apps/generate/src/components/PromptEditor.tsx
git commit -m "feat(generate): add PromptEditor with @ mention picker"
```

---

## Task 8: DynamicForm 接入复合渲染（refSyntax 模型）

**Files:**
- Modify: `apps/generate/src/components/DynamicForm.tsx`
- Modify: `apps/generate/src/components/GeneratorPanel.tsx`

- [ ] **Step 1: DynamicForm 对 refSyntax 模型走复合渲染**

打开 `apps/generate/src/components/DynamicForm.tsx`，整体替换为：

```tsx
import type { FieldMeta, ModelDefinition } from '../types'
import { FieldRenderer } from './FieldRenderer'
import { ReferenceAssets } from './ReferenceAssets'
import { PromptEditor } from './PromptEditor'
import type { MediaItem, PromptToken } from '../types'

interface DynamicFormProps {
  model: ModelDefinition | null
  params: Record<string, unknown>
  errors: Record<string, string>
  onChange: (key: string, value: unknown) => void
}

const ROW_PAIRS: [string, string][] = [
  ['resolution', 'ratio'],
  ['watermark', 'seed'],
]

function isPair(a: FieldMeta, b: FieldMeta): boolean {
  return ROW_PAIRS.some(([x, y]) =>
    (a.key === x && b.key === y) || (a.key === y && b.key === x),
  )
}

function groupIntoRows(fields: FieldMeta[]): FieldMeta[][] {
  const rows: FieldMeta[][] = []
  let i = 0
  while (i < fields.length) {
    const cur = fields[i]
    const next = fields[i + 1]
    if (next && isPair(cur, next)) {
      rows.push([cur, next])
      i += 2
    } else {
      rows.push([cur])
      i += 1
    }
  }
  return rows
}

export function DynamicForm({ model, params, errors, onChange }: DynamicFormProps) {
  if (!model) return null

  const refSyntax = model.refSyntax
  const promptField = model.fields.find((f) => f.key === 'prompt' && f.group === 'input')
  const mediaField = model.fields.find((f) => f.type === 'media' && f.group === 'input')
  const isRefModel = Boolean(refSyntax && promptField && mediaField)

  // refSyntax 模型：prompt + media 合并为复合区，不单独渲染这两个字段
  const inputs = model.fields.filter(
    (f) =>
      f.group === 'input' &&
      !(isRefModel && (f.key === 'prompt' || f.type === 'media')),
  )
  const parameters = model.fields.filter((f) => f.group === 'parameters')
  const paramRows = groupIntoRows(parameters)

  const renderField = (f: FieldMeta) => (
    <FieldRenderer
      key={f.key}
      field={f}
      value={params[f.key]}
      error={errors[f.key]}
      onChange={(v) => onChange(f.key, v)}
    />
  )

  const renderRow = (row: FieldMeta[], idx: number) => {
    if (row.length === 1) return <div key={idx}>{renderField(row[0])}</div>
    return (
      <div className="gen-form__row" key={idx}>
        {row.map(renderField)}
      </div>
    )
  }

  return (
    <div className="gen-form">
      <div className="gen-form__group">
        {inputs.map(renderField)}

        {isRefModel && promptField && mediaField && (
          <ReferenceComposite
            promptField={promptField}
            mediaField={mediaField}
            refSyntax={refSyntax!}
            params={params}
            onChange={onChange}
          />
        )}
      </div>

      {parameters.length > 0 && (
        <div className="gen-form__group">
          <p className="gen-form__group-title">参数</p>
          {paramRows.map(renderRow)}
        </div>
      )}
    </div>
  )
}

/** refSyntax 模型的 prompt + media 复合区 */
function ReferenceComposite({
  promptField,
  mediaField,
  refSyntax,
  params,
  onChange,
}: {
  promptField: FieldMeta
  mediaField: FieldMeta
  refSyntax: NonNullable<ModelDefinition['refSyntax']>
  params: Record<string, unknown>
  onChange: (key: string, value: unknown) => void
}) {
  const items = (params[mediaField.key] as MediaItem[] | undefined) ?? []
  const tokens = (params[promptField.key] as PromptToken[] | undefined) ?? []

  return (
    <>
      <label className="uhyc-field">
        <span className="uhyc-field__label">{mediaField.label}</span>
        <ReferenceAssets
          items={items}
          refSyntax={refSyntax}
          allowVideo={refSyntax === 'cn-prefixed'}
          onChange={(next) => onChange(mediaField.key, next)}
        />
        {mediaField.description && (
          <p className="gen-field__desc">{mediaField.description}</p>
        )}
      </label>

      <label className="uhyc-field">
        <span className="uhyc-field__label">
          {promptField.label}
          {promptField.required ? ' *' : ''}
        </span>
        <PromptEditor
          items={items}
          refSyntax={refSyntax}
          tokens={tokens}
          placeholder={promptField.label}
          maxLength={promptField.maxLength}
          onChange={(next) => onChange(promptField.key, next)}
        />
        {promptField.description && (
          <p className="gen-field__desc">{promptField.description}</p>
        )}
      </label>
    </>
  )
}
```

> 注意：`params.prompt` 现在存的是 **`PromptToken[]`**（chip 结构），不是字符串。真正的序列化成字符串发生在**提交时**（Task 9 的 GeneratorPanel.handleSubmit）。这是关键设计点：编辑期存结构化 tokens，提交时用 `serializePrompt` 转字符串。

- [ ] **Step 2: 加 PromptToken 类型导出到 types.ts**

`PromptToken` 来自 `lib/promptSerializer.ts`，但 DynamicForm 从 `../types` 引用了它。需在 `apps/generate/src/types.ts` 末尾加一个 re-export：

```ts
export type { PromptToken } from './lib/promptSerializer'
```

（DynamicForm 的 import 写的是 `from '../types'`，所以要 re-export。）

- [ ] **Step 3: typecheck**

Run:
```bash
cd apps/generate && bunx tsc -b
```
Expected: exit 0（若报 `PromptToken` 未导出，确认 Step 2 的 re-export 已加）。

- [ ] **Step 4: Commit**

```bash
git add apps/generate/src/components/DynamicForm.tsx apps/generate/src/types.ts
git commit -m "feat(generate): wire ReferenceAssets + PromptEditor into DynamicForm"
```

---

## Task 9: GeneratorPanel 提交时序列化 tokens

**Files:**
- Modify: `apps/generate/src/components/GeneratorPanel.tsx`

- [ ] **Step 1: handleSubmit 序列化 ref 模型的 prompt + media**

打开 `apps/generate/src/components/GeneratorPanel.tsx`，在文件顶部 import 区追加：

```tsx
import { serializePrompt } from '../lib/promptSerializer'
import type { MediaItem } from '../types'
```

然后把 `handleSubmit` 函数整体替换为：

```tsx
  async function handleSubmit() {
    if (!model) return
    setErrors({})

    // refSyntax 模型：params.prompt 是 PromptToken[]，需序列化成字符串 + media[]
    let submitParams = { ...params }
    const promptField = model.fields.find((f) => f.key === 'prompt')
    const mediaField = model.fields.find((f) => f.type === 'media')
    if (model.refSyntax && promptField && mediaField) {
      const tokens = (params[promptField.key] as unknown) ?? []
      const items = (params[mediaField.key] as MediaItem[]) ?? []
      const { prompt, media } = serializePrompt(
        tokens as Parameters<typeof serializePrompt>[0],
        items,
        model.refSyntax,
      )
      // 前端预校验：至少引用一个素材
      if (media.length === 0) {
        setErrors({ [promptField.key]: '请在提示词中至少引用一个参考素材（打 @）' })
        return
      }
      // media[] 仅保留 bailian 需要的 {type, url}，丢弃前端用的 id/label/thumbnail
      const bailianMedia = media.map((m) => ({ type: m.type, url: m.url }))
      submitParams = {
        ...submitParams,
        [promptField.key]: prompt,
        [mediaField.key]: bailianMedia,
      }
    }

    try {
      await onSubmit({
        category,
        subCategory,
        model: model.model,
        params: submitParams,
      })
    } catch {
      // submitError 由父组件管理
    }
  }
```

> 关键：编辑期 `params.prompt` 存的是 `PromptToken[]`，提交时才转字符串 + media[]。`serializePrompt` 把 chip 序列化成 `图1`/`[Image 1]`，并产出有序 `media[]`（按 prompt 首次出现顺序）。

- [ ] **Step 2: typecheck**

Run:
```bash
cd apps/generate && bunx tsc -b
```
Expected: exit 0。

- [ ] **Step 3: Commit**

```bash
git add apps/generate/src/components/GeneratorPanel.tsx
git commit -m "feat(generate): serialize prompt tokens to string + media[] on submit"
```

---

## Task 10: CSS 样式（chip / 素材网格 / @ 浮层 / contentEditable）

**Files:**
- Modify: `apps/generate/src/App.css`

- [ ] **Step 1: 追加样式**

打开 `apps/generate/src/App.css`，在文件**末尾**追加：

```css
/* ---- ReferenceAssets (多素材区) ---- */
.gen-refassets__actions {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
}
.gen-refassets__add {
  border: 2px solid var(--ink);
  border-radius: 8px;
  background: var(--paper);
  color: var(--ink);
  padding: 8px 14px;
  font-family: var(--font);
  font-weight: 700;
  font-size: 13px;
  cursor: pointer;
  box-shadow: var(--shadow-sm);
}
.gen-refassets__add:hover {
  background: var(--purple-soft);
}
.gen-refassets__empty {
  color: var(--muted);
  font-size: 14px;
  margin: 0;
}
.gen-refassets__grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(88px, 1fr));
  gap: 10px;
}
.gen-refassets__item {
  position: relative;
  border: 2px solid var(--ink);
  border-radius: 8px;
  overflow: hidden;
  background: var(--paper);
  box-shadow: var(--shadow-sm);
}
.gen-refassets__label {
  position: absolute;
  top: 4px;
  left: 4px;
  z-index: 1;
  background: var(--ink);
  color: var(--paper);
  font-size: 11px;
  font-weight: 800;
  padding: 1px 6px;
  border-radius: 4px;
}
.gen-refassets__thumb {
  display: block;
  width: 100%;
  aspect-ratio: 1;
  object-fit: cover;
}
.gen-refassets__thumb--video {
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--cyan);
  font-weight: 800;
  font-size: 13px;
}
.gen-refassets__remove {
  position: absolute;
  top: 4px;
  right: 4px;
  z-index: 1;
  border: 2px solid var(--ink);
  border-radius: 50%;
  background: var(--red-soft);
  color: var(--danger);
  width: 20px;
  height: 20px;
  line-height: 1;
  font-weight: 800;
  cursor: pointer;
  padding: 0;
}

/* ---- PromptEditor (contentEditable) ---- */
.gen-prompteditor {
  position: relative;
}
.gen-prompteditor__input {
  min-height: 100px;
  border: var(--border);
  border-radius: 8px;
  background: var(--paper);
  padding: 12px 14px;
  font-family: var(--font);
  font-size: 15px;
  line-height: 1.7;
  outline: none;
  resize: vertical;
}
.gen-prompteditor__input:empty::before {
  content: attr(data-placeholder);
  color: #9aa3af;
}
.gen-prompteditor__input:focus {
  box-shadow: var(--shadow-sm);
  transform: translate(-1px, -1px);
}
.gen-prompteditor__hint {
  font-size: 12px;
  color: var(--muted);
  margin: 4px 0 0;
}

/* chip（内联引用） */
.gen-chip {
  display: inline-flex;
  align-items: center;
  background: var(--purple);
  color: var(--ink);
  border: 2px solid var(--ink);
  border-radius: 6px;
  padding: 0 6px;
  margin: 0 2px;
  font-weight: 800;
  font-size: 13px;
  user-select: none;
  vertical-align: baseline;
}
.gen-chip--video {
  background: var(--cyan);
}

/* @ 浮层 */
.gen-promptpicker {
  position: absolute;
  z-index: 30;
  min-width: 180px;
  max-width: 260px;
  background: var(--paper);
  border: var(--border);
  border-radius: 8px;
  box-shadow: var(--shadow);
  padding: 4px;
  max-height: 240px;
  overflow-y: auto;
}
.gen-promptpicker__empty {
  margin: 0;
  padding: 10px;
  color: var(--muted);
  font-size: 13px;
}
.gen-promptpicker__item {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  border: none;
  background: transparent;
  padding: 6px 8px;
  border-radius: 6px;
  font-family: var(--font);
  font-size: 14px;
  font-weight: 600;
  color: var(--ink);
  cursor: pointer;
  text-align: left;
}
.gen-promptpicker__item:hover {
  background: var(--purple-soft);
}
.gen-promptpicker__thumb {
  width: 28px;
  height: 28px;
  border-radius: 4px;
  object-fit: cover;
  border: 2px solid var(--ink);
}
.gen-promptpicker__thumb--video {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: var(--cyan);
  font-size: 10px;
  font-weight: 800;
}
```

- [ ] **Step 2: vite 编译验证**

Run:
```bash
cd apps/generate && bunx tsc -b && echo "typecheck ok"
```
Expected: exit 0。

- [ ] **Step 3: Commit**

```bash
git add apps/generate/src/App.css
git commit -m "feat(generate): styles for chips, reference grid, and @ picker"
```

---

## Task 11: 端到端验证

**Files:** 无（运行验证）

- [ ] **Step 1: 后端全量测试**

Run:
```bash
cd services/api && bun test 2>&1 | tail -5
```
Expected: 30 pass, 0 fail。

- [ ] **Step 2: 前端 typecheck + vite 编译**

Run:
```bash
cd apps/generate && bunx tsc -b && echo "tsc ok"
```
Expected: exit 0。

- [ ] **Step 3: 起服务，浏览器验证 r2v @ 流程**

Run（三个终端）:
```bash
docker compose up -d
cd services/api && bun run src/index.ts
cd apps/generate && bun run dev
```

浏览器开 `http://localhost:5174`（未登录会跳 auth 登录后回来），然后：
1. 左栏选「视频生成 → 参考生视频 → 万相 2.7 参考生视频」
2. 参考素材区点「+ 添加图片」传 2 张图、点「+ 添加视频」传 1 段视频 → 网格显示 `图1`、`图2`、`视频1`
3. 在提示词输入区打 `@` → 弹出缩略图列表 → 选「图1」→ 插入紫色 chip `图1`
4. 继续输入文字，再 `@` 选「视频1」→ 插入青色 chip `视频1`
5. 点「生成」→ 检查请求体：`prompt` 含 `图1`/`视频1` 文本，`media[]` 含对应素材

- [ ] **Step 4: 验证欢乐马 bracket-en（仅图）**

切模型到「HappyHorse 参考生视频」：
1. 参考素材区**无**「+ 添加视频」按钮（bracket-en 隐藏）
2. 上传图，提示词 `@` 选图 → chip 显示 `[Image 1]`
3. 生成 → 请求体 `prompt` 含 `[Image 1]`

- [ ] **Step 5: 验证纯文生视频不受影响**

切「文生视频」模型：提示词仍是普通 textarea（无 @ 编辑器、无参考素材区）。

- [ ] **Step 6: 最终提交（若有调整）**

```bash
git add -A
git commit -m "chore: prompt @ editor e2e verification" || echo "nothing to commit"
```

---

## 完成标准

- bailian 4 个 r2v/video-edit 模型有 `refSyntax`，catalog 透传（测试断言）
- 前端 r2v/video-edit 模型：参考素材区（多图/视频 + 自动编号）+ contentEditable @ 编辑器
- chip 按模型家族序列化：万相 `图1/视频1`，欢乐马 `[Image 1]`
- 提交时 prompt 字符串 + 有序 media[] 正确产出
- 纯文生视频/文生图不受影响（仍用 textarea）
- 后端 30 测试全绿，前端 typecheck + vite 通过
