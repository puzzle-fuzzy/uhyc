import type { FieldMeta } from '../types'

interface FieldRendererProps {
  field: FieldMeta
  value: unknown
  error?: string
  onChange: (value: unknown) => void
}

export function FieldRenderer({ field, value, error, onChange }: FieldRendererProps) {
  const label = (
    <span className="uhyc-field__label">
      {field.label}
      {field.required ? ' *' : ''}
    </span>
  )

  const desc = field.description ? (
    <p className="gen-field__desc">{field.description}</p>
  ) : null

  switch (field.type) {
    case 'text':
      return (
        <label className="uhyc-field">
          {label}
          {field.maxLength && field.maxLength > 200 ? (
            <textarea
              className="uhyc-input gen-textarea"
              value={(value as string) ?? ''}
              maxLength={field.maxLength}
              placeholder={field.label}
              onChange={(e) => onChange(e.target.value)}
            />
          ) : (
            <input
              className="uhyc-input"
              type="text"
              value={(value as string) ?? ''}
              maxLength={field.maxLength}
              placeholder={field.label}
              onChange={(e) => onChange(e.target.value)}
            />
          )}
          {desc}
          {error && <p className="gen-field__error">{error}</p>}
        </label>
      )

    case 'number':
      return (
        <label className="uhyc-field">
          {label}
          <input
            className="uhyc-input"
            type="number"
            value={(value as number | undefined) ?? ''}
            min={field.min}
            max={field.max}
            placeholder={field.label}
            onChange={(e) =>
              onChange(
                e.target.value === '' ? undefined : Number(e.target.value),
              )
            }
          />
          {desc}
          {error && <p className="gen-field__error">{error}</p>}
        </label>
      )

    case 'boolean':
      return (
        <label className="uhyc-field uhyc-field--inline">
          <input
            type="checkbox"
            checked={Boolean(value)}
            onChange={(e) => onChange(e.target.checked)}
          />
          <span>
            {label}
            {desc}
          </span>
        </label>
      )

    case 'select':
      return (
        <label className="uhyc-field">
          {label}
          <select
            className="uhyc-input"
            value={(value as string) ?? ''}
            onChange={(e) => onChange(e.target.value)}
          >
            {(field.options ?? []).map((o) => (
              <option key={String(o.value)} value={String(o.value)}>
                {o.label}
              </option>
            ))}
          </select>
          {desc}
          {error && <p className="gen-field__error">{error}</p>}
        </label>
      )

    case 'range': {
      const min = field.min ?? 0
      const max = field.max ?? 100
      return (
        <label className="uhyc-field">
          {label}
          <div className="gen-range">
            <input
              type="range"
              min={min}
              max={max}
              value={(value as number) ?? min}
              onChange={(e) => onChange(Number(e.target.value))}
            />
            <span className="gen-range__value">{String(value ?? min)}</span>
          </div>
          {desc}
          {error && <p className="gen-field__error">{error}</p>}
        </label>
      )
    }

    default:
      return null
  }
}
