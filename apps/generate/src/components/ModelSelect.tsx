import type { ModelDefinition } from '../types'

interface ModelSelectProps {
  models: ModelDefinition[]
  value: string | null
  onChange: (v: string) => void
}

export function ModelSelect({ models, value, onChange }: ModelSelectProps) {
  if (models.length === 0) {
    return <p className="gen-empty-inline">该类别暂无可用模型</p>
  }
  return (
    <label className="uhyc-field">
      <span className="uhyc-field__label">模型</span>
      <select
        className="uhyc-input"
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
      >
        {models.map((m) => (
          <option key={m.model} value={m.model}>
            {m.displayName}
          </option>
        ))}
      </select>
    </label>
  )
}
