# Fix request — F-0002: Org Pricing grid columns — parity mismatch

> For the FIXING Claude session. Read `parity/FIXER_BRIEF.md` first (standing rules:
> legacy is source of truth, match it exactly, do NOT git commit, leave for human build).

## The gap
- **Expected (legacy):** Migrated must match legacy:
- **Grid columns match legacy** — legacy: org name, first name, email, txn id, plan name, created by, updated by, phone · migrated: organization, plan, product, grand total, from, to, txn id, status (missing: org name, first name, email, plan name, created by, updated by, phone | extra: organization, plan, product, grand total, from, to, status)
- **Actual (migrated):** Grid columns match legacy: migrated=organization, plan, product, grand total, from, to, txn id, status
- See `ERROR.md` in this folder for evidence + screenshots.

## Where to look
- Legacy: /admin/viewOrgPricing.action grid (gridColumnArray).
- Migrated: OrgPricingController + OrgPricingSchema (AG-grid column defs).

## Definition of done
- Migrated behaviour matches legacy for this case.
- Re-run the parity case and confirm it passes:
  `node parity/run-case.mjs --case TC-PRICE-000 --instance local-dev`
- Update this finding's row in `parity/findings/INDEX.md` → **Fixed** with a one-line note.
- Log root cause + files changed in the migrated repo's `summary.md` (per its CLAUDE.md).
- Do **NOT** `git commit`. Leave changes uncommitted for the human to build/test/commit.
