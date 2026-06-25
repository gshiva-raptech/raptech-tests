# F-0027 — Taxes → Tax Rate edit always fails (endDate String → OffsetDateTime binding collision)

**Type:** confirmed bug · **Severity:** high (cannot edit a tax rate)
**Case:** TC-TAX-001 (edit RED)
**Found:** Admin → Taxes → Tax Rates → Edit, 2026-06-24 (verified by code + spring.log)
**Same class as F-0022** (a posted field name binding onto an entity field of an incompatible type).

## Repro
Edit any tax rate → POST `/admin/taxes/tax-rates/{id}` → Spring error page; nothing persists
(rate %, description, status, default-flag all lost). Reproduces even when `end_date` is NULL.

## Root cause
`TaxesController.taxRatesUpdate(@ModelAttribute TaxMasterRecord form, @RequestParam("endDate") String endDate, ...)`
— the form input `name="endDate"` (a `yyyy-MM-dd` string) is bound by the `@ModelAttribute` onto
`TaxMasterRecord.endDate` (`@Column(name="end_date") OffsetDateTime`, `TaxMasterRecord.java:49`). The
String→OffsetDateTime conversion throws `MethodArgumentNotValidException` **before** the manual
`@RequestParam String endDate` + `parseDate()` path runs. There is no `@InitBinder` disallowing the
field (unlike `GeneralController`, which does `setDisallowedFields(...)` for exactly this). Compounded:
the edit template renders **today's date even when `end_date` is null** (`form.html:158`), so a bad
value is always posted. `taxRatesCreate` has the identical collision and will fail the same way once
F-0026 unblocks the create form.

## Fix (recommended)
Add an `@InitBinder` to `TaxesController` disallowing the date field from `@ModelAttribute` binding so
only `parseDate()` sets it — mirror `GeneralController.initBinder`:
```java
@InitBinder
public void initBinder(WebDataBinder binder) { binder.setDisallowedFields("endDate", "startDate"); }
```
(Or rename the request param, e.g. `name="endDateStr"` + `@RequestParam("endDateStr")`.) Also fix the
template so a null `end_date` renders an empty date input. Apply to create + update. Verify TC-TAX-001.
