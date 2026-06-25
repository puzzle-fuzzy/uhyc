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
  const pickerRef = useRef<HTMLDivElement>(null)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [pickerPos, setPickerPos] = useState<{ top: number; left: number } | null>(null)
  const [filterQuery, setFilterQuery] = useState('')
  const [activeIdx, setActiveIdx] = useState(0)

  const labeled = computeLabels(items, refSyntax)
  const filtered = filterQuery
    ? labeled.filter((it) => it.label.includes(filterQuery))
    : labeled

  // 受控 → DOM：tokens 变化时重建内容（chip 用 data-item-id 标记）
  useEffect(() => {
    const root = rootRef.current
    if (!root) return
    root.innerHTML = ''
    for (const t of tokens) {
      if (t.kind === 'text') {
        root.appendChild(document.createTextNode(t.text))
      } else {
        const item = labeled.find((i) => i.id === t.itemId)
        const chip = document.createElement('span')
        chip.className =
          'gen-chip' + (item?.type === 'reference_video' ? ' gen-chip--video' : '')
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

  /** 解析光标前的文本，检测 @ + 过滤词 */
  function detectAtTrigger() {
    const sel = window.getSelection()
    if (!sel || sel.rangeCount === 0) {
      closePicker()
      return
    }
    const range = sel.getRangeAt(0)
    const node = range.startContainer
    // 只处理文本节点（光标在 chip 上时忽略）
    if (node.nodeType !== Node.TEXT_NODE) {
      closePicker()
      return
    }
    const text = node.textContent ?? ''
    const offset = range.startOffset
    const before = text.slice(0, offset)

    // 找光标前最后一个 @
    const atIdx = before.lastIndexOf('@')
    if (atIdx === -1) {
      closePicker()
      return
    }

    // @ 必须在词首（前一个是空格或位于开头）
    const charBefore = atIdx > 0 ? before[atIdx - 1] : ' '
    if (charBefore !== ' ' && charBefore !== ' ') {
      closePicker()
      return
    }

    // 提取过滤词
    const query = before.slice(atIdx + 1)

    // 定位浮层：光标底部
    const rect = range.getBoundingClientRect()
    const rootRect = rootRef.current!.getBoundingClientRect()
    setPickerPos({
      top: rect.bottom - rootRect.top + 4,
      left: rect.left - rootRect.left,
    })
    setFilterQuery(query)
    setActiveIdx(0)

    if (!pickerOpen) setPickerOpen(true)
  }

  function closePicker() {
    setPickerOpen(false)
    setFilterQuery('')
    setActiveIdx(0)
  }

  /** 选中一个素材 → 替换 @query + 插入 chip */
  function insertChip(item: MediaItem) {
    const sel = window.getSelection()
    if (!sel || sel.rangeCount === 0) return

    const range = sel.getRangeAt(0)
    const node = range.startContainer

    // 删除 @ 及之后的过滤词
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent ?? ''
      const offset = range.startOffset
      const before = text.slice(0, offset)
      const atIdx = before.lastIndexOf('@')
      if (atIdx !== -1) {
        const deleteLen = offset - atIdx
        ;(node as Text).deleteData(atIdx, deleteLen)
        range.setStart(node, atIdx)
        range.collapse(true)
        sel.removeAllRanges()
        sel.addRange(range)
      }
    }

    // 插入 chip
    const chip = document.createElement('span')
    chip.className =
      'gen-chip' + (item.type === 'reference_video' ? ' gen-chip--video' : '')
    chip.setAttribute('contenteditable', 'false')
    chip.dataset.itemId = item.id
    chip.textContent = item.label
    range.insertNode(chip)

    // chip 后跟一个空格（方便继续输入）
    const space = document.createTextNode(' ')
    chip.after(space)

    // 光标移到空格后
    range.setStartAfter(space)
    range.collapse(true)
    sel.removeAllRanges()
    sel.addRange(range)

    closePicker()
    onChange(readTokens())
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!pickerOpen) return

    if (e.key === 'Escape') {
      e.preventDefault()
      closePicker()
      return
    }

    if (filtered.length === 0) return

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIdx((i) => (i + 1) % filtered.length)
      return
    }

    if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIdx((i) => (i - 1 + filtered.length) % filtered.length)
      return
    }

    if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault()
      const idx = Math.min(activeIdx, filtered.length - 1)
      insertChip(filtered[idx])
      return
    }
  }

  // 浮层打开时跟踪光标位置
  useEffect(() => {
    if (!pickerOpen) return

    function onSelectionChange() {
      const sel = window.getSelection()
      if (!sel || sel.rangeCount === 0 || !rootRef.current) return
      const range = sel.getRangeAt(0)
      const rect = range.getBoundingClientRect()
      const rootRect = rootRef.current.getBoundingClientRect()
      setPickerPos({
        top: rect.bottom - rootRect.top + 4,
        left: rect.left - rootRect.left,
      })
    }

    document.addEventListener('selectionchange', onSelectionChange)
    return () => document.removeEventListener('selectionchange', onSelectionChange)
  }, [pickerOpen])

  // 高亮项滚入视图
  useEffect(() => {
    if (!pickerOpen || !pickerRef.current) return
    const active = pickerRef.current.querySelector<HTMLElement>(
      '.gen-promptpicker__item--active',
    )
    active?.scrollIntoView({ block: 'nearest' })
  }, [activeIdx, pickerOpen])

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
        onBlur={closePicker}
        data-placeholder={placeholder ?? ''}
      />
      {pickerOpen && (
        <div
          ref={pickerRef}
          className="gen-promptpicker"
          style={pickerPos ? { top: pickerPos.top, left: pickerPos.left } : undefined}
        >
          {filtered.length === 0 ? (
            <p className="gen-promptpicker__empty">
              {filterQuery
                ? `没有匹配 "${filterQuery}" 的素材`
                : '请先上传参考素材'}
            </p>
          ) : (
            filtered.map((it, idx) => (
              <button
                key={it.id}
                type="button"
                className={`gen-promptpicker__item${idx === activeIdx ? ' gen-promptpicker__item--active' : ''}`}
                onMouseDown={(e) => {
                  e.preventDefault() // 不让 editor 失焦
                  insertChip(it)
                }}
                onMouseEnter={() => setActiveIdx(idx)}
              >
                {it.thumbnail ? (
                  <img
                    src={it.thumbnail}
                    alt=""
                    className="gen-promptpicker__thumb"
                  />
                ) : (
                  <span className="gen-promptpicker__thumb gen-promptpicker__thumb--video">
                    视频
                  </span>
                )}
                <span>{it.label}</span>
              </button>
            ))
          )}
        </div>
      )}
      <div className="gen-prompteditor__hints">
        {maxLength && (
          <span className="gen-prompteditor__hint">最多 {maxLength} 个字</span>
        )}
        {refSyntax && (
          <span className="gen-prompteditor__hint">
            输入 <kbd>@</kbd> 选择参考素材；提示词中用{' '}
            {refSyntax === 'cn-prefixed' ? '图1 / 视频1' : '[Image 1]'} 指代
          </span>
        )}
      </div>
    </div>
  )
}
