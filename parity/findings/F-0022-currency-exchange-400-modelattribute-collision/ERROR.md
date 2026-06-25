# F-0022 — Currency Exchange create & edit fail with HTTP 400 (model-attribute name collision)

**Type:** confirmed bug
**Severity:** high — a user **cannot create or edit** a currency exchange rate. Every submit on
`/admin/general/currency-exchanges/new` and `/admin/general/currency-exchanges/{id}` returns
**HTTP 400 Bad Request**. (The 3 existing rows predate this — they can't be edited either.)
**Case:** TC-GEN-CE-001 (General → Currency Exchanges)
**Found:** Admin → General → Currency Exchanges, 2026-06-24

## Repro
1. As an org user, go to `/admin/general/currency-exchanges/new`.
2. Pick From + To currency, a date ≤ today, and a rate (e.g. 2.5). The form is valid client-side
   (`checkValidity() === true`).
3. Submit → page shows "There was an unexpected error (type=Bad Request, status=400)."; no row created.
4. Same on edit (`/{id}`) — the rate field can't be saved.

## Server log
```
WARN ... DefaultHandlerExceptionResolver : Resolved [org.springframework.beans.TypeMismatchException:
Failed to convert value of type 'java.lang.String' to required type
'com.ipact.raptech.domain.admin.ExchangeRate'; Failed to convert from type [java.lang.String]
to type [java.lang.Long] for value [2.5]]
```

## Root cause
Name collision between the controller's `@ModelAttribute` parameter name and a posted field name:

- `GeneralController.exchangeRateCreate(@ModelAttribute ExchangeRate exchangeRate, ...)` — the model
  attribute is implicitly named **`exchangeRate`**.
- `ExchangeRate` has a property **also named `exchangeRate`** (the rate, `BigDecimal exchange_rate`).
- The form (`currency-exchanges/form.html`) binds the rate with `th:field="*{exchangeRate}"` →
  posts a request parameter **`exchangeRate=2.5`**.

So there is a request param `exchangeRate` whose name equals the model-attribute name `exchangeRate`.
With Spring Data's `DomainClassConverter` registered (String→entity by id), Spring tries to *materialise
the whole `ExchangeRate` model attribute from the param value* "2.5" → convert "2.5" to the entity's
`Long` id → fails → `TypeMismatchException` → 400.

This is why **only Currency Exchange** breaks: `DateLocker`, `FinancialYear`, `EmailConfig` have no
property whose name equals their model-attribute name, so no collision (TC-GEN-DL-001 / FY-001 / EC-001
are all green).

## Fix → see INSTRUCTIONS.md
Decouple the names so no request param equals the `@ModelAttribute` name — e.g. rename the model
attribute (and the template `th:object`), or post the rate under a distinct param bound via
`@RequestParam`.
