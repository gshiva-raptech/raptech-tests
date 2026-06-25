# FIXER BRIEF — standing rules for the fixing Claude session

You are the **fixing** session. The **testing** session finds parity gaps and drops them in
`parity/findings/F-xxxx-*/`. Your job: take one finding and make the migrated app match legacy,
to the migrated repo's standards, leaving the change uncommitted for the human.

## Before you touch code (every time)
1. Read the migrated repo's `CLAUDE.md` and the files it points to — especially `NEW_CHAT_PROMPT.md`,
   `AUTOFIX_AGENT_BRIEF.md`, `checklist.md`, and `summary.md`. Those are the law for how to fix.
2. Read the finding you're handed: `ERROR.md` (gap + evidence + screenshots) and `INSTRUCTIONS.md`
   (definition of done) in its folder.
3. Read the **legacy** screen for the finding's URL path (legacy is the source of truth), then the
   migrated controller + template + service.

## Working rules (from the migrated repo — non-negotiable)
- **Legacy is the source of truth.** Match fields, rules, validations, dropdowns, actions, columns,
  labels exactly. New theme governs LAYOUT only.
- **Minimal scope.** Fix only the finding. Don't break working screens. A shared-component change is
  allowed only when the finding genuinely needs it — keep it backward-compatible and log it.
- **Never `git commit` / build / run / deploy.** Leave changes uncommitted; the human builds, tests,
  commits.
- **Do not touch** the superadmin `/admin/organizations` grid or `OrgPricingController.adminTabs`
  (confirmed correct), and obey every cardinal rule in `NEW_CHAT_PROMPT.md`.
- No `T(java...)` SpEL, no `th:on*` String handlers in Thymeleaf.
- Verify column / field / route names against the actual entity + DDL before using them.

## Per-finding workflow
1. Reproduce the gap from `ERROR.md`.
2. Read legacy → migrated for that screen; identify the exact divergence.
3. Make the minimal change to reach legacy parity using the shared standards.
4. Log root cause + files changed in the migrated repo's `summary.md` (and `fixes.md` if you extended
   a settled pattern).
5. Update the finding: set its row in `parity/findings/INDEX.md` to **Fixed** (or **Partially Fixed**
   / **Need More Info**) with a one-line note, and append a `## Fix` section to its `ERROR.md` stating
   what changed and the files.
6. Tell the human it's ready to build; the testing session will re-run the case to confirm parity.

## Status values (INDEX.md)
`Open` (tester set) → `Fixed` / `Partially Fixed` (needs build/verify) / `Need More Info`
(unclear — state the precise missing detail).

## Definition of done (before marking Fixed)
- You read the legacy screen and matched it.
- The fix uses shared standards, not a one-off hack.
- Scope stayed minimal; nothing else broke.
- The parity case will pass on re-run:
  `node parity/run-case.mjs --case <ID> --instance <instance>`.
- `summary.md` updated. Changes left uncommitted.
