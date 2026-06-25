import { useRef } from 'react'

// ---------------------------------------------------------------------------
// ColorPaletteEditor — 色板编辑器（万相2.7 Image 独有能力）
//
// API 格式：color_palette: [{ hex: "#C2D1E6", ratio: "23.51%" }, ...]
// 要求 3-10 色，推荐 8 种，所有 ratio 之和必须为 100.00%
// ---------------------------------------------------------------------------

export interface ColorStop {
  hex: string
  ratio: number // 0-100
}

interface ColorPaletteEditorProps {
  value: ColorStop[]
  minColors?: number
  maxColors?: number
  onChange: (stops: ColorStop[]) => void
}

/** 预设调色板，用于快速填充 */
const PRESET_PALETTES: { name: string; colors: string[] }[] = [
  {
    name: '柔粉暮光',
    colors: ['#C2D1E6', '#CDD8E9', '#B5C8DB', '#C0B5B4', '#DAE0EC', '#636574', '#CACAD2', '#CBD4E4'],
  },
  {
    name: '暖阳大地',
    colors: ['#E8C9A0', '#D4A87C', '#C4946A', '#B0805C', '#A07250', '#8C5E3C', '#7A4E2E', '#684024'],
  },
  {
    name: '森林物语',
    colors: ['#A8C5A0', '#8DB580', '#7A9E6E', '#6B8F5E', '#5C7E50', '#4D6E42', '#3E5E34', '#2F4E26'],
  },
  {
    name: '海洋微风',
    colors: ['#A0C0D8', '#88B0CC', '#70A0C0', '#5890B4', '#4880A8', '#3C709C', '#306090', '#245084'],
  },
  {
    name: '简约黑白',
    colors: ['#F5F5F5', '#E0E0E0', '#CCCCCC', '#B3B3B3', '#999999', '#808080', '#666666', '#4D4D4D'],
  },
  {
    name: '复古胶片',
    colors: ['#E8D5B7', '#C9A96E', '#A67C52', '#8B6914', '#6B4E31', '#4A3728', '#D4C5A9', '#B8A88A'],
  },
]

let idSeq = 0

