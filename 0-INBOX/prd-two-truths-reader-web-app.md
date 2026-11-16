# PRD — Two Truths Reader (web app)

| | |
|---|---|
| Status | Draft for review |
| Date | 2026-11-15 |
| Owner | kaldan007 |
| Source vault | `Two_Truths_by_Tenet_System_rails` (branch `restructure-rails-layout`) |

> **Update, 2026-11-15 (after build).** The app is built in `reader-app/` inside this vault for now. The References folder had grown since the mapping was recorded, so by owner decision the app now links **193 verse quotations across 21 reference texts** (the 178 recorded plus 15 newly matched). Wherever this document says 178 quotations or 13 texts, read 193 and 21. The current mapping is written to `reader-app/quote-mapping.tsv` on every export.

Items marked **Decided** were confirmed by the owner. Items marked **Proposed** are suggestions awaiting confirmation. Nothing in §9 (Open questions) has been decided.

---

## 1. Summary

A static, React-only web reader for *The Two Truths according to the Four Tenet Systems* (གྲུབ་མཐའ་བཞིའི་ལུགས་ཀྱི་བདེན་པ་གཉིས་ཀྱི་དོན་རབ་ཏུ་གསལ་བའི་ལེགས་བཤད་རིན་ཆེན་སྒྲོན་མ།). The reader shows the segmented root text. Where the root text quotes a verse from a reference text that exists in the vault, clicking the quotation opens a side panel with that reference text, positioned at the quoted stanza. The reference texts can also be read on their own.

The look and interaction model follow Sefaria.org's reader (text column on the left, resource panel on the right).

## 2. Goals and non-goals

### Goals

1. Read the segmented root text comfortably in a browser.
2. From any linked verse quotation, see the quoted stanza in its original source without leaving the root text.
3. Browse and read the linked reference texts by themselves.
4. Work as a fully static site: no backend, no database, no accounts.
5. Feel smooth: fast first load, no jank while scrolling or opening the panel.

### Non-goals for v1 (Decided)

- Prose quotations. Only verse quotations are linked.
- Outline / table-of-contents navigation of the root text.
- Shareable deep links to a passage or an open quotation.
- Reference texts that no quotation links to (43 of the 56 files in `1-SOURCES/References`), and the raw `Katen-text/` Kangyur/Tengyur files.
- Translations, commentary, audio, annotations, user accounts.
- Any link from a reference text back to the root text. A reference text opened from the list shows the text and nothing more.

## 3. Decisions confirmed by the owner

| # | Topic | Decision |
|---|---|---|
| D1 | Landing page | Two buttons: one labelled with the root text's title, one for the reference texts. |
| D2 | Side panel content | The full reference text loads in the panel, scrolled to the quoted stanza, with that stanza highlighted. |
| D3 | Quotation scope | Verse quotations only, using the existing mappings (178 quotations). |
| D4 | Unlinked quotations | A quotation with no reference text in the repository behaves as ordinary text: no marker, no hover, no click action. |
| D5 | Reference list | Only the 13 texts that at least one quotation links to. |
| D6 | Interface language | English and Tibetan, with a toggle. Text content is Tibetan. |
| D7 | Extra reader features | Font size and theme settings; full-text search. |
| D8 | Linked-quotation style | A subtle visual marker shows which quotations are clickable before they are clicked. |
| D9 | Tech stack | React only, static, no backend. |
| D10 | Code location | The app lives in a new repository and reads data exported from this vault. |

## 4. Content inventory (what exists today)

### 4.1 Root text

- File: `1-SOURCES/Text/bo-ནང་པའི་གྲུབ་མཐའ་བཞིའི་བདེན་གཉིས་ཀྱི་རྣམ་བཞག.md`
- 5,611 lines, about 774 KB. Segmented: one segment per paragraph, verse quotations laid out one pāda per line and one stanza per paragraph.
- Markup present in the file:
  - `**…**` bold marks the author's outline (sa bcad) sentences.
  - `༼…༽` brackets hold editorial locators (chapter or page references such as `༼རབ་བྱེད། ༢༤༽`); 347 occurrences.
  - `>` blockquote appears in the title lines.
