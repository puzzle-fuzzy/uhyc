import { useState } from 'react'
import type { UseAuth } from '@uhyc/shared'

type Mode = 'login' | 'register'

interface AuthCardProps {
  auth: UseAuth
  /** Called after a successful login/register (host decides where to navigate). */
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
      setFormError(err instanceof Error ? err.message : 'Something went wrong.')
    }
  }

  const shownError = formError ?? auth.error

  return (
    <div className="uhyc-card form-card">
      <div className="uhyc-tabs" role="tablist">
        <button
          type="button"
          className={`uhyc-tab ${isLogin ? 'uhyc-tab--active' : ''}`}
          onClick={() => {
            setMode('login')
            setFormError(null)
          }}
          role="tab"
        >
          Log in
        </button>
        <button
          type="button"
          className={`uhyc-tab ${!isLogin ? 'uhyc-tab--active' : ''}`}
          onClick={() => {
            setMode('register')
            setFormError(null)
          }}
          role="tab"
        >
          Sign up
        </button>
      </div>

      <div className="uhyc-card__body">
        <h2 className="uhyc-card__heading">
          {isLogin ? 'Welcome back' : 'Create your account'}
        </h2>
        <p className="uhyc-card__hint">
          {isLogin
            ? 'Enter your username or email to continue.'
            : 'Pick a username — you can use it to sign in later.'}
        </p>

        {shownError && (
          <div className="uhyc-alert uhyc-alert--error" role="alert">
            {shownError}
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          {isLogin ? (
            <label className="uhyc-field">
              <span className="uhyc-field__label">Username or email</span>
              <input
                className="uhyc-input"
                name="emailOrUsername"
                type="text"
                placeholder="alice"
                autoFocus
                autoComplete="username"
              />
            </label>
          ) : (
            <>
              <label className="uhyc-field">
                <span className="uhyc-field__label">Username</span>
                <input
                  className="uhyc-input"
                  name="username"
                  type="text"
                  placeholder="alice"
                  autoFocus
                  autoComplete="username"
                />
              </label>
              <label className="uhyc-field">
                <span className="uhyc-field__label">Email</span>
                <input
                  className="uhyc-input"
                  name="email"
                  type="email"
                  placeholder="alice@uhyc.dev"
                  autoComplete="email"
                />
              </label>
            </>
          )}

          <label className="uhyc-field">
            <span className="uhyc-field__label">Password</span>
            <input
              className="uhyc-input"
              name="password"
              type="password"
              placeholder={isLogin ? '••••••••' : 'at least 8 chars'}
              minLength={isLogin ? undefined : 8}
              autoComplete={isLogin ? 'current-password' : 'new-password'}
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
              'Continue'
            ) : (
              'Create account'
            )}
          </button>
        </form>
      </div>
    </div>
  )
}