export function ColorPaletteEditor({
  value,
  minColors = 3,
  maxColors = 10,
  onChange,
}: ColorPaletteEditorProps) {
  const pickerRef = useRef<HTMLInputElement>(null)
  const activeIndexRef = useRef<number>(0)

  const stops: ColorStop[] = value.length >= minColors
    ? value
    : DEFAULT_PALETTE.slice(0, 8)

  const totalRatio = stops.reduce((s, c) => s + c.ratio, 0)
  const isValid = Math.abs(totalRatio - 100) < 0.02

  function update(index: number, patch: Partial<ColorStop>) {
    const next = stops.map((s, i) => (i === index ? { ...s, ...patch } : s))
    onChange(next)
  }

  function setHex(index: number, hex: string) {
    update(index, { hex })
  }

  function setRatio(index: number, ratio: number) {
    const next = stops.map((s, i) => {
      if (i === index) return { ...s, ratio: Math.max(0, Math.min(100, ratio)) }
      return s
    })
    onChange(next)
  }

  function addColor() {
    if (stops.length >= maxColors) return
    // Split the current smallest ratio in half (or default)
    const avg = 100 / (stops.length + 1)
    const adjusted = stops.map((s) => ({ ...s, ratio: Math.round((s.ratio * stops.length) / (stops.length + 1) * 100) / 100 }))
    onChange([...adjusted, { hex: '#888888', ratio: Math.round(avg * 100) / 100 }])
  }

  function removeColor(index: number) {
    if (stops.length <= minColors) return
    const next = stops.filter((_, i) => i !== index)
    // Redistribute the removed ratio equally
    const removedRatio = stops[index].ratio
    const each = removedRatio / next.length
    onChange(next.map((s) => ({ ...s, ratio: Math.round((s.ratio + each) * 100) / 100 })))
  }

  return (
    <div className="gen-colorpal">
      {/* Preset selector */}
      <div className="gen-colorpal__presets">
        <span className="gen-colorpal__presets-label">预设：</span>
        {PRESET_PALETTES.map((p) => (
          <button
            key={p.name}
            type="button"
            className="gen-colorpal__preset"
            onClick={() => {
              const n = stops.length
              const each = Math.round((100 / n) * 100) / 100
              const colors = p.colors.slice(0, n)
              // Adjust last color to make sum = 100
              const sum = each * (n - 1)
              const last = Math.round((100 - sum) * 100) / 100
              const newStops = colors.map((hex, i) => ({
                hex,
                ratio: i < n - 1 ? each : last,
              }))
              onChange(newStops)
            }}
            title={p.name}
          >
            <span className="gen-colorpal__preset-swatch" aria-hidden="true">
              {p.colors.slice(0, 4).map((c) => (
                <span
                  key={c}
                  className="gen-colorpal__swatch-dot"
                  style={{ background: c }}
                />
              ))}
            </span>
            {p.name}
          </button>
        ))}
      </div>

      {/* Color stops */}
      <div className="gen-colorpal__stops">
        {stops.map((stop, idx) => (
          <div className="gen-colorpal__stop" key={idx}>
            <span className="gen-colorpal__stop-index">{idx + 1}</span>
            <label className="gen-colorpal__color-input-wrap">
              <span
                className="gen-colorpal__color-swatch"
                style={{ background: stop.hex }}
                onClick={() => {
                  activeIndexRef.current = idx
                  pickerRef.current?.click()
                }}
              />
              <input
                type="color"
                ref={idx === 0 ? pickerRef : undefined}
                value={stop.hex}
                className="gen-colorpal__color-input"
                onChange={(e) => setHex(idx, e.target.value)}
              />
            </label>
            <input
              type="text"
              className="gen-colorpal__hex-input"
              value={stop.hex}
              maxLength={7}
              onChange={(e) => {
                const v = e.target.value
                if (/^#[0-9a-fA-F]{0,6}$/.test(v)) setHex(idx, v)
              }}
              aria-label={`颜色 ${idx + 1} HEX 值`}
            />
            <input
              type="number"
              className="gen-colorpal__ratio-input"
              value={stop.ratio}
              min={0}
              max={100}
              step={0.01}
              onChange={(e) => setRatio(idx, Number(e.target.value))}
              aria-label={`颜色 ${idx + 1} 占比`}
            />
            <span className="gen-colorpal__percent">%</span>
            {stops.length > minColors && (
              <button
                type="button"
                className="gen-colorpal__remove"
                onClick={() => removeColor(idx)}
                aria-label={`移除颜色 ${idx + 1}`}
              >
                ×
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Add button + total indicator */}
      <div className="gen-colorpal__foot">
        {stops.length < maxColors && (
          <button
            type="button"
            className="gen-colorpal__add"
            onClick={addColor}
          >
            + 添加颜色（{stops.length}/{maxColors}）
          </button>
        )}
        <span className={`gen-colorpal__total ${isValid ? '' : 'gen-colorpal__total--err'}`}>
          合计：{totalRatio.toFixed(2)}% {isValid ? '✓' : '（需等于 100%）'}
        </span>
      </div>

      <input
        type="color"
        className="gen-upload__input"
        ref={pickerRef}
        onChange={(e) => {
          setHex(activeIndexRef.current, e.target.value)
        }}
      />
    </div>
  )
}

/** 默认 8 色调色板 */
const DEFAULT_PALETTE: ColorStop[] = [
  { hex: '#C2D1E6', ratio: 12.5 },
  { hex: '#CDD8E9', ratio: 12.5 },
  { hex: '#B5C8DB', ratio: 12.5 },
  { hex: '#C0B5B4', ratio: 12.5 },
  { hex: '#DAE0EC', ratio: 12.5 },
  { hex: '#636574', ratio: 12.5 },
  { hex: '#CACAD2', ratio: 12.5 },
  { hex: '#CBD4E4', ratio: 12.5 },
]