- No frontmatter and no block IDs yet.
- The segmented version is currently an **uncommitted** change to this file (identical in size to `0-INBOX/…segmented-final.md`).

### 4.2 Quotation mappings

- File: `0-INBOX/bo-ནང་པའི་གྲུབ་མཐའ་བཞིའི་བདེན་གཉིས་ཀྱི་རྣམ་བཞག.stanza-quotes.tsv`, produced by `4-SYSTEM/scripts/stanza_quotes.py`.
- 178 rows. Columns: `ref_text`, `ref_line` (1-based line in the reference file), `padas` (number of pādas matched), `first_pada`.
- All 13 referenced files exist in `1-SOURCES/References`.

| Reference text | Linked quotations |
|---|---|
| དབུ་མ་འཇུག་པ། | 70 |
| ཚད་མ་རྣམ་འགྲེལ། | 40 |
| དབུ་མ་རྩ་བའི་ཚིག་ལེའུར་བྱས་པ་ཤེས་རབ་ཅེས་བྱ་བ། | 37 |
| དབུ་མ་རྒྱན་གྱི་ཚིག་ལེའུར་བྱས་པ། | 8 |
| ཐེག་པ་ཆེན་པོ་བསྡུས་པ། | 7 |
| དབུ་མའི་སྙིང་པོའི་ཚིག་ལེའུ་བྱས་པ། | 5 |
| དབུ་མ་སྣང་བ་ཞེས་བྱ་བ། | 3 |
| རྩོད་པ་བཟློག་པའི་ཚིག་ལེའུར་བྱས་པ་ཞེས་བྱ་བ། | 2 |
| དམིགས་པ་བརྟག་པ། | 2 |
| རྣལ་འབྱོར་སྤྱོད་པའི་ས་ལས་བྱང་ཆུབ་སེམས་དཔའི་ས། | 1 |
| རིགས་པ་དྲུག་ཅུ་པའི་ཚིག་ལེའུར་བྱས་པ། | 1 |
| བྱང་ཆུབ་སེམས་དཔའི་སྤྱོད་པ་ལ་འཇུག་པ། | 1 |
| དེ་ཁོ་ན་ཉིད་བསྡུས་པའི་ཚིག་ལེའུར་བྱས་པ། | 1 |

### 4.3 Data gaps the build must close

1. **The mapping does not record where in the root text each quotation sits.** It stores only the reference-side line and the first pāda. Six first-pāda values occur more than once (the same verse is quoted in several places), so the first pāda cannot serve as a key. The export step must emit the root-side position of every quotation.
2. **Quoted wording can differ from the reference wording.** The matcher tolerates one or two differing syllables per pāda. The panel highlight must therefore be driven by reference line numbers, never by string search.
3. **Reference files are large.** They range from about 180 KB to 2.4 MB (the 2.4 MB text is linked by a single quotation). Full-text-in-panel (D2) requires lazy loading and windowed rendering.
4. **Line numbers are fragile.** `ref_line` breaks if a reference file is edited. The export should resolve line numbers into stable stanza indices at build time and fail loudly if a mapped line is no longer a verse line.

## 5. Users and primary flows

Primary user: a reader of Tibetan studying the root text who wants to check each verse quotation against its source.

**Flow A — read the root text and check a quotation**
1. Open the site; choose the root-text button.
2. Scroll the root text. Linked verse quotations carry a subtle marker.
3. Click a marked quotation. The side panel opens with the reference text, scrolled to the quoted stanza, which is highlighted.
4. Scroll within the panel to read around the stanza. The root text stays in place.
5. Click another quotation: the panel switches to that source. Close the panel to return to full-width reading.

**Flow B — read a reference text**
1. Open the site; choose the reference-text button.
2. See the list of 13 reference texts; pick one.
3. The text opens as a plain reader page.

