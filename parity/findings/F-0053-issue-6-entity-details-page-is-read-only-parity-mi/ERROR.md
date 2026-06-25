# F-0053 — Issue #6 — Entity Details page is read-only — parity mismatch

| Field | Value |
|---|---|
| Case | TC-UIP-06 |
| Instance | local-dev |
| URL path | /admin/organizations/{orgId}/entities/{entityId} |
| Module / Sub Module | Admin Settings / Business Unit (super-admin) |
| Priority | Medium |
| Status | Open |
| Found | parity testing session, 2026-06-25 |

## Expected (legacy = source of truth)
Migrated must match legacy spec:
- **Entity Details has no editable fields (read-only)** — expected: 0 · migrated: 23 editable: checkbox,currency,displayName,abbreviation,timeZoneId,dateFormat,address1,address2,country,state

## Actual (migrated)
Entity Details has no editable fields (read-only): migrated=23 editable: checkbox,currency,displayName,abbreviation,timeZoneId,dateFormat,address1,address2,country,state

## Evidence / how observed
Auto-captured by parity runner (case TC-UIP-06, instance local-dev).

## Screenshots
- `screenshots/migrated-detail.png`
