import { useEffect, useMemo, useState } from 'react'
import type { Catalog, ModelDefinition, MediaItem, PromptToken } from '../types'
import { serializePrompt } from '../lib/promptSerializer'
import { CategorySelect } from './CategorySelect'
import { SubCategoryTabs } from './SubCategoryTabs'
import { ModelSelect } from './ModelSelect'
import { DynamicForm } from './DynamicForm'

interface GeneratorPanelProps {
  catalog: Catalog
  submitting: boolean
  submitError: string | null
  onSubmit: (input: {
    category: string
    subCategory: string
    model: string
    params: Record<string, unknown>
  }) => Promise<void>
}

function defaultsFor(model: ModelDefinition | null): Record<string, unknown> {
  if (!model) return {}
  const out: Record<string, unknown> = {}
  for (const f of model.fields) {
    if (f.defaultValue !== undefined) out[f.key] = f.defaultValue
  }
  return out
}

export function GeneratorPanel({
  catalog,
  submitting,
  submitError,
  onSubmit,
}: GeneratorPanelProps) {
  const categories = useMemo(() => Object.keys(catalog), [catalog])
  const [category, setCategory] = useState(categories[0] ?? '')
  const subOptions = useMemo(
    () => Object.keys(catalog[category] ?? {}),
    [catalog, category],
  )
  const [subCategory, setSubCategory] = useState('')
  const models = useMemo(
    () => catalog[category]?.[subCategory] ?? [],
    [catalog, category, subCategory],
  )
  const [modelName, setModelName] = useState<string | null>(null)
  const model = useMemo(
    () => models.find((m) => m.model === modelName) ?? null,
    [models, modelName],
  )
  const [params, setParams] = useState<Record<string, unknown>>({})
  const [errors, setErrors] = useState<Record<string, string>>({})

  // category 变了：取第一个 subCategory
  useEffect(() => {
    const subs = Object.keys(catalog[category] ?? {})
    setSubCategory(subs[0] ?? '')
  }, [catalog, category])

  // subCategory 变了：取第一个模型
  useEffect(() => {
    const ms = catalog[category]?.[subCategory] ?? []
    setModelName(ms[0]?.model ?? null)
  }, [catalog, category, subCategory])

  // 模型变了：重置 params 为默认值
  useEffect(() => {
    setParams(defaultsFor(model))
    setErrors({})
  }, [model])

  function setParam(key: string, value: unknown) {
    setParams((p) => ({ ...p, [key]: value }))
  }

  async function handleSubmit() {
    if (!model) return
    setErrors({})

    // refSyntax 模型：params.prompt 是 PromptToken[]，需序列化成字符串 + media[]
    let submitParams = { ...params }
    const promptField = model.fields.find((f) => f.key === 'prompt')
    const mediaField = model.fields.find((f) => f.type === 'media')
    if (model.refSyntax && promptField && mediaField) {
      const tokens = (params[promptField.key] as PromptToken[] | undefined) ?? []
      const items = (params[mediaField.key] as MediaItem[]) ?? []
      const { prompt, media } = serializePrompt(tokens, items, model.refSyntax)
      // 前端预校验：至少引用一个素材
      if (media.length === 0) {
        setErrors({
          [promptField.key]: '请在提示词中至少引用一个参考素材（打 @）',
        })
        return
      }
      // media[] 仅保留 bailian 需要的 {type, url}，丢弃前端用的 id/label/thumbnail
      const bailianMedia = media.map((m) => ({ type: m.type, url: m.url }))
      submitParams = {
        ...submitParams,
        [promptField.key]: prompt,
        [mediaField.key]: bailianMedia,
      }
    }

    try {
      await onSubmit({
        category,
        subCategory,
        model: model.model,
        params: submitParams,
      })
    } catch {
      // submitError 由父组件管理
    }
  }

  return (
    <div className="uhyc-card gen-panel">
      <div className="gen-panel__head">
        <CategorySelect
          value={category}
          options={categories}
          onChange={setCategory}
        />
        <SubCategoryTabs
          options={subOptions}
          value={subCategory}
          onChange={setSubCategory}
        />
      </div>

      <div className="gen-panel__body">
        <ModelSelect models={models} value={modelName} onChange={setModelName} />
        <DynamicForm
          model={model}
          params={params}
          errors={errors}
          onChange={setParam}
        />
        {submitError && (
          <div className="uhyc-alert uhyc-alert--error" role="alert">
            {submitError}
          </div>
        )}
      </div>

      <div className="gen-panel__foot">
        <button
          type="button"
          className="uhyc-btn uhyc-btn--accent"
          disabled={!model || submitting}
          onClick={handleSubmit}
        >
          {submitting ? <span className="uhyc-spinner" /> : '生成'}
        </button>
      </div>
    </div>
  )
}
