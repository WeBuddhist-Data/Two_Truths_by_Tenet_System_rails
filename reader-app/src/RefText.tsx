import { memo, useEffect, useMemo, useRef, useState, type RefObject } from 'react'
import { loadRef, useLoad, type RefBlock, type RefDoc } from './data'
import { useSettings } from './settings'

export function Status({ error, retry }: { error?: Error; retry: () => void }) {
  const { t } = useSettings()
  return error ? (
    <div className="status" role="alert">
      <p>{t.loadError}</p>
      <button className="btn" onClick={retry}>
        {t.retry}
      </button>
    </div>
  ) : (
    <p className="status" aria-live="polite">
      {t.loading}
    </p>
  )
}

/**
 * Bring the first element matching `selector` into view inside `box` and hold it
 * there while off-screen blocks settle to their real heights. Stops once the position
 * is stable, or as soon as the reader scrolls by hand.
 */
export function useBringIntoView(
  box: RefObject<HTMLElement | null>,
  selector: string,
  active: boolean,
  deps: unknown[],
) {
  useEffect(() => {
    const el = box.current
    if (!active || !el) return
    let stable = 0
    let tries = 0
    let timer = 0
    const stop = () => window.clearTimeout(timer)
    const step = () => {
      const mark = el.querySelector<HTMLElement>(selector)
      if (!mark) return
      const m = mark.getBoundingClientRect()
      const v = el.getBoundingClientRect()
      const wanted = v.top + Math.max(24, (v.height - Math.min(m.height, v.height)) / 3)
      const delta = m.top - wanted
      const before = el.scrollTop
      if (Math.abs(delta) > 4) el.scrollTop += delta
      if (el.scrollTop === before) stable++
      else stable = 0
      if (stable < 3 && ++tries < 40) timer = window.setTimeout(step, 40)
    }
    step()
    const events = ['wheel', 'touchstart', 'pointerdown', 'keydown'] as const
    events.forEach((e) => el.addEventListener(e, stop, { passive: true }))
    return () => {
      stop()
      events.forEach((e) => el.removeEventListener(e, stop))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, selector, ...deps])
}

/** Index of the block that contains source-file line `line`. */
function blockOfLine(doc: RefDoc, line: number): number {
  let lo = 0
  let hi = doc.blocks.length - 1
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1
    if (doc.blocks[mid].s <= line) lo = mid
    else hi = mid - 1
  }
  return lo
}

/** `marks` lists the highlighted line offsets of this block, e.g. "0,1,2". */
const Block = memo(function Block(p: { block: RefBlock; marks: string; target: boolean }) {
  if (p.block.h) return <h2 className="ref-heading bo cv">{p.block.l[0]}</h2>
  const on = p.marks ? new Set(p.marks.split(',').map(Number)) : null
  return (
    <p className={`block bo cv${p.target ? ' target' : ''}`}>
      {p.block.l.map((line, k) => (
        <span key={k} className={on?.has(k) ? 'line hl' : 'line'}>
          {line}
        </span>
      ))}
    </p>
  )
})

type Props = {
  refId: string
  /** Source-file line numbers to highlight (the quoted pādas). */
  highlight?: number[]
  /** Block to bring into view (search result). */
  targetBlock?: number
}

/** A full reference text, optionally positioned at a quoted stanza. */
export const RefText = memo(function RefText({ refId, highlight, targetBlock }: Props) {
  const { data: doc, error, retry } = useLoad(() => loadRef(refId), refId)
  const box = useRef<HTMLDivElement>(null)

  const marks = useMemo(() => {
    const byBlock = new Map<number, number[]>()
    if (doc && highlight) {
      for (const line of highlight) {
        const b = blockOfLine(doc, line)
        byBlock.set(b, [...(byBlock.get(b) ?? []), line - doc.blocks[b].s])
      }
    }
    return byBlock
  }, [doc, highlight])

  // Re-centre after a resize or rotation, which reflows the text.
  const [resized, setResized] = useState(0)
  useEffect(() => {
    const onResize = () => setResized((n) => n + 1)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  useBringIntoView(box, '.hl, .target', !!doc, [doc, highlight, targetBlock, resized])

  if (!doc) return <Status error={error} retry={retry} />

  return (
    <div className="scroller" ref={box} tabIndex={0}>
      <div className="col">
        {doc.blocks.map((block, i) => (
          <Block
            key={i}
            block={block}
            marks={marks.get(i)?.join(',') ?? ''}
            target={!highlight && i === targetBlock}
          />
        ))}
        <div className="end-space" />
      </div>
    </div>
  )
})
