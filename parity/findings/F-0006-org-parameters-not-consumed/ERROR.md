# F-0006 — Most Org Parameters are config-only (not consumed by their modules)

| Field | Value |
|---|---|
| Case | exploration audit (see ORG-PARAMETER-AUDIT.md) |
| Instance | local-dev |
| URL path | /admin/org-parameter → consuming modules (Sales Order/Invoice, Purchase, Cost Estimate, …) |
| Module / Sub Module | Admin Settings / Org Parameter → most business modules |
| Priority | High (systemic) |
| Status | Open — needs legacy spec + per-param verification |
| Found | parity testing session, 2026-06-23 (overnight audit) |

## Expected (legacy = source of truth)
Each org parameter is a business rule: enabling/disabling it changes what an org user sees/can do in
the consuming module (e.g., Sales Order "Order Type" options, "Validate Stock Qty"/"Warehouse Mandatory"
validations, "Additional field N" extra fields, auto-sequence numbering, etc.). Confirmed-wired example:
the Items "Item Type" params correctly gate the Add-Item type list (TC-IPARAM-001, green).

## Actual (migrated)
**42 of 189 parameters are wired; 147 have NO migrated server-side consumer** (config saved, ignored —
same class as Item Formula F-0005). Whole modules have zero consumers:
- Sales Order (0/26), Sales Invoices (0/16), Purchase Invoices (0/5), Cost Estimates (0/4),
  Labelling (0/4), Projects (0/3), Reorder (0/3), POS (0/2), Deliveries, GRN, etc.
- Admin/Global: only 4/46 wired (GL Code 10001, Paybook 10002, Entity-seq 10021, Resource-WH 10027).
- **Items: 25/25 wired** (the exception) — fully consumed.

Full per-parameter catalog: **`parity/findings/ORG-PARAMETER-AUDIT.md`**.

## Evidence / method
The only DB access to `org_conditional_parameters` is via `OrgConditionalParameterRepository`
(`countEnabledParameter`, `findEnabledParameterValue`), `ItemsRepository` (`findItemTypesForOrg`,
`findEnabledOrgParameterIds`), and one `BankStatementRepository` query (GL-code 10001). Every caller of
these (35 sites, 13 files) was enumerated and the parameter ids they check collected → that is the
wired set (42). Params not in it have no server-side consumer.

## Notes for triage / fixer
- **Confidence:** "no server-side consumer found" is a strong signal but NOT a per-param proof of legacy
  behavior. Before fixing each: confirm what legacy does for that parameter and that it isn't consumed via
  a path not traced here. Treat the catalog's ⚠️ rows as **candidate gaps to verify**, not yet-confirmed defects.
- **Scale:** this is a large program (wire ~147 params across ~25 modules). Prioritize by business impact —
  e.g., Sales Order/Invoice types + validations (Validate Stock Qty 63, Warehouse Mandatory 66, Credit
  Limit 69), auto-sequence params (83, 89, etc.), Additional-field params, PO price rules (111/112/117/84).
- Overlaps F-0005 (Item Formula) — both are "admin config built, consumption not wired".
- Verification harness exists: configure as super admin (switch into org) → log in as org user → check the
  module (pattern from TC-IPARAM-001). Use it to confirm each candidate before/after wiring.
