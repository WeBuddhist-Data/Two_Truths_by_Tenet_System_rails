#!/usr/bin/env python3
"""Export the vault's root text, its verse-quotation links and the linked reference
texts as JSON for the reader app.

Reads (never writes) 1-SOURCES/. Writes reader-app/public/data/.

The quotation matcher is the one from 4-SYSTEM/scripts/stanza_quotes.py, re-run here
so that the root-side position of every quotation is known. The result is checked
against the recorded mapping (0-INBOX/*.stanza-quotes.tsv); any difference fails the
export.

usage: python3 scripts/export_data.py
"""
import glob
import json
import os
import re
import sys
from collections import Counter, defaultdict
from pathlib import Path

APP = Path(__file__).resolve().parents[1]
VAULT = APP.parent
REF_DIR = VAULT / '1-SOURCES' / 'References'
OUT = APP / 'public' / 'data'
ROOT_TITLE = 'གྲུབ་མཐའ་བཞིའི་ལུགས་ཀྱི་བདེན་པ་གཉིས་ཀྱི་དོན་རབ་ཏུ་གསལ་བའི་ལེགས་བཤད་རིན་ཆེན་སྒྲོན་མ།'

SYL = re.compile(r'[ཀ-ྼ]+')


def one(pattern):
    hits = glob.glob(str(pattern))
    if len(hits) != 1:
        sys.exit(f'expected exactly one file for {pattern}, found {len(hits)}')
    return hits[0]


ROOT = one(VAULT / '1-SOURCES' / 'Text' / 'bo-*.md')
TSV = one(VAULT / '0-INBOX' / '*.stanza-quotes.tsv')


def syls(text):
    return [m.group(0) for m in SYL.finditer(text)]


# ---------- 1. reference pādas (same rules as stanza_quotes.py) -----------------
# Every text in References is indexed. The recorded mapping (TSV) may be older than
# the folder: it is used to break ties and as a floor that must still be found.
recorded_names = {row.split('\t')[0]
                  for row in open(TSV, encoding='utf-8').read().strip().split('\n')[1:]}
ref_padas = []          # (name, line_no, stanza_no, syllable tuple)
ref_paths = {}
for path in sorted(glob.glob(str(REF_DIR / '*.md'))):
    name = os.path.basename(path)[3:-3]
    ref_paths[name] = path
    lines = open(path, encoding='utf-8').read().split('\n')
    stanza, in_fm = 0, False
    for ln, raw in enumerate(lines):
        if ln == 0 and raw.strip() == '---':
            in_fm = True
            continue
        if in_fm:
            if raw.strip() == '---':
                in_fm = False
            continue
        line = re.sub(r'\[\^\d+\]', '', raw)
        line = re.sub(r'\s\^[\w.-]+\s*$', '', line).strip()
        if not line or line.startswith('#'):
            stanza += 1
            continue
        if not line.rstrip(' ').endswith('།'):
            stanza += 1
            continue
        sy = syls(line)
        if 5 <= len(sy) <= 21:
            ref_padas.append((name, ln, stanza, tuple(sy)))
        else:
            stanza += 1
        if re.search(r'\^[\w.-]+\s*$', raw):
            stanza += 1

index = defaultdict(list)
for k, p in enumerate(ref_padas):
    index[(len(p[3]), p[3][0])].append(k)
    index[(len(p[3]), p[3][1])].append(k)


def close(a, b):
    if len(a) != len(b):
        return False
    bad = sum(x != y for x, y in zip(a, b))
    return bad <= (1 if len(a) <= 9 else 2)


# ---------- 2. tokenise the root text (skip ༼…༽ locators) -----------------------
text = open(ROOT, encoding='utf-8').read()
toks, depth = [], 0
for m in re.finditer(r'[ཀ-ྼ]+|༼|༽', text):
    g = m.group(0)
    if g == '༼':
        depth += 1
        continue
    if g == '༽':
        depth = max(0, depth - 1)
        continue
    if depth == 0:
        toks.append((g, m.start(), m.end()))
tok_syl = [t[0] for t in toks]


def shad_after(j):
    end = toks[j][2]
    nxt = toks[j + 1][1] if j + 1 < len(toks) else len(text)
    return '།' in text[end:nxt]


# ---------- 3. match pādas and chain them into runs -----------------------------
matches = defaultdict(list)
for j in range(len(toks)):
    for L in range(5, 22):
        if j + L > len(toks) or not shad_after(j + L - 1):
            continue
        seg = tuple(tok_syl[j:j + L])
        cands = set(index.get((L, seg[0]), [])) | set(index.get((L, seg[1]), []))
        for k in sorted(cands):
            if close(seg, ref_padas[k][3]):
                matches[j].append((L, k))


