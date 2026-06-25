# Fix request — F-0005: wire the Item Formula engine into the consuming modules

> For the FIXING session (needs LEGACY source). Read `parity/FIXER_BRIEF.md` first.
> This is a feature build, not a small parity nit — scope it carefully.

## The gap
Item Formula definitions (admin/item-formula) are stored but **never evaluated**. Legacy applies them in
Costing (Cost Estimate), Quotation, Sales Order, and Purchase Order to compute derived values. Migrated
ignores them. See `ERROR.md` for full evidence.

## Where to look
- **Legacy:** `createOrEditItemFormula.jsp`, `ItemFormula2DTOMapper`, and the legacy costing / quotation /
  sales-order / purchase-order calculation code that reads the saved formulas and evaluates them (find the
  formula parser supporting `{attr_id_X}`, `{COSTING_UOM}`, `roundup(...)`, arithmetic).
- **Migrated (to change):** `ItemFormulaRepository.findActiveByOrgIdAndType`; the L2Q consumers
  (`CostEstimatesController`, `QuotationLineSupport`, `SalesQuotesController`), Sales Order, Purchase Order;
  `CostingLineItem` (currently hardcoded `costing_uom_qty × price_factor`).

## Suggested approach
1. Build a `FormulaEvaluator` service: substitute `{attr_id_<id>}` from the item/line dynamic attributes
   and `{COSTING_UOM}` etc., then evaluate the arithmetic + legacy functions (`roundup`, …) safely.
2. On the relevant line calculation in each consuming module, look up the org+type ItemFormula rows and,
   where enabled (Costing/Quotation/SO/PO), compute the field from the formula instead of (or in addition
   to) the hardcoded calc — matching legacy exactly.
3. Likely overlaps tracker **#84** (Cost-Estimate item-formula dynamic columns).

## Definition of done
- Defining a Qty/Price formula changes the computed value in the respective module, matching legacy.
- A parity case (TC-IF-003, to be added) will: define a known formula on a fixture org's item, drive the
  consuming module, and assert the computed value equals the formula result.
- Log in `summary.md`; update this finding's INDEX row. Do NOT `git commit`.
