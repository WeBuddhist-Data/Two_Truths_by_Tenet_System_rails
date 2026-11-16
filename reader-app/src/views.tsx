import { useEffect, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { loadManifest, loadRef, loadRoot, useLoad, type Manifest } from './data'
import { RefText, Status } from './RefText'
import {
  MAX_HITS_PER_TEXT,
  normaliseQuery,
  refBlocks,
  rootBlocks,
  searchBlocks,
  type TextHits,
} from './search'
import { useSettings } from './settings'

export function Landing() {
  const { t } = useSettings()
  const { data: m, error, retry } = useLoad(loadManifest, 'manifest')
  if (!m) return <Status error={error} retry={retry} />
  return (
    <div className="page">
      <div className="landing">
        <h1 className="landing-title">{t.startLearning}</h1>
        <div className="cards">
          <Link to="/root" className="card card-root">
            <span className="kicker">{t.rootText}</span>
            <span className="card-title bo">{m.rootTitle}</span>
          </Link>
          <Link to="/references" className="card card-refs">
            <span className="kicker">{t.referenceCount(m.refs.length)}</span>
            <span className="card-title">{t.referenceTexts}</span>
          </Link>
        </div>
      </div>
    </div>
  )
}

export function RefList() {
  const { t } = useSettings()
  const { data: m, error, retry } = useLoad(loadManifest, 'manifest')
  if (!m) return <Status error={error} retry={retry} />
  return (
    <div className="page">
      <div className="col">
        <div className="text-title">
          <h1>{t.referenceTexts}</h1>
        </div>
        <ul className="ref-list">
          {m.refs.map((r) => (
            <li key={r.id}>
              <Link to={`/references/${r.id}`} className="bo">
                {r.title}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

export function RefReader() {
  const { t } = useSettings()
  const { id = '' } = useParams()
  const [params] = useSearchParams()
  const { data: m, error, retry } = useLoad(loadManifest, 'manifest')
  if (!m) return <Status error={error} retry={retry} />
  const meta = m.refs.find((r) => r.id === id)
  if (!meta) return <p className="status">{t.notFound}</p>
  return (
    <section className="reader solo" aria-label={meta.title}>
      <div className="reader-head">
        <Link to="/references" className="back">
          ‹ {t.back}
        </Link>
        <div className="reader-head-title bo">{meta.title}</div>
        <span className="back-spacer" aria-hidden="true" />
      </div>
      <RefText
        key={id}
        refId={id}
        targetBlock={params.has('b') ? Number(params.get('b')) : undefined}
      />
    </section>
  )
}

type Group = { key: string; title: string; to: (index: number) => string; result: TextHits }

function useSearch(query: string, m: Manifest | undefined) {
  const [state, setState] = useState<{
    query: string
    done: number
    groups?: Group[]
    error?: Error
  }>({ query, done: 0 })
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    if (!m || !query) return
    let live = true
    setState({ query, done: 0 })
    let done = 0
    const tick = <T,>(v: T) => {
      done++
      if (live) setState((s) => (s.query === query ? { ...s, done } : s))
      return v
    }
    Promise.all([
      loadRoot().then(tick),
      ...m.refs.map((r) => loadRef(r.id).then(tick)),
    ]).then(
      ([root, ...refs]) => {
        if (!live) return
        const groups: Group[] = [
          {
            key: 'root',
            title: root.title,
            to: (i: number) => `/root?seg=${i}`,
            result: searchBlocks(rootBlocks(root), query),
          },
          ...refs.map((doc) => ({
            key: doc.id,
            title: doc.title,
            to: (i: number) => `/references/${doc.id}?b=${i}`,
            result: searchBlocks(refBlocks(doc), query),
          })),
        ].filter((g) => g.result.total > 0)
        setState({ query, done, groups })
      },
      (error: Error) => live && setState({ query, done, error }),
    )
    return () => {
      live = false
    }
  }, [query, m, attempt])

  return { ...(state.query === query ? state : { query, done: 0 }), retry: () => setAttempt((n) => n + 1) } as {
    query: string
    done: number
    groups?: Group[]
    error?: Error
    retry: () => void
  }
}

export function SearchPage() {
  const { t } = useSettings()
  const [params] = useSearchParams()
  const query = normaliseQuery(params.get('q') ?? '')
  const manifest = useLoad(loadManifest, 'manifest')
  const s = useSearch(query, manifest.data)

  let body
  if (!query) body = <p className="status">{t.enterQuery}</p>
  else if (manifest.error || s.error)
    body = <Status error={manifest.error ?? s.error} retry={manifest.error ? manifest.retry : s.retry} />
  else if (!s.groups)
    body = (
      <p className="status" aria-live="polite">
        {t.searching(s.done, (manifest.data?.refs.length ?? 0) + 1)}
      </p>
    )
  else if (s.groups.length === 0) body = <p className="status">{t.noResults}</p>
  else
    body = s.groups.map((g) => (
      <section key={g.key} className="result-group">
        <h2 className="bo">{g.title}</h2>
        <div className="result-count">
          {t.resultCount(g.result.total)}
          {g.result.total > MAX_HITS_PER_TEXT && ` · ${t.showingFirst(MAX_HITS_PER_TEXT)}`}
        </div>
        <ul>
          {g.result.hits.map((h) => (
            <li key={h.index}>
              <Link to={g.to(h.index)} className="bo">
                {h.before}
                <mark>{h.match}</mark>
                {h.after}
              </Link>
            </li>
          ))}
        </ul>
      </section>
    ))

  return (
    <div className="page">
      <div className="col">
        <div className="text-title">
          <div className="kicker">{t.search}</div>
          {query && <h1 className="bo">{query}</h1>}
        </div>
        {body}
      </div>
    </div>
  )
}
