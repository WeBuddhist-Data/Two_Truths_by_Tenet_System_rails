import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { strings, type Lang, type Strings } from './i18n'

export type Theme = 'light' | 'dark'
export const FONT_MIN = 16
export const FONT_MAX = 36
const FONT_DEFAULT = 22

type Settings = {
  lang: Lang
  theme: Theme
  fontSize: number
  t: Strings
  setLang: (l: Lang) => void
  setTheme: (t: Theme) => void
  setFontSize: (n: number) => void
}

const KEY = 'two-truths-reader:settings'
const Ctx = createContext<Settings | null>(null)

function read(): { lang: Lang; theme: Theme; fontSize: number } {
  const fallback = { lang: 'en' as Lang, theme: 'light' as Theme, fontSize: FONT_DEFAULT }
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? '{}')
    return {
      lang: raw.lang === 'bo' ? 'bo' : 'en',
      theme: raw.theme === 'dark' ? 'dark' : 'light',
      fontSize:
        typeof raw.fontSize === 'number'
          ? Math.min(FONT_MAX, Math.max(FONT_MIN, raw.fontSize))
          : FONT_DEFAULT,
    }
  } catch {
    return fallback
  }
}

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [s, setS] = useState(read)

  useEffect(() => {
    const el = document.documentElement
    el.dataset.theme = s.theme
    el.lang = s.lang
    el.style.setProperty('--text-size', `${s.fontSize}px`)
    try {
      localStorage.setItem(KEY, JSON.stringify(s))
    } catch {
      /* storage unavailable: settings last for this visit only */
    }
  }, [s])

  const value = useMemo<Settings>(
    () => ({
      ...s,
      t: strings[s.lang],
      setLang: (lang) => setS((p) => ({ ...p, lang })),
      setTheme: (theme) => setS((p) => ({ ...p, theme })),
      setFontSize: (n) =>
        setS((p) => ({ ...p, fontSize: Math.min(FONT_MAX, Math.max(FONT_MIN, n)) })),
    }),
    [s],
  )
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useSettings(): Settings {
  const v = useContext(Ctx)
  if (!v) throw new Error('SettingsProvider missing')
  return v
}
