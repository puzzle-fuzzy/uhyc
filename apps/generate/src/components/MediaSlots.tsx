import { useRef, useState } from 'react'
import type { MediaItem, MediaSlotConfig } from '../types'
import { uploadFile } from '../api'

// ---------------------------------------------------------------------------
// MediaSlots — 多类型媒体上传组件
//
// 根据 mediaSlots 配置渲染分槽位的上传区域。
// 每个槽位可接受不同类型的文件（图片/视频/音频），带预览和删除。
// ---------------------------------------------------------------------------

interface MediaSlotsProps {
  slots: MediaSlotConfig[]
  items: MediaItem[]
  onChange: (items: MediaItem[]) => void
  /** 允许附加参考音色（仅 reference_image / reference_video） */
  allowVoice?: boolean
}

let idSeq = 0
function nextId(): string {
  idSeq += 1
  return `media-${Date.now()}-${idSeq}`
}

/** 判断媒体类型是否为图片 */
function isImageType(type: string): boolean {
  return ['reference_image', 'first_frame', 'last_frame', 'refer'].includes(type)
}

/** 判断媒体类型是否为视频 */
function isVideoType(type: string): boolean {
  return ['reference_video', 'first_clip', 'video', 'base', 'feature'].includes(type)
}

/** 判断媒体类型是否为音频 */
function isAudioType(type: string): boolean {
  return ['driving_audio', 'reference_voice'].includes(type)
}