def chain_from(s, L, k):
    run = [(s, L, k)]
    while True:
        ls, lL, lk = run[-1]
        nxt = ls + lL
        best = None
        for L2, k2 in matches.get(nxt, []):
            d = ref_padas[k2][1] - ref_padas[lk][1]
            if ref_padas[k2][0] == ref_padas[lk][0] and 0 < d <= 3 and (best is None or d < best[0]):
                best = (d, L2, k2)
        if not best:
            return run
        run.append((nxt, best[1], best[2]))


runs, used = [], set()
for s in sorted(matches):
    if s in used:
        continue
    # Longest chain wins. When the same verse stands in two reference texts, keep the
    # text of the recorded mapping (in every such case it is also the text the root
    # text itself names in its lead-in).
    run = max((chain_from(s, L, k) for L, k in matches[s]),
              key=lambda c: (len(c), ref_padas[c[0][2]][0] in recorded_names))
    if len(run) >= 2:
        runs.append(run)
        used.update(x[0] for x in run)

# ---------- 4. check against the recorded mapping -------------------------------
recorded = Counter()
for row in open(TSV, encoding='utf-8').read().strip().split('\n')[1:]:
    ref_text, ref_line, padas, _ = row.split('\t')
    recorded[(ref_text, int(ref_line), int(padas))] += 1
found = Counter((ref_padas[r[0][2]][0], ref_padas[r[0][2]][1] + 1, len(r)) for r in runs)
lost = recorded - found
if lost:
    print('Recorded quotations that the matcher no longer finds:', file=sys.stderr)
    for key in sorted(lost):
        print('  ', key, file=sys.stderr)
    sys.exit(1)
new_since_mapping = found - recorded

# ---------- 5. reference texts ---------------------------------------------------
linked = Counter(ref_padas[r[0][2]][0] for r in runs)
ref_order = sorted(linked, key=lambda n: (-linked[n], n))
ref_id = {name: f'ref-{i + 1:02d}' for i, name in enumerate(ref_order)}

WIKILINK = re.compile(r'!?\[\[(?:[^\]|]*\|)?([^\]]*)\]\]')


def export_ref(name):
    lines = open(ref_paths[name], encoding='utf-8').read().split('\n')
    title, blocks, cur, in_fm = name, [], None, False
    valid_lines = set()

    def flush():
        nonlocal cur
        if cur:
            blocks.append(cur)
        cur = None

    for ln, raw in enumerate(lines):
        if ln == 0 and raw.strip() == '---':
            in_fm = True
            continue
        if in_fm:
            if raw.strip() == '---':
                in_fm = False
            else:
                m = re.match(r'title:\s*"?(.*?)"?\s*$', raw)
                if m and m.group(1):
                    title = m.group(1)
            continue
        if re.match(r'\s*\[\^\d+\]:', raw):          # footnote definition
            flush()
            continue
        line = re.sub(r'\[\^\d+\]', '', raw)
        line = re.sub(r'\s\^[\w.-]+\s*$', '', line)
        line = WIKILINK.sub(r'\1', line).replace('**', '')
        line = re.sub(r'^\s*>\s?', '', line).strip()
        if not line:
            flush()
            continue
        if line.startswith('#'):
            flush()
            blocks.append({'s': ln, 'h': 1, 'l': [line.lstrip('#').strip()]})
            continue
        if cur is None:
            cur = {'s': ln, 'l': []}
        cur['l'].append(line)
        valid_lines.add(ln)
    flush()
    return title, blocks, valid_lines


OUT.mkdir(parents=True, exist_ok=True)
(OUT / 'refs').mkdir(exist_ok=True)
for old in (OUT / 'refs').glob('*.json'):
    old.unlink()

manifest_refs, ref_valid = [], {}
for name in ref_order:
    title, blocks, valid = export_ref(name)
    ref_valid[name] = valid
    payload = json.dumps({'id': ref_id[name], 'title': title, 'blocks': blocks},
                         ensure_ascii=False, separators=(',', ':'))
    (OUT / 'refs' / f'{ref_id[name]}.json').write_text(payload, encoding='utf-8')
    manifest_refs.append({'id': ref_id[name], 'title': title, 'source': f'bo-{name}.md',
                          'quotes': linked[name], 'bytes': len(payload.encode('utf-8'))})

