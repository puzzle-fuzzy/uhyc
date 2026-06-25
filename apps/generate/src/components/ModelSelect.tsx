import type { ModelDefinition } from '../types'
import { Select } from './Select'

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
      <Select
        value={value ?? ''}
        options={models.map((m) => ({ label: m.displayName, value: m.model }))}
        onChange={(v) => onChange(String(v))}
        placeholder="请选择模型"
      />
    </label>
  )
}
