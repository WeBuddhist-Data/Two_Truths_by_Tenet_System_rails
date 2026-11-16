#!/usr/bin/env python3
"""Find verse quotations from the related texts (1-SOURCES/References) inside the
segmented root-text draft, and lay each one out in stanza format:
one pāda per line, one stanza per paragraph, set apart from surrounding prose.

Only whitespace is changed. The output is asserted equal to the input (and to the
original source) after whitespace-squeezing, using the segmentation skill's squeeze.

usage: stanza_quotes.py DRAFT REF_DIR SOURCE OUT REPORT [--dry-run]
"""
import sys, re, glob, os, importlib.util
from collections import defaultdict

DRAFT, REF_DIR, SOURCE, OUT, REPORT = sys.argv[1:6]
DRY = '--dry-run' in sys.argv

spec = importlib.util.spec_from_file_location(
    's2', '4-SYSTEM/Skills/commentary-segmentation/scripts/stage2_refine.py')
s2 = importlib.util.module_from_spec(spec); spec.loader.exec_module(s2)
squeeze = s2.squeeze

SYL = re.compile(r'[ཀ-ྼ]+')


def syls(text):
    return [m.group(0) for m in SYL.finditer(text)]


# ---------- 1. reference pādas -------------------------------------------------
ref_padas = []          # (file, line_no, stanza_no, syllable tuple)
for path in sorted(glob.glob(os.path.join(REF_DIR, '*.md'))):
    name = os.path.basename(path)[3:-3]
    lines = open(path, encoding='utf-8').read().split('\n')
    stanza, in_fm = 0, False
    for ln, raw in enumerate(lines):
        if ln == 0 and raw.strip() == '---':
            in_fm = True; continue
        if in_fm:
            if raw.strip() == '---':
                in_fm = False
            continue
        line = re.sub(r'\[\^\d+\]', '', raw)
        line = re.sub(r'\s\^[\w.-]+\s*$', '', line).strip()
        if not line or line.startswith('#'):
            stanza += 1; continue
        if not line.rstrip(' ').endswith('།'):
            stanza += 1; continue
        sy = syls(line)
        if 5 <= len(sy) <= 21:
            ref_padas.append((name, ln, stanza, tuple(sy)))
        else:
            stanza += 1
        if re.search(r'\^[\w.-]+\s*$', raw):   # block ID closes a stanza
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


# ---------- 2. tokenise draft (skip ༼…༽ page refs) --------------------------
text = open(DRAFT, encoding='utf-8').read()
toks = []               # (syllable, start, end)
depth = 0
i = 0
for m in re.finditer(r'[ཀ-ྼ]+|༼|༽', text):
    g = m.group(0)
    if g == '༼': depth += 1; continue
    if g == '༽': depth = max(0, depth - 1); continue
    if depth == 0:
        toks.append((g, m.start(), m.end()))
tok_syl = [t[0] for t in toks]


def shad_after(j):
    """True if the token j is followed (before the next token) by a shad."""
    end = toks[j][2]
    nxt = toks[j + 1][1] if j + 1 < len(toks) else len(text)
    return '།' in text[end:nxt]


# ---------- 3. match pādas ------------------------------------------------------
matches = defaultdict(list)   # token start -> [(len, ref index), ...]
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
starts = sorted(matches)
for s in starts:
    if s in used:
        continue
    run = max((chain_from(s, L, k) for L, k in matches[s]), key=len)
    if len(run) >= 2:
        runs.append(run)
        used.update(x[0] for x in run)

# ---------- 4. re-lay whitespace ------------------------------------------------
edits = []              # (start, end, replacement) over whitespace-only spans


def gap_after(tok_idx):
    """span of the whitespace that follows the shad group after token tok_idx"""
    end = toks[tok_idx][2]
    m = re.compile(r'[་༌]?(?:\s*།)+').match(text, end)
    p = m.end() if m else end
    m2 = re.compile(r'[ \t\n]*').match(text, p)
    return p, m2.end()


def gap_before(tok_idx):
    s = toks[tok_idx][1]
    p = s
    while p > 0 and text[p - 1] in ' \t\n':
        p -= 1
    return p, s


for run in runs:
    first, last = run[0], run[-1]
    # before the stanza: own paragraph when lead-in words (prose or an attribution)
    # precede it in the same paragraph; a bare ༼ref༽ / markup prefix stays attached
    b0, b1 = gap_before(first[0])
    para_start = text.rfind('\n\n', 0, b0) + 2 if text.rfind('\n\n', 0, b0) >= 0 else 0
    prefix_core = re.sub(r'༼[^༽]*༽|\*\*|</?mark>|\s', '', text[para_start:b0])
    if prefix_core:
        edits.append((b0, b1, '\n\n'))
    # between pādas: newline; between stanzas of the reference: blank line
    for a, b in zip(run, run[1:]):
        g0, g1 = gap_after(a[0] + a[1] - 1)
        new_stanza = ref_padas[b[2]][2] != ref_padas[a[2]][2]
        edits.append((g0, g1, '\n\n' if new_stanza else '\n'))
    # after the stanza: closing words (ཞེས…) go to their own paragraph;
    # markup that closes right after the stanza stays attached
    g0, g1 = gap_after(last[0] + last[1] - 1)
    if g1 < len(text) and SYL.match(text, g1) and '\n\n' not in text[g0:g1]:
        edits.append((g0, g1, '\n\n'))

# apply right-to-left; keep bold spans inside one paragraph
edits = sorted(set(edits), reverse=True)
out = text
for s, e, rep in edits:
    out = out[:s] + rep + out[e:]


def bold_safe(t):
    blocks = t.split('\n\n')
    res, cur = [], None
    for b in blocks:
        cur = b if cur is None else cur + '\n' + b
        if cur.count('**') % 2 == 0 and cur.count('<mark>') == cur.count('</mark>'):
            res.append(cur); cur = None
    if cur is not None:
        res.append(cur)
    return '\n\n'.join(res)


out = re.sub(r'\n{3,}', '\n\n', bold_safe(out))
assert squeeze(out) == squeeze(text), 'no-loss vs draft FAILED'
assert squeeze(out) == squeeze(open(SOURCE, encoding='utf-8').read()), 'no-loss vs source FAILED'

# ---------- 5. report -----------------------------------------------------------
by_file = defaultdict(lambda: [0, 0])
rows = ['ref_text\tref_line\tpadas\tfirst_pada']
for run in runs:
    f = ref_padas[run[0][2]][0]
    by_file[f][0] += 1; by_file[f][1] += len(run)
    rows.append(f"{f}\t{ref_padas[run[0][2]][1] + 1}\t{len(run)}\t{''.join(toks[run[0][0]+x][0] + '་' for x in range(run[0][1]))}")
open(REPORT, 'w', encoding='utf-8').write('\n'.join(rows) + '\n')
print(f'reference pādas indexed: {len(ref_padas)}')
print(f'quoted stanzas found: {len(runs)}  ({sum(len(r) for r in runs)} pādas); single-pāda hits skipped: {len([s for s in starts if s not in used])}')
for f, (n, p) in sorted(by_file.items(), key=lambda x: -x[1][1]):
    print(f'  {n:3d} quotes / {p:4d} pādas  {f}')
if not DRY:
    open(OUT, 'w', encoding='utf-8').write(out)
    print('wrote', OUT)
print('no-loss vs draft and source: PASSED')
