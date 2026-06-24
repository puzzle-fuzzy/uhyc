import type { FieldMeta, ModelDefinition } from '../types'
import { FieldRenderer } from './FieldRenderer'

interface DynamicFormProps {
  model: ModelDefinition | null
  params: Record<string, unknown>
  errors: Record<string, string>
  onChange: (key: string, value: unknown) => void
}

export function DynamicForm({ model, params, errors, onChange }: DynamicFormProps) {
  if (!model) return null
  const inputs = model.fields.filter((f) => f.group === 'input')
  const parameters = model.fields.filter((f) => f.group === 'parameters')

  const render = (f: FieldMeta) => (
    <FieldRenderer
      key={f.key}
      field={f}
      value={params[f.key]}
      error={errors[f.key]}
      onChange={(v) => onChange(f.key, v)}
    />
  )

  return (
    <div className="gen-form">
      {inputs.length > 0 && (
        <div className="gen-form__group">{inputs.map(render)}</div>
      )}
      {parameters.length > 0 && (
        <div className="gen-form__group">
          <p className="gen-form__group-title">参数</p>
          {parameters.map(render)}
        </div>
      )}
    </div>
  )
}