**Flow C — search**
1. Type a Tibetan word or phrase in search.
2. See matches from the root text and the reference texts; pick one to open the text at that match.

## 6. Functional requirements

### 6.1 Landing page

- FR-1 Shows two buttons (D1): one labelled with the root text's title, one for the reference texts.
- FR-2 The root-text button opens the root-text reader; the reference button opens the reference list.
- FR-3 Carries the interface-language toggle (D6).

### 6.2 Root-text reader

- FR-4 Renders the segmented root text: one segment per paragraph; verse quotations one pāda per line.
- FR-5 Renders outline sentences (bold in the source) as visually distinct from body text.
- FR-6 Every verse quotation with a mapping is a single clickable unit covering all its matched pādas, including quotations that span more than one stanza.
- FR-7 Linked quotations show a subtle marker at rest (D8), a stronger state on hover and keyboard focus, and a selected state while their panel is open.
- FR-8 Quotations without a mapping, and all prose quotations, render as ordinary text with no marker, no hover state and no click behaviour (D4).
- FR-9 Clicking a linked quotation opens the side panel (§6.3). Clicking a different one replaces the panel content. Clicking the selected one again leaves the panel open.
- FR-10 Opening or closing the panel does not change the reader's scroll position relative to the passage being read.

### 6.3 Quotation side panel

- FR-11 Opens on the right of the root text, Sefaria-style, and splits the width with the reader.
- FR-12 Header shows the reference text's title and a close button. `Esc` also closes.
- FR-13 Loads the full reference text (D2), positions the quoted stanza in view, and highlights exactly the matched pādas.
- FR-14 The panel scrolls independently of the reader.
- FR-15 Shows a loading state while the reference text is fetched, and an error state with retry if the fetch fails.
- FR-16 Reference texts already opened in the session reopen without a new network request.

### 6.4 Reference list and reference reader

- FR-17 The list shows the 13 linked reference texts (D5) by title.
- FR-18 Opening one shows that text alone: no side panel, no quotation markers, no links to the root text.
- FR-19 A back control returns to the list.

### 6.5 Reader settings (D7)

- FR-20 Font size control for Tibetan text, applied to the reader and the panel.
- FR-21 Theme control.
- FR-22 Settings persist across visits in the browser's local storage.

### 6.6 Search (D7)

- FR-23 Full-text search over the root text and the 13 reference texts, running entirely in the browser.
- FR-24 Results show the text title and a snippet with the match highlighted, and open the text at the match.
- FR-25 Matching is syllable-aware for Tibetan (tsheg-delimited) and ignores markup characters (`**`, `༼…༽`).

### 6.7 Interface language (D6)

- FR-26 All interface strings exist in English and Tibetan; the toggle switches them without reloading.
- FR-27 The choice persists across visits.
- FR-28 Text content is always Tibetan regardless of the interface language.

## 7. Data and architecture

### 7.1 Stack (D9)

- React single-page app, built to static files, deployable to any static host.
- **Proposed:** Vite + React + TypeScript, React Router for the four views, a windowing library for long texts, a client-side search index built at build time.

### 7.2 Data pipeline (D10)

A build-time export script reads the vault and writes JSON into the app repository. The vault stays the source of truth; the app never edits it. `1-SOURCES/` is read-only for this pipeline.

**Proposed output:**

```
data/
  manifest.json            # root-text title; list of reference texts {id, title, quoteCount}
  root.json                # ordered segments
  quotes.json              # every linked quotation
  refs/<id>.json           # one file per reference text, loaded on demand
  search/…                 # prebuilt search index, loaded when search is first used
```

- `root.json` segment: `{ id, kind: "prose" | "outline" | "verse", lines: [...], quoteId? }`
- `quotes.json` entry: `{ id, rootSegmentIds: [...], refId, refStanzaStart, refLineStart, padaCount }`
- `refs/<id>.json`: `{ id, title, blocks: [{ index, lines: [...] }] }`

