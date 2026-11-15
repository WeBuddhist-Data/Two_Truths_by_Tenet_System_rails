# Vault Annex — Two Truths by Tenet System conventions

The methodology guidelines (`0-VAULT-Structure.md`, `../../1-SOURCES/About Sources.md`, `../../2-RAILS/About Rails.md`, `../../3-TRANSFORMATIONS/About Transformations.md`) are **text-agnostic**. This annex records the conventions specific to *this* vault. When the guidelines and this annex disagree on a vault-specific detail, this annex wins.

Sections marked **TBD** have not been decided yet. Do not invent values for them; leave them for a human contributor.

> This vault's tooling (`4-SYSTEM/Skills/`, `4-SYSTEM/scripts/`, `.claude/commands/`) was imported from the [bodhisattvacharyavatara-rails](https://github.com/WeBuddhist-Data/bodhisattvacharyavatara-rails) vault. Many skills still reference that vault's paths, commentary IDs and `BCA` book codes. Adapt a skill to this text before running it.

---

## 1. The text

This vault serves the Tibetan text:

> **གྲུབ་མཐའ་བཞིའི་ལུགས་ཀྱི་བདེན་པ་གཉིས་ཀྱི་དོན་རབ་ཏུ་གསལ་བའི་ལེགས་བཤད་རིན་ཆེན་སྒྲོན་མ།**

According to its colophon, it was composed by **རིས་མེད་དགེ་བཤེས་བསྟན་འཛིན་འགྱུར་མེད།** and completed on 24 June 2026 (ཕྱི་ལོ་༢༠༢༦ ཟླ་༦ ཚེས་༢༤) at རང་ཤག་ནོར་གླིང་བཀྲ་ཤིས་གཡས་འཁྱིལ།. It is used as a Serkong class text.

| Role | File |
| ---- | ---- |
| Root text (Tibetan) | `1-SOURCES/Text/bo-ནང་པའི་གྲུབ་མཐའ་བཞིའི་བདེན་གཉིས་ཀྱི་རྣམ་བཞག.md` |

The root text has not been formatted yet. It has no frontmatter, no headings and no block IDs. Formatting it is the first step: see the `format-root-text` and `add-block-id-root-text` skills.

---

## 2. Addressing scheme — TBD

The text is prose with an inline structural outline (ས་བཅད་), not a chapter-verse poem. Choose and declare a `verse_id_format` once the outline has been turned into headings (`tag-inline-toc` / `toc-tree-extraction` skills). Follow the heading hierarchy and `-0` heading-ID rule in [`../CLAUDE.md`](../CLAUDE.md) §5a.

---

## 3. Registered commentary IDs — TBD

No commentaries are in `1-SOURCES/Commentaries/` yet.

| `registered_id` | Author | Tier | Language | File |
| --------------- | ------ | ---- | -------- | ---- |

---

## 3a. Book IDs (catalog codes) — TBD

The root-title code for this vault has not been registered yet. Build codes per [`../../1-SOURCES/About Sources.md`](../../1-SOURCES/About%20Sources.md) §3a once it is.

---

## 4. Reference texts

`1-SOURCES/References/` holds Tibetan texts by Indian masters that this text relates to (all `-bo`, as received):

| File |
| ---- |
| `bo-ཆོས་མངོན་པ་མཛོད།.md` |
| `bo-ཐེག་པ་ཆེན་པོ་བསྡུས་པ།.md` |
| `bo-དབུ་མ་འཇུག་པ།.md` |
| `bo-དབུ་མ་རྒྱན་གྱི་ཚིག་ལེའུར་བྱས་པ།.md` |
| `bo-དབུ་མ་རྩ་བའི་ཚིག་ལེའུར་བྱས་པ་ཤེས་རབ་ཅེས་བྱ་བ།.md` |
| `bo-དབུ་མ་སྣང་བ་ཞེས་བྱ་བ།.md` |
| `bo-དབུ་མའི་སྙིང་པོའི་ཚིག་ལེའུ་བྱས་པ།.md` |
| `bo-དབུས་དང་མཐའ་རྣམ་པར་འབྱེད་པའི་ཚིག་ལེའུར་བྱས་པ།.md` |
| `bo-དམིགས་པ་བརྟག་པ།.md` |
| `bo-དེ་ཁོ་ན་ཉིད་བསྡུས་པའི་ཚིག་ལེའུར་བྱས་པ།.md` |
| `bo-བདེན་པ་གཉིས་ལ་འཇུག་པ།.md` |
| `bo-བྱང་ཆུབ་སེམས་དཔའི་སྤྱོད་པ་ལ་འཇུག་པ།.md` |
| `bo-ཚད་མ་རྣམ་འགྲེལ།.md` |
| `bo-རིགས་པ་དྲུག་ཅུ་པའི་ཚིག་ལེའུར་བྱས་པ།.md` |
| `bo-རྣལ་འབྱོར་སྤྱོད་པའི་ས་ལས་བྱང་ཆུབ་སེམས་དཔའི་ས།.md` |
| `bo-རྩོད་པ་བཟློག་པའི་ཚིག་ལེའུར་བྱས་པ་ཞེས་བྱ་བ།.md` |
| `bo-སུམ་ཅུ་པའི་ཚིག་ལེའུར་བྱས་པ།.md` |

---

## 5. Language tracks — TBD

| Tag | Language | Script | Role |
| --- | -------- | ------ | ---- |
| `-bo` | Tibetan | Unicode | Root text and reference texts |

No translation, adaptation or plan tracks exist yet.

---

## 6. Where to look next

- [`0-VAULT-Structure.md`](0-VAULT-Structure.md) — the architecture in full.
- [`../../1-SOURCES/About Sources.md`](../../1-SOURCES/About%20Sources.md) — source-file rules.
- [`../../2-RAILS/About Rails.md`](../../2-RAILS/About%20Rails.md) — rails schema.
- [`../../3-TRANSFORMATIONS/About Transformations.md`](../../3-TRANSFORMATIONS/About%20Transformations.md) — track and output rules.
- [Top-level `README.md`](../../README.md) — pipeline overview and reading paths.
