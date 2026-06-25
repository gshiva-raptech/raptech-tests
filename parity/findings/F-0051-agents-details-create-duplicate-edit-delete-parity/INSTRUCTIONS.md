# Fix request — F-0051: Agents Details create / duplicate / edit / delete — parity mismatch

> For the FIXING Claude session. Read `parity/FIXER_BRIEF.md` first (standing rules:
> legacy is source of truth, match it exactly, do NOT git commit, leave for human build).

## The gap
- **Expected (legacy):** Migrated must match legacy spec:
- **Duplicate unique id blocked** — expected: unique id already exists · migrated: (none)
- **Edit (telephone/description) persisted (after GL-picker workaround)** — expected: true · migrated: false
- **Actual (migrated):** Duplicate unique id blocked: migrated=(none); Edit (telephone/description) persisted (after GL-picker workaround): migrated=false
- See `ERROR.md` in this folder for evidence + screenshots.

## Where to look
- SalesController agentsCreate (dup name + unique id, auto GL child), agentsUpdate, delete.

## Definition of done
- Migrated behaviour matches legacy for this case.
- Re-run the parity case and confirm it passes:
  `node parity/run-case.mjs --case TC-SALES-003 --instance local-dev`
- Update this finding's row in `parity/findings/INDEX.md` → **Fixed** with a one-line note.
- Log root cause + files changed in the migrated repo's `summary.md` (per its CLAUDE.md).
- Do **NOT** `git commit`. Leave changes uncommitted for the human to build/test/commit.