export function MediaSlots({ slots, items, onChange, allowVoice }: MediaSlotsProps) {
  // Track upload progress per item
  const [uploading, setUploading] = useState<Set<string>>(new Set())

  async function handleFiles(slot: MediaSlotConfig, files: FileList | null) {
    if (!files) return
    const slotItems = items.filter((it) => it.type === slot.type)
    const maxForSlot = slot.maxCount ?? Infinity
    const remaining = maxForSlot - slotItems.length
    if (remaining <= 0) return

    const toAdd = Array.from(files).slice(0, remaining)
    const added: MediaItem[] = []

    for (const f of toAdd) {
      const id = nextId()
      setUploading((s) => new Set(s).add(id))

      // Local preview
      const blobUrl = URL.createObjectURL(f)
      let url = blobUrl
      let thumbnail: string | undefined

      if (isImageType(slot.type)) {
        thumbnail = blobUrl
      }

      // Upload to server
      try {
        const result = await uploadFile(f)
        url = result.url
        if (isImageType(slot.type)) {
          thumbnail = result.thumbnail || url
        }
      } catch {
        // Keep blob URL; retry on submit
      }

      setUploading((s) => {
        const next = new Set(s)
        next.delete(id)
        return next
      })

      added.push({
        id,
        type: slot.type,
        url,
        label: '',
        thumbnail,
      })
    }

    onChange([...items, ...added])
  }

  function removeItem(id: string) {
    onChange(items.filter((i) => i.id !== id))
  }

  function setVoice(itemId: string, voiceUrl: string) {
    onChange(
      items.map((i) =>
        i.id === itemId ? { ...i, referenceVoice: voiceUrl || undefined } : i,
      ),
    )
  }

  return (
    <div className="gen-mediaslots">
      {slots.map((slot) => {
        const slotItems = items.filter((it) => it.type === slot.type)
        const maxForSlot = slot.maxCount ?? Infinity
        const isFull = slotItems.length >= maxForSlot

        return (
          <div className="gen-mediaslots__slot" key={slot.type}>
            <div className="gen-mediaslots__slot-head">
              <span className="gen-mediaslots__slot-label">{slot.label}</span>
              {maxForSlot < Infinity && (
                <span className="gen-mediaslots__slot-count">
                  {slotItems.length}/{maxForSlot}
                </span>
              )}
            </div>

            {/* Preview grid */}
            {slotItems.length > 0 && (
              <div className="gen-mediaslots__grid">
                {slotItems.map((item) => (
                  <SlotPreview
                    key={item.id}
                    item={item}
                    uploading={uploading.has(item.id)}
                    allowVoice={allowVoice && (item.type === 'reference_image' || item.type === 'reference_video')}
                    onRemove={() => removeItem(item.id)}
                    onSetVoice={(url) => setVoice(item.id, url)}
                  />
                ))}
              </div>
            )}

            {/* Upload button */}
            {!isFull && (
              <SlotUploadButton
                slot={slot}
                onFiles={(files) => handleFiles(slot, files)}
              />
            )}

            {/* Size/duration hints */}
            {slot.maxSizeMB && (
              <p className="gen-mediaslots__hint">
                文件≤{slot.maxSizeMB}MB{slot.maxDurationSec ? `，时长 ${slot.maxDurationSec}s` : ''}
              </p>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ---------------------------------------------------------------------------
// SlotPreview — 单个媒体项的预览
// ---------------------------------------------------------------------------

function SlotPreview({
  item,
  uploading,
  allowVoice,
  onRemove,
  onSetVoice,
}: {
  item: MediaItem
  uploading: boolean
  allowVoice: boolean
  onRemove: () => void
  onSetVoice: (url: string) => void
}) {
  const voiceRef = useRef<HTMLInputElement>(null)

  return (
    <div className="gen-mediaslots__item">
      {/* Image preview */}
      {isImageType(item.type) && item.thumbnail && (
        <img
          src={item.thumbnail}
          alt={item.label || item.type}
          className="gen-mediaslots__thumb"
          loading="lazy"
        />
      )}

      {/* Video preview */}
      {isVideoType(item.type) && (
        <div className="gen-mediaslots__thumb gen-mediaslots__thumb--video">
          {item.url && !item.url.startsWith('blob:') ? (
            <video
              src={item.url}
              className="gen-mediaslots__video"
              preload="metadata"
              controls
              muted
            />
          ) : (
            <span className="gen-mediaslots__placeholder">🎬 视频已上传</span>
          )}
        </div>
      )}

      {/* Audio preview */}
      {isAudioType(item.type) && (
        <div className="gen-mediaslots__thumb gen-mediaslots__thumb--audio">
          {item.url ? (
            <audio
              src={item.url}
              className="gen-mediaslots__audio"
              preload="metadata"
              controls
            />
          ) : (
            <span className="gen-mediaslots__placeholder">🎵 音频已上传</span>
          )}
        </div>
      )}

      {/* Reference voice (for image/video slots) */}
      {allowVoice && item.referenceVoice && (
        <div className="gen-mediaslots__voice-badge">
          🎤 已设置参考音色
          <button
            type="button"
            className="gen-mediaslots__voice-remove"
            onClick={() => onSetVoice('')}
            aria-label="移除参考音色"
          >
            ×
          </button>
        </div>
      )}

      {uploading && (
        <div className="gen-mediaslots__uploading">
          <span className="uhyc-spinner" />
        </div>
      )}

      <button
        type="button"
        className="gen-mediaslots__remove"
        onClick={(e) => {
          e.stopPropagation()
          onRemove()
        }}
        aria-label={`移除 ${item.label || item.type}`}
      >
        ×
      </button>
    </div>
  )
}

// ---------------------------------------------------------------------------
// SlotUploadButton — 单个槽位的上传按钮
// ---------------------------------------------------------------------------

function SlotUploadButton({
  slot,
  onFiles,
}: {
  slot: MediaSlotConfig
  onFiles: (files: FileList | null) => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const isImage = slot.accept.startsWith('image/')
  const isVideo = slot.accept.startsWith('video/')
  const isAudio = slot.accept.startsWith('audio/')

  const icon = isImage ? '🖼' : isVideo ? '🎬' : isAudio ? '🎵' : '📎'

  return (
    <>
      <button
        type="button"
        className="gen-mediaslots__add"
        onClick={(e) => {
          e.stopPropagation()
          inputRef.current?.click()
        }}
      >
        {icon} + {slot.label}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept={slot.accept}
        multiple={slot.maxCount !== 1}
        className="gen-upload__input"
        onChange={(e) => {
          onFiles(e.target.files)
          e.target.value = ''
        }}
      />
    </>
  )
}
