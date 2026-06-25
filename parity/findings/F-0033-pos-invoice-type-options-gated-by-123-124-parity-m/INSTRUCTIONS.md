# Fix request — F-0033: POS invoice-type options gated by 123 / 124 — parity mismatch

> For the FIXING Claude session. Read `parity/FIXER_BRIEF.md` first (standing rules:
> legacy is source of truth, match it exactly, do NOT git commit, leave for human build).

## The gap
- **Expected (legacy):** Migrated must match legacy spec:
- **123 only → POS-Non-Inventory hidden** — expected: false · migrated: true
- **Actual (migrated):** 123 only → POS-Non-Inventory hidden: migrated=true
- See `ERROR.md` in this folder for evidence + screenshots.

## Where to look
- SalesInvoiceController.addInvoiceFormLookups(isPos=true): POS_INVOICE_TYPES filtered by 123/124, fallback all.

## Definition of done
- Migrated behaviour matches legacy for this case.
- Re-run the parity case and confirm it passes:
  `node parity/run-case.mjs --case TC-PARAM-SI-123 --instance local-dev`
- Update this finding's row in `parity/findings/INDEX.md` → **Fixed** with a one-line note.
- Log root cause + files changed in the migrated repo's `summary.md` (per its CLAUDE.md).
- Do **NOT** `git commit`. Leave changes uncommitted for the human to build/test/commit.
