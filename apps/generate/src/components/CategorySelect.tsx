import { Select } from './Select'

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
      <Select
        value={value}
        options={options.map((c) => ({ label: LABELS[c] ?? c, value: c }))}
        onChange={(v) => onChange(String(v))}
      />
    </label>
  )
}
