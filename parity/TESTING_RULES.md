# TESTING RULES — read first, applies to ALL parity testing (lead + every agent)

**Goal (the only thing that matters):** A user logging into the system must not lose ANY validation or
function that exists in legacy. We test from the **user's perspective**, comparing **legacy ↔ migrated**,
so that everything already developed still works in migrated. Completeness > speed — taking longer is fine.

## RULE 1 — UI only, like a manual tester
Drive AND verify through the **rendered browser UI** (Playwright on the real pages). Behave exactly like a
human tester clicking through the app. Do **not** take backend shortcuts to decide pass/fail.

## RULE 2 — Verify what the user SEES (not the backend)
- ✅ Verify via: the **AG-Grid DOM** (search the grid for the row, read the cell text the user sees),
  on-screen **success/error/validation messages**, rendered **field values**, **read-only/disabled**
  states, presence/absence of **buttons/menus/row-actions**, **page navigation / URL changes**, popups.
- ❌ Do NOT assert via the JSON `rows` endpoint, and do NOT assert via `psql`. Those reflect the backend,
  not the user. (The whole point: the UI can be broken even when the DB is correct.)
- `psql` is allowed ONLY for: test **cleanup**, and **last-resort prerequisite seeding** a tester truly
  couldn't do via the UI (note it when you do). **Prefer creating prerequisites through the UI** — a
  manual tester would create the department/category/role first, then use it.

## RULE 3 — Test ALL validations (not just happy path)
For every form, do what a tester does: submit with each required field empty → assert the on-screen
validation message; enter bad formats (email/number/date), out-of-range (min/max), duplicates, and
business-rule violations → assert the correct message appears and the save is blocked. Then the valid
case → assert success feedback. Missing/weaker validation vs legacy is a finding.

## RULE 4 — Exercise EVERY function on the screen
Every button, menu item, row action, tab, sub-tab, link, toggle, search, sort, filter, export — click it
and confirm it does the right thing. A dead/no-op control is a finding (e.g. dead "Pricing" menu).

## RULE 5 — Legacy ↔ migrated parity from the user's view
For each screen, enumerate what **legacy** presents to the user — fields, required markers, validations,
actions, messages, read-only states, navigation — and confirm **migrated** matches. Flag anything migrated
is **missing, weaker, different, or broken** vs legacy. Where legacy is the golden master, legacy wins
unless the product owner accepted an intentional change (see exceptions.json).

## RULE 6 — A "bug" is a user-visible defect, confirmed on screen
Broken button, missing/weaker validation, wrong or missing message, dead link, can't-save, leaked field,
wrong displayed value, no navigation. Reproduce it on screen before recording. (Server log / DB may be
used to explain root cause AFTER you've reproduced it in the UI — never as the proof itself.)

## RULE 7 — Cleanup discipline (STRICT — shared dev DB)
- Delete ONLY rows **you created in THIS run**. Name them with a unique per-run stamp (e.g. `ZZ <prefix>
  <Date-derived stamp>`) and delete by that exact stamp — NOT by a broad `ZZ %` match.
- **NEVER delete pre-existing data** or another run's/agent's leftovers (even if `ZZ`-prefixed). If you
  find orphan test rows, **report them** for the lead to handle — do not delete them.
- **NEVER spawn a sub-agent to perform DB deletes**, and never run destructive shared-DB SQL beyond your
  own this-run rows. `psql` deletes are limited to your own stamped rows in a `finally`.
- If a delete is blocked, leave it and report — do not work around the block.

## Practical notes
- Reading a grid row (UI way): wait for `.ag-row`, search cells by visible text, read `.ag-cell` values —
  do not fetch `/rows`. For "appears after create", find the row in the grid the user is returned to.
- Capturing validation: after clicking the real Submit, read the visible field-error(s) / banner / popup.
- Compare legacy by driving the legacy app too (Track A) for the same screen and diffing what the user sees.
- Findings still: reproduce in UI → record with the on-screen evidence + (optional) root cause from code.
