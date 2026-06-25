# Fix request — F-0054: Capacity Planning create / edit / details / delete — parity mismatch

> For the FIXING Claude session. Read `parity/FIXER_BRIEF.md` first (standing rules:
> legacy is source of truth, match it exactly, do NOT git commit, leave for human build).

## The gap
- **Expected (legacy):** Migrated must match legacy spec:
- **Edit (working hours) persisted** — expected: true · migrated: false
- **Actual (migrated):** Edit (working hours) persisted: migrated=false
- See `ERROR.md` in this folder for evidence + screenshots.

## Where to look
- ProductionController capacity create (entity+resourceType+machine+hours+days; tasks→mappings; no dup guard), {id} update (hours/days/status), {id}/details (read-only), {id}/delete (hard, mappings child first). task_resource_master.

## Definition of done
- Migrated behaviour matches legacy for this case.
- Re-run the parity case and confirm it passes:
  `node parity/run-case.mjs --case TC-PROD-CP-001 --instance local-dev`
- Update this finding's row in `parity/findings/INDEX.md` → **Fixed** with a one-line note.
- Log root cause + files changed in the migrated repo's `summary.md` (per its CLAUDE.md).
- Do **NOT** `git commit`. Leave changes uncommitted for the human to build/test/commit.
