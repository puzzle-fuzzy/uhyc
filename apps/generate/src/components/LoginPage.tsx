import { useNavigate } from 'react-router-dom'
import { useAuthContext } from './AuthContext'
import { AuthCard } from './AuthCard'

const LOGO_SVG = (
  <svg viewBox="0 0 32 32" fill="none" aria-hidden="true">
    <rect x="3" y="3" width="11" height="11" rx="2" fill="#cba0ff" stroke="#0a0a0a" strokeWidth="2.5" />
    <rect x="18" y="3" width="11" height="11" rx="2" fill="#93ecff" stroke="#0a0a0a" strokeWidth="2.5" />
    <rect x="3" y="18" width="11" height="11" rx="2" fill="#ffaef3" stroke="#0a0a0a" strokeWidth="2.5" />
    <rect x="18" y="18" width="11" height="11" rx="2" fill="#0a0a0a" />
  </svg>
)

/** 全屏品牌展示面板（登录页背景） */
export function BrandPanel() {
  return (
    <div className="brand">
      <div className="nodes" aria-hidden="true">
        <div className="node node--1">AI 图片</div>
        <div className="node node--2">视频生成</div>
        <div className="node node--3">音乐创作</div>
      </div>
      <div className="brand__logo">
        {LOGO_SVG}
        <span>uhyc</span>
      </div>
      <h1 className="brand__title">
        用 AI 创造<span className="brand__title-highlight">媒体</span>
      </h1>
      <p className="brand__sub">
        基于百炼模型平台，一站式生成图片、视频和音乐。选模型，调参数，提交即可。
      </p>
    </div>
  )
}

/** 全屏登录页：品牌背景 + 居中登录模态框 */
export function LoginPage() {
  const auth = useAuthContext()
  const navigate = useNavigate()

  // 如果已登录，自动跳回首页
  if (auth.status === 'authenticated' && auth.user) {
    return null // 让 ProtectedRoute 或 Navigate 处理
  }

  if (auth.status === 'loading') {
    return (
      <main className="form-panel">
        <span className="uhyc-spinner" style={{ margin: '0 auto' }} />
      </main>
    )
  }

  return (
    <div className="login-page">
      <BrandPanel />
      <div className="login-overlay">
        <AuthCard auth={auth} onSuccess={() => navigate('/')} />
      </div>
    </div>
  )
}
