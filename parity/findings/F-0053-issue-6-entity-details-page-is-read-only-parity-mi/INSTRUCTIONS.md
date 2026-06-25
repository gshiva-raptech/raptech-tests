# Fix request — F-0053: Issue #6 — Entity Details page is read-only — parity mismatch

> For the FIXING Claude session. Read `parity/FIXER_BRIEF.md` first (standing rules:
> legacy is source of truth, match it exactly, do NOT git commit, leave for human build).

## The gap
- **Expected (legacy):** Migrated must match legacy spec:
- **Entity Details has no editable fields (read-only)** — expected: 0 · migrated: 23 editable: checkbox,currency,displayName,abbreviation,timeZoneId,dateFormat,address1,address2,country,state
- **Actual (migrated):** Entity Details has no editable fields (read-only): migrated=23 editable: checkbox,currency,displayName,abbreviation,timeZoneId,dateFormat,address1,address2,country,state
- See `ERROR.md` in this folder for evidence + screenshots.

## Where to look
- Issue #6: Entity Details fields all editable → should be read-only.
- Legacy detailEntity.jsp: all fields static <s:property>.
- Migrated: OrganizationController.viewEntity() returns editable entity-form.html with no mode; grid "Entity Details" action URL == "Edit Entity" URL (no ?mode=view).

## Definition of done
- Migrated behaviour matches legacy for this case.
- Re-run the parity case and confirm it passes:
  `node parity/run-case.mjs --case TC-UIP-06 --instance local-dev`
- Update this finding's row in `parity/findings/INDEX.md` → **Fixed** with a one-line note.
- Log root cause + files changed in the migrated repo's `summary.md` (per its CLAUDE.md).
- Do **NOT** `git commit`. Leave changes uncommitted for the human to build/test/commit.
