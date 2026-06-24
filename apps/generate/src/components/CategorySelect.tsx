interface CategorySelectProps {
  value: string
  options: string[]
  onChange: (v: string) => void
}

const LABELS: Record<string, string> = {
  image: '图片生成',
  video: '视频生成',
  music: '音乐生成',
}

export function CategorySelect({ value, options, onChange }: CategorySelectProps) {
  return (
    <label className="uhyc-field">
      <span className="uhyc-field__label">生成类型</span>
      <select
        className="uhyc-input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map((c) => (
          <option key={c} value={c}>
            {LABELS[c] ?? c}
          </option>
        ))}
      </select>
    </label>
  )
}
