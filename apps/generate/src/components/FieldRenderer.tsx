import { useRef } from 'react'
import type { FieldMeta } from '../types'
import { Select } from './Select'
import { ResolutionPicker } from './ResolutionPicker'

interface FieldRendererProps {
  field: FieldMeta
  value: unknown
  error?: string
  onChange: (value: unknown) => void
}

function errorId(key: string): string {
  return `field-error-${key}`
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
    case 'media':
      return (
        <MediaUpload field={field} value={value} onChange={onChange} />
      )

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
              aria-describedby={error ? errorId(field.key) : undefined}
              onChange={(e) => onChange(e.target.value)}
            />
          ) : (
            <input
              className="uhyc-input"
              type="text"
              value={(value as string) ?? ''}
              maxLength={field.maxLength}
              placeholder={field.label}
              aria-describedby={error ? errorId(field.key) : undefined}
              onChange={(e) => onChange(e.target.value)}
            />
          )}
          {desc}
          {error && <p id={errorId(field.key)} className="gen-field__error">{error}</p>}
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
            aria-describedby={error ? errorId(field.key) : undefined}
            onChange={(e) =>
              onChange(
                e.target.value === '' ? undefined : Number(e.target.value),
              )
            }
          />
          {desc}
          {error && <p id={errorId(field.key)} className="gen-field__error">{error}</p>}
        </label>
      )

    case 'boolean':
      // Custom toggle switch (neo-brutalist)
      return (
        <label className="uhyc-field">
          {label}
          <button
            type="button"
            role="switch"
            aria-checked={Boolean(value)}
            className={`gen-toggle ${value ? 'gen-toggle--on' : ''}`}
            onClick={() => onChange(!value)}
          >
            <span className="gen-toggle__thumb" />
          </button>
          {desc}
        </label>
      )

    case 'select':
      if (field.key === 'size') {
        return (
          <label className="uhyc-field">
            {label}
            <ResolutionPicker
              value={(value as string) ?? ''}
              options={(field.options ?? []) as { label: string; value: string }[]}
              onChange={onChange}
            />
            {desc}
            {error && <p id={errorId(field.key)} className="gen-field__error">{error}</p>}
          </label>
        )
      }
      return (
        <label className="uhyc-field">
          {label}
          <Select
            value={(value as string) ?? ''}
            options={field.options ?? []}
            onChange={onChange}
          />
          {desc}
          {error && <p id={errorId(field.key)} className="gen-field__error">{error}</p>}
        </label>
      )

    case 'range': {
      // Custom slider (neo-brutalist): visible track + fill + JS-positioned thumb
      const min = field.min ?? 0
      const max = field.max ?? 100
      const v = (value as number) ?? min
      const pct = ((v - min) / (max - min)) * 100
      return (
        <label className="uhyc-field">
          {label}
          <div className="gen-range">
            <div className="gen-range__track">
              <div className="gen-range__fill" style={{ width: `${pct}%` }} />
              <div className="gen-range__thumb" style={{ left: `${pct}%` }} />
              <input
                type="range"
                min={min}
                max={max}
                value={v}
                aria-describedby={error ? errorId(field.key) : undefined}
                onChange={(e) => onChange(Number(e.target.value))}
              />
            </div>
            <span className="gen-range__value">{v}{rangeUnit(field.key)}</span>
          </div>
          {desc}
          {error && <p id={errorId(field.key)} className="gen-field__error">{error}</p>}
        </label>
      )
    }

    default:
      return null
  }
}

/**
 * Image upload area (UI only — OSS upload comes later).
 * Accepts a file, previews it locally, and stores a placeholder URL string.
 * The backend will later provide a real URL after OSS upload.
 */
function MediaUpload({
  field,
  value,
  onChange,
}: {
  field: FieldMeta
  value: unknown
  onChange: (value: unknown) => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const preview = typeof value === 'string' ? value : null

  function handleFile(file: File | undefined) {
    if (!file) return
    // Local preview only; real OSS URL comes from backend later.
    const url = URL.createObjectURL(file)
    onChange(url)
  }

  return (
    <div className="uhyc-field">
      <span className="uhyc-field__label">
        {field.label}
        {field.required ? ' *' : ''}
      </span>
      <div
        className="gen-upload"
        role="button"
        tabIndex={0}
        onClick={(e) => {
          e.stopPropagation()
          inputRef.current?.click()
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            inputRef.current?.click()
          }
        }}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="gen-upload__input"
          onChange={(e) => {
            handleFile(e.target.files?.[0])
            e.target.value = ''
          }}
        />
        {preview ? (
          <img src={preview} alt={field.label} className="gen-upload__preview" />
        ) : (
          <div className="gen-upload__empty">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M12 16V4m0 0L8 8m4-4l4 4" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span>点击上传图片</span>
          </div>
        )}
      </div>
      {field.description && <p className="gen-field__desc">{field.description}</p>}
      {preview && (
        <button
          type="button"
          className="gen-upload__clear"
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            onChange(undefined)
          }}
        >
          移除
        </button>
      )}
    </div>
  )
}

/**
 * 根据 range 字段的 key 返回对应的单位后缀。 */
function rangeUnit(key: string): string {
  switch (key) {
    case 'duration':
      return 's'
    case 'n':
      return ' 张'
    default:
      return ''
  }
}