# ---------- 6. quotations: root-side character ranges ---------------------------
SHADS = re.compile(r'[་༌]?(?:\s*།)+')
quotes, ranges = [], []      # ranges: (start, end, quote index)
for qi, run in enumerate(sorted(runs, key=lambda r: r[0][0])):
    name = ref_padas[run[0][2]][0]
    start = toks[run[0][0]][1]
    last_tok = run[-1][0] + run[-1][1] - 1
    m = SHADS.match(text, toks[last_tok][2])
    end = m.end() if m else toks[last_tok][2]
    ref_lines = [ref_padas[k][1] for _, _, k in run]
    missing = [ln for ln in ref_lines if ln not in ref_valid[name]]
    if missing:
        sys.exit(f'quote {qi}: reference lines {missing} of {name} are not exported text lines')
    quotes.append({'id': qi, 'ref': ref_id[name], 'lines': ref_lines})
    ranges.append((start, end, qi))

# ---------- 7. root text segments ------------------------------------------------
qid_at = [None] * len(text)
for start, end, qi in ranges:
    for p in range(start, end):
        if qid_at[p] is not None:
            sys.exit(f'quotes {qid_at[p]} and {qi} overlap in the root text')
        qid_at[p] = qi

segments = []
pos = 0
for para in re.split(r'(\n\n+)', text):
    if not para.strip():
        pos += len(para)
        continue
    runs_out, bold, loc = [], False, False
    i, n = 0, len(para)
    at_line_start = True

    def push(ch, b, l, q):
        if runs_out and runs_out[-1]['_k'] == (b, l, q):
            runs_out[-1]['t'] += ch
        else:
            runs_out.append({'_k': (b, l, q), 't': ch})

    while i < n:
        q = qid_at[pos + i]
        if para.startswith('**', i):
            bold = not bold
            i += 2
            continue
        if para.startswith('<mark>', i):
            i += 6
            continue
        if para.startswith('</mark>', i):
            i += 7
            continue
        ch = para[i]
        if at_line_start and ch == '>':
            i += 2 if para.startswith('> ', i) else 1
            continue
        at_line_start = ch == '\n'
        if ch == '༼':
            loc = True
        push(ch, bold, loc, q)
        if ch == '༽':
            loc = False
        i += 1
    if bold:
        sys.exit(f'unbalanced ** in paragraph at offset {pos}')

    cleaned = []
    for k, r in enumerate(runs_out):
        b, l, q = r['_k']
        t = r['t']
        prev_q = runs_out[k - 1]['_k'][2] if k else None
        next_q = runs_out[k + 1]['_k'][2] if k + 1 < len(runs_out) else None
        if q is not None:
            t = t.strip()
        else:                                  # a quote renders as its own block
            if k and prev_q is not None:
                t = t.lstrip()
            if next_q is not None:
                t = t.rstrip()
        if not t.strip():
            continue
        item = {'t': t}
        if b:
            item['b'] = 1
        if l:
            item['l'] = 1
        if q is not None:
            item['q'] = q
        cleaned.append(item)
    if cleaned:
        for item in cleaned:
            if 'q' in item and 'seg' not in quotes[item['q']]:
                quotes[item['q']]['seg'] = len(segments)
        segments.append(cleaned)
    pos += len(para)

unplaced = [q['id'] for q in quotes if 'seg' not in q]
if unplaced:
    sys.exit(f'quotes without a root segment: {unplaced}')

dump = lambda obj: json.dumps(obj, ensure_ascii=False, separators=(',', ':'))
(OUT / 'root.json').write_text(dump({'title': ROOT_TITLE, 'segments': segments}), encoding='utf-8')
(OUT / 'quotes.json').write_text(dump(quotes), encoding='utf-8')
(OUT / 'manifest.json').write_text(
    json.dumps({'rootTitle': ROOT_TITLE, 'rootSegments': len(segments),
                'quotes': len(quotes), 'refs': manifest_refs}, ensure_ascii=False, indent=1),
    encoding='utf-8')

ref_name = {v: k for k, v in ref_id.items()}
rows = ['quote_id\tref_text\tref_line\tpadas\troot_segment\tin_recorded_mapping']
seen = Counter()
for q in quotes:
    key = (ref_name[q['ref']], q['lines'][0] + 1, len(q['lines']))
    seen[key] += 1
    rows.append('\t'.join(map(str, [q['id'], key[0], key[1], key[2], q['seg'],
                                    'yes' if seen[key] <= recorded[key] else 'no'])))
(APP / 'quote-mapping.tsv').write_text('\n'.join(rows) + '\n', encoding='utf-8')

print(f'root segments: {len(segments)}')
print(f'quotations:    {len(quotes)} ({sum(recorded.values())} recorded, '
      f'{sum(new_since_mapping.values())} new since the recorded mapping)')
for key in sorted(new_since_mapping):
    print(f'  new: {key[0]}  line {key[1]}  {key[2]} pādas')
print(f'references:    {len(manifest_refs)}')
for r in manifest_refs:
    print(f"  {r['id']}  {r['quotes']:>3} quotes  {r['bytes'] / 1024:>7.0f} KB  {r['title']}")
