import { useState } from 'react'
import type { UseAuth } from '@uhyc/shared'

type Mode = 'login' | 'register'

interface AuthCardProps {
  auth: UseAuth
  /** Called after a successful login/register. */
  onSuccess: () => void
}

export function AuthCard({ auth, onSuccess }: AuthCardProps) {
  const [mode, setMode] = useState<Mode>('login')
  const [formError, setFormError] = useState<string | null>(null)
  const isLogin = mode === 'login'

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setFormError(null)
    const data = new FormData(e.currentTarget)

    try {
      if (isLogin) {
        await auth.login({
          emailOrUsername: String(data.get('emailOrUsername') ?? ''),
          password: String(data.get('password') ?? ''),
        })
      } else {
        await auth.register({
          username: String(data.get('username') ?? ''),
          email: String(data.get('email') ?? ''),
          password: String(data.get('password') ?? ''),
        })
      }
      onSuccess()
    } catch (err) {
      setFormError(err instanceof Error ? err.message : '出了点问题，请稍后重试')
    }
  }

  const shownError = formError ?? auth.error
  const TAB_LOGIN = 'tab-login'
  const TAB_REGISTER = 'tab-register'
  const TABPANEL_ID = 'auth-form-panel'
  const ERROR_ID = 'auth-error'

  return (
    <div className="uhyc-card form-card">
      <div className="uhyc-tabs" role="tablist">
        <button
          type="button"
          id={TAB_LOGIN}
          className={`uhyc-tab ${isLogin ? 'uhyc-tab--active' : ''}`}
          onClick={() => {
            setMode('login')
            setFormError(null)
          }}
          role="tab"
          aria-selected={isLogin}
          aria-controls={TABPANEL_ID}
        >
          登录
        </button>
        <button
          type="button"
          id={TAB_REGISTER}
          className={`uhyc-tab ${!isLogin ? 'uhyc-tab--active' : ''}`}
          onClick={() => {
            setMode('register')
            setFormError(null)
          }}
          role="tab"
          aria-selected={!isLogin}
          aria-controls={TABPANEL_ID}
        >
          注册
        </button>
      </div>

      <div
        id={TABPANEL_ID}
        className="uhyc-card__body"
        role="tabpanel"
        aria-labelledby={isLogin ? TAB_LOGIN : TAB_REGISTER}
      >
        <h2 className="uhyc-card__heading">
          {isLogin ? '欢迎回来' : '创建账号'}
        </h2>
        <p className="uhyc-card__hint">
          {isLogin
            ? '输入用户名或邮箱以继续'
            : '设置用户名，之后可用它登录'}
        </p>

        {shownError && (
          <div id={ERROR_ID} className="uhyc-alert uhyc-alert--error" role="alert">
            {shownError}
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          {isLogin ? (
            <label className="uhyc-field">
              <span className="uhyc-field__label">用户名或邮箱</span>
              <input
                className="uhyc-input"
                name="emailOrUsername"
                type="text"
                placeholder="alice"
                autoFocus
                autoComplete="username"
                required
                aria-required="true"
                aria-describedby={shownError ? ERROR_ID : undefined}
              />
            </label>
          ) : (
            <>
              <label className="uhyc-field">
                <span className="uhyc-field__label">用户名</span>
                <input
                  className="uhyc-input"
                  name="username"
                  type="text"
                  placeholder="alice"
                  autoFocus
                  autoComplete="username"
                  required
                  aria-required="true"
                  aria-describedby={shownError ? ERROR_ID : undefined}
                />
              </label>
              <label className="uhyc-field">
                <span className="uhyc-field__label">邮箱</span>
                <input
                  className="uhyc-input"
                  name="email"
                  type="email"
                  placeholder="alice@uhyc.dev"
                  autoComplete="email"
                  required
                  aria-required="true"
                  aria-describedby={shownError ? ERROR_ID : undefined}
                />
              </label>
            </>
          )}

          <label className="uhyc-field">
            <span className="uhyc-field__label">密码</span>
            <input
              className="uhyc-input"
              name="password"
              type="password"
              placeholder={isLogin ? '••••••••' : '至少 8 个字符'}
              minLength={isLogin ? undefined : 8}
              required
              aria-required="true"
              autoComplete={isLogin ? 'current-password' : 'new-password'}
              aria-describedby={shownError ? ERROR_ID : undefined}
            />
          </label>

          <button
            type="submit"
            className="uhyc-btn uhyc-btn--accent"
            disabled={auth.busy}
          >
            {auth.busy ? (
              <span className="uhyc-spinner" />
            ) : isLogin ? (
              '登录'
            ) : (
              '创建账号'
            )}
          </button>
        </form>
      </div>
    </div>
  )
}
