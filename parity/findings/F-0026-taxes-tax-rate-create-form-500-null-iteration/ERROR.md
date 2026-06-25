# F-0026 — Taxes → Tax Rates "Add Tax Rate" form 500s; create is impossible

**Type:** confirmed bug · **Severity:** high (cannot create a tax rate through the UI)
**Case:** TC-TAX-001 (create RED; edit/delete verified via a DB-seeded record)
**Found:** Admin → Taxes → Tax Rates → New, 2026-06-24 (verified against spring.log)

## Repro
GET `/admin/taxes/tax-rates/new` as an org user → response truncates
(`ERR_INCOMPLETE_CHUNKED_ENCODING`), page never reaches DOMContentLoaded; no Module options, no
rate-line table → no tax rate can be created. (The edit form renders fine.)

## Evidence (spring.log)
```
org.thymeleaf.exceptions.TemplateInputException: An error happened during template parsing
  (template: "templates/admin/taxes/tax-rates/form.html")
Caused by: java.lang.IllegalArgumentException: Iteration variable cannot be null
  at org.thymeleaf.standard.processor.StandardEachTagProcessor.doProcess(StandardEachTagProcessor.java:59)
```

## Root cause (needs the fixer to pin the exact var)
A `th:each` in the **isNew** branch of `tax-rates/form.html` iterates a **null** model attribute. The
stack points near `form.html:139` — the Module `<option th:each="mod : ${modules}">`. NOTE: `modules`
*is* populated (`TaxesController.populateFormLookups` → `model.addAttribute("modules", MODULES)`,
`MODULES = List.of("Purchase","Sales")`), and `taxTypes` is too — so the actually-null iteration var
may be a different `th:each` rendered only when `isNew` (the inline `th:each` blocks at ~196/207/211 over
`groupTaxNames`/`glCodes`/`taxRateRows`, or a nested fragment). The fixer should add a null-safe guard
(`th:each="x : ${list ?: {}}"`) and confirm which attribute is null on the `/new` path specifically.
The edit form avoids it because the offending field is `th:if="${isNew}"`-gated.

## Fix
Identify the null `th:each` source on the create path and ensure it's always a non-null list (populate
it in `taxRatesNewForm`/`populateFormLookups`, or null-guard the `th:each`). Then TC-TAX-001 create
should pass.
