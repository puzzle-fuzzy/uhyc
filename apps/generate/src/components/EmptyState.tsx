import { useEffect, useState } from 'react'

const MESSAGES = [
  '去左边搞点创作吧 ✨',
  '灵感在等你，快试试吧',
  'AI 已经饥渴难耐了',
  '空白画廊，等待你的第一幅杰作',
  '按 ? 查看快捷键，然后开搞',
  '左边的模型在向你招手',
]

/** 空状态：动效场景 + 滚动文案 */
export function EmptyState() {
  const [msgIdx, setMsgIdx] = useState(0)

  useEffect(() => {
    const t = setInterval(() => {
      setMsgIdx((i) => (i + 1) % MESSAGES.length)
    }, 4000)
    return () => clearInterval(t)
  }, [])

  return (
    <div className="gen-empty-scene">
      {/* 场景容器 */}
      <div className="gen-empty-scene__stage" aria-hidden="true">
        {/* 虚线画框 */}
        <div className="gen-empty-frame">
          {/* 在画框内游荡的光标 */}
          <div className="gen-empty-cursor" />
        </div>

        {/* 四个色块：来自 logo 的方块，各自动画 */}
        <div className="gen-empty-blocks">
          <div className="gen-empty-block gen-empty-block--purple">
            <span className="gen-empty-block__face">:D</span>
          </div>
          <div className="gen-empty-block gen-empty-block--cyan">
            <span className="gen-empty-block__face">{'>_<'}</span>
          </div>
          <div className="gen-empty-block gen-empty-block--pink">
            <span className="gen-empty-block__face">:P</span>
          </div>
          <div className="gen-empty-block gen-empty-block--ink">
            <span className="gen-empty-block__face">B)</span>
          </div>
        </div>
      </div>

      {/* 文案 */}
      <p className="gen-empty-scene__text" key={msgIdx}>
        {MESSAGES[msgIdx]}
      </p>
    </div>
  )
}
