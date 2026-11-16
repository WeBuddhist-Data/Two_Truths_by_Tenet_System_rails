import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Link, NavLink, Route, Routes, useNavigate, useSearchParams } from 'react-router-dom'
import { FONT_MAX, FONT_MIN, useSettings } from './settings'
import { RootReader } from './RootReader'
import { Landing, RefList, RefReader, SearchPage } from './views'

function SettingsMenu() {
  const { t, theme, setTheme, fontSize, setFontSize } = useSettings()
  const [open, setOpen] = useState(false)
  const box = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (!box.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div className="menu" ref={box}>
      <button
        className="icon-btn"
        aria-label={t.settings}
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <span className="aa">A</span>
      </button>
      {open && (
        <div className="menu-pop" role="group" aria-label={t.settings}>
          <div className="menu-label">{t.fontSize}</div>
          <div className="seg">
            <button
              aria-label={t.smaller}
              disabled={fontSize <= FONT_MIN}
              onClick={() => setFontSize(fontSize - 2)}
            >
              <span className="a-small">A</span>
            </button>
            <button
              aria-label={t.larger}
              disabled={fontSize >= FONT_MAX}
              onClick={() => setFontSize(fontSize + 2)}
            >
              <span className="a-large">A</span>
            </button>
          </div>
          <div className="menu-label">{t.theme}</div>
          <div className="seg">
            <button aria-pressed={theme === 'light'} onClick={() => setTheme('light')}>
              {t.light}
            </button>
            <button aria-pressed={theme === 'dark'} onClick={() => setTheme('dark')}>
              {t.dark}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function Header() {
  const { t, lang, setLang } = useSettings()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const [q, setQ] = useState(params.get('q') ?? '')

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (q.trim()) navigate(`/search?q=${encodeURIComponent(q.trim())}`)
  }

  return (
    <header className="header">
      <Link to="/" className="brand">
        {t.appName}
      </Link>
      <nav className="nav">
        <NavLink to="/root">{t.rootText}</NavLink>
        <NavLink to="/references">{t.referenceTexts}</NavLink>
      </nav>
      <form className="search" role="search" onSubmit={submit}>
        <svg viewBox="0 0 20 20" aria-hidden="true">
          <circle cx="8.5" cy="8.5" r="5.5" fill="none" stroke="currentColor" strokeWidth="1.6" />
          <path d="M13 13l4.5 4.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t.searchPlaceholder}
          aria-label={t.search}
          lang="bo"
        />
      </form>
      <SettingsMenu />
      <div className="seg lang" role="group" aria-label={t.language}>
        <button aria-pressed={lang === 'en'} onClick={() => setLang('en')}>
          EN
        </button>
        <button aria-pressed={lang === 'bo'} onClick={() => setLang('bo')} lang="bo">
          བོད།
        </button>
      </div>
    </header>
  )
}

export function App() {
  const { t } = useSettings()
  return (
    <div className="app">
      <Header />
      <main className="main">
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/root" element={<RootReader />} />
          <Route path="/references" element={<RefList />} />
          <Route path="/references/:id" element={<RefReader />} />
          <Route path="/search" element={<SearchPage />} />
          <Route path="*" element={<p className="status">{t.notFound}</p>} />
        </Routes>
      </main>
    </div>
  )
}
