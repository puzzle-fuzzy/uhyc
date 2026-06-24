import { useEffect, useMemo, useState } from 'react'
import type { Catalog, ModelDefinition } from '../types'
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
    try {
      await onSubmit({
        category,
        subCategory,
        model: model.model,
        params,
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
