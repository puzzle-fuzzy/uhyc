interface SubCategoryTabsProps {
  options: string[]
  value: string
  onChange: (v: string) => void
}

const LABELS: Record<string, string> = {
  'text-to-video': '文生视频',
  'image-to-video': '图生视频',
  'reference-to-video': '参考生视频',
  'video-editing': '视频编辑',
  'text-to-image': '文生图',
  'image-to-image': '图生图',
  'reference-to-image': '参考生图',
  'text-to-music': '文生音乐',
}

export function SubCategoryTabs({ options, value, onChange }: SubCategoryTabsProps) {
  if (options.length === 0) return null
  return (
    <div className="gen-subtabs" role="tablist">
      {options.map((s) => (
        <button
          key={s}
          type="button"
          role="tab"
          aria-selected={s === value}
          className={`gen-subtab ${s === value ? 'gen-subtab--active' : ''}`}
          onClick={() => onChange(s)}
        >
          {LABELS[s] ?? s}
        </button>
      ))}
    </div>
  )
}
