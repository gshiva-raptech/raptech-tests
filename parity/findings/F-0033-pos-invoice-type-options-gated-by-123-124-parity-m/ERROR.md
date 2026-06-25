# F-0033 — POS invoice-type options gated by 123 / 124 — parity mismatch

| Field | Value |
|---|---|
| Case | TC-PARAM-SI-123 |
| Instance | local-dev |
| URL path | /sales-invoice/point-of-sale/new |
| Module / Sub Module | Admin Settings / Org Parameter (Sales Invoice) → POS form |
| Priority | Medium |
| Status | Open |
| Found | parity testing session, 2026-06-24 |

## Expected (legacy = source of truth)
Migrated must match legacy spec:
- **123 only → POS-Non-Inventory hidden** — expected: false · migrated: true

## Actual (migrated)
123 only → POS-Non-Inventory hidden: migrated=true

## Evidence / how observed
Auto-captured by parity runner (case TC-PARAM-SI-123, instance local-dev).

## Screenshots
- (none)
