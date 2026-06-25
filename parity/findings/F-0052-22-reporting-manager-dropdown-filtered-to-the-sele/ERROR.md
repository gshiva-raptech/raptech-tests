# F-0052 — #22 Reporting Manager dropdown filtered to the selected entity — parity mismatch

| Field | Value |
|---|---|
| Case | TC-UIP-22 |
| Instance | local-dev |
| URL path | /admin/users/new |
| Module / Sub Module | Admin Settings / Users |
| Priority | Medium |
| Status | Open |
| Found | parity testing session, 2026-06-25 |

## Expected (legacy = source of truth)
Migrated must match legacy spec:
- **Reporting Manager excludes "SU_ora" (not in entity 119)** — expected: absent · migrated: present (bug)
- **Reporting Manager options match the selected entity's user set** — expected: 8 (entity 119) · migrated: 9 options (matchesOrg=true, matchesEntity=false)

## Actual (migrated)
Reporting Manager excludes "SU_ora" (not in entity 119): migrated=present (bug); Reporting Manager options match the selected entity's user set: migrated=9 options (matchesOrg=true, matchesEntity=false)

## Evidence / how observed
Auto-captured by parity runner (case TC-UIP-22, instance local-dev).

## Screenshots
- (none)
