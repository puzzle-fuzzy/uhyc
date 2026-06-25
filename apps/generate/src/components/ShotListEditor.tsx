import { useRef } from 'react'

// ---------------------------------------------------------------------------
// ShotListEditor — 分镜脚本编辑器（可灵自定义分镜）
//
// API 格式：multi_prompt: [{ index: 1, prompt: "...", duration: 5 }, ...]
// 1~6 个分镜片段，每个含提示词和时长
// ---------------------------------------------------------------------------

export interface ShotItem {
  index: number
  prompt: string
  duration: number
}

interface ShotListEditorProps {
  value: ShotItem[]
  minShots?: number
  maxShots?: number
  maxDuration?: number
  minDuration?: number
  onChange: (shots: ShotItem[]) => void
}

let seq = 0
function nextIndex(existing: ShotItem[]): number {
  const used = new Set(existing.map((s) => s.index))
  for (let i = 1; i <= (existing.length + 1); i++) {
    if (!used.has(i)) return i
  }
  return existing.length + 1
}

export function ShotListEditor({
  value,
  minShots = 1,
  maxShots = 6,
  maxDuration = 15,
  minDuration = 1,
  onChange,
}: ShotListEditorProps) {
  const shots: ShotItem[] = value.length >= minShots
    ? value
    : [{ index: 1, prompt: '', duration: 5 }]

  function update(index: number, patch: Partial<ShotItem>) {
    const next = shots.map((s) => (s.index === index ? { ...s, ...patch } : s))
    onChange(next)
  }

  function add() {
    if (shots.length >= maxShots) return
    onChange([...shots, { index: nextIndex(shots), prompt: '', duration: 5 }])
  }

  function remove(index: number) {
    if (shots.length <= minShots) return
    // Re-index remaining shots
    const filtered = shots.filter((s) => s.index !== index)
    onChange(filtered.map((s, i) => ({ ...s, index: i + 1 })))
  }

  return (
    <div className="gen-shotlist">
      {shots.map((shot) => (
        <div className="gen-shotlist__shot" key={shot.index}>
          <div className="gen-shotlist__shot-head">
            <span className="gen-shotlist__shot-idx">第 {shot.index} 镜</span>
            <div className="gen-shotlist__shot-dur">
              <input
                type="number"
                className="gen-shotlist__dur-input"
                value={shot.duration}
                min={minDuration}
                max={maxDuration}
                onChange={(e) => update(shot.index, { duration: Number(e.target.value) })}
                aria-label={`第 ${shot.index} 镜时长`}
              />
              <span className="gen-shotlist__dur-unit">秒</span>
            </div>
            {shots.length > minShots && (
              <button
                type="button"
                className="gen-shotlist__remove"
                onClick={() => remove(shot.index)}
                aria-label={`移除第 ${shot.index} 镜`}
              >
                ×
              </button>
            )}
          </div>
          <textarea
            className="gen-shotlist__prompt"
            value={shot.prompt}
            maxLength={512}
            placeholder={`第 ${shot.index} 镜提示词…`}
            onChange={(e) => update(shot.index, { prompt: e.target.value })}
            rows={2}
          />
        </div>
      ))}

      {shots.length < maxShots && (
        <button type="button" className="gen-shotlist__add" onClick={add}>
          + 添加分镜（{shots.length}/{maxShots}）
        </button>
      )}
    </div>
  )
}
