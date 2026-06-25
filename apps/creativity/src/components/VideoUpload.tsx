import { useEffect, useRef, useState } from 'react'

const STORAGE_KEY = 'creativity-pending-video'

interface VideoUploadProps {
  onProcess: (url: string) => void
  processing: boolean
}

/** 从 localStorage 恢复上次未处理的视频 URL */
export function getPendingVideo(): string | null {
  return localStorage.getItem(STORAGE_KEY)
}

/** 清除未处理状态 */
export function clearPendingVideo() {
  localStorage.removeItem(STORAGE_KEY)
}

export function VideoUpload({ onProcess, processing }: VideoUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [ossUrl, setOssUrl] = useState<string | null>(getPendingVideo())
  const [uploading, setUploading] = useState(false)

  // 恢复上次的预览 blob（仅内存，OSS URL 持久化）
  const [previewBlob, setPreviewBlob] = useState<string | null>(null)

  useEffect(() => {
    return () => {
      if (previewBlob) URL.revokeObjectURL(previewBlob)
    }
  }, [previewBlob])

  async function handleFile(file: File | undefined) {
    if (!file) return
    const blob = URL.createObjectURL(file)
    setPreviewBlob(blob)
    setUploading(true)
    try {
      const { url } = await import('../api').then((m) => m.uploadFile(file))
      setOssUrl(url)
      localStorage.setItem(STORAGE_KEY, url)
    } catch {
      setPreviewBlob(null)
      setOssUrl(null)
    } finally {
      setUploading(false)
    }
  }

  function handleClear() {
    setOssUrl(null)
    setPreviewBlob(null)
    clearPendingVideo()
  }

  const previewSrc = previewBlob || (ossUrl ? ossUrl : null)

  return (
    <div className="crea-upload">
      {previewSrc ? (
        <>
          <video key={previewSrc} src={previewSrc} controls preload="metadata" className="crea-upload__preview" />
          <div className="crea-upload__bar">
            <button
              type="button"
              className="uhyc-btn uhyc-btn--accent"
              disabled={processing}
              onClick={() => ossUrl && onProcess(ossUrl)}
            >
              {processing ? '处理中…' : '开始处理'}
            </button>
            <button
              type="button"
              className="uhyc-btn uhyc-btn--ghost"
              onClick={handleClear}
              disabled={processing}
            >
              更换视频
            </button>
          </div>
        </>
      ) : (
        <div
          className="crea-upload__placeholder"
          role="button"
          tabIndex={0}
          onClick={() => inputRef.current?.click()}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              inputRef.current?.click()
            }
          }}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true" className="crea-upload__icon">
            <path d="M12 16V4m0 0L8 8m4-4l4 4" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span>点击上传视频，或拖拽到此处</span>
        </div>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="video/*"
        className="crea-upload__input"
        aria-label="上传视频文件"
        onChange={(e) => {
          handleFile(e.target.files?.[0])
          e.target.value = ''
        }}
      />
      {uploading && <p className="crea-upload__status">上传中…</p>}
    </div>
  )
}
