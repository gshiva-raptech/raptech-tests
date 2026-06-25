# Fix request — F-0052: #22 Reporting Manager dropdown filtered to the selected entity — parity mismatch

> For the FIXING Claude session. Read `parity/FIXER_BRIEF.md` first (standing rules:
> legacy is source of truth, match it exactly, do NOT git commit, leave for human build).

## The gap
- **Expected (legacy):** Migrated must match legacy spec:
- **Reporting Manager excludes "SU_ora" (not in entity 119)** — expected: absent · migrated: present (bug)
- **Reporting Manager options match the selected entity's user set** — expected: 8 (entity 119) · migrated: 9 options (matchesOrg=true, matchesEntity=false)
- **Actual (migrated):** Reporting Manager excludes "SU_ora" (not in entity 119): migrated=present (bug); Reporting Manager options match the selected entity's user set: migrated=9 options (matchesOrg=true, matchesEntity=false)
- See `ERROR.md` in this folder for evidence + screenshots.

## Where to look
Manual UI-parity issue #22. Reporting Manager dropdown is org-wide, not entity-scoped. Root cause: UserController.populateModel → userService.findReportingManagerOptions(orgId); UserRepository.findReportingManagerCandidates joins org_user_mapping on org_id_fk only (no entity_id_fk). Expected legacy behaviour: filter RM candidates to the selected entity (fetchReportingManagerUserList by entity).

## Definition of done
- Migrated behaviour matches legacy for this case.
- Re-run the parity case and confirm it passes:
  `node parity/run-case.mjs --case TC-UIP-22 --instance local-dev`
- Update this finding's row in `parity/findings/INDEX.md` → **Fixed** with a one-line note.
- Log root cause + files changed in the migrated repo's `summary.md` (per its CLAUDE.md).
- Do **NOT** `git commit`. Leave changes uncommitted for the human to build/test/commit.