The export must (a) re-derive each quotation's root-side position, extending `stanza_quotes.py` or re-running its matcher (see §4.3 item 1), (b) verify that all 178 mappings resolve, and (c) fail the build on any that do not.

### 7.3 Rendering

- Root text and reference texts are rendered with windowing so only visible segments are in the DOM.
- Reference JSON is fetched on first use and cached in memory.
- Tibetan web font is self-hosted and subset where possible; text must not reflow visibly when the font arrives.

## 8. Non-functional requirements (Proposed)

| Area | Target |
|---|---|
| First load | Landing page interactive in under 2 s on a mid-range laptop over broadband. |
| Root text open | First screen of text visible in under 1 s after the button is pressed. |
| Panel open | Quoted stanza visible and highlighted within 500 ms on a cached text, 1.5 s on first fetch of the largest text. |
| Scrolling | 60 fps while scrolling either column; no layout shift when the panel opens. |
| Accessibility | Linked quotations reachable and operable by keyboard; panel is a labelled region; focus moves into the panel on open and returns to the quotation on close; colour contrast meets WCAG AA in every theme. |
| Browsers | Current Chrome, Safari, Firefox, Edge. |
| Tibetan rendering | Correct stacking and line breaking at tsheg; no mid-syllable breaks. |

## 9. Open questions

Each of these needs an owner decision before design or build starts.

1. **Mobile and narrow screens.** Is phone use in scope for v1? If so, how should the panel appear (Sefaria uses a lower split panel on mobile)?
2. **Root-text button label.** The full title is long. Use the full title, a short title, or different labels per interface language?
3. **English titles.** The vault holds only Tibetan titles for the root text and the reference texts. With the English interface on, show Tibetan titles, or supply English/Sanskrit titles (and who supplies them)?
4. **Editorial locators `༼…༽`.** Show them inline as they are, style them as dimmed annotations, or hide them?
5. **Themes.** Which ones: light and dark only, or also sepia?
6. **Marker design.** Which subtle cue for linked quotations: faint background, side rule, or dotted underline?
7. **Reference text in the panel vs. the list.** Should the panel offer an "open in full reader" link to the standalone reference page, or stay self-contained?
8. **Search scope and results.** One combined result list or grouped by text? Should a result from a reference text open the standalone reference reader?
9. **Hosting and domain.** Where will the static site be deployed, and under which URL?
10. **Root text baseline.** The segmented root text is an uncommitted change in the vault. Should the export read `1-SOURCES/Text/…` once committed, or the `0-INBOX/…segmented-final.md` draft?
11. **Sefaria fidelity.** "Similar to Sefaria" covers layout and interaction. Should typography and colour also follow Sefaria closely, or should the app have its own visual identity (e.g. WeBuddhist branding)?
12. **Reference text scope in the panel.** The Bodhisattvabhūmi file is 2.4 MB for one linked quotation. Is loading the whole text acceptable there, or should very large texts load a window around the stanza?

## 10. Acceptance criteria for v1

1. The landing page shows the two buttons and the language toggle; each button reaches its view.
2. The root text renders completely and matches the source file after whitespace is normalised.
3. All 178 mapped verse quotations are marked and clickable; each opens the correct reference text with the correct stanza highlighted. Verified by an automated check over every mapping plus a manual sample.
4. No unmapped or prose quotation shows a marker or responds to a click.
5. The reference list shows exactly the 13 linked texts; each opens as a plain reader with no panel.
6. Font size, theme and interface language change immediately and survive a reload.
7. Search returns matches from the root text and the reference texts and opens the text at the match.
8. The site runs from static files with no server-side code.
9. The targets in §8 are met on the reference test device.

## 11. Suggested milestones

1. **Data export** — export script, root-side quotation positions, validation of all 178 mappings.
2. **Readers** — landing page, root-text reader, reference list and reference reader, windowed rendering.
3. **Quotation panel** — markers, panel, scroll-to-stanza, highlight, caching.
4. **Settings, language toggle, search.**
5. **Polish and release** — performance pass, accessibility pass, deployment.
