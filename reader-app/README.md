# Two Truths Reader

Static React reader for the root text and its linked reference texts.
Spec: `../0-INBOX/prd-two-truths-reader-web-app.md`.

```bash
npm install
npm run export-data   # vault -> public/data (re-run whenever the vault texts change)
npm run dev           # http://localhost:5183
npm run build         # static site in dist/
```

## Data

`scripts/export_data.py` reads `1-SOURCES/Text` and `1-SOURCES/References` (read-only)
and writes `public/data/`:

- `root.json` — root-text segments as inline runs (`b` bold outline, `l` editorial
  locator, `q` quotation id)
- `quotes.json` — each linked quotation: reference id, reference source-line numbers,
  first root segment
- `refs/<id>.json` — one file per linked reference text, fetched on demand
- `manifest.json` — titles and counts

The export re-runs the matcher from `4-SYSTEM/scripts/stanza_quotes.py` against the
reference texts named in `0-INBOX/*.stanza-quotes.tsv` and fails if the result differs
from that recorded mapping.

## Deployment

`.github/workflows/deploy-reader-app.yml` builds the app and publishes `dist/` to
GitHub Pages on every push that touches `reader-app/`. It builds from the committed
`public/data/`, so run `npm run export-data` and commit the result after vault changes.

## Notes

- Hash routing and a relative base: `dist/` works from any static host or sub-path.
- Long texts are rendered natively with `content-visibility: auto`; no windowing library.
- Interface strings: `src/i18n.ts`.
