import { useMemo, useRef } from 'react'
import type { MediaItem, MediaSlotType, RefSyntax } from '../types'
import { computeLabels } from '../lib/promptSerializer'
import { uploadFile } from '../api'

interface ReferenceAssetsProps {
  /** 当前素材列表（即 params.media） */
  items: MediaItem[]
  refSyntax: RefSyntax
  /** 允许上传视频（cn-prefixed 模型支持视频参考） */
  allowVideo: boolean
  /** 允许上传音频作为参考音色 */
  allowVoice: boolean
  /** 允许上传首帧图片 */
  allowFirstFrame: boolean
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
  allowVoice,
  allowFirstFrame,
  onChange,
}: ReferenceAssetsProps) {
  const fileImg = useRef<HTMLInputElement>(null)
  const fileVid = useRef<HTMLInputElement>(null)
  const fileAudio = useRef<HTMLInputElement>(null)
  const fileFirstFrame = useRef<HTMLInputElement>(null)

  const labeled = useMemo(() => computeLabels(items, refSyntax), [items, refSyntax])

  async function addFiles(files: FileList | null, type: MediaSlotType) {
    if (!files) return
    const added: MediaItem[] = []
    for (const f of Array.from(files)) {
      const blobUrl = URL.createObjectURL(f)
      let url = blobUrl
      let thumbnail: string | undefined

      // 图片类型：生成缩略图
      if (['reference_image', 'first_frame', 'last_frame', 'refer'].includes(type)) {
        thumbnail = blobUrl
      }

      try {
        const result = await uploadFile(f)
        url = result.url
        thumbnail = result.thumbnail || url
      } catch {
        // 上传失败则保留 blob URL，提交时会重试
      }

      added.push({
        id: nextId(),
        type,
        url,
        label: '',
        thumbnail,
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
        {allowFirstFrame && (
          <button
            type="button"
            className="gen-refassets__add"
            onClick={(e) => {
              e.stopPropagation()
              fileFirstFrame.current?.click()
            }}
          >
            + 添加首帧
          </button>
        )}
        {allowVoice && (
          <button
            type="button"
            className="gen-refassets__add"
            onClick={(e) => {
              e.stopPropagation()
              fileAudio.current?.click()
            }}
          >
            + 添加参考音色
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
        <input
          ref={fileFirstFrame}
          type="file"
          accept="image/*"
          className="gen-upload__input"
          onChange={(e) => {
            addFiles(e.target.files, 'first_frame')
            e.target.value = ''
          }}
        />
        <input
          ref={fileAudio}
          type="file"
          accept="audio/*"
          multiple
          className="gen-upload__input"
          onChange={(e) => {
            addFiles(e.target.files, 'reference_voice')
            e.target.value = ''
          }}
        />
      </div>

      {labeled.length === 0 ? (
        <p className="gen-refassets__empty">还没有参考素材</p>
      ) : (
        <div className="gen-refassets__grid">
          {labeled.map((it) => {
            const isVideo = it.type === 'reference_video'
            const isAudio = it.type === 'reference_voice'
            const isImage = !isVideo && !isAudio && Boolean(it.thumbnail)

            return (
              <div className="gen-refassets__item" key={it.id}>
                <span className="gen-refassets__label">{it.label}</span>
                {isImage ? (
                  <img
                    src={it.thumbnail}
                    alt={it.label}
                    className="gen-refassets__thumb"
                    loading="lazy"
                  />
                ) : isVideo ? (
                  <div className="gen-refassets__thumb gen-refassets__thumb--video">
                    视频
                  </div>
                ) : isAudio ? (
                  <div className="gen-refassets__thumb gen-refassets__thumb--audio">
                    <audio
                      src={it.url}
                      className="gen-refassets__audio-player"
                      preload="metadata"
                      controls
                    />
                  </div>
                ) : null}
                <button
                  type="button"
                  className="gen-refassets__remove"
                  onClick={() => remove(it.id)}
                  aria-label={`移除 ${it.label}`}
                >
                  ×
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
