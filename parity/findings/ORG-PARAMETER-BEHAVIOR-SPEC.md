# Org Parameter — BEHAVIOR SPEC & full-flow parity test plan

**Why this is critical.** Org Parameters (the checkboxes in Admin → Configuration → Org Parameters)
silently change how the *main transactional modules* behave. The structural audit
([ORG-PARAMETER-AUDIT.md](ORG-PARAMETER-AUDIT.md)) could only tell us whether migrated code *reads*
each parameter (40 WIRED / 149 no-consumer-found of 189) — it cannot tell us what each one is
*supposed* to do. That product knowledge lives with the product owner. This document captures the
**intended behavior** (dictated by the product owner, section by section), and is the spec the
full-flow parity tests assert against.

**Source of truth.** The product owner dictates intended behavior here. **Legacy is the golden
master** — migrated must reproduce the legacy effect of each parameter in both ON and OFF states.
Anything migrated is missing / weaker / different / broken vs this spec becomes a finding (F-####).

> **➡️ Fixing the findings?** See **[FIXER-BRIEF.md](FIXER-BRIEF.md)** — the hand-off for the developer/autofix
> agent (triage A/B, the working wiring pattern to copy, per-controller fix table, and the verify loop with the
> `TC-PARAM-*` test IDs). Each section's **🧪 block** below has the per-param verdict + code root-cause it draws from.

---

## How we work (the loop, one section at a time)

1. **You describe a section** (e.g. "Sales Order"): for each checkbox, what turning it ON does, and
   where it shows up in the main module.
2. **I write the spec** rows below for that section (pid + name pulled from the audit, plus your
   behavior + the affected screen/flow).
3. **I build a full-flow test** per parameter (UI-only, legacy ↔ migrated) and run it.
4. **I record the result** (✅ parity / ❌ finding) inline, and file F-#### for any deviation.
5. We move to the next section.

### What I need from you per parameter (so your dictation is efficient)
- **ON does what?** — the rule/behavior the checkbox turns on.
- **OFF (default) does what?** — what happens when it's unchecked.
- **Where does it take effect?** — the exact main-module screen + step/field/action the user sees
  (e.g. "Sales Order → create → Order Type dropdown gains a 'Service Order' option").
- **User-visible outcome** in each state — so the test can assert it (a field appears/hides, an
  option is offered, a validation blocks, a value defaults, a sequence is generated…).
- **Carries a value?** — some params hold a value/number, not just a checkbox (note it).
- **Depends on other data?** — prerequisites (an approval flow, a sequence config, master data).

---

## Per-parameter entry schema

Each specified parameter gets an entry in this shape:

```
### [pid] Parameter Name  — <Section>
- Audit: WIRED ✅ | no-consumer ⚠️   (from ORG-PARAMETER-AUDIT.md)
- ON  → <intended behavior>
- OFF → <intended/default behavior>
- Where (main module): <screen → step → the control/validation/value the user sees>
- Value: <none | the value it carries>
- Prereqs: <none | what must exist first>
- Legacy (golden master): <what legacy actually does — confirmed by driving legacy>
- Migrated expected: <must match legacy>
- Test: TC-PARAM-<...>  →  Result: ⬜ not built | ✅ parity | ❌ F-####
```

**Spec status legend:** ⬜ Awaiting your spec · 📝 Specified (test not built) · 🧪 Test built ·
✅ Verified parity · ❌ Finding filed.

---

## Worked example (already understood end-to-end)

### [147] Customer Approval — Menu - Customers
- Audit: WIRED ✅ (after F-0007 fix)
- ON  → creating a Customer routes it through the approval workflow instead of going active immediately.
- OFF → a new Customer is created active immediately (no approval step).
- Where (main module): Customers → Create Customer → Save. ON + an approval flow defined for the
  entity ⇒ the customer is saved in **PENDING** state (status 103) and appears in the approver's queue;
  OFF ⇒ customer is **Active** right after save.
- Value: none.
- Prereqs (ON): an approval flow must exist for the entity/workflow-type (else it errored — that was F-0007).
- Legacy (golden master): same — 147 ON gates customer creation through approval.
- Migrated expected: match legacy (ON → PENDING via flow; OFF → active).
- Test: TC-PARAM-ACT-147 → Result: ✅ parity (F-0007 fixed + verified green).

This is the level of detail that lets the test assert the **user-visible** effect in both states.

---

## Section roadmap (from the audit — fill in as we go)

Counts are params per section (WIRED / no-consumer). We tackle these in the order you choose.

| # | Section (package) | params | WIRED | no-consumer | Spec status |
|---|---|---|---|---|---|
| 1 | Tab - Items | 25 | 25 | 0 | 📝 Specified (all types + toggles, doc 2026-06-26; [9] held; Finance re-capture pending) |
| 2 | Tab - Sales Order | 26 | 0 | 26 | 📝 Specified (doc 2026-06-26; 69 has TC/F-0024; SO form not yet captured) |
| 3 | Tab - Sales Invoices | 16 | 0 | 16 | 📝 Specified 15/16 (doc 2026-06-26; 138 awaiting; SI form not captured) |
| 4 | Menu - Purchase Invoices | 5 | 0 | 5 | 📝 Specified (doc 2026-06-26; PI form not yet captured) |
| 5 | Tab - Purchase Requisitions | 11 | 1 | 10 | 📝 Specified (doc 2026-06-26; 110/117 not-implemented; PR form not captured) |
| 6 | Tab - Cost Estimates | 4 | 0 | 4 | ⬜ Awaiting spec |
| 7 | Tab - Labelling | 4 | 0 | 4 | ⬜ Awaiting spec |
| 8 | Tab - Sales Quotes | 2 | 0 | 2 | 📝 Specified (doc 2026-06-26; SQ form not yet captured) |
| 9 | Menu - Planning | 12 | 4 | 8 | ⬜ Awaiting spec |
| 10 | Menu - Deals | 3 | 2 | 1 | ⬜ Awaiting spec |
| 11 | Tab - Projects | 3 | 0 | 3 | 📝 Specified (doc 2026-06-26; gates Project Code auto-gen) |
| 12 | Tab - Users | 4 | 1 | 3 | ⬜ Awaiting spec |
| 13 | Tab - Customers | 2 | 1 | 1 | 📝 Specified (doc 2026-06-26; 147 ✅ verified, 87 spec'd) |
| 14 | Tab - Suppliers | 1 | 1 | 0 | 📝 Specified (doc 2026-06-26) |
| 15 | Tab - Banks | 1 | 1 | 0 | ⬜ Awaiting spec |
| 16 | Tab - GRN/SDN | 1 | 0 | 1 | 📝 Specified (doc 2026-06-26; ⚠️ verify ON/OFF polarity) |
| 17 | Tab - Material Requests | 2 | 0 | 2 | ⬜ Awaiting spec |
| 18 | Tab - Material Deliveries | 2 | 0 | 2 | ⬜ Awaiting spec |
| 19 | Tab - Direct Material Deliveries | 1 | 0 | 1 | ⬜ Awaiting spec |
| 20 | Tab - Movable Asset Requests/Deliveries | 3 | 0 | 3 | ⬜ Awaiting spec |
| 21 | Sub Tab - Stock Adjust | 2 | 0 | 2 | ⬜ Awaiting spec |
| 22 | Sub Tab - Stock On Hand | 1 | 0 | 1 | ⬜ Awaiting spec |
| 23 | Tab - Reorder Stocks | 3 | 0 | 3 | ⬜ Awaiting spec |
| 24 | Tab - Sales Invoice (POS) | 2 | 0 | 2 | ⬜ Awaiting spec |
| 25 | Sub Tab - Production Routing | 2 | 0 | 2 | ⬜ Awaiting spec |
| 26 | Tab - Attendance | 1 | 0 | 1 | ⬜ Awaiting spec |
| 27 | Tab - Travel Requests | 3 | 0 | 3 | ⬜ Awaiting spec |
| 28 | Tab - Expense Requests | 1 | 0 | 1 | ⬜ Awaiting spec |
| 29 | Admin / Global (10000-series) | 46 | 4 | 42 | ⬜ Awaiting spec |

> Full pid/name inventory per section: see [ORG-PARAMETER-AUDIT.md](ORG-PARAMETER-AUDIT.md) "Full
> parameter table". When you start a section I pull its rows in here and fill behavior + tests.

---

## Specified parameters

*(spec entries get added here, grouped by section, as you dictate them)*

---

# Section 1 — Tab - Items

> **Companion doc:** full per-field detail (label · tech name · datatype · required · source · business logic)
> for every form lives in [FORM-FIELD-CATALOG.md](FORM-FIELD-CATALOG.md). This section keeps the
> org-parameter *behavior*; the catalog keeps the *field-level functional spec*.

**Model (product owner, 2026-06-26).** The Item-Type checkboxes (1–15, 62, 64, 65, 68…) each
enable a **distinct item type** in the Item master. In **Items → Items → Add Item**, choosing a type
renders a form made of:
- **Common fields** — shared by every item type (Primary/Item/Purchase/Inventory/Finance Details + Summary).
- **Type-specific fields/sections** — present only for that type; these carry the business logic for the
  downstream main modules (e.g. Asset types add **Depreciation Details** + **Scrap Item**).
- **Other Details** — org-defined **dynamic custom fields**, definable per customer org (varies by org;
  NOT standard — the examples below are this dev org's custom set, not a parity baseline).

Two in-form fields are driven by *other* org parameters, not by the item-type param:
- **Bundle Item Link** (checkbox, in Item Details) ⇐ param **131** Bundle Link Item — *logic TBD when we reach 131*.
- **Price Variant** field (here labeled `price Variant6778`, the alias from 118) ⇐ param **118** Price Variant — *logic TBD when we reach 118*.

### Common Item form baseline (shared across types) — captured from the Asset-Movable form
`*` = required marker on screen.
- **Primary Details**: Entity Alias `*` (Select Company) · Item Type (display of the chosen type).
- **Item Details**: Description `*` · Additional Description · UOM `*` (Select UOM) · Manufacturer ·
  Manufacturer Part No. · Category (Select Item Category) · Image (upload JPEG/JPG/PNG/GIF) ·
  **Bundle Item Link** [param 131] · **Price Variant** field [param 118].
- **Purchase Related Details**: Minimum Order Qty · Order Multiples.
- **Inventory Related Details**: Criticality (select) · Barcode · GRN Inspection Required [checkbox] · Expiry Days.
- **Finance Related Details**: HSN/SAC `*` · Purchase Account `*` · Sales Account `*`.
- **Summary**: Attachments (Browse File · Add another File).
- Actions: **Cancel** · **Create**.

> **Product-owner clarification (2026-06-26):** **Depreciation Details is Asset-types-only.**
> **Scrap Item, Purchase Related Details, and Inventory Related Details** render on *most* item-type forms
> but are NOT actually *used* by every type — a **legacy quirk** (the section is shown regardless of whether
> the type uses it). Migrated will tighten this later; for now we capture **legacy as-is** and will derive the
> real common-vs-type-specific split once every item-type form is captured. So treat the "common baseline"
> above as *"rendered on the Asset-Movable form"*, not yet as *"genuinely common to all types."*

---

### [1] Asset - Movable Item — Section 1 (Tab - Items)
- Audit: WIRED ✅ (Items module 25/25 consumed).
- ON  → "Asset - Movable Item" is available as a selectable **Item Type** in Items → Add Item; choosing it
  renders the common baseline **plus the Asset-specific sections** below.
- OFF → the type is not offered in the Item master (cannot create an item of this type).
- Where (main module): **Items → Items → Add Item**, Item Type = "Asset - Movable Item".
- **Type-specific sections (the business logic for Asset - Movable):**
  - **Depreciation Details**: Depreciation Method `*` · Depreciation Based on `*` · Useful Life (years) `*` ·
    Useful Life (Months) · Salvage Value · Depreciation Percentage · Depreciation Frequency `*` ·
    Depreciation Expense Account (Dr) `*` · Accumulated Depreciation Account (Cr) `*`.
  - **Scrap Item**: Scrap Item Search → table (Item No. · Item).
- **Other Details (org-defined dynamic custom fields — this dev org's set, illustrative not baseline):**
  test attribute · Attribute1 · Test-01 · Test-02 (datetime) · Test-03 `*` · Test-04 `*` ·
  New attribute-Added `*` · Date · Thickness · Coverage · Item Multiplying Factor · Coverage1 · DateTime ·
  Inventory UoM · Bottles per Case · Liters per Count UoM · Flammable or Hazmat (select) · Purchasing UoM ·
  UoM Conversion (Liters) · UoM Conversion (Units) · API Export (select) · Brand · Incoming Weight · Gain ·
  Price · Start-Time · End-Time · Sales UoM.
- Value: none (item-type toggle).
- Prereqs: master data for the required selects (Company/Entity, UOM, HSN/SAC, Purchase & Sales Accounts,
  Depreciation Method/Frequency, Depreciation/Accumulated-Depreciation accounts).
- Legacy (golden master): _TBD — confirm Asset-Movable type + Depreciation/Scrap sections by driving legacy._
- Migrated expected: match legacy (type offered; Depreciation + Scrap sections render with same required markers).
- Test: TC-PARAM-ITEM-001-asset-movable → Result: ⬜ not built
- Spec status: 📝 Specified (form captured 2026-06-26; pending legacy diff + test build).

### [2] Asset - Immovable Item — Section 1 (Tab - Items)
- Audit: WIRED ✅.
- ON  → "Asset - Immovable Item" available as a selectable **Item Type** in Items → Add Item.
- OFF → type not offered.
- Where (main module): **Items → Items → Add Item**, Item Type = "Asset - Immovable Item".
- **Form: IDENTICAL to [1] Asset - Movable Item** (captured 2026-06-26, 4 screenshots). Same sections and
  required markers — Primary/Item/Purchase/Inventory/Finance Details, **Depreciation Details** (same 9 fields,
  Method/Based-on/Useful-Life-yrs/Frequency/Dep-Expense-Dr/Accum-Dep-Cr all `*`), **Scrap Item**,
  **Other Details** (same org custom fields), **Summary**. Only the Item Type label differs.
- Value: none.
- Prereqs: same as [1].
- Legacy (golden master): _TBD — confirm by driving legacy._
- Migrated expected: match legacy.
- Test: TC-PARAM-ITEM-002-asset-immovable → Result: ⬜ not built
- Spec status: 📝 Specified (form captured 2026-06-26; identical to [1]).

### [3] Asset - IT Item — Section 1 (Tab - Items)
- Audit: WIRED ✅.
- ON  → "Asset - IT Item" available as a selectable **Item Type** in Items → Add Item.
- OFF → type not offered.
- Where (main module): **Items → Items → Add Item**, Item Type = "Asset - IT Item".
- **Form: IDENTICAL to [1] Asset - Movable Item** (captured 2026-06-26, 4 screenshots). Same sections,
  **Depreciation Details** (same 9 fields + `*` markers), **Scrap Item**, **Other Details**, **Summary**.
  Only the Item Type label differs.
- Value: none. Prereqs: same as [1].
- Legacy (golden master): _TBD._  Migrated expected: match legacy.
- Test: TC-PARAM-ITEM-003-asset-it → Result: ⬜ not built
- Spec status: 📝 Specified (form captured 2026-06-26; identical to [1]).

> **Asset family note:** types [1] Movable, [2] Immovable, [3] IT all render the **same form** (common
> sections + Depreciation Details + Scrap Item). The Add-Item form is uniform; they differ by **business
> meaning / where they surface downstream** (product owner, 2026-06-26):
>
> - **[1] Asset - Movable** — assets that physically **move out and come back** (e.g. tools sent from
>   company to a project location and returned). Modeled as a distinct type so they surface **only in the
>   relevant modules** that handle moving assets (request/issue/return tracking).
> - **[2] Asset - Immovable (Fixed asset)** — the **standard fixed asset** that **stays in one place**.
> - Both Movable **and** Fixed carry **Depreciation Details** because accounting must **post depreciation +
>   asset value** for both; the **Maintenance module pulls BOTH** movable and fixed assets.
> - **[3] Asset - IT** — for tracking **IT assets** (laptops, servers, etc.); a separate asset class.
>
> _Parity implication:_ the per-type effect to verify is **which downstream modules each asset type appears
> in** (movable → moving-asset modules; movable+fixed → Maintenance + depreciation posting; IT → IT tracking).
> These are the main-module flows the full-flow tests must assert once we reach those modules.

### [4] Consumable Item — Section 1 (Tab - Items)
- Audit: WIRED ✅.
- ON  → "Consumable Item" available as a selectable **Item Type** in Items → Add Item.
- OFF → type not offered.
- Where (main module): **Items → Items → Add Item**, Item Type = "Consumable Item".
- **Business meaning (product owner):** auxiliary/**packing materials consumed in the process** — e.g. in
  manufacturing, raw materials become finished goods, and when those finished goods are packed, consumables
  are used for packing. Consumed, not sold as the primary product.
- **Form = common baseline with these deltas vs the Asset form** (captured 2026-06-26):
  - **➖ Depreciation Details** — section absent (Asset-only, as expected).
  - **➕ Issue Method** — dropdown in *Inventory Related Details*. **Manual** = store person picks the batch
    from a popup of available stock batches at issue time; **Backflush** = system auto-deducts by FIFO/LIFO.
  - **➕ Finance Group** — dropdown in *Finance Related Details*. Used when the org **manages GL posting**
    (an org parameter): customers that post to GL use it; those on an external finance system don't need it.
  - Scrap Item, Other Details, Summary still render; Item Details / Purchase Related / common Inventory & Finance
    fields unchanged (Criticality, Barcode, GRN Inspection Required, Expiry Days; HSN/SAC `*`, Purchase Acct `*`,
    Sales Acct `*`).
- Value: none. Prereqs: master data for the selects (incl. Issue Method, Finance Group).
- Legacy (golden master): _TBD._  Migrated expected: match legacy.
- Test: TC-PARAM-ITEM-004-consumable → Result: ⬜ not built
- Spec status: 📝 Specified (form captured 2026-06-26; first non-asset type — Depreciation drops, Issue Method +
  Finance Group appear).

### [5] Service Item — Section 1 (Tab - Items)
- Audit: WIRED ✅.
- ON  → "Service Item" available as a selectable **Item Type** in Items → Add Item.
- OFF → type not offered.
- Where (main module): **Items → Items → Add Item**, Item Type = "Service Item".
- **Business meaning (product owner):** services rather than physical products. **When a PO is raised for
  services (not products), only Service-type items are shown** in the item picker — i.e. the type filters the
  item list in the service-PO flow. (Downstream flow to assert when we reach Purchase/Service-PO modules.)
- **Form = common baseline with these deltas** (captured 2026-06-26):
  - **➖ Depreciation Details** — absent (non-asset).
  - **➕ Issue Method** — present in *Inventory Related Details* (shared with Consumable). _Logic TBD._
  - **➖ Finance Group** — NOT present (so Finance Group is Consumable-specific so far).
  - Inventory Related Details + Scrap Item still render even though Service is non-inventory — the legacy
    "render-regardless" quirk (these are not actually used by a service item).
  - Param-118 field labeled "Price Variant" here vs "price Variant6778" on Asset/Consumable — **known bug,
    IGNORE** (product owner 2026-06-26): the label is org-configurable; the cross-type inconsistency is not a finding.
- Value: none. Prereqs: master data for the selects.
- Legacy (golden master): _TBD._  Migrated expected: match legacy.
- Test: TC-PARAM-ITEM-005-service → Result: ⬜ not built
- Spec status: 📝 Specified (form captured 2026-06-26; Issue Method yes / Finance Group no).

---

# Section 4 — Menu - Purchase Invoices

> Source: product-owner doc **Org_Parameter_Purchase_Invoice.docx** (2026-06-26). Audit: **all 5 are
> no-consumer ⚠️** → candidate config-only gaps (F-0006 class) — verify legacy actually renders these and that
> migrated reproduces them. PI form not yet screen-captured (doc-driven so far).
>
> **General rules (doc):** alias names from org params render as the field labels; the configured **calculation
> type** (Addition / Subtraction / Multiplication) determines how an Additional Field is applied in the invoice
> summary; disabled params hide the corresponding field from the Purchase Invoice screen.

### [22] Reimbursement — Menu - Purchase Invoices
- Audit: no-consumer ⚠️.
- ON → display the **Reimbursement** checkbox while creating a Purchase Invoice — **only on Direct Purchase
  Invoice creation**, NOT while **converting a PO → Purchase Invoice**. OFF → field not displayed.
- Where: Purchase Invoices → Create (Direct) → Reimbursement checkbox.
- Legacy (golden master): _TBD._  Migrated expected: match legacy.
- Test: TC-PARAM-PI-022-reimbursement → ⬜.

### [49] Additional Field 1 — Menu - Purchase Invoices  (carries alias + calc type)
- Audit: no-consumer ⚠️.
- ON → display **Additional Field 1** in the **Summary** section. Org param configures an **alias name** and a
  **calculation type** (Addition / Subtraction / Multiplication). Available on **both** Direct PI creation **and**
  PO → PI conversion. OFF → hidden.
- Value: alias name + calc type. Where: Purchase Invoices → Summary section.
- Test: TC-PARAM-PI-049-addl-field-1 → ⬜.

### [50] Additional Field 2 — Menu - Purchase Invoices  (carries alias + calc type)
- Audit: no-consumer ⚠️.
- ON/OFF & behavior: identical to [49] for **Additional Field 2** (Summary section, both creation paths).
- Test: TC-PARAM-PI-050-addl-field-2 → ⬜.

### [51] Additional Field 3 — Menu - Purchase Invoices  (carries alias + calc type)
- Audit: no-consumer ⚠️.
- ON/OFF & behavior: identical to [49] for **Additional Field 3** (Summary section, both creation paths).
- Test: TC-PARAM-PI-051-addl-field-3 → ⬜.

### [70] WHT % — Menu - Purchase Invoices
- Audit: no-consumer ⚠️.
- ON → display the **WHT %** field in the **Summary** section **only during Direct Purchase Invoice creation**;
  NOT available when a PO is converted to a Purchase Invoice. OFF → field not displayed.
- Where: Purchase Invoices → Create (Direct) → Summary → WHT %.
- Test: TC-PARAM-PI-070-wht-pct → ⬜.

> **Path-dependence to assert:** these params split by creation path — **22 & 70 = Direct-PI only**;
> **49/50/51 = both Direct-PI and PO→PI**. Tests must exercise BOTH paths to catch a field leaking into / missing
> from the wrong path.

---

# Section 2 — Tab - Sales Order

> Source: product-owner doc **Org_Parameter_Sales_Order.docx** (2026-06-26). Audit: **all 26 no-consumer ⚠️**
> (except 69 which now has a built test). pids mapped from ORG-PARAMETER-AUDIT.md. SO form not yet screen-captured
> (doc-driven). **General rule (doc):** params control field visibility/validation; disabled → functionality
> hidden. Additional Fields carry a configurable **alias** and (summary-level ones) a **calc type**
> (Addition/Subtraction/Multiplication).

**Order Type dropdown gates** (ON → option shown in **Order Type** dropdown; OFF → hidden):
- **[23] Standard Order - Non-Inventory**, **[24] Blanket Order**, **[25] Service Order**,
  **[26] Standard Order - Inventory**, **[72] Rental Order**.

**Document No. Sequence gates** (ON → value shown in **Document No. Sequence** dropdown; OFF → hidden):
- **[41] Domestic**, **[42] Export**, **[43] Scrap**, **[44] Return**, **[45] FOC**.
- **[56] Business Type** → ON shows the **Document No. Sequence field** itself; OFF hides it. *(gates the whole
  sequence picker that 41–45 populate)*

**Validations / behavior:**
- **[63] Validate Stock Qty** → for **Reserved** Sales Orders, if SO Qty > Stock-On-Hand Qty, block submit with
  *"Sales Order Qty is Exceeded than OnHand Qty"*. OFF → no stock check.
- **[66] Warehouse Mandatory** → Warehouse becomes mandatory when creating an SO.
- **[69] Validate Credit Limit** → if SO amount > customer Credit Limit, show *"Amount Exceeded than Credit Limit"*
  and prevent submit. **Test: TC-PARAM-SO-069 → ✅ (F-0024).** ⚠️ doc message string *"Amount Exceeded than Credit
  Limit"* vs test regex `/credit limit exceeded/i` — **verify the exact migrated message matches legacy**.
- **[158] Shipping/Billing Address Change** → ON lets users edit Shipping & Billing Address while creating an SO.
- **[166] Sales Order Group Name** → if **Group Items = Yes**, the configured SO Group Name is used.

**Additional Fields** (alias-configurable; Summary unless noted):
- **[90] Addl Field 1**, **[91] Addl Field 2**, **[92] Addl Field 3** — Summary level + calc type.
- **[120] Addl Field 4** — **Line Item** level (alias only).
- **[121] Addl Field 5** — Summary + calc type **+ default value**.
- **[122] Addl Field 1 (Line Item)** — **Line Item** level (alias only).
- **[139] Addl Field 6**, **[140] Addl Field 7**, **[141] Addl Field 8**, **[145] Addl Field 9** — Summary + calc type.
- Tests: TC-PARAM-SO-<pid> → ⬜ (one per field; assert visibility + alias + level + calc type).

> Spec status: 📝 Specified (doc 2026-06-26). Legacy golden-master strings TBD; build tests per param. **Levels to
> assert:** Summary vs Line-Item placement is the main parity risk for the Additional Fields.

> **🧪 Test results — background agent run (2026-06-26):** Track B; **own throwaway fixture orgs** (org-switched
> super-admin renders the SO form — the regular user gets 403 on `/admin/organizations`, so super-admin session is
> used). All toggles snapshot/restore; all 6 fixture orgs soft-deleted after.
> - **✅ Honors (gating works in migrated):** Order Type options **[23][24][25][26][72]** (gate `#poType`
>   options) · Business-Type picker **[56]** + its options **[41][42][43][44][45]** (gate `#salesType`). Fail-safe
>   confirmed: none-enabled → all options show (SO creation never breaks). Also **[66]** Warehouse Mandatory &
>   **[158]** Shipping/Billing edit (already covered by existing `TC-PARAM-SO-001`), and **[69]** Credit Limit
>   (existing `TC-PARAM-SO-069`).
> - **✅ [63] Validate Stock Qty — wired in code** (`soValidateOnhandEnabled` + `onHandError` blocks submit when
>   ordered qty > `soRepo.availableOnHandQty`); form-level pass, **live submit-flow deferred** (needs a seeded
>   on-hand stock item + warehouse + customer — mirror the SO-069 submit harness on a seeded org to assert the
>   message *"Sales Order Qty is Exceeded than OnHand Qty"*).
> - **❌ Gaps (no consumer — `SalesOrdersController.addFormLookups` has zero wiring):** all 11 Additional-Field /
>   Group params **[90][91][92][120][121][122][139][140][141][145][166]** — toggling ON produces no form change;
>   no addl-field or group control ever renders.
> - **⚠️ Labelling parity note (not a failure):** the doc labels **41-45 as "Document No. Sequence"**, but migrated
>   wires them as the options of the **Business Type** (`#salesType`) field gated by 56 — gating is honored, the
>   field *label* differs. Confirm against legacy.
> - New files: `TC-PARAM-SO-ORDERTYPE-23-26-72-order-type-gates.mjs` (7/7 pass) ·
>   `TC-PARAM-SO-BIZTYPE-41-45-56-seq-gates.mjs` (9/9 pass) ·
>   `TC-PARAM-SO-ADDLFIELDS-GROUP-no-consumer.mjs` (11 documented gaps) ·
>   `TC-PARAM-SO-063-validate-stock-qty.mjs` (form-level pass + deferred submit).

---

# Section 3 — Tab - Sales Invoices

> Source: **Org_Parameter_Sales_Invoice.docx** (2026-06-26). Audit: all 16 no-consumer ⚠️. pids from audit. SI
> form not yet captured (doc-driven).

**Invoice Type dropdown gates** (ON → shown in **Invoice Type** dropdown on **direct** Sales Invoice creation):
- **[29] Non PO - Inventory**, **[31] Non PO - Non-Inventory**.

**Validations / behavior:**
- **[61] E-Invoice (Avalara)** → enables Avalara E-Invoice integration using the configured token/key.
- **[81] Credit Limit - Sales Invoice** → validates customer credit limit on SI submit; if exceeded show
  *"Amount Exceeded than Credit Limit"* and prevent submit. *(SI twin of SO [69].)*
- **[83] Invoice No./Date - Auto Sequence** → auto-generates Invoice Number (no manual entry when ON).

**Additional Fields** (alias-configurable; Summary + calc type unless noted):
- **[52] Addl Field 1**, **[53] Addl Field 2**, **[54] Addl Field 3** — Summary + calc type.
- **[125] Addl Field 4** — **Line Item** level (alias only).
- **[126] Addl Field 5** — Summary + calc type.
- **[127] Addl Field 1 (Line Item)** — **Line Item** level (alias only).
- **[142] Addl Field 6**, **[143] Addl Field 7**, **[144] Addl Field 8**, **[146] Addl Field 9** — Summary + calc type.

> ⚠️ **[138] Sales Invoice Qty Editable than SO** is in the audit (16th param) but **NOT covered by the doc** —
> behavior still ⬜ awaiting spec.
> Spec status: 📝 Specified (15 of 16; doc 2026-06-26). Tests TC-PARAM-SI-<pid> → ⬜.

> **🧪 Test results — background agent run (2026-06-26):**
> - **Pre-existing tests already cover:** `TC-PARAM-SI-029` & `TC-PARAM-SI-031` (Invoice-Type gates — **✅ wired**,
>   via `addInvoiceFormLookups`); `TC-PARAM-SI-081` (credit-limit submit — **✅ wired**, `siCreditLimitError`);
>   `TC-PARAM-SI-138` (qty editable). *(Authored before the isolation rule — they toggle shared org 36.)*
> - **❌ Confirmed no-consumer gaps (migrated SI form does NOT honor):** **61** (Avalara appears only in *print*
>   output `print-e-invoice.html`, never on create form) · **83** (no manual Invoice-No input exists at all —
>   auto-assigned on save regardless, so the param is moot) · **52, 53, 54, 125, 126, 127, 142, 143, 144, 146**
>   (Additional Fields are driven by the **form-template engine** `dynamicAttributeService.attributesFor(orgId,
>   type 16)` → `form_attribute` table, **not** by these org params; none referenced in `SalesInvoiceController`).
> - **⚠️ [81] message-wording divergence (parity finding):** migrated emits *"Customer credit limit exceeded — …"*
>   vs spec/legacy golden-master *"Amount Exceeded than Credit Limit"* — verify exact string parity (same class as
>   the [69] flag).
> - **🔒 Env blocker:** SI create form is `@PreAuthorize("!isSuperAdmin")` → super-admin gets **403**; only a
>   regular org user renders it, and that user is **pinned to org 36** (switch-org is a no-op). ⇒ the
>   fresh-fixture-org isolation approach **cannot render the SI form** — wired-param ON/OFF diffs are only provable
>   by toggling shared org 36. **General implication for ALL transactional-form param tests** (SO/PR/SQ likely
>   same gate).
> - New file: `TC-PARAM-SI-NOCON-noconsumer-fields.mjs` (read-only, Track B; documents the 61/83/additional-field
>   gaps; passes with warn-level notes).

---

# Section 5 — Tab - Purchase Requisitions

> Source: **Org_Parameter_Purchase_Requisitions.docx** (2026-06-26). Audit: 1 WIRED (77) / 10 no-consumer. pids
> from audit. "Purchase Requisition" here drives PO creation.

- **[55] Sales Order No.** → ON shows the **Sales Order** dropdown (populated with existing SOs) while creating a
  PR; OFF hides it.
- **[84] PO Discount** → ON shows the **Discount** column at **Line Item** level; OFF hides it.
- **[85] Service Order Sequence No.** → ON: PO Numbers for Service Orders use the configured Service Order sequence.
- **[99] Manual PO No.** → ON: user manually enters the PO Number; OFF: system auto-generates.
- **[111] PO Fixed Price** → ON: PO amount is **fixed** after creation (cannot be modified).
- **[112] PO Variable Price** → ON: PO amount **can be modified** even after creation. *(opposes 111)*
- **Additional Fields** — **[75] Addl Field 1**, **[76] Addl Field 2**, **[77] Addl Field 3** (77 = **WIRED ✅**):
  Summary level + calc type (Add/Sub/Mult), alias-configurable.
- ⚠️ **Not implemented (param exists, no functionality):** **[110] Service Order New Item**, **[117] PO New Item**
  — both meant to show a *'New Item'* option below Line Items to add non-master items. Doc explicitly says
  functionality **not implemented** → spec = "no visible effect"; assert nothing renders (and that legacy matches).

> Spec status: 📝 Specified (doc 2026-06-26). Tests TC-PARAM-PR-<pid> → ⬜. Note 111 vs 112 are a
> fixed-vs-variable pair — test both states + their interaction.

> **🧪 Test results — background agent run (2026-06-26):** Track B, form-signature diff (OFF vs ON) on the PR/PO
> create form `/procurement/purchase-requisitions/new`, **fresh fixture org** (this form is NOT super-admin-gated,
> so isolation worked here — unlike SI). Code-confirmed against `PurchaseRequisitionController.prepareForm` +
> `procurement/pr/form.html`.
> - **✅ Honors (migrated gates these — wired):** **[55]** Sales Order field shown ON-only · **[84]** Discount
>   shown ON-only · **[99]** Manual PO No. editable ON-only. *(Nuance on [84]: migrated gates the **summary-level
>   Trade Discount**, not a line-item Discount column — the per-line "Disc %" is always present. Spec phrasing
>   says "line-item"; behavior is real + ON-only. Treat as phrasing nuance, not a defect.)*
> - **❌ Gaps (no consumer; no form effect):** **[85]** Service Order Sequence No. · **[111]** PO Fixed Price ·
>   **[112]** PO Variable Price (neither gated in controller/form, even with both ON).
> - **⚠️ No PR-form effect:** **[75][76][77]** Additional Fields (77 is audit-WIRED but only via the
>   summary/alias engine, not the PR create form).
> - **⚪ Confirmed not-implemented:** **[110]** Service Order New Item · **[117]** PO New Item — controller computes
>   `woNewItemEnable`/`poNewItemEnable` but `form.html` never consumes them, so no 'New Item' renders in either
>   state (matches the doc's "not implemented" note).
> - New files: `TC-PARAM-PR-gates-55-84-99-110-117.mjs` (all pass), `TC-PARAM-PR-unwired-85-111-112-75-76-77.mjs`.
> - ⚠️ **Env note:** the agent saw migrated app **saturation** (java ~336% CPU, dropped connections) from the
>   concurrent background runs — added retry/backoff. Local load, not a code defect; may slow the remaining agents.

---

# Section 8 — Tab - Sales Quotes

> Source: **Org_Parameter_Sales_Quote.docx** (2026-06-26). Audit: both no-consumer ⚠️.

- **[151] Quote Validity** → ON: admin configures a validity period in **days** (e.g. 10). On Sales Quote
  creation the period is applied; once **expired**, the quotation becomes **read-only** — no Edit/Amend/Cancel
  allowed after the validity window. Carries a **value** (number of days). OFF: no validity enforcement.
- **[178] Quotation Section Image Upload** → ON: show an **image upload** option **per quotation section** during
  Sales Quote creation (one or more images per section). OFF: upload option hidden.

> Spec status: 📝 Specified (doc 2026-06-26). Tests TC-PARAM-SQ-151 (validity expiry → read-only) and
> TC-PARAM-SQ-178 (per-section image upload visible) → ⬜. 151 needs a date-aged quote to assert the read-only
> lock — note the **value (days)** must be exercised.

> **🧪 Test results — background agent run (2026-06-26):** Track B; org 36 + regular user `shekar_N`,
> snapshot+restore on each param (fixture-org isolation can't render the quote form — same `!isSuperAdmin` gate).
> - **❌ [178] gap** — quote create form is **byte-identical ON vs OFF**; no per-section image-upload control
>   renders. No consumer (not read by `SalesQuotesController` / `sales-quotes/form.html`).
> - **⚠️ [151] partial/gap** — config side works (the **days value `value_151`** round-trips on save), but the
>   quote create form **does not react** (no validity control, identical ON/OFF). Expiry→read-only lock **not
>   tested** (needs a date-aged quote, not UI-seedable).
> - New files: `TC-PARAM-SQ-178-section-image-upload.mjs`, `TC-PARAM-SQ-151-quote-validity.mjs`.

---

# Section 16 — Tab - GRN/SDN

> Source: **Org_Parameter_GRN_SDN.docx** (2026-06-26). Audit: 1 no-consumer ⚠️.

- **[57] Hide - PO Price** → controls visibility of **PO pricing fields** in the GRN/SDN module.
  - **ON** → show **Unit Price · PO Amount · Discount % · Tax · PO Total**.
  - **OFF** → show **only Unit Price**; hide PO Amount, Discount %, Tax, PO Total.
  - ⚠️ Note the **inverted sense**: param named "Hide - PO Price" but **ON = show more** per the doc. Verify the
    polarity against legacy carefully (easy parity trap).

> Spec status: 📝 Specified (doc 2026-06-26). Test TC-PARAM-GRN-057 → ⬜ (assert the 5-field vs 1-field GRN line
> in both states; confirm ON/OFF polarity vs legacy).

> **🧪 Test results — background agent run (2026-06-26):** Track B; GRN capture form rendered against a real
> pending PO (`requisitionId` auto-discovered; fallback 14695).
> - **❌ [57] gap — feature entirely absent.** Toggling 57 ON vs OFF produces an **identical** receive line with
>   **zero** PO-price fields (not even Unit Price) in either state — columns are only S.No · Item No · Item · UOM ·
>   Ordered Qty · Received Qty · Receive Qty · Warehouse. **Polarity cannot be confirmed** because migrated never
>   reads 57: `InventoryInboundController.newGrn` builds `captureLines` without any price columns; `grn-form.html`
>   has nowhere to hide/show them. The doc's "OFF → only Unit Price" can't even be satisfied (Unit Price absent).
> - New file: `TC-PARAM-GRN-057-hide-po-price.mjs`. ⮕ Strong **❌ gap** finding — the whole PO-price block is
>   missing from the migrated GRN line vs the legacy golden master.
>
> **✅ FIX VERIFIED — [57] PO-price block CLOSED (fixer build, 2026-06-26):** UI-verified on org 36 / requisition
> 4275 — **57 ON → Unit Price · PO Amount · Discount % · Tax · PO Total all render; 57 OFF → only Unit Price**
> (other 4 hidden). **Polarity confirmed intentional** (inverted name; ON sets `poPriceEnable=true` = show MORE).
> `TC-PARAM-GRN-057` 11/11 green on the build. ⮕ Section 16 verdict: **❌ gap → ✅ fixed.**
> ⚠️ **Separate finding — admin-form exposure (CONFIRMED REGRESSION, 2026-06-27):** param **57 is NOT rendered on
> the migrated admin org-parameter form** (admin can only toggle via DB). **Legacy DOES expose it** — verified on
> live staging: a **"Tab - GRN/SDN"** section renders `<input type="checkbox" id="parameterId_57">` /
> `<label>Hide - PO Price</label>` (legacy `viewOrgParameter.action`; DTO `packageId=9, parameterId=57`). Legacy's
> screen is **fully data-driven** (`OrgParameterServiceImpl.retrieveConditionalParameterDetail` + JSP iterates all
> packages/params, no exclusion). ⇒ **Migrated must render 57 as a checkbox under a GRN/SDN section** to match.
> Scope is exactly **one** param (package 9 = only 57, confirmed in `conditional_parameters`).
> 🚩 **Systemic check for the fixer:** since legacy's form is data-driven but migrated dropped 57, the migrated
> org-parameter form is **not rendering every param/package legacy does** — audit whether OTHER params/packages
> are also being filtered out, not just 57.

---

# Section 11 — Tab - Projects

> Source: **Org_Parameter_Projects.docx** (2026-06-26). Audit: all 3 no-consumer ⚠️. These gate **Project Code
> auto-generation**, driven by the sequence config in **Admin-Settings → Projects → Project Code** (the 3 sub-tabs
> captured in FORM-FIELD-CATALOG.md: BOQ Seq · Project Code Seq · Site Code Seq).

- **[46] Project Code with BOQ Sequence** → ON: auto-generate the Project Code **+ BOQ Sequence** using the
  *Project Code with BOQ Sequence* config. OFF: no auto-generation.
- **[47] Project Code Sequence** → ON: auto-generate the Project Code using the *Project Code Sequence* config.
  OFF: no auto-sequence.
- **[89] Project Code - Auto Sequence** → ON: Project Code generated automatically from the configured Project
  sequence; user does **not** enter it manually. OFF: manual entry / app default.

> These three are mutually-related generation modes (which composer applies). **Parity risk:** which param wins
> when more than one is ON — assert against legacy. Cross-link: Admin-Settings → Projects → Project Code
> (config source). Spec status: 📝 Specified (doc 2026-06-26). Tests TC-PARAM-PROJ-<pid> → ⬜.

> **🧪 Test results — background agent run (2026-06-26):** Track B; org 36 + regular user, snapshot+restore.
> - **❌ [46]/[47]/[89] all gaps (no consumer)** — the Project create form (`projects/project-form.html`) has **no
>   Project Code field** at all; the Project-Code subsystem form (`project-code-form.html` `#code`, gated by
>   `ProjectsController.createProjectCode`) is **always manual + required** — none of 46/47/89 is read
>   (`countEnabledParameter` never called for them). The "which wins when >1 ON" question is **moot** (none
>   consumed). New file: `TC-PARAM-PROJ-46-47-89-projectcode-autoseq.mjs` (passes; documents the gap).

---

# Section 13 — Tab - Customers

> Source: **Org_Parameter_Customers_.docx** (2026-06-26). Audit: 87 WIRED ✅ / 147 no-consumer (corrected).

- **[87] Customer ID - Auto Sequence** (WIRED ✅) → ON: auto-generate the **Customer ID** on creation; user does
  not enter it. Carries a configurable **prefix** (e.g. `CST` → CST01, CST02; `00` → 001, 002). OFF: Customer ID
  is manual entry. **Value:** prefix. Cross-link: Super Admin → Org → Sequence Number (running counter).
- **[147] Customer Approval** → ON: the **Approval** field is shown in the Customer module and new customers route
  through the **approval workflow** before becoming active. OFF: Approval field hidden; customers active
  immediately. **Already verified — see Worked Example above. Test: TC-PARAM-ACT-147 → ✅ (F-0007).**
  - Doc adds a detail beyond the worked example: 147 also controls **visibility of the Approval field** itself,
    not only the routing — assert the field appears/disappears with the param.

> Spec status: 📝 Specified (doc 2026-06-26); 147 ✅ verified. Test TC-PARAM-CUST-087 (auto-seq + prefix) → ⬜.

> **🧪 Test results — background agent run (2026-06-26; UI-only retightened):** Track B; org 36, snapshot+restore.
> - **✅ [87] field-state gating honors (UI-verified)** — `CustomerController` (param 87 → `customerIdAutoGen`)
>   drives `#vendorId` in `customers/form.html`: ON → readonly + not-required + placeholder "Auto-generated on
>   save"; OFF → editable + required. All field-state assertions pass on the rendered form.
> - **⚠️ [87] prefix-on-generated-id — NOT UI-verifiable.** After removing a DB-read fallback (it had made the
>   prefix a backend-sourced pass), the generated Customer Id is **not surfaced anywhere in the migrated UI**
>   (detail `#vendorId` empty post-save; grid has no visible code column) → aspect degrades to **warn**. So the
>   prefix *config* (`value_`) is set, but a user never sees the generated code carry it — a possible UI parity
>   gap vs legacy (legacy shows the generated customer code?). *(Contrast [88] Supplier, where it IS surfaced.)*
> - **❌ [147] field-visibility aspect = gap** — `customers/form.html` renders **no Approval field** in either
>   state; 147 only drives the approval-**routing** path, not field visibility. *(The routing behavior stays ✅ in
>   `TC-PARAM-ACT-147`; this gap is only the doc's extra "controls visibility of the Approval field" claim.)*
> - New file: `TC-PARAM-CUST-087-customer-id-autoseq.mjs` (covers 87 + the 147 visibility gap).
>
> **✅ FIX VERIFIED — [147] field gap CLOSED (fixer build, 2026-06-26):** the Customer-Approval control was wired
> as a **required "Workflow" picker** (`#workflowId`), not an "Approval"-labelled field. UI-verified: **147 ON →
> Workflow dropdown present + required; OFF → absent.** It is **entity-scoped** — `reloadWorkflows()` hits
> `/customers/customers/workflows?entityId=`; a flow seeded on entity 34 lists for 34 and **not** for 26
> (org 36 ships zero customer-approval flows, so the dropdown is correctly empty until one is configured — known
> gotcha, not a failure). Routing still ✅ (`TC-PARAM-ACT-147` updated to pick the now-required Workflow → 5/5
> green). `TC-PARAM-CUST-087` assertion D updated to detect `#workflowId` → passes. **New regression case:**
> `TC-PARAM-CUST-147-workflow-picker.mjs` (7/7). ⮕ Section 13 verdict for the 147 field: **❌ gap → ✅ fixed.**

---

# Section 14 — Tab - Suppliers

> Source: **Org_Parameter_Suppliers.docx** (2026-06-26). Audit: 88 WIRED ✅.

- **[88] Supplier ID - Auto Sequence** (WIRED ✅) → ON: auto-generate the **Supplier ID** on supplier creation;
  user does not enter it. Carries a configurable **prefix** (e.g. `CST` → CST01, CST02; `00` → 001, 002). OFF:
  Supplier ID is manual entry. **Value:** prefix. *(Supplier twin of Customer [87].)* Cross-link: Sequence Number.

> Spec status: 📝 Specified (doc 2026-06-26). Test TC-PARAM-SUPP-088 (auto-seq + prefix, ON/OFF) → ⬜.

> **🧪 Test results — background agent run (2026-06-26; UI-only retightened):** Track B; org 36, snapshot+restore.
> - **✅ [88] honors (fully UI-verified)** — `SuppliersController` (param 88 → `vendorIdAutoGen`) drives `#vendorId`
>   in `suppliers/supplier/form.html` (readonly/placeholder/required toggle, twin of [87]). After tightening to
>   UI-only (DB-read fallback removed), the generated **`ZSUP814`** is read from the **rendered detail field** →
>   prefix genuinely surfaces in the UI. 6/6 assertions pass. New file: `TC-PARAM-SUPP-088-supplier-id-autoseq.mjs`.
> - **⚠️ Asymmetry vs [87]:** supplier-create lands on a detail page that shows the generated id; customer-create
>   does not surface it → [87] prefix can't be UI-verified (see Section 13). Worth a legacy parity check on whether
>   the customer flow should also display the generated code.

---

# Section 29 — Admin / Global (10000-series)

> **Sequencing (product owner 2026-06-26): detailed global-param behavior is DEFERRED to last** — we'll spec
> these after walking the main modules, so each global param can be linked to the module it affects. The config
> **snapshot** below stays now as reference; only [10001] Ledgers has its behavior captured (it directly gates
> the Item form). The rest: snapshot-only until the modules pass.
>
> Cross-references the Items form: several Item-form sections are gated by global params (e.g. Ledgers).
> Field-level detail in [FORM-FIELD-CATALOG.md](FORM-FIELD-CATALOG.md).

### [10001] Ledgers — Admin / Global
- Audit: WIRED ✅.
- ON  → the **Finance Related Details** section appears in the **Item creation form** (HSN/SAC, Purchase
  Account, Sales Account, Finance Group) — the org **manages its own accounting / GL posting**.
- OFF → the Finance section is **hidden** in item creation; the customer uses an **external finance system**
  (no GL posting needed).
- Where (main module): **Items → Items → Add Item → Finance Related Details** section visibility. (Also drives
  GL posting across modules — broader effect TBD.)
- Value: none. Prereqs: GL accounts master data (for the selects when ON).
- Legacy (golden master): _TBD._  Migrated expected: match legacy (Ledgers ON ⇒ Finance section shows).
- Test: TC-PARAM-GBL-10001-ledgers-finance-section → Result: ⬜ not built
- Spec status: 📝 Specified (product owner 2026-06-26).

### [6] Trading/Finished Goods Item — Section 1 (Tab - Items)
- Audit: WIRED ✅.
- ON  → "Trading/Finished Goods Item" available as a selectable **Item Type** in Items → Add Item.
- OFF → type not offered.
- Where (main module): **Items → Items → Add Item**, Item Type = "Trading/Finished Goods Item".
- **Business meaning (product owner):** the core **sellable/stocked product** — covers **both trading items and
  finished goods**. Selected in **Sales Order**, **Delivery / Delivery Note**, **Invoice**, and chosen as the
  **finished good in BOM**. (Downstream flows to assert when we reach those modules.)
- **Form = common baseline with these deltas** (captured 2026-06-26):
  - **➖ Depreciation Details** — absent (non-asset).
  - **➕ Issue Method** — present in *Inventory Related Details* (shared with Consumable/Service).
  - **Finance Related Details = ONLY HSN/SAC `*`** — **no Purchase Account, no Sales Account, no Finance Group**
    (Ledgers ON so the section renders, but this type omits the GL-account fields). ⇒ Purchase/Sales Account are
    **type-gated**, not common.
  - Scrap Item, Other Details, Summary still render.
- Value: none. Prereqs: master data for the selects.
- Legacy (golden master): _TBD._  Migrated expected: match legacy.
- Test: TC-PARAM-ITEM-006-trading-fg → Result: ⬜ not built
- Spec status: 📝 Specified (form captured 2026-06-26; Finance section reduced to HSN/SAC only).

### [7] Trading Item - Batch — Section 1 (Tab - Items)
- Audit: WIRED ✅.
- ON  → "Trading Item - Batch" available as a selectable **Item Type** in Items → Add Item.
- OFF → type not offered.
- Where (main module): **Items → Items → Add Item**, Item Type = "Trading Item - Batch".
- **Business meaning (product owner):** a trading/finished good that must be **managed and tracked by its
  incoming/outgoing batch details** (batch-level traceability through receipts and issues).
- **Form = Trading/FG (6) baseline with these deltas** (captured 2026-06-26):
  - **➕ Alternate UOM** — checkbox in *Item Details* (next to UOM; shown ticked). Ties to param **15** Alternate UOM.
  - **➕ Catch Weight Item** — checkbox in *Inventory Related Details* (next to Issue Method). For variable-weight
    items (capture actual weight per unit).
  - **Finance Related Details = HSN/SAC `*` only** (same as Trading/FG; no Purchase/Sales Account).
  - Bundle Item Link — RESOLVED: present for all types (param 131); the "missing" view was another tester
    toggling 131 on the shared instance. Not a Batch-specific drop.
  - Scrap Item, Other Details, Summary present; no Depreciation.
- Value: none. Prereqs: master data for the selects.
- Legacy (golden master): _TBD._  Migrated expected: match legacy.
- Test: TC-PARAM-ITEM-007-trading-batch → Result: ⬜ not built
- Spec status: 📝 Specified (form captured 2026-06-26; +Alternate UOM, +Catch Weight Item).

### [10] Expense Item — Section 1 (Tab - Items)
- Audit: WIRED ✅.
- ON  → "Expense Item" available as a selectable **Item Type** in Items → Add Item.
- OFF → type not offered.
- Where (main module): **Items → Items → Add Item**, Item Type = "Expense Item".
- **Business meaning (product owner):** created for **employee expense-submission forms** — the item is defined
  here so it can be **selected when an employee submits an expense**. (Downstream flow: Expense Requests / expense
  submission — assert when we reach that module.)
- **Form = stripped baseline** (captured 2026-06-26):
  - **➖ Depreciation Details** — absent (non-asset).
  - **➖ Issue Method** — **absent** (Expense has no Issue Method; cf. Consumable/Service/Trading have it).
  - **Finance Related Details = HSN/SAC `*` only** (no Purchase/Sales Account, no Finance Group).
  - No Alternate UOM, no Catch Weight Item.
  - Bundle Item Link — RESOLVED: present for all types (param 131); earlier "missing" was another tester
    toggling 131 on the shared instance.
  - Scrap Item, Other Details, Summary present.
- Value: none. Prereqs: master data for the selects.
- Legacy (golden master): _TBD._  Migrated expected: match legacy.
- Test: TC-PARAM-ITEM-010-expense → Result: ⬜ not built
- Spec status: 📝 Specified (form captured 2026-06-26; minimal form — no Issue Method).
- NOTE: captured **out of pid order** — [8] Trading Item - Margin Calc. and [9] Sales Distributed Goods still
  to capture.

### [11] Trading Item - Serial No. Split — Section 1 (Tab - Items)
- Audit: WIRED ✅.
- ON  → "Trading Item - Serial No. Split" available as a selectable **Item Type** in Items → Add Item.
- OFF → type not offered.
- Where (main module): **Items → Items → Add Item**, Item Type = "Trading Item - Serial No. Split".
- **Business meaning (product owner):** a **serial-number tracked** trading item where each unit has a unique
  serial (e.g. laptops: 10 qty = 10 distinct serials). **"Split"** = at **GRN** the receipt can be partial — if
  order qty is 10 and you receive 5, the GRN shows **5 serial-input rows** to enter serials for just the received
  units (splits the receipt over multiple GRNs). The lean item-master form is expected — serials are captured at
  GRN, not at item creation.
- **Form (item master) = leaner Trading variant** (captured 2026-06-26):
  - **➖ Depreciation Details** — absent (non-asset).
  - **Inventory Related Details = Criticality, Barcode, Expiry Days only** — GRN Inspection Required & Issue Method
    not shown on this capture (plausibly because serials/inspection are handled at GRN; confirm).
  - **Finance Related Details = HSN/SAC `*` only**. Bundle Item Link present. Scrap/Other/Summary present.
- **Downstream (GRN) effect — the real serial behavior:** at GRN, each received unit becomes a serial row
  (Sl No · Item No `…-01/-02/-03` · Barcode · **Item Type**). The per-row **Item Type** dropdown offers
  *Consumable Item* and *Trading Item - Margin Calc.* (see [8] below). _Full GRN form to be catalogued under
  Purchase-to-Pay → GRN._
- Test: TC-PARAM-ITEM-011-serial-split → Result: ⬜ not built
- Spec status: 📝 Specified (item form + GRN serial behavior captured 2026-06-26).

### [12] Trading Item - Serial No. — Section 1 (Tab - Items)
- Audit: WIRED ✅.
- ON  → "Trading Item - Serial No." available as a selectable **Item Type** in Items → Add Item.
- OFF → type not offered.
- **Business meaning (product owner):** serial-number tracked trading item, **non-split**: at GRN the **full
  ordered qty** is processed at once — all serials are **either manually entered or auto-generated** for the
  whole quantity (vs Serial-No.-Split, which lets you receive/enter serials for a partial qty per GRN).
- **Form (item master) = Trading variant** (captured 2026-06-26):
  - Item Details: standard + Bundle Item Link (param 131); **no Alternate UOM**.
  - **Inventory Related Details = Criticality, Barcode, GRN Inspection Required, Expiry Days, Catch Weight Item**
    — **no Issue Method** (serial items issued by serial selection, not batch Issue Method).
  - **Finance Related Details = HSN/SAC `*` only**. Scrap/Other/Summary present; no Depreciation.
- ⚠️ **Re-capture [11] Serial No. Split:** [12] here shows GRN Inspection Required + Catch Weight Item, which were
  ABSENT in the earlier [11] capture. As 11/12 are sibling types, [11]'s lean view was likely **shared-instance
  param drift** (another tester). Recommend re-capturing [11] in a clean state and reconciling.
- Test: TC-PARAM-ITEM-012-serial → Result: ⬜ not built
- Spec status: 📝 Specified (item form captured 2026-06-26; +GRN Inspection, +Catch Weight, no Issue Method).

### [8] Trading Item - Margin Calc. — NOT a standalone item type
- Audit lists pid 8 as an Items checkbox, but **product owner (2026-06-26): Margin Calc is NOT a separate item
  master type.** It surfaces as a **per-serial-line Item Type option during GRN** of Serial-No.-Split items
  (dropdown: *Consumable Item* / *Trading Item - Margin Calc.*), used to **calculate the margin to arrive at the
  final price** of each received unit.
- ⇒ Param 8 ON likely **enables the "Trading Item - Margin Calc." option in the GRN serial-line Item Type
  dropdown** (confirm). There is **no Add-Item form** for Margin Calc — do not expect one.
- Where (main module): **Purchase-to-Pay → GRN**, serial-line grid → Item Type dropdown.
- Test: TC-PARAM-ITEM-008-margin-calc (GRN-level) → Result: ⬜ not built
- Spec status: 📝 Specified (re-scoped from "item type" to GRN serial-line margin option 2026-06-26).

### [13] Resource — Section 1 (Tab - Items)
- Audit: WIRED ✅.
- ON  → "Resource" available as a selectable **Item Type** in Items → Add Item.
- OFF → type not offered.
- Where (main module): **Items → Items → Add Item**, Item Type = "Resource".
- **Business meaning (product owner):** created to **manage resources** — e.g. **machines used in production
  planning**, and **resources used in projects**. (Downstream: Planning / Production / Projects — assert there.)
- **Form = standard lean Trading variant** (captured 2026-06-26):
  - Item Details: standard + Bundle Item Link (param 131); no Alternate UOM.
  - **Inventory Related Details = Criticality, Barcode, GRN Inspection Required, Expiry Days** — no Issue Method,
    no Catch Weight Item.
  - **Finance Related Details = HSN/SAC `*` only**. Scrap/Other/Summary present; no Depreciation.
- Value: none. Prereqs: master data for the selects.
- Legacy (golden master): _TBD._  Migrated expected: match legacy.
- Test: TC-PARAM-ITEM-013-resource → Result: ⬜ not built
- Spec status: 📝 Specified (form captured 2026-06-26).

### [14] Travel Item — Section 1 (Tab - Items)
- Audit: WIRED ✅.
- ON  → "Travel Item" available as a selectable **Item Type** in Items → Add Item.
- OFF → type not offered.
- Where (main module): **Items → Items → Add Item**, Item Type = "Travel Item".
- **Business meaning (product owner):** created for items like **different modes of travel / other travel-related
  items**, used by the **Travel Request module**. (Downstream: Travel Requests — assert there.)
- **Form = standard variant with FULL finance** (captured 2026-06-26):
  - Item Details: standard + Bundle Item Link (param 131); no Alternate UOM.
  - **Inventory Related Details = Criticality, Barcode, GRN Inspection Required, Expiry Days** — no Issue Method /
    Catch Weight.
  - **Finance Related Details = HSN/SAC `*` + Purchase Account `*` + Sales Account `*`** (full — like
    Asset/Consumable/Service; NOT HSN-only).
  - Scrap/Other/Summary present; no Depreciation.
- Value: none. Prereqs: GL accounts master data (Purchase/Sales Account selects).
- Legacy (golden master): _TBD._  Migrated expected: match legacy.
- Test: TC-PARAM-ITEM-014-travel → Result: ⬜ not built
- Spec status: 📝 Specified (form captured 2026-06-26; full Finance section).

### [64] Raw Material Item — Section 1 (Tab - Items)
- Audit: WIRED ✅.
- ON  → "Raw Material Item" available as a selectable **Item Type** in Items → Add Item.
- OFF → type not offered.
- Where (main module): **Items → Items → Add Item**, Item Type = "Raw Material Item".
- **Business meaning (product owner):** **raw material consumed in production**; in **BOM**, raw-material items
  appear **only in the raw-material section** (the BOM raw-material picker is filtered to this type).
  (Downstream: BOM / Production — assert there.)
- **Form = full-finance + Finance Group + Issue Method** (captured 2026-06-26):
  - Item Details: standard + Bundle Item Link (param 131); no Alternate UOM.
  - **Inventory Related Details = Criticality, Barcode, GRN Inspection Required, Expiry Days, Issue Method** —
    no Catch Weight.
  - **Finance Related Details = HSN/SAC `*` + Purchase Account `*` + Sales Account `*` + Finance Group** (same
    profile as Consumable).
  - Scrap/Other/Summary present; no Depreciation.
- Value: none. Prereqs: GL accounts, Issue Method, Finance Group master data.
- Legacy (golden master): _TBD._  Migrated expected: match legacy.
- Test: TC-PARAM-ITEM-064-raw-material → Result: ⬜ not built
- Spec status: 📝 Specified (form captured 2026-06-26; full Finance + Finance Group + Issue Method).

### [65] Trading/Semi Finished Goods Item — Section 1 (Tab - Items)
- Audit: WIRED ✅.
- ON  → "Trading/Semi Finished Goods Item" available as a selectable **Item Type** in Items → Add Item.
- OFF → type not offered.
- Where (main module): **Items → Items → Add Item**, Item Type = "Trading/Semi Finished Goods Item".
- **Business meaning (product owner):** **similar to Trading/Finished Goods (6)** — just another type to **manage
  semi-finished goods** (work-in-progress output that feeds further production).
- **Form** (captured 2026-06-26): standard + Bundle Item Link; Inventory = Criticality, Barcode, GRN Inspection
  Required, Expiry Days, **Issue Method**; **Finance = HSN/SAC `*` + Purchase Account `*` + Sales Account `*` +
  Finance Group** (full + Finance Group). Scrap/Other/Summary present; no Depreciation.
- Test: TC-PARAM-ITEM-065-semi-fg → Result: ⬜ not built
- Spec status: 📝 Specified (form captured 2026-06-26).

### [68] Scrap Item — Section 1 (Tab - Items)
- Audit: WIRED ✅.
- ON  → "Scrap Item" available as a selectable **Item Type** in Items → Add Item.
- OFF → type not offered.
- Where (main module): **Items → Items → Add Item**, Item Type = "Scrap Item".
- **Business meaning (product owner):** manages **scrap / wastage in manufacturing**. When an item produces
  wastage, the company wants to track the waste as a **separately-named item** (not the original) — so they
  create a **Scrap Item** and **link it** on the original item via that item's **Scrap Item** section (the
  search→table seen on the other forms). This is the *purpose of the Scrap Item section* on all item forms.
- **Form delta** (captured 2026-06-26):
  - **Scrap section shows a `Scrap Amount` field** (Decimal) **instead of** the Scrap-Item search→table (this
    item IS the scrap item, so it has an amount, not a link).
  - Item Details standard + Bundle Item Link; Finance = HSN/SAC `*` + Purchase Account `*` + Sales Account `*` +
    Finance Group (full + Finance Group — subject to the drift caveat below). Other/Summary present; no Depreciation.
- Value: Scrap Amount (a value). Prereqs: GL accounts master data.
- Legacy (golden master): _TBD._  Migrated expected: match legacy.
- Test: TC-PARAM-ITEM-068-scrap → Result: ⬜ not built
- Spec status: 📝 Specified (form captured 2026-06-26; Scrap Amount replaces scrap-link grid).

---

## Items tab — behavior toggles (non-item-type params)
> Source: product-owner doc **Org_Parameter_Tab_Item.docx** (2026-06-26). These params change the **item form
> behavior**, not the item-type list. All are WIRED ✅ per the audit (Items 25/25).

### [15] Alternate UOM — behavior toggle
- ON → show the **Alternate UOM** field in Item Master. OFF → hide it.
- Where: Items → Add/Edit Item → Item Details (Alternate UOM checkbox). Test: TC-PARAM-ITEM-015 → ⬜.

### [62] HSN Code Mandatory — behavior toggle
- ON → **HSN/SAC is mandatory**. OFF → HSN/SAC optional.
- Where: Items → Add/Edit Item → Finance Related Details → HSN/SAC required marker + save validation.
- Test: TC-PARAM-ITEM-062-hsn-mandatory → ⬜ (assert `*` + blocked save when ON; allowed when OFF).

### [82] Item No. - Auto Sequence — behavior toggle (carries values)
- ON → **auto-generate the Item Number** and **hide the manual Item No. field**; supports a **configurable prefix**
  (e.g. IT-01, IT-02 → the "Item No. Prefix(Value)" = `IT - RP`, and "Item No. (Value1)" seen in org params).
  OFF → allow **manual Item Number entry**.
- Value: Prefix(Value) + (Value1). Where: Items → Add Item → Item No. field (hidden+auto vs manual).
- Test: TC-PARAM-ITEM-082-auto-seq → ⬜.

### [100] Is Expense Category Mandatory — behavior toggle
- **Applicable to Expense Items.** ON → **Expense Category mandatory**. OFF → optional.
- Where: Items → Add/Edit Item (Expense Item type) → Expense Category required marker + validation.
- Test: TC-PARAM-ITEM-100-expcat-mandatory → ⬜.

### [106] Item No. Seq. By Type — behavior toggle
- Intent: maintain a **separate numbering sequence per Item Type** (e.g. CON-01, FG-01).
- ⚠️ **Doc says: parameter exists but functionality is NOT yet implemented.** → Verify legacy behavior; if legacy
  also doesn't implement it, parity holds (no-op both sides). If legacy DOES sequence-by-type, migrated is a gap.
- Test: TC-PARAM-ITEM-106-seq-by-type → ⬜ (confirm legacy first).

### [118] Price Variant — behavior toggle (carries alias value)
- ON → display **Price Variant** field in **Item Master AND Sales Price List**, with a **configurable alias**
  (the `Price Variant (Alias Name)` org-param value, e.g. "price Variant6778"). OFF → hide the field in both.
- Where: Items → Add/Edit Item → Item Details; and Sales Price List. (Recall: the cross-type alias label
  inconsistency is a known bug to ignore.)
- Test: TC-PARAM-ITEM-118-price-variant → ⬜.

### [131] Bundle Link Item — behavior toggle
- ON → show **Bundle Item Link** checkbox during item creation; **if checked, display the Bundle dropdown** and map
  the item to the selected **bundle**. In **Edit mode** the field is **read-only**, displaying **Yes/No + Bundle
  Name** if applicable. OFF → hide the whole feature.
- Where: Items → Add/Edit Item → Item Details. Test: TC-PARAM-ITEM-131-bundle-link → ⬜
  (assert create: checkbox→Bundle select required; edit: read-only Yes/No + bundle name).

### [136] Edit UOM — behavior toggle
- ON → **UOM is editable on the Edit Item page**. OFF → UOM **read-only** on edit.
- Where: Items → Edit Item → UOM field editable/disabled. Test: TC-PARAM-ITEM-136-edit-uom → ⬜.

### [8] Trading Item - Margin Calc. — doc confirmation
- Doc (1.8): "Margin calculation is applicable **only for Trading Item – Serial No. Split in the GRN module**." ✅
  Confirms the earlier re-scope — not a standalone item-master type; it's the GRN serial-line option.

> **General rule (doc):** each **Item-Type** org param independently controls the **visibility of its item type in
> the Item Type dropdown** (ON → shown, OFF → hidden). The non-type params above instead toggle field
> visibility / mandatory / sequence / edit behavior on the item form.

---

> ⚠️ **CAVEAT — Finance-section per-type table is suspect (param drift).** [65] (full Finance + Finance Group)
> vs [6] Trading/FG (HSN-only) conflict, although the product owner says they are similar types. Most likely the
> **Finance sub-fields (Purchase Account / Sales Account / Finance Group) are gated by org params** (under the
> §10001 Ledgers section) that **another tester was toggling on the shared instance** between captures — NOT by
> item type. **Action:** re-capture the Finance section for ALL types in a **clean, snapshot-restored org-param
> state** before trusting the "full vs HSN-only" split. Until then, treat that split as provisional.

### Global Parameter config snapshot — local-dev (captured 2026-06-26)

### Global Parameter config snapshot — local-dev (captured 2026-06-26)
> Reference snapshot of the **current state** on this dev instance (✅ = ticked, ☐ = unticked). Captured for
> context only — NOT modified. Restore to this exact state if any global param is toggled during testing.

| pid | Parameter | State | Value(s) |
|---|---|---|---|
| 10000 | Cost Centre | ✅ | |
| 10001 | Ledgers | ✅ | (gates Item Finance section — see above) |
| 10002 | HRMS | ✅ | |
| 10003 | Additional Discount | ☐ | |
| 10004 | Global Additional field 1 | ✅ | Alias "Additional Field s1"; Value (select) |
| 10005 | Global Additional field 2 | ✅ | Alias "Additional Field a2"; Value (select) |
| 10006 | Global Additional field 2 (dup name) | ✅ | Alias "Additional Field s3"; Value (select) |
| 10007 | Hide - Buy Price & Margin | ✅ | |
| 10008 | Order Tracking Workflow | ✅ | |
| 10009 | Hide - Supplier (Sales Modules) | ☐ | |
| 10010 | Additional field 4 | ☐ | |
| 10011 | Validate Cash Limit | ✅ | |
| 10013 | Currency Exchange Rate - Editable | ✅ | |
| 10016 | Digits After Decimal In Price | ✅ | Value "3" |
| 10017 | Average Item Value - Reports | ✅ | |
| 10018 | Digits After Decimal In PDF | ☐ | |
| 10021 | Entity Based sequence No. | ✅ | |
| 10022 | Reconciliation | ✅ | |
| 10023 | Project Code | ✅ | |
| 10025 | Add On Cost | ✅ | |
| 10026 | Transaction Date | ✅ | |
| 10027 | Assign WareHouse Resource | ✅ | |
| 10028 | Manufacturer Costing Uom | ✅ | Value "SqFt" |
| 10029 | Barcode With Qty | ✅ | |
| 10030 | E-VAT | ☐ | |
| 10031 | Agents Commission | ✅ | Alias "Commission Beneficiary" |
| 10032 | E Invoice (Vayana) | ✅ | Value "test_24_001\|\|Trial63$value…"; Value1 "2fb4edc6-…" |
| 10033 | E-Way Bill (Vayana) | ✅ | Value / Value1 set |
| 10034 | Search Items | ✅ | |
| 10035 | Search PriceList-Items | ✅ | |
| 10036 | Search Bundles | ✅ | |
| 10037 | Advance Amount Deduction By Request No. | ✅ | |
| 10038 | Qty Decimal Trailing Zeros | ☐ | |
| 10039 | Clover Payment | ✅ | Value "1c194457-…" |
| 10040 | Auto Realization | ☐ | |
| 10041 | Stock By Customer (Marathon) | ✅ | |
| 10042 | Requestor-Workflow Mail Required | ☐ | |
| 10043 | Digit Prefix Sequence | ☐ | |
| 10044 | Show Pdf For Saved Records | ✅ | |
| 10045 | Asset View Not Required | ✅ | |
| 10046 | E Invoice By IRN No. (Vayana) | ✅ | Value / Value1 set |
| 10047 | Allow Zero Price by Price List | ✅ | |
| 10048 | Ghana Tax Split | ✅ | |
| 10049 | Is Grouping Pdf | ✅ | |
| 10050 | Account Not Required | ✅ | |
| 10051 | Tax Calculation (Ghana) | ✅ | |
