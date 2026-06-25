# F-0050 — Tax Rate create / edit / delete — parity mismatch

| Field | Value |
|---|---|
| Case | TC-TAX-001 |
| Instance | local-dev |
| URL path | /admin/taxes/tax-rates |
| Module / Sub Module | Admin Settings / Taxes → Tax Rates |
| Priority | Medium |
| Status | Open |
| Found | parity testing session, 2026-06-25 |

## Expected (legacy = source of truth)
Migrated must match legacy spec:
- **Create form renders + is usable** — expected: true · migrated: false (Add Tax Rate form (/tax-rates/new) truncates: Thymeleaf "Iteration variable cannot be null" at form.html:139 (th:each="mod : ${modules}").)

## Actual (migrated)
Create form renders + is usable: migrated=false

## Evidence / how observed
Auto-captured by parity runner (case TC-TAX-001, instance local-dev).

## Screenshots
- (none)
