import type { ModelDefinition } from '../types'
import { Select } from './Select'

interface ModelSelectProps {
  models: ModelDefinition[]
  value: string | null
  onChange: (v: string) => void
}

export function ModelSelect({ models, value, onChange }: ModelSelectProps) {
  if (models.length === 0) {
    return <p className="gen-empty-inline">这里还什么都没有，换个分类试试？</p>
  }
  return (
    <label className="uhyc-field">
      <span className="uhyc-field__label">模型</span>
      <Select
        value={value ?? ''}
        options={models.map((m) => ({ label: m.displayName, value: m.id }))}
        onChange={(v) => onChange(String(v))}
        placeholder="请选择模型"
      />
    </label>
  )
}
