import { useCallback, useEffect, useState } from 'react'

export type Run = { t: string; b?: 1; l?: 1; q?: number }
export type Segment = Run[]
export type RootDoc = { title: string; segments: Segment[] }
export type Quote = { id: number; ref: string; lines: number[]; seg: number }
export type RefBlock = { s: number; h?: 1; l: string[] }
export type RefDoc = { id: string; title: string; blocks: RefBlock[] }
export type RefMeta = { id: string; title: string; source: string; quotes: number; bytes: number }
export type Manifest = { rootTitle: string; rootSegments: number; quotes: number; refs: RefMeta[] }

const cache = new Map<string, Promise<unknown>>()

/** Fetch a JSON data file once per session; failed fetches are not cached. */
export function load<T>(path: string): Promise<T> {
  let p = cache.get(path) as Promise<T> | undefined
  if (!p) {
    p = fetch(`${import.meta.env.BASE_URL}data/${path}`).then((r) => {
      if (!r.ok) throw new Error(`${path}: HTTP ${r.status}`)
      return r.json() as Promise<T>
    })
    p.catch(() => cache.delete(path))
    cache.set(path, p)
  }
  return p
}

export const loadManifest = () => load<Manifest>('manifest.json')
export const loadRoot = () => load<RootDoc>('root.json')
export const loadQuotes = () => load<Quote[]>('quotes.json')
export const loadRef = (id: string) => load<RefDoc>(`refs/${id}.json`)

export type Loaded<T> = { data?: T; error?: Error; retry: () => void }

export function useLoad<T>(loader: () => Promise<T>, key: string): Loaded<T> {
  const [state, setState] = useState<{ key: string; data?: T; error?: Error }>({ key })
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    let live = true
    setState({ key })
    loader().then(
      (data) => live && setState({ key, data }),
      (error: Error) => live && setState({ key, error }),
    )
    return () => {
      live = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, attempt])
  const retry = useCallback(() => setAttempt((n) => n + 1), [])
  // Never hand back data that belongs to a previous key.
  return state.key === key ? { data: state.data, error: state.error, retry } : { retry }
}
