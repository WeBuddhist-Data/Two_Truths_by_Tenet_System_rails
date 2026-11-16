import type { RefDoc, RootDoc } from './data'

export type Hit = { index: number; before: string; match: string; after: string }
export type TextHits = { total: number; hits: Hit[] }

const LETTER = /[ཀ-ྼ]/
export const MAX_HITS_PER_TEXT = 100

/** Same normalisation for query and text: one tsheg form, single spaces. */
export function normalise(s: string): string {
  return s.replace(/༌/g, '་').replace(/\s+/g, ' ')
}

export function normaliseQuery(q: string): string {
  return normalise(q)
    .trim()
    .replace(/^[་། ]+|[་། ]+$/g, '')
}

const prepared = new WeakMap<object, string[]>()

/** One searchable string per root segment (locators and markup left out). */
export function rootBlocks(doc: RootDoc): string[] {
  let out = prepared.get(doc)
  if (!out) {
    out = doc.segments.map((seg) =>
      normalise(
        seg
          .filter((r) => !r.l)
          .map((r) => r.t)
          .join(' '),
      ),
    )
    prepared.set(doc, out)
  }
  return out
}

export function refBlocks(doc: RefDoc): string[] {
  let out = prepared.get(doc)
  if (!out) {
    out = doc.blocks.map((b) => normalise(b.l.join(' ')))
    prepared.set(doc, out)
  }
  return out
}

/** Syllable-aware search: a match may not start or end in the middle of a syllable. */
export function searchBlocks(blocks: string[], query: string): TextHits {
  const hits: Hit[] = []
  let total = 0
  if (!query) return { total, hits }
  for (let index = 0; index < blocks.length; index++) {
    const text = blocks[index]
    let from = 0
    for (;;) {
      const at = text.indexOf(query, from)
      if (at < 0) break
      from = at + 1
      const end = at + query.length
      const startsClean = at === 0 || !LETTER.test(text[at - 1])
      const endsClean = end >= text.length || !LETTER.test(text[end])
      if (!startsClean || !endsClean) continue
      total++
      if (hits.length < MAX_HITS_PER_TEXT) {
        hits.push({
          index,
          before: (at > 60 ? '…' : '') + text.slice(Math.max(0, at - 60), at),
          match: text.slice(at, end),
          after: text.slice(end, end + 80) + (end + 80 < text.length ? '…' : ''),
        })
      }
      break // one hit per block is enough to locate it
    }
  }
  return { total, hits }
}
