# F-0004 — Role Details (read-only view) — parity mismatch

> **RESOLUTION (2026-06-23): FIXED in this session (uncommitted).** `mode=view` now
> renders read-only. Files: RolePermissionController.roleEditForm() (reads `mode` →
> `canEdit`); admin/roles/form.html (name readonly, status disabled, Save/Delete hidden,
> back link when read-only). Re-run TC-ROLE-005 after rebuild to confirm green.

| Field | Value |
|---|---|
| Case | TC-ROLE-005 |
| Instance | local-dev |
| URL path | /admin/roles/{id}?mode=view |
| Module / Sub Module | Admin Settings / Roles |
| Priority | Medium |
| Status | Open |
| Found | parity testing session, 2026-06-23 |

## Expected (legacy = source of truth)
Migrated must match legacy spec:
- **Role Details is read-only (no Save)** — expected: no save · migrated: has save
- **Name field read-only in Details** — expected: true · migrated: false

## Actual (migrated)
Role Details is read-only (no Save): migrated=has save; Name field read-only in Details: migrated=false

## Evidence / how observed
Auto-captured by parity runner (case TC-ROLE-005, instance local-dev).

## Screenshots
- `screenshots/migrated-view.png`
