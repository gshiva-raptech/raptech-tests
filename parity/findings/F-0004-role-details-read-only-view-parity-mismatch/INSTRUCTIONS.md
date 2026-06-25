# Fix request — F-0004: Role Details (read-only view) — parity mismatch

> For the FIXING Claude session. Read `parity/FIXER_BRIEF.md` first (standing rules:
> legacy is source of truth, match it exactly, do NOT git commit, leave for human build).

## The gap
- **Expected (legacy):** Migrated must match legacy spec:
- **Role Details is read-only (no Save)** — expected: no save · migrated: has save
- **Name field read-only in Details** — expected: true · migrated: false
- **Actual (migrated):** Role Details is read-only (no Save): migrated=has save; Name field read-only in Details: migrated=false
- See `ERROR.md` in this folder for evidence + screenshots.

## Where to look
- Legacy detailRole is read-only.
- Migrated: RolePermissionController.roleEditForm() ignores the mode param → form is always editable (likely the gap).

## Definition of done
- Migrated behaviour matches legacy for this case.
- Re-run the parity case and confirm it passes:
  `node parity/run-case.mjs --case TC-ROLE-005 --instance local-dev`
- Update this finding's row in `parity/findings/INDEX.md` → **Fixed** with a one-line note.
- Log root cause + files changed in the migrated repo's `summary.md` (per its CLAUDE.md).
- Do **NOT** `git commit`. Leave changes uncommitted for the human to build/test/commit.
