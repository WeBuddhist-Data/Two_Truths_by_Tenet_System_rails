import { memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  loadManifest,
  loadQuotes,
  loadRoot,
  useLoad,
  type Manifest,
  type Quote,
  type RootDoc,
  type Segment,
} from './data'
import { RefText, Status, useBringIntoView } from './RefText'
import { useSettings } from './settings'

type SegProps = {
  seg: Segment
  selected: number | null
  hovered: number | null
  target: boolean
  label: string
  onOpen: (q: number, el: HTMLElement) => void
  onHover: (q: number | null) => void
}

const SegmentView = memo(function SegmentView(p: SegProps) {
  return (
      <p className={`block bo cv${p.target ? ' target' : ''}`}>
        {p.seg.map((run, i) => {
          if (run.q !== undefined) {
            const q = run.q
            const cls =
              'quote' + (p.selected === q ? ' selected' : '') + (p.hovered === q ? ' hover' : '')
            return (
              <span
                key={i}
                className={cls}
                data-q={q}
                role="button"
                tabIndex={0}
                aria-label={p.label}
                aria-pressed={p.selected === q}
                onClick={(e) => p.onOpen(q, e.currentTarget)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    p.onOpen(q, e.currentTarget)
                  }
                }}
                onMouseEnter={() => p.onHover(q)}
                onMouseLeave={() => p.onHover(null)}
                onFocus={() => p.onHover(q)}
                onBlur={() => p.onHover(null)}
              >
                {run.t}
              </span>
            )
          }
          if (run.l) {
            return (
              <span key={i} className="locator">
                {run.t}
              </span>
            )
          }
          return run.b ? <strong key={i}>{run.t}</strong> : <span key={i}>{run.t}</span>
        })}
      </p>
  )
})

/** If the panel now covers the quotation (lower split on narrow screens), reveal it. */
function keepVisible(box: HTMLElement, el: HTMLElement) {
  const b = box.getBoundingClientRect()
  const r = el.getBoundingClientRect()
  if (r.bottom > b.bottom - 12) box.scrollTop += Math.min(r.bottom - b.bottom + 12, r.top - b.top - 12)
  else if (r.top < b.top) box.scrollTop += r.top - b.top - 12
}

const WIDTH_KEY = 'two-truths-reader:panel-width'
const PANEL_MIN = 280
const READER_MIN = 320

function storedWidth(): number | null {
  try {
    const n = Number(localStorage.getItem(WIDTH_KEY))
    return n >= PANEL_MIN ? n : null
  } catch {
    return null
  }
}

type Bundle = { root: RootDoc; quotes: Quote[]; manifest: Manifest }
const loadBundle = async (): Promise<Bundle> => {
  const [root, quotes, manifest] = await Promise.all([loadRoot(), loadQuotes(), loadManifest()])
  return { root, quotes, manifest }
}

