# F-0054 — Capacity Planning create / edit / details / delete — parity mismatch

| Field | Value |
|---|---|
| Case | TC-PROD-CP-001 |
| Instance | local-dev |
| URL path | /admin/production/capacity-planning |
| Module / Sub Module | Production / Production → Capacity Planning |
| Priority | Medium |
| Status | Verified — no code change required (stale finding) |
| Found | parity testing session, 2026-06-25 |
| Verified | 2026-06-25 — TC-PROD-CP-001 PASS, all 5 checks, 2 consecutive runs |

## Expected (legacy = source of truth)
Migrated must match legacy spec:
- **Edit (working hours) persisted** — expected: true · migrated: false (as originally captured)

## Actual (migrated) — RESOLVED
Re-ran TC-PROD-CP-001 against local-dev twice: **"Edit (working hours) persisted" = migrated=true**, all 5 checks green.

The reported failure was **stale**. Code inspection of the full edit path shows it was already correct:
- Form input name and entity field align end-to-end: `totalWorkingHoursPerDay`
  (template `th:field="*{totalWorkingHoursPerDay}"` → entity `TaskResourceMaster.totalWorkingHoursPerDay`, BigDecimal/float8).
- `ProductionController.capacityUpdate` (POST `/admin/production/capacity-planning/{id}`) does fetch-then-set:
  `ex.setTotalWorkingHoursPerDay(form.getTotalWorkingHoursPerDay())` before `capacityRepo.save(ex)`.
- `git log -S "ex.setTotalWorkingHoursPerDay"` → this setter has been present since the original
  migration commit `bc22dd2`; no binding mismatch, no missing setter.

There is no code change for the edit-persist behaviour. The only related uncommitted change is the
F-0029 delete-cascade fix (capacityDelete removes child mappings before deleteById), already reflected
in the running jar (delete check = migrated=gone).

## Evidence / how observed
Auto-captured by parity runner (case TC-PROD-CP-001, instance local-dev). Verification re-run on
2026-06-25 returned PASS on all five checks across two consecutive runs.

## Screenshots
- (none)
