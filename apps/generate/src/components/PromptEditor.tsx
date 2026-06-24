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
  const [pickerPos, setPickerPos] = useState<{ top: number; left: number } | null>(
    null,
  )

  const labeled = computeLabels(items, refSyntax)

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

  function detectAtTrigger() {
    const sel = window.getSelection()
    if (!sel || sel.rangeCount === 0) {
      setPickerOpen(false)
      return
    }
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
      setPickerPos({
        top: rect.bottom - rootRect.top + 4,
        left: rect.left - rootRect.left,
      })
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
      'gen-chip' + (item.type === 'reference_video' ? ' gen-chip--video' : '')
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
    if (pickerOpen && e.key === 'Escape') {
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
      {(maxLength || refSyntax) && (
        <p className="gen-prompteditor__hint">
          提示词中用{' '}
          {refSyntax === 'cn-prefixed' ? '图1 / 视频1' : '[Image 1]'} 指代参考素材
        </p>
      )}
    </div>
  )
}
