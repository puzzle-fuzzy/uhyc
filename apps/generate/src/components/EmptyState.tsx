import { useEffect, useRef, useState } from 'react'

interface KaomojiMeta {
  face: string
  color: string
}

const KAOMOJIS: KaomojiMeta[] = [
  { face: '(◕‿◕)',       color: 'var(--purple)' },
  { face: '(╯°□°)╯',     color: 'var(--cyan)' },
  { face: 'ʕ•ᴥ•ʔ',       color: 'var(--pink)' },
  { face: '(≧∇≦)',       color: '#ffe066' },
  { face: '┐(￣ヮ￣)┌',   color: 'var(--ink)' },
  { face: '(｡•̀ᴗ-)✧',    color: 'var(--purple-soft)' },
]

const MESSAGES = [
  '去左边搞点创作吧 ✨',
  '灵感在等你，快试试吧',
  'AI 已经饥渴难耐了',
  '空白画廊，等待你的第一幅杰作',
  '按 ? 查看快捷键，然后开搞',
  '左边的模型在向你招手',
]

/** 随机挑一个退场动画后缀 */
function randomSwapVariant(): string {
  const variants = ['squish', 'spin', 'pop']
  return variants[Math.floor(Math.random() * variants.length)]
}

/** 空状态：单色块 + 颜文字轮换 + 滚动文案 */
export function EmptyState() {
  const [faceIdx, setFaceIdx] = useState(0)
  const [msgIdx, setMsgIdx] = useState(0)
  const [swapping, setSwapping] = useState(false)
  const swapVariant = useRef('squish')

  // 颜文字轮换
  useEffect(() => {
    const t = setInterval(() => {
      swapVariant.current = randomSwapVariant()
      setSwapping(true)
      setTimeout(() => {
        setFaceIdx((i) => (i + 1) % KAOMOJIS.length)
        setSwapping(false)
      }, 350)
    }, 3500)
    return () => clearInterval(t)
  }, [])

  // 文案轮换
  useEffect(() => {
    const t = setInterval(() => {
      setMsgIdx((i) => (i + 1) % MESSAGES.length)
    }, 4000)
    return () => clearInterval(t)
  }, [])

  const current = KAOMOJIS[faceIdx]
  const isInk = current.color === 'var(--ink)'

  return (
    <div className="gen-empty-scene">
      <div className="gen-empty-scene__stage" aria-hidden="true">
        <div
          className={`gen-empty-blob${swapping ? ` gen-empty-blob--swap gen-empty-blob--${swapVariant.current}` : ''}`}
          style={{ background: current.color }}
        >
          <span
            className="gen-empty-blob__face"
            key={faceIdx}
            style={isInk ? { color: 'var(--paper)' } : undefined}
          >
            {current.face}
          </span>
        </div>

        <p className="gen-empty-scene__text" key={msgIdx}>
          {MESSAGES[msgIdx]}
        </p>
      </div>
    </div>
  )
}
