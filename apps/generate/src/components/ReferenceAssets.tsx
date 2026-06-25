import { useRef } from 'react'
import type { MediaItem, RefSyntax } from '../types'
import { computeLabels } from '../lib/promptSerializer'

interface ReferenceAssetsProps {
  /** 当前素材列表（即 params.media） */
  items: MediaItem[]
  refSyntax: RefSyntax
  /** 允许上传视频（仅 cn-prefixed） */
  allowVideo: boolean
  onChange: (items: MediaItem[]) => void
}

let idSeq = 0
function nextId(): string {
  idSeq += 1
  return `media-${Date.now()}-${idSeq}`
}

export function ReferenceAssets({
  items,
  refSyntax,
  allowVideo,
  onChange,
}: ReferenceAssetsProps) {
  const fileImg = useRef<HTMLInputElement>(null)
  const fileVid = useRef<HTMLInputElement>(null)

  const labeled = computeLabels(items, refSyntax)

  function addFiles(files: FileList | null, type: MediaItem['type']) {
    if (!files) return
    const added: MediaItem[] = []
    for (const f of Array.from(files)) {
      const url = URL.createObjectURL(f)
      added.push({
        id: nextId(),
        type,
        url,
        label: '',
        thumbnail: type === 'reference_video' ? undefined : url,
      })
    }
    onChange([...items, ...added])
  }

  function remove(id: string) {
    onChange(items.filter((i) => i.id !== id))
  }

  return (
    <div className="gen-refassets">
      <div className="gen-refassets__actions">
        <button
          type="button"
          className="gen-refassets__add"
          onClick={(e) => {
            e.stopPropagation()
            fileImg.current?.click()
          }}
        >
          + 添加图片
        </button>
        {allowVideo && (
          <button
            type="button"
            className="gen-refassets__add"
            onClick={(e) => {
              e.stopPropagation()
              fileVid.current?.click()
            }}
          >
            + 添加视频
          </button>
        )}
        <input
          ref={fileImg}
          type="file"
          accept="image/*"
          multiple
          className="gen-upload__input"
          onChange={(e) => {
            addFiles(e.target.files, 'reference_image')
            e.target.value = ''
          }}
        />
        <input
          ref={fileVid}
          type="file"
          accept="video/*"
          multiple
          className="gen-upload__input"
          onChange={(e) => {
            addFiles(e.target.files, 'reference_video')
            e.target.value = ''
          }}
        />
      </div>

      {labeled.length === 0 ? (
        <p className="gen-refassets__empty">还没有参考素材</p>
      ) : (
        <div className="gen-refassets__grid">
          {labeled.map((it) => (
            <div className="gen-refassets__item" key={it.id}>
              <span className="gen-refassets__label">{it.label}</span>
              {it.thumbnail ? (
                <img
                  src={it.thumbnail}
                  alt={it.label}
                  className="gen-refassets__thumb"
                />
              ) : (
                <div className="gen-refassets__thumb gen-refassets__thumb--video">
                  视频
                </div>
              )}
              <button
                type="button"
                className="gen-refassets__remove"
                onClick={() => remove(it.id)}
                aria-label={`移除 ${it.label}`}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
