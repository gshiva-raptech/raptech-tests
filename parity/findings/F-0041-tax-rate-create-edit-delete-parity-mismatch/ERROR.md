# F-0041 — Tax Rate create / edit / delete — parity mismatch

| Field | Value |
|---|---|
| Case | TC-TAX-001 |
| Instance | local-dev |
| URL path | /admin/taxes/tax-rates |
| Module / Sub Module | Admin Settings / Taxes → Tax Rates |
| Priority | Medium |
| Status | Open |
| Found | parity testing session, 2026-06-24 |

## Expected (legacy = source of truth)
Migrated must match legacy spec:
- **Create form renders + is usable** — expected: true · migrated: false (Add Tax Rate form (/tax-rates/new) truncates: Thymeleaf "Iteration variable cannot be null" at form.html:139 (th:each="mod : ${modules}").)
- **Edit (rate % + description) persisted** — expected: true · migrated: false (Update POST fails MethodArgumentNotValidException: endDate (yyyy-MM-dd String) binds to TaxMasterRecord.endDate (OffsetDateTime) on the @ModelAttribute and cannot convert → error page, edit lost. Affects ALL edits (the date input renders today even when end_date is null).)

## Actual (migrated)
Create form renders + is usable: migrated=false; Edit (rate % + description) persisted: migrated=false

## Evidence / how observed
Auto-captured by parity runner (case TC-TAX-001, instance local-dev).

## Screenshots
- (none)
