# F-0005 — Item Formula defined but NOT consumed by any module (formula engine missing)

| Field | Value |
|---|---|
| Case | (exploration — TC-IF-003 to be added once engine exists) |
| Instance | local-dev |
| URL path | /admin/item-formula → consuming modules: Cost Estimate / Quotation / Sales Order / Purchase Order |
| Module / Sub Module | Admin Settings / Item Formula → L2Q + Procurement calculation |
| Priority | High |
| Status | Open |
| Found | parity testing session, 2026-06-23 |

## Expected (legacy = source of truth)
Legacy `createOrEditItemFormula` lets an org define, per item-template attribute (and the base
SELLING/NET PRICE / CALCULATED QTY rows), a formula for **Costing, Quotation, Sales Order, Purchase
Order**. Those formulas are then **evaluated in the respective module** to compute derived values, e.g.:
- Coverage `attr_2300` = `{attr_id_2299}/{attr_id_2298}`
- Calculated Qty `CALCULATED_QTY` = `roundup(({COSTING_UOM}/{attr_id_2300}),0)`
So in Cost Estimate / Quotation / Sales Order / PO, entering the input attributes auto-computes the
formula-driven fields. Defining a formula must change the calculation in that module.

## Actual (migrated)
The Item Formula **config screen** saves/stores `ItemFormula` rows correctly (verified by TC-IF-000/001/002),
but **nothing consumes them**:
- `ItemFormula` is referenced in only 4 files: `domain/admin/ItemFormula.java`, `repo/admin/ItemFormulaRepository.java`,
  `web/controller/admin/AdminMiscController.java` (the config screen), `web/grid/schema/ItemFormulaSchema.java`.
- The consuming controllers (`l2q/CostEstimatesController`, `l2q/QuotationLineSupport`, `l2q/SalesQuotesController`,
  and Purchase Order) have **zero** references to `ItemFormula` / formula evaluation / `{attr_id_…}` tokens.
- `domain/sales/CostingLineItem` computes `calculated_qty = costing_uom_qty × price_factor` — a **hardcoded**
  rule, not the configured formula.
- No formula evaluator exists in the static JS (no token substitution / `roundup` / formula parser).

Net: defining a Qty or Price formula has **no effect** in any module — the formula engine is not wired.

## Evidence / how observed
- `grep -rln "ItemFormula" --include=*.java .` → only the 4 admin/domain files above.
- l2q consumer controllers grep for `ItemFormula|costingFormula|attr_id_|roundup|PRICE_FACTOR` → empty.
- Docs corroborate: `fixes.md` R27 ("Item Formula | Fields OK; legacy Price/Qty MATRIX not rebuilt";
  listed among "remaining true gaps"); `summary.md` tracker **#84** "Cost-Estimate item-formula dynamic columns".

## Notes for triage / fixer
- This is a **substantive feature gap**, not a field/label parity nit. Needs the **legacy source** to spec
  exactly where/how formulas are evaluated (legacy `ItemFormula2DTOMapper` + the costing/quotation/SO/PO
  calculation code + the formula parser supporting `{attr_id_X}`, `{COSTING_UOM}`, arithmetic, `roundup`, etc.).
- Suggested build: a `FormulaEvaluator` service (token substitution + safe arithmetic + `roundup`/legacy
  functions), wired into Cost Estimate / Quotation / Sales Order / Purchase Order line calculation, matching
  legacy. Likely overlaps tracker #84.
- Until then, the Item Formula admin tab is **config-only** (define + store), which can mislead users into
  thinking the formulas affect calculations.

---
## RESOLUTION (2026-06-24) — CLOSED
Product owner reported the root cause was a migration gap: a separate dev session migrated the
legacy **jxl** spreadsheet code to **jexcel** (the new stack) and wired/tested the Item Formula
evaluation through it. F-0005 is closed on that basis.

Note: this was NOT independently re-verified by the parity harness — the planned consuming-module
case **TC-IF-003** (define a known Qty/Price formula on a fixture org → drive Cost Estimate /
Quotation / Sales Order / PO → assert the computed value matches the formula) has not been run. If
on-record confirmation is wanted later, add + run TC-IF-003.
