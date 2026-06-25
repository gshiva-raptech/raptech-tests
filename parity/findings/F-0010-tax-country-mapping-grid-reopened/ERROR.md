# F-0010 (reopened) — Tax Country Mapping grid: buggy columns (manual #14 + #15)

**Type:** confirmed bug (was wrongly accepted as an enhancement) · **Severity:** medium
**Cases:** TC-TCM-000, TC-UIP-14, TC-UIP-15 · Verified 2026-06-24 (code + DB)

## #14 — Business Type column shows raw "0"
`AdminMiscController.resolveBusinessType()` (~:970-980) maps only `1→Supplier, 2→Customer`, `default →
String.valueOf(code)`. Real data uses legacy codes 0/4/5 (DB: 123×0, 122×5, 122×4) → fall through to the
raw integer. Legacy: `0=""(blank), 4="Unregistered Business", 5="Special Economic Zone"` (1/2 unused here).
Fix: rewrite resolveBusinessType to 0→"", 4→"Unregistered Business", 5→"Special Economic Zone".

## #15 — Unwanted Action column
`taxCountryMappingList()` (~:270-282) declares GridAction View/Edit/Delete + actionUrls → Action column.
Legacy exposes no usable actions. Fix: remove .actions/.actionUrls (and /{id}/delete) for the TCM grid.

## Note
Original F-0010 accepted the extra columns as an enhancement — premature (checked presence, not values/
actions). Exception removed; reopened.
