import { useEffect, useMemo, useState } from 'react'
import type { Catalog, ModelDefinition, MediaItem, PromptToken } from '../types'
import { serializePrompt } from '../lib/promptSerializer'
import { uploadFile } from '../api'
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
  const [uploading, setUploading] = useState(false)

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
    if (!model || uploading) return
    setErrors({})

    let submitParams = { ...params }
    const promptField = model.fields.find((f) => f.key === 'prompt')
    const mediaField = model.fields.find((f) => f.type === 'media')

    // 1. 通用：将所有 blob URL 的 media 字段上传到 OSS
    const mediaFields = model.fields.filter((f) => f.type === 'media')
    for (const field of mediaFields) {
      const value = params[field.key]
      if (!value) continue

      if (Array.isArray(value)) {
        // refSyntax 风格：MediaItem[] 数组，每个 item 有 id/url/type
        const items = value as MediaItem[]
        const blobItems = items.filter((m) => m.url.startsWith('blob:'))
        if (blobItems.length === 0) continue

        setUploading(true)
        try {
          const uploaded = await Promise.all(
            blobItems.map(async (m) => {
              const blob = await fetch(m.url).then((r) => r.blob())
              const ext = blob.type.startsWith('video/') ? 'mp4' : 'png'
              const file = new File([blob], `ref-${m.id}.${ext}`, { type: blob.type })
              const { url, thumbnail } = await uploadFile(file)
              return { ...m, url, thumbnail: thumbnail || url }
            }),
          )
          const urlMap = new Map(uploaded.map((m) => [m.id, m.url]))
          const thumbMap = new Map(uploaded.map((m) => [m.id, m.thumbnail]))
          submitParams[field.key] = items.map((m) =>
            urlMap.has(m.id)
              ? { ...m, url: urlMap.get(m.id)!, thumbnail: thumbMap.get(m.id)! }
              : m,
          )
        } catch (e) {
          const msg = e instanceof Error ? e.message : '上传素材失败'
          setErrors({ [field.key]: msg })
          return
        } finally {
          setUploading(false)
        }
      } else if (typeof value === 'string' && value.startsWith('blob:')) {
        // 单值风格：MediaUpload 存储的 blob URL
        setUploading(true)
        try {
          const blob = await fetch(value).then((r) => r.blob())
          const ext = blob.type.startsWith('video/') ? 'mp4' : 'png'
          const file = new File([blob], `media.${ext}`, { type: blob.type })
          const { url } = await uploadFile(file)
          submitParams[field.key] = url
        } catch (e) {
          const msg = e instanceof Error ? e.message : '上传素材失败'
          setErrors({ [field.key]: msg })
          return
        } finally {
          setUploading(false)
        }
      }
    }

    // 2. refSyntax 模型：序列化 PromptToken[] + media[]
    if (model.refSyntax && promptField && mediaField) {
      const tokens = (params[promptField.key] as PromptToken[] | undefined) ?? []
      const currentItems = (submitParams[mediaField.key] as MediaItem[]) ?? []
      const { prompt, media } = serializePrompt(tokens, currentItems, model.refSyntax)
      if (media.length === 0) {
        setErrors({ [promptField.key]: '请在提示词中至少引用一个参考素材（打 @）' })
        return
      }
      const bailianMedia = media.map((m) => ({ type: m.type, url: m.url }))
      submitParams[promptField.key] = prompt
      submitParams[mediaField.key] = bailianMedia
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
          disabled={!model || uploading}
          onClick={handleSubmit}
        >
          {uploading ? '上传素材中…' : '生成'}
        </button>
      </div>
    </div>
  )
}
