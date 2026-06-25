# F-0024 — Sales Order Credit Limit (69) blocks an over-limit submit, allows within-limit — parity mismatch

| Field | Value |
|---|---|
| Case | TC-PARAM-SO-069 |
| Instance | local-dev |
| URL path | /sales-orders/sales-orders/new |
| Module / Sub Module | Admin Settings / Org Parameter (Sales Order) → SO submit credit-limit guard |
| Priority | Medium |
| Status | Open |
| Found | parity testing session, 2026-06-24 |

## Expected (legacy = source of truth)
Migrated must match legacy spec:
- **69 ON + low limit → over-limit SO blocked** — expected: true · migrated: false

## Actual (migrated)
69 ON + low limit → over-limit SO blocked: migrated=false

## Evidence / how observed
Auto-captured by parity runner (case TC-PARAM-SO-069, instance local-dev).

## Screenshots
- (none)
