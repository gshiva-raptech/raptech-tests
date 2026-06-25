# F-0030 — Ledgers → Account Opening Balance delete leaves orphan GL postings (CANDIDATE — needs legacy spec)

**Type:** candidate (NOT a confirmed regression) · **Severity:** low/medium (data-integrity)
**Case:** TC-LED-OB-001 (passed; this is an observed side-effect, not a case failure)
**Found:** Admin → Ledgers → Account Opening Balance, 2026-06-24

## Observation
On save, an Opening Balance synchronously posts to `gl_entry` (process_type 'Opening Balance') and
`bank_statement`. The migrated delete (`openingBalanceDelete`) does a plain `deleteById` on
`gl_closing_balance` only — it does **not** reverse those postings, leaving an orphan `gl_entry` after a
delete.

## Why this is a CANDIDATE, not a confirmed bug
This could be intentional (plain delete, no posting reversal) and the agent could not confirm it diverges
from legacy. Treat as a candidate: the fixer should check what **legacy** does on opening-balance delete
(reverse the GL/bank postings, or block delete when posted?) before changing behavior. If legacy reverses
or blocks, this is a real data-integrity gap; if legacy also leaves them, accept.

## Note
The test harness hard-cleans the orphan postings FK-ordered in its `finally`, so it's not a test-data leak.
