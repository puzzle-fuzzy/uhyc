import type { FieldMeta, ModelDefinition } from '../types'
import { FieldRenderer } from './FieldRenderer'

interface DynamicFormProps {
  model: ModelDefinition | null
  params: Record<string, unknown>
  errors: Record<string, string>
  onChange: (key: string, value: unknown) => void
}

/**
 * Fields that should share one row when they appear adjacently in parameters.
 * Keeps compact controls (resolution+ratio, watermark+seed) on a single line.
 */
const ROW_PAIRS: [string, string][] = [
  ['resolution', 'ratio'],
  ['watermark', 'seed'],
]

function isPair(a: FieldMeta, b: FieldMeta): boolean {
  return ROW_PAIRS.some(([x, y]) =>
    (a.key === x && b.key === y) || (a.key === y && b.key === x),
  )
}

/** Group an ordered field list into rows (singletons or adjacent pairs). */
function groupIntoRows(fields: FieldMeta[]): FieldMeta[][] {
  const rows: FieldMeta[][] = []
  let i = 0
  while (i < fields.length) {
    const cur = fields[i]
    const next = fields[i + 1]
    if (next && isPair(cur, next)) {
      rows.push([cur, next])
      i += 2
    } else {
      rows.push([cur])
      i += 1
    }
  }
  return rows
}

export function DynamicForm({ model, params, errors, onChange }: DynamicFormProps) {
  if (!model) return null
  const inputs = model.fields.filter((f) => f.group === 'input')
  const parameters = model.fields.filter((f) => f.group === 'parameters')
  const paramRows = groupIntoRows(parameters)

  const renderField = (f: FieldMeta) => (
    <FieldRenderer
      key={f.key}
      field={f}
      value={params[f.key]}
      error={errors[f.key]}
      onChange={(v) => onChange(f.key, v)}
    />
  )

  const renderRow = (row: FieldMeta[], idx: number) => {
    if (row.length === 1) return <div key={idx}>{renderField(row[0])}</div>
    return (
      <div className="gen-form__row" key={idx}>
        {row.map(renderField)}
      </div>
    )
  }

  return (
    <div className="gen-form">
      {inputs.length > 0 && (
        <div className="gen-form__group">
          {inputs.map(renderField)}
        </div>
      )}
      {parameters.length > 0 && (
        <div className="gen-form__group">
          <p className="gen-form__group-title">参数</p>
          {paramRows.map(renderRow)}
        </div>
      )}
    </div>
  )
}
