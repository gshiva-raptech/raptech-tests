# Fix request — F-0022: Currency Exchange create/edit returns 400 (model-attribute name collision)

> FIXING session. Read `parity/FIXER_BRIEF.md` first (do NOT git commit; leave for human build).
> See ERROR.md for full evidence.

## The gap (one line)
`@ModelAttribute ExchangeRate exchangeRate` is named `exchangeRate`, and the form posts a field
`exchangeRate` (the rate, `th:field="*{exchangeRate}"`). The param name == the model-attribute name →
Spring's DomainClassConverter tries to build the whole entity from "2.5" (String→Long id) → 400 on
every create AND edit.

## Fix (recommended — rename the model attribute so it can't collide with any field name)
`raptech-web/.../web/controller/admin/GeneralController.java` — both `exchangeRateCreate` and
`exchangeRateUpdate`:
```java
public String exchangeRateCreate(@ModelAttribute("exchangeRateForm") ExchangeRate exchangeRate, ...)
public String exchangeRateUpdate(@PathVariable Long id,
                                 @ModelAttribute("exchangeRateForm") ExchangeRate exchangeRate, ...)
```
And in the new/edit model setup use the same attribute name:
```java
model.addAttribute("exchangeRateForm", new ExchangeRate());   // newForm
model.addAttribute("exchangeRateForm", exchangeRate);          // editForm
```
Then in `currency-exchanges/form.html` point the form object at it:
```html
<form ... th:object="${exchangeRateForm}"> ... </form>
```
`th:field="*{exchangeRate}"` still posts `exchangeRate=2.5`, but the model attribute is now
`exchangeRateForm`, so there is no param/attribute name collision and the rate binds to
`exchangeRateForm.exchangeRate` normally.

### Alternative (smaller template change)
Keep the model attribute as-is but post the rate under a different param name and bind it explicitly:
```html
<input type="number" id="exchangeRateVal" name="rateValue" .../>   <!-- not th:field -->
```
```java
exchangeRateCreate(@ModelAttribute ExchangeRate exchangeRate, @RequestParam BigDecimal rateValue, ...)
  → exchangeRate.setExchangeRate(rateValue);
```
(Apply to update too.) Either approach works; the first keeps `th:field` binding intact.

## Verify
1. Rebuild + restart.
2. `node parity/run-case.mjs --case TC-GEN-CE-001 --instance local-dev`
   Expect all green: create + in grid, duplicate blocked (same pair+date), edit (rate) persists,
   delete removes from grid.
3. Update this finding's INDEX row → Fixed. Log in migrated `summary.md`. Do NOT git commit.
