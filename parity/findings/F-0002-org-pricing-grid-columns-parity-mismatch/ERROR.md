# F-0002 — Org Pricing grid columns — parity mismatch

> **RESOLUTION (2026-06-23): ACCEPTED — migrated is correct.** The migrated grid's
> pricing-centric columns are an intended redesign; legacy's contact/audit columns
> are deliberately not carried over. Recorded as a saved exception in
> `parity/exceptions.json` (case TC-PRICE-000) so it no longer flags. No fix needed.

| Field | Value |
|---|---|
| Case | TC-PRICE-000 |
| Instance | local-dev |
| URL path | /admin/org-pricing |
| Module / Sub Module | Admin Settings / Org Pricing |
| Priority | Medium |
| Status | Open |
| Found | parity testing session, 2026-06-23 |

## Expected (legacy = source of truth)
Migrated must match legacy:
- **Grid columns match legacy** — legacy: org name, first name, email, txn id, plan name, created by, updated by, phone · migrated: organization, plan, product, grand total, from, to, txn id, status (missing: org name, first name, email, plan name, created by, updated by, phone | extra: organization, plan, product, grand total, from, to, status)

## Actual (migrated)
Grid columns match legacy: migrated=organization, plan, product, grand total, from, to, txn id, status

## Evidence / how observed
Auto-captured by parity runner (case TC-PRICE-000, instance local-dev).

## Screenshots
- `screenshots/legacy-grid.png`
- `screenshots/migrated-grid.png`

## Notes for triage
- The automated legacy read captured 8 columns; the legacy screen (and the user's
  screenshot) also shows **Product Info** — so the full legacy column set is:
  Org Name, First Name, Email, Txn Id, Plan Name, Created By, Updated By, Phone, Product Info.
- The migrated grid was redesigned to pricing-centric columns (Plan, Product,
  Grand Total, From, To, Status) and dropped legacy's contact/audit columns
  (First Name, Email, Created By, Updated By, Phone) and renamed others.
- **Decision needed (regression vs intended improvement):** project rule is
  "fields/columns are 100% legacy ditto; new theme = LAYOUT only" → by that rule
  migrated should match the legacy column set/labels/order. But the migrated set is
  arguably more useful for a pricing view. Same triage as the create-org diffs
  (F-0001): the human labels this **align-to-legacy** or **accepted improvement**
  (saved exception). Fixer should NOT change columns until labeled.
