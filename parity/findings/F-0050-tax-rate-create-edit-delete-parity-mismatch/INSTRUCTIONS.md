# Fix request — F-0050: Tax Rate create / edit / delete — parity mismatch

> For the FIXING Claude session. Read `parity/FIXER_BRIEF.md` first (standing rules:
> legacy is source of truth, match it exactly, do NOT git commit, leave for human build).

## The gap
- **Expected (legacy):** Migrated must match legacy spec:
- **Create form renders + is usable** — expected: true · migrated: false (Add Tax Rate form (/tax-rates/new) truncates: Thymeleaf "Iteration variable cannot be null" at form.html:139 (th:each="mod : ${modules}").)
- **Actual (migrated):** Create form renders + is usable: migrated=false
- See `ERROR.md` in this folder for evidence + screenshots.

## Where to look
- TaxesController new (dependent Tax Type→Group Tax→rate lines), {id} update, {id}/delete.

## Definition of done
- Migrated behaviour matches legacy for this case.
- Re-run the parity case and confirm it passes:
  `node parity/run-case.mjs --case TC-TAX-001 --instance local-dev`
- Update this finding's row in `parity/findings/INDEX.md` → **Fixed** with a one-line note.
- Log root cause + files changed in the migrated repo's `summary.md` (per its CLAUDE.md).
- Do **NOT** `git commit`. Leave changes uncommitted for the human to build/test/commit.
