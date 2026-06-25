import type { FieldMeta, ModelDefinition, PromptToken, MediaItem } from '../types'
import { FieldRenderer } from './FieldRenderer'
import { ReferenceAssets } from './ReferenceAssets'
import { PromptEditor } from './PromptEditor'

interface DynamicFormProps {
  model: ModelDefinition | null
  params: Record<string, unknown>
  errors: Record<string, string>
  onChange: (key: string, value: unknown) => void
}

const ROW_PAIRS: [string, string][] = [
  ['resolution', 'ratio'],
  ['watermark', 'seed'],
]

function isPair(a: FieldMeta, b: FieldMeta): boolean {
  return ROW_PAIRS.some(
    ([x, y]) => (a.key === x && b.key === y) || (a.key === y && b.key === x),
  )
}

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

  const refSyntax = model.refSyntax
  const promptField = model.fields.find(
    (f) => f.key === 'prompt' && f.group === 'input',
  )
  const mediaField = model.fields.find((f) => f.type === 'media' && f.group === 'input')
  const isRefModel = Boolean(refSyntax && promptField && mediaField)

  // refSyntax 模型：prompt + media 合并为复合区，不单独渲染这两个字段
  const inputs = model.fields.filter(
    (f) =>
      f.group === 'input' &&
      !(isRefModel && (f.key === 'prompt' || f.type === 'media')),
  )
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
      <div className="gen-form__group">
        {inputs.map(renderField)}

        {isRefModel && promptField && mediaField && (
          <ReferenceComposite
            promptField={promptField}
            mediaField={mediaField}
            refSyntax={refSyntax!}
            params={params}
            onChange={onChange}
          />
        )}
      </div>

      {parameters.length > 0 && (
        <div className="gen-form__group">
          <p className="gen-form__group-title">参数</p>
          {paramRows.map(renderRow)}
        </div>
      )}
    </div>
  )
}

/** refSyntax 模型的 prompt + media 复合区 */
function ReferenceComposite({
  promptField,
  mediaField,
  refSyntax,
  params,
  onChange,
}: {
  promptField: FieldMeta
  mediaField: FieldMeta
  refSyntax: NonNullable<ModelDefinition['refSyntax']>
  params: Record<string, unknown>
  onChange: (key: string, value: unknown) => void
}) {
  const items = (params[mediaField.key] as MediaItem[] | undefined) ?? []
  const tokens = (params[promptField.key] as PromptToken[] | undefined) ?? []

  return (
    <>
      <div className="uhyc-field" role="group" aria-labelledby="ref-assets-label">
        <span id="ref-assets-label" className="uhyc-field__label">{mediaField.label}</span>
        <ReferenceAssets
          items={items}
          refSyntax={refSyntax}
          allowVideo={refSyntax === 'cn-prefixed'}
          onChange={(next) => onChange(mediaField.key, next)}
        />
        {mediaField.description && (
          <p className="gen-field__desc">{mediaField.description}</p>
        )}
      </div>

      <div className="uhyc-field" role="group" aria-labelledby="ref-prompt-label">
        <span id="ref-prompt-label" className="uhyc-field__label">
          {promptField.label}
          {promptField.required ? ' *' : ''}
        </span>
        <PromptEditor
          items={items}
          refSyntax={refSyntax}
          tokens={tokens}
          placeholder={promptField.label}
          maxLength={promptField.maxLength}
          onChange={(next) => onChange(promptField.key, next)}
        />
        {promptField.description && (
          <p className="gen-field__desc">{promptField.description}</p>
        )}
      </div>
    </>
  )
}
