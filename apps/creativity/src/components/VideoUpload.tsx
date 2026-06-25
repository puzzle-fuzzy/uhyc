import { useRef, useState } from 'react'

interface VideoUploadProps {
  onUpload: (url: string) => void
}

export function VideoUpload({ onUpload }: VideoUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)

  async function handleFile(file: File | undefined) {
    if (!file) return
    setPreview(URL.createObjectURL(file))
    setUploading(true)
    try {
      const { url } = await import('../api').then((m) => m.uploadFile(file))
      onUpload(url)
    } catch {
      setPreview(null)
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="crea-upload">
      {preview ? (
        <video src={preview} controls className="crea-upload__preview" />
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
        onChange={(e) => {
          handleFile(e.target.files?.[0])
          e.target.value = ''
        }}
      />
      {uploading && <p className="crea-upload__status">上传中…</p>}
    </div>
  )
}