export function RootReader() {
  const { t } = useSettings()
  const { data, error, retry } = useLoad(loadBundle, 'root')
  const [params] = useSearchParams()
  const targetSeg = params.has('seg') ? Number(params.get('seg')) : undefined

  const [selected, setSelected] = useState<number | null>(null)
  const [hovered, setHovered] = useState<number | null>(null)
  const scroller = useRef<HTMLDivElement>(null)
  const panel = useRef<HTMLElement>(null)
  /** Where the clicked quotation sat on screen, so it can be kept there. */
  const anchor = useRef<{ q: number; top: number } | null>(null)
  const lastSelected = useRef<number | null>(null)

  const split = useRef<HTMLDivElement>(null)
  const [panelWidth, setPanelWidth] = useState<number | null>(storedWidth)

  /** Set the panel width, keeping the open quotation where it is on screen. */
  const applyWidth = useCallback(
    (px: number | null, commit: boolean) => {
      const root = split.current
      const box = scroller.current
      if (!root || !box) return
      const w =
        px === null ? null : Math.round(Math.max(PANEL_MIN, Math.min(px, root.clientWidth - READER_MIN - 7)))
      const el = selected === null ? null : box.querySelector<HTMLElement>(`[data-q="${selected}"]`)
      const top = el?.getBoundingClientRect().top
      if (w === null) root.style.removeProperty('--panel-w')
      else root.style.setProperty('--panel-w', `${w}px`)
      if (el && top !== undefined) box.scrollTop += el.getBoundingClientRect().top - top
      if (commit) {
        setPanelWidth(w)
        try {
          if (w === null) localStorage.removeItem(WIDTH_KEY)
          else localStorage.setItem(WIDTH_KEY, String(w))
        } catch {
          /* width just is not remembered */
        }
        // Lets both texts re-centre on what is open, as after a window resize.
        window.dispatchEvent(new Event('resize'))
      }
    },
    [selected],
  )

  const startDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    const root = split.current
    if (!root) return
    e.preventDefault()
    const handle = e.currentTarget
    handle.setPointerCapture(e.pointerId)
    handle.classList.add('dragging')
    root.classList.add('resizing')
    const widthAt = (x: number) => root.getBoundingClientRect().right - x
    const move = (ev: PointerEvent) => applyWidth(widthAt(ev.clientX), false)
    const end = (ev: PointerEvent) => {
      handle.removeEventListener('pointermove', move)
      handle.removeEventListener('pointerup', end)
      handle.removeEventListener('pointercancel', end)
      handle.classList.remove('dragging')
      root.classList.remove('resizing')
      applyWidth(widthAt(ev.clientX), true)
    }
    handle.addEventListener('pointermove', move)
    handle.addEventListener('pointerup', end)
    handle.addEventListener('pointercancel', end)
  }

  const nudge = (e: React.KeyboardEvent) => {
    const step = e.key === 'ArrowLeft' ? 32 : e.key === 'ArrowRight' ? -32 : 0
    if (!step || !panel.current) return
    e.preventDefault()
    applyWidth(panel.current.getBoundingClientRect().width + step, true)
  }

  const open = useCallback((q: number, el: HTMLElement) => {
    anchor.current = { q, top: el.getBoundingClientRect().top }
    setSelected(q)
  }, [])

  const close = useCallback(() => setSelected(null), [])

  // The panel changes the reader's width, which reflows the text. Put the clicked
  // quotation back where it was so the reader does not lose their place.
  useLayoutEffect(() => {
    const fix = () => {
      const a = anchor.current
      const box = scroller.current
      if (!a || !box) return
      const el = box.querySelector<HTMLElement>(`[data-q="${a.q}"]`)
      if (!el) return
      box.scrollTop += el.getBoundingClientRect().top - a.top
      keepVisible(box, el)
    }
    fix()
    const id = requestAnimationFrame(() => {
      fix()
      if (selected === null) anchor.current = null
    })
    return () => cancelAnimationFrame(id)
  }, [selected])

  // Focus goes into the panel when it opens and back to the quotation when it closes.
  useEffect(() => {
    if (selected !== null) {
      if (lastSelected.current === null) panel.current?.focus({ preventScroll: true })
    } else if (lastSelected.current !== null) {
      const q = lastSelected.current
      const el = scroller.current?.querySelector<HTMLElement>(`[data-q="${q}"]`)
      if (el) {
        anchor.current = { q, top: el.getBoundingClientRect().top }
        el.focus({ preventScroll: true })
      }
    }
    lastSelected.current = selected
  }, [selected])

  // Rotating or resizing reflows the text: keep the open quotation on screen.
  useEffect(() => {
    if (selected === null) return
    const onResize = () => {
      const box = scroller.current
      const el = box?.querySelector<HTMLElement>(`[data-q="${selected}"]`)
      if (box && el) {
        keepVisible(box, el)
        anchor.current = { q: selected, top: el.getBoundingClientRect().top }
      }
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [selected])

  useEffect(() => {
    if (selected === null) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close()
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [selected, close])

  const quote = data && selected !== null ? data.quotes[selected] : null
  const refTitle = useMemo(
    () => (quote ? data?.manifest.refs.find((r) => r.id === quote.ref)?.title : undefined),
    [quote, data],
  )

  // Which segments hold which quotation, so that hovering or selecting one
  // re-renders only the segments it touches.
  const segQuotes = useMemo(
    () => data?.root.segments.map((seg) => new Set(seg.flatMap((r) => (r.q === undefined ? [] : [r.q])))),
    [data],
  )

  useBringIntoView(scroller, '.block.target', !!data && targetSeg !== undefined, [data, targetSeg])

  if (!data) return <Status error={error} retry={retry} />

  return (
    <div
      className={quote ? 'split open' : 'split'}
      ref={split}
      style={panelWidth === null ? undefined : ({ '--panel-w': `${panelWidth}px` } as React.CSSProperties)}
    >
      <section className="reader" aria-label={t.rootText}>
        <div className="scroller" ref={scroller}>
          <div className="col">
            <div className="text-title">
              <div className="kicker">{t.rootText}</div>
              <h1 className="bo">{data.root.title}</h1>
            </div>
            {data.root.segments.map((seg, i) => {
              const own = segQuotes![i]
              return (
                <SegmentView
                  key={i}
                  seg={seg}
                  selected={selected !== null && own.has(selected) ? selected : null}
                  hovered={hovered !== null && own.has(hovered) ? hovered : null}
                  target={i === targetSeg}
                  label={t.openSource}
                  onOpen={open}
                  onHover={setHovered}
                />
              )
            })}
            <div className="end-space" />
          </div>
        </div>
      </section>
      {quote && (
        <div
          className="resizer"
          role="separator"
          aria-orientation="vertical"
          aria-label={t.resizePanel}
          title={t.resizePanel}
          tabIndex={0}
          onPointerDown={startDrag}
          onKeyDown={nudge}
          onDoubleClick={() => applyWidth(null, true)}
        />
      )}
      {quote && (
        <aside className="panel" ref={panel} tabIndex={-1} aria-label={`${t.source}: ${refTitle}`}>
          <div className="panel-head">
            <div className="panel-titles">
              <div className="kicker">{t.source}</div>
              <div className="panel-title bo">{refTitle}</div>
            </div>
            <button className="icon-btn" aria-label={t.close} onClick={close}>
              <svg viewBox="0 0 20 20" aria-hidden="true">
                <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              </svg>
            </button>
          </div>
          <RefText key={quote.ref} refId={quote.ref} highlight={quote.lines} />
        </aside>
      )}
    </div>
  )
}
