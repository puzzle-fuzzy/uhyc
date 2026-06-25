interface RatioOption {
  label: string
  value: string
}

interface ResolutionPickerProps {
  value: string
  options: RatioOption[]
  onChange: (value: unknown) => void
}

/** 从 "1:1　2048×2048" 格式的 label 中提取比例部分 */
function ratioFromLabel(label: string): string {
  const m = label.match(/^([\d:]+)/)
  return m?.[1] ?? '1:1'
}

/** 比例 → 用于展示的矩形尺寸（宽/高比） */
function ratioSize(ratio: string): { w: number; h: number } {
  const [a, b] = ratio.split(':').map(Number)
  if (!a || !b) return { w: 1, h: 1 }
  // 缩放到 max 48px，保持比例
  const max = 48
  const scale = max / Math.max(a, b)
  return { w: Math.round(a * scale), h: Math.round(b * scale) }
}

export function ResolutionPicker({ value, options, onChange }: ResolutionPickerProps) {
  return (
    <div className="res-picker">
      {options.map((opt) => {
        const ratio = ratioFromLabel(opt.label)
        const size = ratioSize(ratio)
        const active = opt.value === value
        return (
          <button
            key={opt.value}
            type="button"
            className={`res-picker__card${active ? ' res-picker__card--active' : ''}`}
            onClick={() => onChange(opt.value)}
          >
            <span
              className="res-picker__rect"
              style={{ width: size.w, height: size.h }}
            />
            <span className="res-picker__ratio">{ratio}</span>
            <span className="res-picker__px">{opt.label.replace(/^[\d:]+\s*/, '')}</span>
          </button>
        )
      })}
    </div>
  )
}
