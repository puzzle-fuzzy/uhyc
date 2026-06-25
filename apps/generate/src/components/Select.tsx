import { useEffect, useRef, useState } from 'react'

interface SelectOption {
  label: string
  value: unknown
}

interface SelectProps {
  value: string
  options: SelectOption[]
  onChange: (value: unknown) => void
  placeholder?: string
}

/**
 * Fully custom dropdown (no native <select>). Button trigger + popover list,
 * styled to match the neo-brutalist aesthetic. Closes on outside click / Esc.
 */
export function Select({ value, options, onChange, placeholder }: SelectProps) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLUListElement>(null)

  useEffect(() => {
    if (!open) return
    function onDoc(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    function onEsc(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onEsc)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onEsc)
    }
  }, [open])

  // 下拉打开时自动滚动到选中项
  useEffect(() => {
    if (!open) return
    requestAnimationFrame(() => {
      const activeEl = listRef.current?.querySelector('.gen-dropdown__option--active') as HTMLElement | null
      if (activeEl) {
        activeEl.scrollIntoView({ block: 'center' })
      }
    })
  }, [open])

  const selected = options.find((o) => String(o.value) === value)

  return (
    <div className="gen-dropdown" ref={rootRef}>
      <button
        type="button"
        className={`uhyc-input gen-dropdown__btn ${open ? 'gen-dropdown__btn--open' : ''}`}
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span>{selected?.label ?? placeholder ?? '请选择'}</span>
        <svg
          className={`gen-dropdown__chevron ${open ? 'gen-dropdown__chevron--up' : ''}`}
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            d="M6 9l6 6 6-6"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
      {open && (
        <ul className="gen-dropdown__list" role="listbox" ref={listRef}>
          {options.map((o) => {
            const active = String(o.value) === value
            return (
              <li key={String(o.value)} role="option" aria-selected={active}>
                <button
                  type="button"
                  className={`gen-dropdown__option ${active ? 'gen-dropdown__option--active' : ''}`}
                  onClick={() => {
                    onChange(o.value)
                    setOpen(false)
                  }}
                >
                  {o.label}
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
