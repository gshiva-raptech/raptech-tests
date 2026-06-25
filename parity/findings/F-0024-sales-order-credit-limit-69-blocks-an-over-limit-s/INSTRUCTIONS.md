# Fix request — F-0024: Sales Order Credit Limit (69) blocks an over-limit submit, allows within-limit — parity mismatch

> For the FIXING Claude session. Read `parity/FIXER_BRIEF.md` first (standing rules:
> legacy is source of truth, match it exactly, do NOT git commit, leave for human build).

## The gap
- **Expected (legacy):** Migrated must match legacy spec:
- **69 ON + low limit → over-limit SO blocked** — expected: true · migrated: false
- **Actual (migrated):** 69 ON + low limit → over-limit SO blocked: migrated=false
- See `ERROR.md` in this folder for evidence + screenshots.

## Where to look
- SalesOrdersController.enforceCreditLimit (param 69); soRepo.customerOutstandingForCreditLimit; @Transactional rollback + @ExceptionHandler.

## Definition of done
- Migrated behaviour matches legacy for this case.
- Re-run the parity case and confirm it passes:
  `node parity/run-case.mjs --case TC-PARAM-SO-069 --instance local-dev`
- Update this finding's row in `parity/findings/INDEX.md` → **Fixed** with a one-line note.
- Log root cause + files changed in the migrated repo's `summary.md` (per its CLAUDE.md).
- Do **NOT** `git commit`. Leave changes uncommitted for the human to build/test/commit.
