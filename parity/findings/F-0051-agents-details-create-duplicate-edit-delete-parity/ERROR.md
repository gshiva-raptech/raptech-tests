# F-0051 — Agents Details create / duplicate / edit / delete — parity mismatch

| Field | Value |
|---|---|
| Case | TC-SALES-003 |
| Instance | local-dev |
| URL path | /admin/sales/agents-details |
| Module / Sub Module | Sales / Agents Details |
| Priority | Medium |
| Status | Open |
| Found | parity testing session, 2026-06-25 |

## Expected (legacy = source of truth)
Migrated must match legacy spec:
- **Duplicate unique id blocked** — expected: unique id already exists · migrated: (none)
- **Edit (telephone/description) persisted (after GL-picker workaround)** — expected: true · migrated: false

## Actual (migrated)
Duplicate unique id blocked: migrated=(none); Edit (telephone/description) persisted (after GL-picker workaround): migrated=false

## Evidence / how observed
Auto-captured by parity runner (case TC-SALES-003, instance local-dev).

## Screenshots
- (none)
