# Form & Field Catalog — functional spec source of truth

**Purpose.** A single, growing catalog of **every form** in the app and **every field** on it, captured
screen-by-screen (legacy as golden master). For each field we record: label, technical name, section,
datatype, required, **source** (where it comes from), and **business logic**. This feeds (a) the parity
behavior spec, (b) a future **functional spec doc**, and (c) the **migrated architecture** cleanup
(e.g. dropping legacy "render-but-unused" sections). Capture once, reuse everywhere.

**Linked from:** [ORG-PARAMETER-BEHAVIOR-SPEC.md](ORG-PARAMETER-BEHAVIOR-SPEC.md) (org-parameter behavior).

## Conventions
- **Datatype:** String · Text(multiline) · Integer · Decimal · Date · DateTime · Boolean · Enum(FK→lookup) ·
  File · Grid(child table).
- **Required:** ✓ = on-screen `*` marker · — = optional.
- **Source** (where the field originates / what controls it):
  - `common` — appears across item types (legacy renders broadly; "used by" may be narrower — see notes).
  - `type:<Type>` — specific to an item type (e.g. `type:Asset` = Depreciation Details).
  - `type-gated` — present on some types but not others, where the exact set isn't known yet (e.g. Issue
    Method / Finance Group on Consumable but not Asset). Resolve to a concrete `type:` set once all forms in.
  - `param:<pid>` — driven by an org parameter (e.g. `param:118` Price Variant, `param:131` Bundle Link).
  - `org-custom` — org-defined **dynamic custom field** (definable per customer org; NOT a standard/parity
    field — varies by org; datatypes inferred from the input placeholder).
- **Business logic** is filled as the product owner dictates; `TBD` until then. Technical names marked
  `(tbd)` are to be confirmed from the migrated templates / legacy JSPs.

---

# FORM: Items → Items → Add Item  (Item Master — create)

- **Route (migrated):** `/items/items/...` (Add Item) — _confirm exact path._
- **Legacy:** _TBD (golden master to be captured)._
- **Applies to item types:** all (the form is type-aware — sections appear/required by type).
- **Captured:** 2026-06-26 from the **Asset** family forms ([1] Movable, [2] Immovable, [3] IT — identical).
- **Actions:** Cancel · Create.

### Fields

| Field (label) | Field name (tech) | Section | Datatype | Req | Source | Description / Business logic |
|---|---|---|---|---|---|---|
| Entity Alias | entityAlias (tbd) | Primary Details | Enum(FK→Company/Entity) | ✓ | common | Owning company/entity the item belongs to. **The on-screen label is org-configurable** — set to any text in org parameters and that text is displayed. |
| Item Type | itemType (tbd) | Primary Details | display (read-only) | — | common | The selected item type; set by which type was chosen to add. Drives which sections render. |
| Item No. | (tbd) | Item Details / Primary | String | — | **param:82 · param:106** | Item number. **⇐ param 82 (Auto Sequence)**: ON → auto-generated + manual field hidden, **configurable prefix** (e.g. IT-01, IT-02); OFF → manual entry. **param 106 (Seq By Type)**: separate sequence per item type (CON-01, FG-01) — **per doc NOT yet implemented** (verify legacy). |
| Expense Category | (tbd) | Item Details | Enum(FK) | cond | type:Expense · **param:100** | Expense category (Expense Items only). **Mandatory ⇐ param 100 (Is Expense Category Mandatory)**: ON → required, OFF → optional. _(Field not yet pinpointed on the Expense form capture — confirm position.)_ |
| Description | description (tbd) | Item Details | String | ✓ | common | Item name/description. |
| Additional Description | (tbd) | Item Details | Text | — | common | Extra free-text description. |
| UOM | uom (tbd) | Item Details | Enum(FK→UOM) | ✓ | common · **param:136** | Base unit of measure. **Editable on Edit Item ⇐ param 136 (Edit UOM)**: ON → editable on edit, OFF → read-only on edit. |
| Manufacturer | (tbd) | Item Details | String | — | common | Manufacturer name. |
| Manufacturer Part No. | (tbd) | Item Details | String | — | common | Manufacturer's part number. |
| Category | (tbd) | Item Details | Enum(FK→Item Category) | — | common | Item category classification. |
| Image | (tbd) | Item Details | File (JPEG/JPG/PNG/GIF) | — | common | Item image upload (image types only). |
| Bundle Item Link | (tbd) | Item Details | Boolean | — | **param:131** | Org param 131 (Bundle Link Item) — shown during item creation when 131 is ON (earlier "missing" screenshots were another tester toggling 131, not type-gating). **Ticking it reveals the required _Bundle_ select** to map the item to a bundle. **In Edit mode the field is read-only**, displaying **Yes/No + Bundle Name** if applicable. OFF → whole feature hidden. (per doc 1.24) |
| Bundle | (tbd) | Item Details | Enum(FK→Bundle) | ✓ (when shown) | **param:131** (conditional) | Appears **only when Bundle Item Link is ticked**. Select the existing **bundle** to add this new item into. Bundles (Bundles module) group items sold/moved together — useful for traders selling items as a bundle, and project teams who request a whole bundle of items for a site in one go (vs item-by-item). |
| Price Variant (`price Variant6778`) | (tbd) | Item Details | String | — | **param:118** | Appears when param 118 (Price Variant) is ON — in **Item Master AND Sales Price List**; **label is org-configurable** alias (per doc 1.23). OFF → hidden in both. NOTE: the cross-type label inconsistency is a **known bug — IGNORE**. |
| Alternate UOM | (tbd) | Item Details | Boolean | — | **param:15** | **⇐ param 15 (Alternate UOM)**: ON → show the Alternate UOM field in Item Master, OFF → hide it (per doc 1.15). |
| Minimum Order Qty | (tbd) | Purchase Related Details | Decimal | — | common | Min order quantity. (Legacy renders on most types; used by a subset.) |
| Order Multiples | (tbd) | Purchase Related Details | Decimal | — | common | Order must be in multiples of this. Default 0. |
| Criticality | (tbd) | Inventory Related Details | Enum(FK) | — | common | Item criticality classification. |
| Barcode | (tbd) | Inventory Related Details | String | — | common | Barcode value. |
| GRN Inspection Required | (tbd) | Inventory Related Details | Boolean | — | common (⚠️ confirm) | If set, item requires inspection at GRN. Seen on Asset/Consumable/Service/Trading/Batch/Expense; **not visible on Trading Item - Serial No. Split** (confirm). |
| Expiry Days | (tbd) | Inventory Related Details | Integer | — | common | Shelf-life in days. Default 0. |
| Issue Method | (tbd) | Inventory Related Details | Enum(FK) | — | type-gated | **How stock is issued from the store.** **Manual** → on issue the store person gets a popup of all available stock batches and picks which batch to issue. **Backflush** → system auto-deducts from batch by **FIFO/LIFO**. Appears on **Consumable, Service, Trading/FG, Trading-Batch, Raw Material** (NOT Asset, Expense, Serial-types, Resource, Travel). |
| Catch Weight Item | (tbd) | Inventory Related Details | Boolean | — | type-gated | For **variable-weight items** — capture actual weight per unit. Seen on **Trading Item - Batch** and **Trading Item - Serial No.** |
| HSN/SAC | (tbd) | Finance Related Details | String | ✓/— | common · **§10001 · param:62** | HSN/SAC tax code. Only Finance field common to all types. **Mandatory ⇐ param 62 (HSN Code Mandatory)**: ON → required (`*`, save blocked if empty), OFF → optional (per doc 1.16). |
| Purchase Account | (tbd) | Finance Related Details | Enum(FK→GL Account) | ✓ | **§10001 + ?param (drift)** | GL account for purchases. Seen as present on some types (Asset/Consumable/Service/Travel/Raw Material/Semi-FG) and ABSENT on others (Trading/FG/Batch/Expense/Serial/Resource) — **but [6] vs [65] conflict suggests this is org-param-driven, not type-gated** (another tester toggled params mid-capture). ⚠️ re-capture in clean state. |
| Sales Account | (tbd) | Finance Related Details | Enum(FK→GL Account) | ✓ | **§10001 + ?param (drift)** | GL account for sales. Same suspected param-drift caveat as Purchase Account. |
| Finance Group | (tbd) | Finance Related Details | Enum(FK) | — | **§10001 + ?param (drift)** | Finance/GL grouping. Seen on Consumable/Raw Material/Semi-FG — but presence likely org-param-driven (drift). ⚠️ re-capture in clean state. |

> **§10001 = the entire _Finance Related Details_ section is gated by Global param 10001 (Ledgers).** Product
> owner (2026-06-26): **Ledgers ON → the Finance section appears in the Item creation form**; OFF → it's hidden
> (customer uses an external finance system, no GL posting). All four fields above live inside that gate.
| Depreciation Method | (tbd) | Depreciation Details | Enum(FK) | ✓ | **type:Asset** | Depreciation calc method. Asset types only. |
| Depreciation Based on | (tbd) | Depreciation Details | Enum(FK) | ✓ | **type:Asset** | Basis for depreciation. |
| Useful Life (years) | (tbd) | Depreciation Details | Integer | ✓ | **type:Asset** | Useful life in years. Default 0. |
| Useful Life (Months) | (tbd) | Depreciation Details | Integer | — | **type:Asset** | Useful life in months. Default 0. |
| Salvage Value | (tbd) | Depreciation Details | Decimal | — | **type:Asset** | Residual value at end of life. |
| Depreciation Percentage | (tbd) | Depreciation Details | Decimal | — | **type:Asset** | Depreciation rate %. Default 0.0. |
| Depreciation Frequency | (tbd) | Depreciation Details | Enum(FK) | ✓ | **type:Asset** | How often depreciation posts. |
| Depreciation Expense Account (Dr) | (tbd) | Depreciation Details | Enum(FK→GL) | ✓ | **type:Asset** | Debit GL for depreciation expense. |
| Accumulated Depreciation Account (Cr) | (tbd) | Depreciation Details | Enum(FK→GL) | ✓ | **type:Asset** | Credit GL for accumulated depreciation. |
| Scrap Item (search → table) | (tbd) | Scrap Item | Grid (Item No., Item) | — | common* | On **non-scrap** item types: search → **link an existing Scrap Item** to this item, so the item's manufacturing wastage is tracked as that separately-named scrap item. (Replaced by the Scrap Amount field on the Scrap Item type itself.) |
| Scrap Amount | (tbd) | Scrap Item | Decimal | — | **type:Scrap** | Amount/value of the scrap. Appears **only on the Scrap Item type** (replaces the scrap-item link grid). |
| Attachments | (tbd) | Summary | File (multiple) | — | common | One or more file attachments (Add another File). |

### Other Details — org-defined dynamic custom fields (this dev org; NOT parity baseline)
> Datatypes inferred from input placeholders. These vary per customer org and are **not** standard fields;
> listed for completeness so the catalog matches the captured screen.

| Field (label) | Datatype (inferred) | Req | Source |
|---|---|---|---|
| test attribute | String | — | org-custom |
| Attribute1 | String | — | org-custom |
| Test-01 | String | — | org-custom |
| Test-02 | DateTime | — | org-custom |
| Test-03 | String | ✓ | org-custom |
| Test-04 | String | ✓ | org-custom |
| New attribute-Added | String | ✓ | org-custom |
| Date | Date | — | org-custom |
| Thickness | Decimal | — | org-custom |
| Coverage | Decimal | — | org-custom |
| Item Multiplying Factor | Decimal | — | org-custom |
| Coverage1 | Decimal | — | org-custom |
| DateTime | DateTime | — | org-custom |
| Inventory UoM | String/Enum | — | org-custom |
| Bottles per Case | Decimal | — | org-custom |
| Liters per Count UoM | Decimal | — | org-custom |
| Flammable or Hazmat | Enum | — | org-custom |
| Purchasing UoM | String/Enum | — | org-custom |
| UoM Conversion (Liters) | Decimal | — | org-custom |
| UoM Conversion (Units) | Decimal | — | org-custom |
| API Export | Enum | — | org-custom |
| Brand | String | — | org-custom |
| Incoming Weight | Decimal | — | org-custom |
| Gain | Decimal | — | org-custom |
| Price | Decimal | — | org-custom |
| Start-Time | Decimal | — | org-custom |
| End-Time | Decimal | — | org-custom |
| Sales UoM | String/Enum | — | org-custom |

### Item-type notes for this form
- **Asset family ([1] Movable, [2] Immovable, [3] IT)** render this exact form (common + Depreciation +
  Scrap Item). They differ by business meaning (see behavior spec Asset-family note): Movable = moves out &
  returns (tools → project → back), Immovable = fixed/stationary, IT = laptops/servers. Both Movable & Fixed
  carry depreciation (accounting posts depreciation + value; Maintenance module pulls both).
- **[4] Consumable Item** (captured 2026-06-26): **drops Depreciation Details**; **adds Issue Method**
  (Inventory Related Details) and **Finance Group** (Finance Related Details). Scrap Item + Other Details +
  Summary still render. Confirms Depreciation = Asset-only; Issue Method / Finance Group = `type-gated`.
- **[5] Service Item** (captured 2026-06-26): −Depreciation; **+Issue Method** (shared w/ Consumable);
  **no Finance Group**. Inventory + Scrap still render (unused for a service item — legacy quirk).
  ⚠️ param-118 field shows generic label "Price Variant" vs alias "price Variant6778" on Asset/Consumable.
- **[6] Trading/Finished Goods Item** (captured 2026-06-26): −Depreciation; **+Issue Method**; **Finance
  section reduced to HSN/SAC only** (no Purchase/Sales Account, no Finance Group). Business: core sellable/stocked
  product (trading items + finished goods); selected in Sales Order, Delivery/Delivery Note, Invoice, and as the
  BOM finished good. ⇒ Purchase Account & Sales Account are **type-gated**, not common.
- **[7] Trading Item - Batch** (captured 2026-06-26): Trading/FG baseline **+Alternate UOM** (Item Details,
  param 15) **+Catch Weight Item** (Inventory). Finance = HSN/SAC only. Bundle Item Link present (param 131; the
  "missing" view was another tester toggling 131). Business: trading/finished good tracked by incoming/outgoing **batch** details.
- **[10] Expense Item** (captured 2026-06-26, out of order): stripped form — **−Issue Method**, −Depreciation,
  Finance=HSN/SAC only, no Alternate UOM / Catch Weight. Bundle Item Link present (param 131). **Business: employee
  expense-submission forms — item defined here to be selectable on expense submission.**
- **[11] Trading Item - Serial No. Split** (captured 2026-06-26, out of order): leaner item-master form (Inventory =
  Criticality/Barcode/Expiry only; Finance=HSN/SAC; Bundle present) — serials are entered at **GRN**, not item
  creation. See serial-tracking note above + the GRN form.
- **[8] Margin Calc** re-scoped: NOT an item type — a GRN serial-line option (see above).
- **[12] Trading Item - Serial No.** (captured 2026-06-26): Trading variant — Inventory = Criticality, Barcode,
  **GRN Inspection Required**, Expiry Days, **Catch Weight Item**; **no Issue Method**; Finance=HSN/SAC; Bundle
  present; no Alternate UOM. ⚠️ Shows GRN Inspection + Catch Weight that were absent in the [11] capture → [11]
  likely caught mid param-drift; **re-capture [11]** and reconcile.
- **[13] Resource** (captured 2026-06-26): standard lean form — Inventory = Criticality, Barcode, GRN Inspection
  Required, Expiry Days; **no Issue Method / Catch Weight**; Finance=HSN/SAC; Bundle present; no Alternate UOM.
  Business: manage resources — machines in production planning, resources in projects.
- **[14] Travel Item** (captured 2026-06-26): standard variant with **FULL Finance** (HSN/SAC + Purchase Account +
  Sales Account); no Issue Method / Catch Weight; Bundle present. Business: travel modes / travel-related items for
  the Travel Request module.
- **[64] Raw Material Item** (captured 2026-06-26): full Finance **+ Finance Group + Issue Method**; no Catch
  Weight; Bundle present. Business: raw material in production; BOM raw-material section filtered to this type.
- **[65] Trading/Semi Finished Goods** (captured 2026-06-26): full Finance + Finance Group + Issue Method.
  Business: like Trading/FG (6), manages **semi-finished goods**.
- ⚠️ **Finance split is now SUSPECT:** [65] (full Finance) vs [6] Trading/FG (HSN-only) conflict though the owner
  says they're similar → the Finance sub-fields (Purchase/Sales Acct, Finance Group) are **likely org-param-driven,
  not type-gated**; my earlier per-type split was contaminated by another tester's param toggling. **Re-capture
  the Finance section for all types in a clean snapshot-restored state.**
- **[68] Scrap Item** (captured 2026-06-26): Scrap section shows **Scrap Amount** (Decimal) instead of the
  scrap-link grid; Finance full + Finance Group (drift caveat). Business: scrap/wastage management — explains the
  **Scrap Item section** on all forms (link a scrap item to track an item's wastage as a separate item).
- **Behavior toggles (15/62/82/100/106/118/131/136)** now specced from the product-owner doc
  **Org_Parameter_Tab_Item.docx** (2026-06-26) — see ORG-PARAMETER-BEHAVIOR-SPEC.md "Items tab — behavior toggles".
  Relevant field rows above updated (HSN/SAC mandatory⇐62, UOM editable⇐136, Item No⇐82/106, Alternate UOM⇐15,
  Price Variant⇐118, Bundle⇐131, Expense Category⇐100).
- Still to capture: **[9] Sales Distributed Goods** item-type form (held per product owner). Item tab otherwise
  complete pending the clean-state **Finance-section re-capture** (drift caveat).

### Product-owner clarifications (2026-06-26) — Items form
- **Issue Method** = stock issue mode: **Manual** (popup of available batches → store person picks) vs
  **Backflush** (auto-deduct by FIFO/LIFO).
- **Entity Alias** & **Price Variant** labels are **org-configurable** (set any display text in org parameters).
  The Price-Variant cross-type label inconsistency is a **known bug — IGNORE** (not a finding).
- **Finance Group / GL posting** is **org-parameter controlled**: enabled when the customer manages their own
  accounting (GL posting); disabled when they use an external finance system (no GL posting needed).
- **Bundle Item Link** (param 131) is **for all item types**; ticking it shows a required **Bundle** select to add
  the new item into an existing bundle (Bundles module — sell/move grouped items; project teams request a whole
  bundle at once). The earlier per-type "disappearance" was **another tester toggling param 131 on the shared
  dev instance** — a reminder that org-param state can drift mid-session (snapshot + restore still applies).

### Serial-tracking item types (8 / 11 / 12) — product owner (2026-06-26)
- **Serial tracking** = each unit has a unique serial number (e.g. laptops: 10 qty → 10 serials); the app tracks
  each unit by serial.
- **[11] Trading Item - Serial No. Split** — at **GRN**, partial receipt allowed: order 10, receive 5 → 5 serial
  rows shown to enter serials for the received units only (split over GRNs).
- **[12] Trading Item - Serial No.** — at GRN the **full qty** is processed at once; serials **manual or
  auto-generated** for all units.
- **[8] Trading Item - Margin Calc.** — **NOT a separate item-master type**. It's a per-serial-line **Item Type**
  option in the GRN receive grid (dropdown: Consumable Item / Trading Item - Margin Calc.), used to **calculate
  margin → final price** of each received unit. Param 8 likely enables this dropdown option (confirm). No Add-Item
  form exists for it.

---

# FORM: Purchase-to-Pay → GRN → receive line (Item Details)  — PARTIAL

- **Captured:** 2026-06-26 (shown while explaining serial item types — not yet a full pass).
- **Scope:** the per-line receive panel of a GRN, incl. the serial-number entry grid for serial-tracked items.
- **Status:** ⏳ partial — full GRN form (header + all sections + validations) to be catalogued later.

### Fields (captured so far)

| Field (label) | Section | Datatype | Req | Source | Description / Business logic |
|---|---|---|---|---|---|
| Item No. / Item / Supplier / UOM / Ordered Qty / Unit Price / Amount / Discount % / Tax % / Total / Rcvd Qty Price / Additional Cost | line summary (read-back) | display | — | line | Read-back of the ordered line being received. |
| Warehouse | receive | Enum(FK→Warehouse) | ✓ | line | Receiving warehouse. |
| Location | receive | String/Enum | — | line | Bin/location within warehouse. |
| Received Qty | receive | Decimal | — | line | Qty already received to date. |
| Qty | receive | Decimal | ✓ | line | Qty being received now. |
| Auto fill ordered Qty | receive | Boolean | — | line | If ticked, prefills Qty with the ordered qty. |
| Batch Name (×2) | receive | String | — | line | Batch identifier(s) for batch-tracked items. |
| Sl No. | serial grid | Integer | — | serial | Row index per received unit. |
| Item No. (serial) | serial grid | String | — | serial | Auto serial-suffixed item no (e.g. `1234-01`, `-02`, `-03`) — one per received unit. |
| Barcode | serial grid | String | — | serial | Barcode per unit. |
| Item Type (serial line) | serial grid | Enum | — | **param:8 (Margin Calc option)** | Per-unit classification. Options seen: *Consumable Item*, *Trading Item - Margin Calc.* — Margin Calc used to compute margin → final price. |
| Bulk Upload Items | serial grid | File + Download Template | — | line | Bulk-upload serials via template. |

> For a **Serial No. Split** item, the serial grid shows **one row per received unit** (received qty, not ordered
> qty). For a **Serial No.** item, rows cover the **full qty**, serials manual or auto-generated.

---

# FORM: Purchase-to-Pay → Purchase Invoices → Create  — DOC-ONLY (not yet screen-captured)

- **Source:** product-owner doc **Org_Parameter_Purchase_Invoice.docx** (2026-06-26). Fields below are the
  org-param-driven ones; full form (header/lines/all sections + validations) to be captured on screen later.
- **Two creation paths:** **Direct PI creation** vs **PO → PI conversion** — several fields are path-specific.

| Field (label) | Section | Datatype | Source | Description / Business logic |
|---|---|---|---|---|
| Reimbursement | create | Boolean | **param:22** | Show on **Direct PI creation only** (NOT on PO→PI). OFF → hidden. |
| Additional Field 1 | Summary | Decimal (alias label) | **param:49** | Show in Summary. Org param sets **alias** + **calc type** (Add/Sub/Mult). **Both** Direct + PO→PI paths. |
| Additional Field 2 | Summary | Decimal (alias label) | **param:50** | As Additional Field 1, for field 2. |
| Additional Field 3 | Summary | Decimal (alias label) | **param:51** | As Additional Field 1, for field 3. |
| WHT % | Summary | Decimal | **param:70** | Show in Summary on **Direct PI creation only** (NOT on PO→PI). OFF → hidden. |

> Audit: all 5 are **no-consumer ⚠️** → candidate config-only gaps; verify legacy renders them and migrated matches.
> Alias names render as field labels; calc type drives how the Additional Field applies to the summary total.

---

# FORM: Super Admin → Organization → Add Organization  (create customer org)

- **Captured:** 2026-06-26. The **first screen** of the app — Super Admin creates a new **customer organization**.
- **Prior parity:** F-0001 (org create: default status + required fields, Fixed), F-0032 (org detail read-only).
  Tech-name hints exist in [fixtures.mjs](../lib/fixtures.mjs) `createMigratedOrg` (name, displayName, firstName,
  lastName, address1, phoneNo, email, city, postalCode, entityAlias, viewAlias, country, state, enterprisePlanId,
  dateFormat, currencyId, contracts1=Product:Contract, poVariablePrice1=Allow-Price-Change:Yes).
- **Actions:** Cancel · Create.

### Fields — header + Primary Details
> Generic fields (self-explanatory per product owner); datatypes inferred, `*` = required on screen.

| Field (label) | Section | Datatype | Req | Notes |
|---|---|---|---|---|
| Organization Name | (header) | String | ✓ | |
| Display Name | (header) | String | — | |
| Time Zone | (header) | Enum(FK) | — | |
| First Name | Primary Details | String | ✓ | admin/primary contact |
| Last Name | Primary Details | String | — | |
| Address 1 | Primary Details | String | ✓ | |
| Address 2 | Primary Details | String | — | |
| Contact No. | Primary Details | String | ✓ | |
| Alternate Contact Number | Primary Details | String | — | |
| Email | Primary Details | String(email) | ✓ | |
| Alternate Email Id | Primary Details | String(email) | — | |
| Fax | Primary Details | String | — | |
| Job Title | Primary Details | String | — | |
| Country | Primary Details | Enum(FK) | ✓ | drives State |
| State | Primary Details | Enum(FK) | ✓ | |
| City | Primary Details | String | ✓ | |
| Postal Code | Primary Details | String | ✓ | |
| Contract Lead Days | Primary Details | Integer | — | |
| Entity Alias | Primary Details | String | ✓ | |
| View Alias | Primary Details | String | ✓ | |
| Email Domain | Primary Details | String | — | |
| Website | Primary Details | String | — | |
| Toll-Free No. | Primary Details | String | — | |
| Enterprise Plan | Primary Details | Enum(FK) | ✓ | |
| Vendor ID Prefix | Primary Details | String | — | |
| Item No. Prefix | Primary Details | String | — | |
| Customer ID Prefix | Primary Details | String | — | |
| Upload Logo Image | Primary Details | File (JPEG/JPG/PNG/GIF) | — | + "Uploaded Logo Image" display |
| My Home Image | Primary Details | File (JPEG/JPG/PNG/GIF) | — | |
| Currency | Primary Details | Enum(FK) | ✓ | |
| Date Format | Primary Details | Enum | ✓ | |
| Decimal Places | Primary Details | Enum | — | default "Two" |
| GSTIN | Primary Details | String (pattern 00AAAAA0000A1Z0) | — | |
| VAT No. | Primary Details | String | — | |
| Allow Price Change In Purchase Invoice | Primary Details | Radio (PO No / Yes) | ✓ | maps to poVariablePrice; F-0001 made it enforced |

### Config checkboxes — ⏳ business logic TBD (tester to write, then update)
> Block of org-config checkboxes (4th screenshot). **Business logic per checkbox to be supplied by the tester.**
> Hypothesis (to confirm): several mirror Org Parameters — Entity Based Sequence↔10021, Project Code↔10023,
> Reconciliation↔10022, Customer ID Auto Generate↔87, Item ID Auto Generate↔82, Vendor ID Auto Generate↔88,
> Invoice No. Auto Generate↔83, Multiple Entity w/ Account No.↔86, PO Discount↔84 — i.e. this form seeds initial
> org params. **Do NOT treat as confirmed until tester logic + verification.**

| Checkbox | Datatype | Business logic |
|---|---|---|
| All View | Boolean | ⏳ TBD (checked in capture) |
| PO New Item | Boolean | ⏳ TBD |
| WO New Item | Boolean | ⏳ TBD |
| Entity Based Sequence | Boolean | ⏳ TBD (↔10021?) |
| Project Code | Boolean | ⏳ TBD (↔10023?) |
| Work Order Sequence | Boolean | ⏳ TBD |
| Reconciliation | Boolean | ⏳ TBD (↔10022?) |
| Multiple Entity with Account No. | Boolean | ⏳ TBD (↔86?) |
| Supplier Stock | Boolean | ⏳ TBD |
| Customer ID Auto Generate | Boolean | ⏳ TBD (↔87?) |
| Item ID Auto Generate | Boolean | ⏳ TBD (↔82?) |
| Vendor ID Auto Generate | Boolean | ⏳ TBD (↔88?) |
| Project Code Auto Generate | Boolean | ⏳ TBD (↔89?) |
| Invoice No. Auto Generate | Boolean | ⏳ TBD (↔83?) |
| PO Discount | Boolean | ⏳ TBD (↔84?) |
| Pickup New Item | Boolean | ⏳ TBD |
| Asset New Item | Boolean | ⏳ TBD |
| Load Chart Of Account Sub Group | Boolean | ⏳ TBD |

### Product (required — select at least one)
> `Product *` checkbox group — the modules/products enabled for the org.

| Checkbox | Business logic |
|---|---|
| Contract · Purchase to Pay · Analytics · Account Receivable · Medical · CRM · HRMS · Seller APIs | ⏳ TBD (tester) — Product is required (`*`); F-0001 enforced selecting a product. |

### Organization grid (list) — captured from screenshot 1
- Columns: **Organization · First Name · Last Name · Email · Created Date · Updated Date · Status · Action (⋮)**.
- Controls: Search box · column-menu per header · pagination ("1 to 100 of 427", Page 1 of 5) · **+ New** · export (↓).
- Tabs (Org admin area): Organization · Org Pricing · Role Permissions · Roles · Data Migration · Item Formula ·
  **Org Parameter** · Tax Country Mapping · Sequence Number · Barcode.
- **Action (⋮) row menu:** Edit Organization · Organization Details (read-only, F-0032) · Delete Organization ·
  **View Entity** (→ entity list/add; see Entity concept below) · Assign Report. (All self-explanatory except
  View Entity.)

> **Entity concept (product owner 2026-06-26) — foundational.** An **Entity** is a legal/operating unit under an
> Organization. A company group has branches: e.g. **ABB Inc** (org/group) → **ABB India**, **ABB UAE**, **ABB US**
> as **entities**, each with its **own P&L accounts**. Entities are created (via View Entity → Add Entity) and a
> company with no child must still have **at least one entity (mandatory)**. **ALL transactional records are
> recorded at the ENTITY level** — so the "Entity Alias" select on item/transaction forms picks which entity owns
> the record.

---

# FORM: Super Admin → Org → View Entity → Sequence Details + Add Sequence  (per-entity number sequences)

- **Captured:** 2026-06-26. Entity grid → Action ⋮ → **Sequence Details** → **+ New** → Add Sequence.
- **Business meaning (product owner):** every entity needs **document number sequences** — each transaction
  (PO#, SO#, GRN#, Invoice#, …) must have a **unique number**, generated from the sequence configured here.
  Sequences are **per entity** (ties to org param 10021 Entity Based Sequence + the auto-gen params).

### Sequence Details grid (View Sequence)
- Columns: **Entity Name · Sequence Name · Sequence Type · Sequence Sub Type · Document No. Sequence · Status · Action (⋮)**.
- **Every transaction type that carries a sequence** (captured 18 rows for one entity) — also a handy module map:
  Sales Orders (SO Default/Default Seq) · Gate Entrys · Purchase Indent (Indent Request) · Material Request
  (Pickup Request/PickUp) · Sales Quotes (Quote Request) · Purchase Orders (Work Order / PR # / Work Order-PR / PO) ·
  Cost Estimates (Costing / Costing Request) · BOQ (BOQ / BOQ Request) · Sales Invoices (Taxable Invoice) ·
  Sales Quotes (Quote) · Delivery Notes/Challans (Sales DC) · Material Request Delivery (Pickup DC) ·
  Goods Receipt Note (GRN).

### Add Sequence — fields
> The sequence definition (number format) + the **print document template** (PDF/HTML headers, signatures, terms).

| Field (label) | Section | Datatype | Req | Notes |
|---|---|---|---|---|
| Entity Name | Primary Details | display | — | the entity (read-back) |
| Sequence Type | Primary Details | Enum(FK) | ✓ | transaction type (Sales Orders, Purchase Orders, …) |
| Sequence Name | Primary Details | String | ✓ | |
| Sequence Category Type | Primary Details | Enum | — | default "Parent" |
| Delimiter | Primary Details | String | — | separator between parts |
| Prefix1 | Primary Details | String | ✓ | |
| Digits | Primary Details | Integer | — | number of running digits |
| Prefix3 | Primary Details | Enum | — | |
| Text Sequence | Primary Details | Enum | — | |
| Digits Sequence | Primary Details | Enum | — | |
| Year Sequence | Primary Details | Enum | — | year component |
| PDF Template | Primary Details | File (PDF) | ✓ | print template |
| HTML Template | Primary Details | File (HTML) | ✓ | + "Download Html" link |
| Header | Primary Details | String | ✓ | |
| Print Text Required (original,duplicate,triplicate) | Primary Details | Boolean | — | |
| Page No Required | Primary Details | Boolean | — | |
| Reference Text Required | Primary Details | Boolean | — | |
| Reference Title | Primary Details | String | ✓ | |
| Supplier Address Header | Primary Details | String | ✓ | |
| PO Information Header | Primary Details | String | ✓ | |
| Billing Address Header | Primary Details | String | ✓ | |
| Shipping Address Header | Primary Details | String | ✓ | |
| Signature 1 | Primary Details | String (3 lines) | ✓ | |
| Signature 1 Image | Primary Details | File (JPEG/JPG/PNG/GIF, 185×100px) | — | |
| Signature 2 | Primary Details | Boolean + text | ✓ | |
| Terms | Primary Details | Text | ✓ | |
| Additional Image1 | Primary Details | File (185×100px) | — | |
| Additional Image2 | Primary Details | File (185×100px) | — | |
| Footer Content | Primary Details | Text | — | |

---

# FORM: Super Admin → Organization → View Entity → Add Entity  (create entity under an org)

- **Captured:** 2026-06-26. Reached via Org grid → Action ⋮ → **View Entity** → Add Entity.
- **Concept:** see *Entity concept* above — entity = legal/operating unit (own P&L); ≥1 mandatory per org; all
  transactions recorded at entity level.
- **Prior parity:** F-0033 (Entity Name editable on edit — should lock after create), F-0034 (Entity Details
  read-only). 
- **Actions:** Cancel · Create.

### Fields

### Entity grid (View Entity) — captured 2026-06-26
- Columns: **Entity Name · Display Name · Status · Action (⋮)**. Search · pagination · **+ New** · export.
- **Action (⋮) menu:** Edit Entity · Entity Details (read-only, F-0034) · **Sequence Details** (→ per-entity number sequences).
- Legacy tech hint (status-bar URL): `anchorTagSubmit('detailForm','/SCM/admin/editEntity.action', <id>)`.

### Add Entity — fields

| Field (label) | Section | Datatype | Req | Notes |
|---|---|---|---|---|
| Entity Name | Primary Details | String | ✓ | locked once created (F-0033) |
| Currency | Primary Details | Enum(FK) | ✓ | default INR |
| Display Name | Primary Details | String | — | |
| Entity Abbreviation | Primary Details | String | — | |
| Same As Organization Address | Primary Details | Boolean | — | copies the org address into Address Details |
| Time Zone | Primary Details | Enum(FK) | — | |
| Date Format | Primary Details | Enum | ✓ | default MM/dd/yyyy |
| Address 1 | Address Details | String | ✓ | |
| Address 2 | Address Details | String | — | |
| Country | Address Details | Enum(FK) | ✓ | |
| State | Address Details | Enum(FK) | ✓ | |
| City | Address Details | String | ✓ | |
| Postal Code | Address Details | String | ✓ | |
| GSTIN | Address Details | String (pattern 00AAAAA0000A1Z0) | — | |
| VAT No. | Address Details | String | — | |
| Contact Name | Contact Details | String | ✓ | |
| Contact No. | Contact Details | String | ✓ | |
| Email | Contact Details | String(email) | ✓ | |
| Website | Contact Details | String | — | |
| Toll-Free No. | Contact Details | String | — | |
| ECC No. | Contact Details | String | — | |
| LUT No. | Contact Details | String | — | |
| LUT Validity Date | Contact Details | Date | — | MM/DD/YYYY |
| SEZ | Contact Details | Boolean | — | Special Economic Zone flag |

---

# FORM: Super Admin → Organization → Org Pricing  (subscription window per org)

- **Captured:** 2026-06-26. Org admin tab **Org Pricing**.
- **Business meaning (product owner):** **every org created auto-creates an Org Pricing entry**; this controls the
  org's **subscription start & end** dates (i.e. when the org's access is active/expires).
- **Prior parity:** F-0002 (grid columns), **F-0038** (End Date editable on every record incl. default — **accepted
  as legacy-correct**, so editable End Date is the expected behavior, not a bug).

### Org Pricing grid
- Columns: **Org Name · First Name · Email · Txn Id · Plan Name · Created By · Updated By · Phone · Product Info · Action (⋮)**.

### Edit Org Pricing — fields (Primary Details)
| Field (label) | Datatype | Editable | Notes |
|---|---|---|---|
| Org Name | display | read-only | e.g. "Zoom Inc" |
| Plan Name | display | read-only | e.g. "Yearly" |
| Product Info | display | read-only | e.g. "Yearly plan" |
| Start Date | Date | read-only | subscription start (e.g. 04/16/2020) |
| End Date | Date | **editable** | subscription end (e.g. 12/31/2030) — only editable field (F-0038). |
- **Actions:** Cancel · Update.

---

# FORM: Super Admin → Organization → Roles  (define user roles)

- **Captured:** 2026-06-26. Org admin tab **Roles**.
- **Business meaning (product owner):** define roles, scoped by a **Group** (the user-population the role serves):
  - **Company** — the raptech customer's own users (the org that set up the ERP). Most roles.
  - **Supplier** — the customer's **suppliers** who log into the ERP to check POs and do **ASN** (advance ship notice).
  - **Customer** — the customer's **customers** who log in to check their orders and other enabled functions.
- **Prior parity:** F-0035 (grid Active shows Inactive), F-0045 (duplicate role name leaks raw SQL error — legacy
  validates), F-0004 (Role Details read-only), F-0036 (Role Permissions save blocked by mandatory disabled tab).

### Roles grid
- Columns: **Role Name · Group · Status · Action** (Edit ✏ + Role-details/permissions icon).

### Add Role — fields
| Field (label) | Datatype | Req | Notes |
|---|---|---|---|
| Group | Enum (Company / Supplier / Customer) | ✓ | the user-population the role applies to |
| Role Name | String | ✓ | unique per org (F-0045 — legacy blocks duplicates) |
- **Actions:** Cancel · Create.

---

# FORM: Super Admin → Organization → Role Permissions  (per-role, per-module permissions)

- **Captured:** 2026-06-26 (selectors only; permission matrix not yet captured).
- **Business meaning:** pick a **Role** + a **Module**, then grant/revoke permissions for that role within the
  module; **Save/Update** persists. (Companion to Roles tab.)
- **Prior parity:** F-0036 (save blocked by mandatory disabled "My Dashboard" tab — fixed), TC-RPERM-001 roundtrip.

### Fields
| Field (label) | Datatype | Notes |
|---|---|---|
| Roles | Enum(FK→Role) | select the role to edit (e.g. Admin) |
| Module | Enum | select the module; **then the permission matrix loads** (not in this capture) |
- **Module options (top-level app modules):** Purchase To Pay · Record To Report · Admin Setting · Main ·
  Lead To Quote · Order To Cash · … (scrollable — more below the fold). Maps to the sidebar groups
  (Main, Lead-to-Quote, Order-to-Cash, Purchase-to-Pay) + Record-To-Report + Admin-Setting.
- **Action:** Save/Update.

### Permission matrix (loads after Role + Module) — structure captured 2026-06-26
- **Hierarchy:** Module → **Menu** → **Tab** → **Sub Tab**. Top of matrix has a **Hide Menu** checkbox; each
  **Menu** has its own enable checkbox; each Tab/Sub-Tab row exposes **5 permission checkboxes**:
  **Add · Edit · View · Export · Delete**.
- **Per-action granularity:** actions are independently toggled — e.g. many tabs have **Delete unchecked** by
  default; some GRN/SDN sub-tabs have **Export unchecked**. So a role can have View+Edit but not Delete/Export.
- **Doubles as a screen inventory:** the menu/tab/sub-tab tree per module IS the app's screen map for that module.
- F-0036 ("My Dashboard" mandatory disabled tab blocking save) lives in this matrix (Module-Main).

#### Module = Purchase To Pay — menu/tab tree (captured)
- **Menu - Suppliers:** Tab - Suppliers · Tab - Supplier Users
- **Menu - Sourcing:** Tab - RFQS · Tab - Supplier Groups
- **Menu - Contracts:** Tab - Contracts · Tab - Tracking · Tab - Library
- **Menu - Purchase Orders:** Tab - MultiSupplier Purchase Requisitions · Tab - Purchase Requisitions ·
  Tab - Purchase Orders · Sub Tab - Purchase Orders-Line Items · Tab - Purchase Indents-Pending · Tab - Supplier ASNs
- **Menu - Inventory Inbound:** Tab - Put Away · Tab - Reorder Stocks · Tab - Movable Asset To Receive - By User
  (+ Sub Tabs: Asset To Receive (Ack)/(Ready Dispatch) - By User) · Tab - Material To Receive - By User
  (+ Sub Tabs: Material To Receive (Ack)/(Dispatch) - By User) · Tab - Material To Return (+ Sub Tabs:
  To Return/Received · Returned · Material To Return Line Items(Admin)) · Tab - Movable Asset To Return
  (+ Sub Tabs: To Return/Received · Returned · Project Code - Pivot · Asset To Return Line Items(Admin)) ·
  Tab - Gate Entry · Tab - GRN/SDN-Pending (+ Sub Tabs: GRN Pending · SDN Pending · GRN Pending-Gate Entry
  Completed) · Tab - GRN/SDN (+ Sub Tabs: GRN Completed · SDN Completed) · Tab - Stocks On Hand (+ Sub Tabs:
  Grn Stock Inspections-Pending · Production Stock Inspections-Pending · Location Changes Items) ·
  Tab - Stock Inspections · Tab - Material To Receive (+ Sub Tabs: Acknowledge · Stock Ready to Dispatch) ·
  Tab - Movable Asset To Receive (+ Sub Tabs: Acknowledge. · Materials Ready to Dispatch) · Tab - A/P Debit Notes
- **Menu - Purchase Invoices:** Tab - Purchase Invoices · Tab - Purchase Invoices Matching
- **Menu - Accounts Payables:** Tab - Payables Outstanding · Tab - Payables Advances · Tab - Direct Payments · Tab - A/P Credit Notes

#### Module = Record To Report — menu/tab tree (captured)
- **Menu - Reports-Taxes:** Tab - TDS/WHT-Pending
- **Menu - Expenses:** Tab - Reimbursements · Tab - Expenses · Tab - Travel Requests-Pending · Tab - Verify Expenses
  (+ Sub Tabs: Mileage · Expenses · Advance / Claim · Bills)
- **Menu - Journals:** Tab - Journals
- **Menu - Reconcile:** Tab - Depreciation Posting · Tab - Depreciation Items · Tab - Reconciliation ·
  Tab - Transaction History · Tab - Account Transfer
- **Menu - Reports:** Sub Tab - Mobile Stock On Hand Report · Tab - Standard Reports · Tab - Purchase
  (+ Sub Tabs: Purchase Order - Pivot · Supplier Creation - Pivot · Purchase - Dashboard) · Tab - Sales Standard
  Report (+ Sub Tabs: Sales Order Status · Quotation - Dashboard · Sales Invoice - Pivot · Sales Order - Dashboard ·
  Sales Invoice - Dashboard · Lead - Dashboard · Credit Notes · Leads - Pivot · Orders Awaiting Pickup Status
  Report · Opportunity - Pivot · Customer Invoice Summary - Pivot · Sales Quotation - Pivot · Customer Creation -
  Pivot · Rental Order - Pivot · Sales Analysis Report · Sales Quotes.. · Sales Orders) · **Tab - Inventory**
  (+ large Sub-Tab set: COGS-WAC Gross Profit Report · Stock Movement Report (+ Stock Movement - Dashboard) ·
  Marathon - DashBoard - By User (+ Point of Use) · Items In Multiple Warehouse · COGS Gross Profit Report ·
  Stock Adjust - Pivot · Material/Transfer Request - Pivot · GRN - Pivot · Item Vs Stock · MTTR and MTBF - Pivot ·
  Stock On Hand By Supplier · Stock Movement WAC Report · Spend by Manufacturer Report · Asset Request Pending
  Report · Reorder Report · Material Request Pending Report · Stock Adjust By Item - Pivot · Inventory Valuation
  Summary · Stock On Hand (+ Pivot) · Reorder Stocks · CEO DashBoard Report · Item Value By Project - Pivot ·
  Asset Maintenance Status - Pivot · Inventory - Dashboard · Goods Pending To Receive · GRN - Dashboard ·
  Inventory Aging Summary (+ By Item)) · **Tab - Taxes** (+ Sub Tabs: GST Report · TDS Report) ·
  **Tab - Accounts** (+ Sub Tabs: Expense - Pivot · Asset Depreciation - Pivot · GL Code - Pivot · Journal - Pivot ·
  Customer Activity Detail · Customer Statement · …)
- **Observation — customer-specific (bespoke) report sub-tabs:** the tree includes white-labelled per-customer
  reports — **Marathon** (Inventory Changes/Total Stock Value/Suggested Orders/Stock Details), **Dream a Dream**
  (Assets Stock On Hand), **Omni Pool** (Asset Location), **Alaska** (Orders Awaiting Pickup) — which are
  **unchecked at the Tab/Sub-Tab level for non-owning roles/orgs** (the leftmost row checkbox controls whether the
  screen exists for the role at all, independent of Add/Edit/View/Export/Delete). Parity note: these are
  customer-scoped screens; don't treat their absence for one org as a defect.
  - **Accounts (financial statements) sub-tabs (cont.):** A/R Aging · A/P Aging · Account Statement · Bank
    Reconciliation Statement · Business Overview · Manufacture Trial Balance / Profit-Loss / Balance Sheet ·
    Ledger Summary · Trial Balance (Opening/Closing) · General Ledger · Balance Sheet · Trial Balance · Day Book ·
    Profit/Loss · Balance Sheet (Schedule VI).
  - **Tab - Projects Standard Report:** Time Sheet · User View · Workflow Users · Attendance · Project Items
    Tracking - Pivot · Travel Request/Desk · Project Code Values · User Location Pivot.
  - **Tab - Production:** Production Schedule-Stages · Order Vs Stock · Log/Finished Items/Rejection - Pivot ·
    Process Management · Machine - Pivot · Order Cost · Summary · Order Aging · Workload Distribution · Forecast ·
    Item-wise Order Status · Skill Level Allocation · Task Delay · Resource Capacity - Pivot · Deviation - Pivot ·
    Order Taskwise Status - Pivot · Item Batch Status · Production Schedule - **Vulcanair Aircraft** (customer-specific) ·
    Production - Dashboard · Production Orders - Pivot.
  - **Tabs:** Sales. · Sales Invoice · Analytics. · Custom Reports.
- **Menu - Employee Expenses:** Tab - Travel Requests - By Project Code · Tab - Expense Requests · Tab - Travel Requests By User.
- ✅ **Record To Report module tree fully traversed (2026-06-26).** (Exact per-report names: screenshots are the
  source if a report-by-report coverage pass is needed; the permission model is identical for every row.)
#### Module = Admin Setting — menu/tab tree (captured) — the admin area mapped above
> This IS the Admin-Settings module we're cataloging form-by-form; it's the master index of admin screens
> (many map to existing findings/cases — noted inline).
- **Menu - Status:** Sales Orders · Sales Invoice(Status) · Sales · Lead Source · Lead Status · Quote Status ·
  Deal Stage · Lead Rating · Task(Status) · Booking Status · Booking Quota & Advise · Travel Itinery ·
  Booking Sourse · Mode of Travel · Asset Return Status · Status · Agents Details (TC-SALES-003 / F-0028/F-0051)
- **Menu - Admin-Production:** Rejection Reason · Production Resources · Production Tasks · Production Task Template ·
  (Sub) Task Delay Reason · Production Machine · Tool
- **Menu - Organization:** Organization (tab unchecked) · Addresses (TC-ADDR / F-0015) · Market Segment (F-0014/F-0047) ·
  Line of Business · Data Migration (unchecked) · Org Pricing (unchecked)
- **Menu - Users:** Employees (TC-EMP) · Users (TC-USER / F-0013/F-0040..44)
- **Menu - Workflows:** Approval Flows
- **Menu - Form Templates:** Line Item Templates (TC-FT-LIT) · Grid Form Templates (TC-FT-GFT) · Form Templates (TC-FT) ·
  Global Custom Fields (TC-FT-GCF / F-0053) · Stagewise Custom Fields (TC-FT-SCF / F-0023)
- **Menu - Admin-Items:** Item Categories · UOM (TC-OUI-ITEM-DETAIL / F-0052)
- **Menu - Admin-Inventory:** Inventory Ledger · BarCode Print Format (TC-BC / F-0037) · Warehouses · Locations
- **Menu - Admin-Planning:** Activities · Resources · Resource Capacities (TC-PROD-CP / F-0029/F-0054)
- **Menu - Admin-Inspections:** Inspection Items Parameters · Inspection Parameters (TC-INSP)
- **Menu - Admin-Projects:** Project Code with BOQ Sequence · Project Code Sequence · Side Code Sequence
- **Menu - Admin-Delivery:** Vehicle Master (TC-DEL-VM) · Transporter Vehicles (TC-DEL-TV) · Labelling (TC-DEL-LB / F-0025)
- **Menu - Admin-Contracts:** Admin-Contract Services (tab unchecked) · Master · D & O Categories (TC-CON / F-0054)
- **Menu - General:** Email Config (TC-GEN-EC) · Transaction Date Lock (TC-GEN-DL / F-0020) · Currency Exchanges
  (TC-GEN-CE / F-0022) · Finacial Year [sic] (TC-GEN-FY / F-0021)
- **Menu - Ledgers:** Expense Category (F-0055) · Account Mapping · Account Opening Balance (TC-LED-OB / F-0030/F-0056)
- **Menu - Taxes:** Tax Rates (TC-TAX / F-0026/F-0027/F-0041) · TDS/TCS · Org Tax Mapping (TC-TCM / F-0010)
- **Menu - Cost Centers:** Cost Centers (TC-CC)
- **Menu - Banks:** Banks (TC-BANK)
- **Menu - CRM:** CRM
- **Menu - HRMS:** HRMS
- **Menu - Sellers Api → Menu - Integrations:** Integrations · Purchase Invoice Integration
- **Menu - Data Upload:** Data Upload
- **Menu - Analytics:** Analytics
- ✅ **Admin Setting module tree fully traversed (2026-06-26)** — serves as the master index of admin screens.

#### Module = Main — menu/tab tree (captured)
- **Menu - Pricing:** Tab - Pricing — **menu + tab UNCHECKED for Admin** (cf. F-0039 "Pricing" dead link).
- **Menu - My Dashboard:** Tab - My Home · Tab - My Dashboard (F-0036 mandatory "My Dashboard" tab lives here).
- **Menu - My Task:** (Menu) Production Tracking · Tab - Meetings · Sub Tab - Lead · Sub Tab - Deals ·
  Sub Tab - Sales Quotes · Tab - Tasks · Sub Tab - Sales Quotes. · Sub Tab - Deals. · Sub Tab - Lead. · Tab - Approvals
- **Menu - Item:** Tab - Items · Tab - Price Lists-Purchase · Tab - Price Lists-Sales · Tab - Bundles · Tab - BOMs
  (this is the **Items** area we cataloged the item-type forms from — Items / Price Lists / Bundles / BOMs tabs).
- ✅ **Main module tree captured (2026-06-26).**

#### Module = Lead To Quote — menu/tab tree (captured)
- **Menu - Deals:** Tab - Deals · Tab - Deals - By User
- **Menu - Leads:** Tab - All Leads By User Entity · Tab - My Leads · Tab - All Leads
- **Menu - Prospects:** Tab - Prospects (TC-OUI-MSEG / prospects forms)
- **Menu - Cost Estimates:** Tab - Manufacturer Cost Estimates · Tab - BOQs · Tab - Cost Estimates ·
  Sub Tab - Cost Estimates - By Project Code · Sub Tab - Convert BOQs
- **Menu - Sales Quotes:** Tab - Sales Quotes · Sub Tab - Sales Quotes - By Project Code ·
  Sub Tab - Convert Cost Estimates · Tab - Sales Quotes-User
- ✅ **Lead To Quote module tree captured (2026-06-26).**

#### Module = Order To Cash — menu/tab tree (captured)
- **Menu - Customers:** Tab - Customer Users · Tab - Customers
- **Menu - Sales Orders:** Tab - Sales Order · Sub Tab - Convert Sales Quotes · Sub Tab - Master Sales Orders ·
  Tab - Sales Order-User · Sub Tab - Sales Order - Track  *(the Sales Order section originally targeted; credit-limit
  param 69 / F-0024 lives in this flow)*
- **Menu - Planning:** Tab - Production ForeCast · Tab - MRP · Tab - Sales Target · Tab - Views
- **Menu - Production:** Production Scheduler · Production Assigned Tasks (Admin / User) · Schedular Job
  (Truck And Trans) · Re Schedular Job (Truck And Trans) · Schedular Job · Direct Production (+ Sub: Time Sheet) ·
  Production Orders (+ Subs: Production Schedule · Time Sheet · Routing-Pending · Order(NI)) · Inspection-Finished
  Goods · Packing-Finished Goods (+ Subs: Packing-SO · Packing-Shipping Invoice · Inspections-Completed ·
  Production Orders-Completed · Packing(NI)-Pending)
- **Menu - Projects:** Tab - My Team · Tab - Attendance - By User (unchecked) · Tab - Project Track ·
  Tab - Attendance · Tab - Projects · Sub Tab - Time Sheets
- **Menu - Inventory Outbound:** Direct Material Deliveries · PickList (+ Subs: Materials Delivered-Line Items ·
  Asset Delivered-Line Items · Sales Invoices-Line Items) · Movable Asset Deliveries · Asset Maintenance
  (+ Subs: Asset Maintenance · Pending-and-Complete · Asset Service Required) · Material Requests-Pending ·
  Movable Asset Requests-Pending · Material Deliveries · W2W Stock Transfers (+ Sub: Transfer Requests-Pending) ·
  W2W Asset Transfers (+ Sub: Transfer Requests-Pending)
- **Menu - (Reserve Stocks / Inventory Outbound cont.):** Tab - Reserve Stocks (+ Subs: Sales Order - Reserve
  Stocks · Production Order - Reserve Stocks) · Tab - Purchase Indents · Tab - A/R Credit Notes. (+ Sub:
  A/R Credit Note - User [unchecked]) · Tab - Material Requests · Tab - Movable Asset Requests
- **Menu - Delivery:** Tab - Sales Orders - Pending (+ Subs: Sales Orders - Non Reserved Stocks. ·
  Sales Orders - Reserved Stocks.) · Tab - Packing · Tab - Delivery Notes (+ Sub: Delivery Notes - Line Items) ·
  Tab - Shipping Invoices  *(Delivery/Labelling: F-0025)*
- **Menu - Sales Invoices:** Tab - Sales Invoice(POS) [unchecked — F-0033 POS invoice types] ·
  Tab - Delivery Notes - Pending · Tab - Sales Orders-Pending (+ Subs: Non Reserved Stocks · Reserved Stocks) ·
  Tab - Sales Invoices (+ Subs: Sales Invoices - Recurring · Sales Invoices-Line Items)
- **Menu - Accounts Receivables:** Tab - Receivables · Tab - Receivables Advances · Tab - Direct Receipts ·
  Tab - A/R Credit Notes
- ✅ **Order To Cash module tree captured (2026-06-26).**

### ✅ ALL 6 module permission trees captured (2026-06-26) — complete app screen inventory
Purchase To Pay · Record To Report · Admin Setting · Main · Lead To Quote · Order To Cash. Together these are the
full Menu→Tab→SubTab screen map of the app, each screen permissioned by Add/Edit/View/Export/Delete (+ tab-level
visibility + Hide Menu). Use as the master coverage checklist for module parity testing.

---

# FORM: Super Admin → Organization → Data Migration  (reference-list cache refresh)

- **Captured:** 2026-06-26. Org admin tab **Data Migration**.
- **Business meaning (product owner):** refreshes/reloads **reference lists into the cache**. These lists are
  served from cache (not hitting the DB on every request). **Legacy used Redis**; **migrated uses a different
  cache** (per-JVM Caffeine — see **F-0011**, *accepted* as correct: single independent app node per region with
  its own DB+cache). Selecting a list type + **Submit** reloads that list.
- **Prior parity:** F-0011 (cache architecture — accepted), TC-DM-001 (data migration cache refresh).

### Fields
| Field (label) | Datatype | Req | Notes |
|---|---|---|---|
| Data Migration | Enum | ✓ | the reference list to reload into cache |
- **Data Migration options (cached reference lists):** Country · Currency · Function · GL Code Hierarchy ·
  Item Category · Suppliers · Supplier Planning · UOM.
- **Action:** Submit.

---

# FORM: Super Admin → Organization → Item Formula  (line-item price/qty formula engine)

- **Captured:** 2026-06-26. Org admin tab **Item Formula**.
- **Business meaning (product owner):** define formulas for **Price** and **Qty** per transaction context
  (Costing, Quotation, Sales Order, Purchase Order). These formulas are applied in each transaction's
  **line-item grid** to **auto-derive the price and quantity** from the item's custom attributes + base values.
- **Prior parity:** F-0005 (formula defined but engine was missing — wired separately via jxl→jexcel),
  F-0046 (item_formula identity sequence behind table max — save fails), TC-IF-001/002/003.

### Controls & grid
| Element | Datatype | Notes |
|---|---|---|
| Item Formula By | Enum (**Price** / **Qty**) | switches the formula set AND the last grid row (see below) |
| Formula Hints | display (red) | example syntax — Price: `(({QTY}*{BUY_PRICE})+{attr_id_0})`, `(({QTY}*{attr_id_0}*{BUY_PRICE})/100)` · Qty: `(({attr_id_0}*{100})+{attr_id_0})` |

**Grid — rows = item attributes; columns = per-context (enable checkbox + Formula text [+ status col]):**
- **Rows (Price mode):** Color (`attr_id_431`) · Capacity (`attr_id_802`) · Zone (`attr_id_1107`) ·
  Wastage (`attr_id_1616`) · **Amount (`NET_PRICE`)**.
- **Rows (Qty mode):** same attributes + **Calculated Qty (`CALCULATED_QTY`)** as the last row (instead of Amount).
- **Columns (each a checkbox + a `<context> Formula` text field, plus a status sub-column):**
  **Costing** · **Quotation** · **Sales Order** · **Purchase Order**.
- **Formula tokens:** `{QTY}`, `{BUY_PRICE}`, `{attr_id_N}` (an item attribute), numeric constants like `{100}`,
  and the calculated outputs `NET_PRICE` / `CALCULATED_QTY`.
- **Action:** Save/Update.
- ⏳ Note: columns extend off-screen (horizontal scroll) — Quotation/Sales Order/Purchase Order Formula columns
  partly captured; the model (checkbox + formula per context per attribute) is confirmed.

---

# FORM: Super Admin → Organization → Tax Country Mapping  (geography-based tax determination)

- **Captured:** 2026-06-26. Org admin tab **Tax Country Mapping**.
- **Business meaning (product owner):** the ERP serves **global organizations**, so tax is defined by
  **geography (From → To)** and **module**; **every module refers to this mapping** to determine the applicable
  tax on a transaction. E.g. intra-state India → SGST/CGST, inter-state India → IGST, US state → GST/VAT.
- **Prior parity:** F-0010 (grid columns — Business Type rendered "0", extra Action column; fixed), TC-TCM-000.

### Tax Country Mapping grid
- Columns: **Module · From Country · To Country · From State · To State · From City · To City · Group Id ·
  Tax Type · Action**. Search · pagination ("1 to 100 of 367", Page 1 of 4) · **+ New** · export.
- Example rows: Sales US Ohio→Ohio GST · Purchase India Tamil Nadu→Tamil Nadu SGST/CGST · India Kerala→Karnataka
  IGST · US Arizona→Arizona VAT.

### Add Tax Country Mapping — fields
| Field (label) | Section | Datatype | Req | Notes |
|---|---|---|---|---|
| Tax Type | Tax Details | Enum(FK) | ✓ | |
| Group Tax | Tax Details | Enum(FK) | ✓ | the tax group (GST/IGST/SGST-CGST/VAT…) |
| Module | Tax Details | Enum (Sales/Purchase) | ✓ | which module the rule applies to |
| Supplier/Customer Type | Tax Details | Enum(FK) | — | further scope by party type |
| From Country | From Details | Enum(FK) | — | origin geography |
| From State | From Details | Enum(FK) | — | |
| From City | From Details | Enum(FK) | — | |
| To Country | To Details | Enum(FK) | — | destination geography |
| To State | To Details | Enum(FK) | — | |
| To City | To Details | Enum(FK) | — | |
- **Actions:** Cancel · Submit.
- Note: "ANY" is a valid value for state/city (wildcard match), per the grid.

---

# FORM: Super Admin → Organization → Sequence Number  (set running/current counter per entity)

- **Captured:** 2026-06-26. Org admin tab **Sequence Number**.
- **Business meaning (product owner):** when **onboarding a customer who already has document numbers running**
  (PO, SO, etc.) and doesn't want the system to restart at 001, this sets the **starting / current number** per
  sequence key. Distinct from *Add Sequence* (which defines the number **format + print template**) — this sets
  the **counter value**.
- **Relation:** complements the Entity → Add Sequence form + the auto-gen org params (82 Item No, 87 Customer ID,
  88 Supplier ID, 83 Invoice No, Entity Based Sequence 10021).

### Controls & grid
| Element | Datatype | Req | Notes |
|---|---|---|---|
| Entity | Enum(FK) | ✓ | scope — Organization or a specific entity |

**Current Sequence grid:** columns **Sequence Key Name · Starts With · Current No.** (Current No. is the
editable running counter — clickable values).
- **Sequence keys (captured):** PO Request Seq · PO No Seq · Workorder Request Seq · Workorder No Seq ·
  Material Request Seq · Movable Asset Request Seq · Material Delivery Note No Seq · Movable Asset Delivery Note
  No Seq · Sales Invoice No Seq · Supplier ID Seq · Customer ID Seq · Sales Invoice to DC No Seq ·
  Item No Auto Gen Seq · GRN No Seq · Sales Quote Request Seq · Sales Quote No Seq ·
  Sales Invoice No - Non Taxable Seq · Purchase Indent Request Seq · A/P Debit Note No Seq · …(continues)
- "Starts With" = 1 for all; "Current No." varies (e.g. PO Request 612, PO No 161, Customer ID 2000, Item No Auto Gen 889).

---

# FORM: Super Admin → Organization → Barcode  (bulk barcode sticker printing)

- **Captured:** 2026-06-26. Org admin tab **Barcode**.
- **Business meaning (product owner):** **bulk-print barcode stickers** — upload an xls of **barcode numbers +
  descriptions**, and the system outputs a **PDF of barcodes** to print.
- **Prior parity:** F-0037 (barcode create button label), TC-BC.

### Fields
| Field (label) | Datatype | Req | Notes |
|---|---|---|---|
| (sample xls) | link | — | "Download a sample xls file" — the import template |
| Upload File | File (xls) | ✓ | barcode numbers + descriptions |
| Barcode → Print Barcode | action | — | generates the printable **PDF** of barcodes |

---

# FORM: Admin-Settings → Users  (grid + Create/Edit User)

- **Captured:** 2026-06-26. The second **Admin-Settings** menu item (alongside Organization).
- **Business meaning:** create/manage the org's login users — entity scope, credentials, role assignment,
  office/field + mobile/web access.
- **Prior parity (heavily tested):** F-0012 (grid extra cols Department/Designation — accepted), F-0013 (org/entity
  mapping persisted), F-0040 (grid org-scoped), F-0041 (entity dropdown for superadmin), F-0042 (Reset Pwd/Assign
  Report/Views removed from form → grid-only), F-0043 (Delete removed from form → grid-only), F-0044 (Reporting
  Manager entity-filtered). TC-USER-000/001, TC-UIP-18..22.

### Users grid
- Columns: **Entity · Emp ID · First Name · Last Name · User ID · Email · Role · Department · Action (⋮)**.
  (Role may be multi-valued, comma-separated.) Search · pagination · **+ New** · export.
- **Action (⋮) menu:** Edit User · User Details · Reset Password · Delete User · Assign Report · Assign Views.
  (Reset Pwd / Assign Report / Assign Views / Delete are **grid-only** per F-0042/F-0043.)
- Legacy tech hint: `javascript:editUser(<id>)`.

### Create/Edit User — fields
| Field (label) | Section | Datatype | Req | Notes |
|---|---|---|---|---|
| Entity | Primary Details | Enum(FK, multi "Select options") | ✓ | owning entity/entities (F-0041 dropdown) |
| User ID | Primary Details | String | ✓ | login id |
| Password | Primary Details | String | ✓ | rule: 8 char, A-Z, a-z, 1 special, 0-9 (e.g. Abcd@123) |
| Confirm Password | Primary Details | String | ✓ | must match |
| All View Access | Primary Details | Boolean | — | |
| Password Strength | Primary Details | indicator | — | live strength meter |
| User Type | User Details | Radio (Office / Field) | — | default Office |
| User Access | User Details | Radio (Both / Mobile / Web) | — | default Web; ties to mobile-limit 128 / creation-limit 102 |
| First Name | User Details | String | ✓ | |
| Last Name | User Details | String | — | |
| Email | User Details | String(email) | ✓ | |
| Contact No. | User Details | String | ✓ | |
| Department | User Details | String | — | |
| Designation | User Details | String | — | |
| Reporting Manager | User Details | Enum(FK) | — | entity-filtered (F-0044) |
| Upload Image | User Details | File | — | + Uploaded Image display |
| Signature Image | User Details | File (JPEG/JPG/PNG/GIF, 185×100px) | — | |
| Roles | Roles | Multi-select (Search/Select Roles) | — | a user can hold multiple roles |
- **Actions:** Cancel · Create.

---

# FORM: Admin-Settings → Organization → Addresses  (customer billing/shipping addresses)

- **Captured:** 2026-06-26. **In-app customer-admin** Admin-Settings area (full sidebar: Organization, General,
  Users, Workflows, Form Templates, Items, Inventory, Planning, Inspections, Projects, Delivery, Contracts,
  Ledgers). Distinct from the **super-admin** Organization tab (which manages orgs/entities/pricing).
- **Admin-Settings → Organization sub-tabs:** **Addresses** · Market Segment · Line of Business · Data Migration.
- **Business meaning (product owner):** maintain the raptech customer's **billing and shipping addresses**.
- **Prior parity:** F-0015 (grid extra cols Updated Date/Status — accepted), TC-ADDR-000/001.

### Addresses grid
- Columns: **Address Name · Address 1 · Address 2 · PAN No. · GSTIN · VAT No. · Contact Name · Created Date ·
  Update · Action (⋮)**. Search · pagination · **+ New** · export.

### Add Address — fields
| Field (label) | Section | Datatype | Req | Notes |
|---|---|---|---|---|
| Address Name | Primary Details | String | ✓ | |
| Same As Organization Address | Primary Details | Boolean | — | copies org address |
| Address 1 | Address Details | String | ✓ | |
| Address 2 | Address Details | String | — | |
| Country | Address Details | Enum(FK) | ✓ | |
| State | Address Details | Enum(FK) | ✓ | |
| City | Address Details | String | ✓ | |
| Postal Code | Address Details | String | — | |
| GSTIN | Address Details | String (pattern 00AAAAA0000A1Z0) | — | |
| PAN | Address Details | String (pattern AAAAA0000A) | — | |
| VAT No. | Address Details | String | — | |
| Address Type | Address Details | Enum(FK) | — | (e.g. billing/shipping) |
| First Name | Contact Details | String | — | |
| Last Name | Contact Details | String | — | |
| Contact No. | Contact Details | String | — | |
| Email | Contact Details | String(email) | — | |
- **Actions:** Cancel · Create.

---

# FORM: Admin-Settings → Organization → Market Segment  (customer-form dropdown master)

- **Captured:** 2026-06-26.
- **Business meaning (product owner):** defines the **dropdown values for the Market Segment field on the Customer
  form** (master data for customer segmentation).
- **Prior parity:** F-0014 (grid header "Regional Name" vs legacy "Segment Name"), F-0047 (form field labeled
  "Regional Name" vs legacy "Segment Name") — **legacy = "Segment Name"** (golden master), migrated must match.
  TC-MSEG-000, TC-OUI-MSEG-1.

### Market Segment grid
- Columns: **Segment Name · Created Date · Updated Date · Action (⋮)**. Search · pagination · **+ New** · export.

### Add Market Segment — fields
| Field (label) | Datatype | Req | Notes |
|---|---|---|---|
| Segment Name | String | ✓ | legacy label "Segment Name" (NOT "Regional Name" — F-0047) |
- **Actions:** Cancel · Create.

---

# FORM: Admin-Settings → Organization → Line of Business  (customer-form dropdown master)

- **Captured:** 2026-06-26. Last Admin-Settings → Organization sub-tab.
- **Business meaning (product owner):** defines the **dropdown values for the Line of Business field on the
  Customer form** (e.g. Manufacturing, Finance/Accounting, IT Services, Consulting, HR Services…).
- ⚠️ **Label mismatch to verify:** the tab/grid + breadcrumb say **"Line of Business"**, but the **create form
  field is labeled "Function Name"**. Confirm legacy label; if legacy says "Line of Business", migrated's
  "Function Name" is a finding (same class as F-0047 Market Segment "Regional Name").

### Line of Business grid
- Columns: **Line of Business · Created Date · Updated Date · Action (⋮)**. Search · pagination · **+ New** · export.
- Seeded values: Manufacturing · Training & Development · Finance / Accounting · Marketing & Advertising ·
  Procurement / Supply Chain · Human Resources (HR Services) · Facilities Management · Consulting · IT Services.

### Create Line of Business — fields
| Field (label) | Datatype | Req | Notes |
|---|---|---|---|
| Function Name | String | ✓ | ⚠️ labeled "Function Name" but the entity is "Line of Business" — verify vs legacy |
- **Actions:** Cancel · Create.

---

# FORM: Admin-Settings → General → Currency Exchanges  (FX rate master)

- **Captured:** 2026-06-26. **Admin-Settings → General** sub-tabs: **Transaction Date Lock · Currency Exchanges ·
  Financial Year · Email Configuration**.
- **Business meaning (product owner):** maintain **currency exchange rates** — used when the **entity/accounting
  currency differs from the purchase/sale currency**. On a transaction the user can **enter the rate directly**
  OR it is **pulled from this master**.
  - **Date is NOT mandatory.** A row **without a date = the DEFAULT rate** for that currency pair (used when no
    dated rate applies).
  - A row **with a date** = the rate applied to **transactions made on that date** (date-specific override).
  Rates can be updated **daily** (multiple dated rows per currency pair).
- **Prior parity:** F-0022 (create/edit 400 — @ModelAttribute name collided with `exchangeRate` field; fixed by
  renaming model attr to `exchangeRateForm`), TC-GEN-CE-000/001.

### Currency Exchanges grid
- Columns: **From Currency · To Currency · Date · Rate · Created Date · Created By · Updated Date · Updated By ·
  Action (⋮)**. Search · pagination · **+ New** · export.

### Add Currency Rate — fields
| Field (label) | Datatype | Req | Notes |
|---|---|---|---|
| From Currency | Enum(FK) | ✓ | |
| To Currency | Enum(FK) | ✓ | |
| Currency Rate Date | Date | — | **NOT mandatory.** Blank → DEFAULT rate for the pair; dated → rate for transactions on that date. |
| Currency Rate | Decimal | ✓ | the exchange rate (F-0022 model-attr `exchangeRateForm`) |
- **Actions:** Cancel · Submit.

---

# FORM: Admin-Settings → General → Financial Year  (per-entity financial years)

- **Captured:** 2026-06-26.
- **Business meaning (product owner):** define the **financial year(s) for each entity** (start/end + opening date
  used for accounting periods / opening balances).
- **Prior parity:** F-0021 (grid header "Entity Alias" vs legacy "Entity" + extra Status column — accepted),
  TC-GEN-FY-000/001.

### Financial Year grid
- Columns: **Entity Alias · Start Date · End Date · Created By · Created Date · Updated By · Updated Date ·
  Opening Date · Action (⋮)**. Search · pagination · **+ New** · export.

### Add Financial Year — fields
| Field (label) | Datatype | Req | Notes |
|---|---|---|---|
| Entity Alias | Enum(FK→Entity) | ✓ | the entity the FY belongs to |
| Start Date | Date | ✓ | FY start (MM/DD/YYYY) |
| End Date | Date | ✓ | FY end |
| Opening Date | Date | ✓ | opening-balance date for the FY |
- **Actions:** Cancel · Submit.

---

# FORM: Admin-Settings → General → Transaction Date Lock  (block entries in a date window)

- **Captured:** 2026-06-26.
- **Business meaning (product owner):** define a **lock window (from → to)** per entity during which the system
  **will NOT allow any transactions to be entered**. Used for **financial-year closing** — no new entries during
  the locked days.
- **Downstream rule (assert in module tests):** attempting to create a transaction dated within a locked window
  must be **blocked** with an error; outside the window it's allowed.
- **Prior parity:** F-0020 (grid header "Entity Alias" vs legacy "Entity" — accepted), TC-GEN-DL-000/001.

### Transaction Date Lock grid
- Columns: **Entity Alias · Lock Date · Created By · Created Date · Updated Date · Updated By · Status · Action (⋮)**.
  Search · pagination · **+ New** · export.

### Add Transaction Date Lock — fields
| Field (label) | Section | Datatype | Req | Notes |
|---|---|---|---|---|
| Entity Alias | Primary Details | Enum(FK→Entity) | ✓ | entity the lock applies to |
| Lock Date | Lock Date Details | Date | ✓ | start of lock window |
| End Lock Date | Lock Date Details | Date | ✓ | end of lock window |
- **Actions:** Cancel · Create.

---

# FORM: Admin-Settings → Users → Employees  (HR employee master)

- **Captured:** 2026-06-26. The **Users** menu has two tabs: **Users** (login accounts) + **Employees** (HR
  records). **Employees** has a sub-tab **Employees Custom Fields**.
- **Distinction:** *Users* = login credentials/roles; *Employees* = HR personnel records (an employee need not be
  a user). Relates to HRMS (param 10002).
- **Prior parity:** TC-EMP-000 (grid), TC-EMP-001 (lifecycle), TC-EMP-CF-001 (employee custom fields).

### Employees grid
- Columns: **Entity Alias · Emp ID · First Name · Last Name · Created By · Created Date · Updated By ·
  Updated Date · Status · Action (⋮)**. Search · pagination · **+ New** (with split-button for bulk) · export.

### Create Employee — fields
| Field (label) | Section | Datatype | Req | Notes |
|---|---|---|---|---|
| Entity Alias | Primary Details | Enum(FK, multi) | ✓ | |
| Emp ID | Primary Details | String | ✓ | |
| First Name | Personal Details | String | ✓ | |
| Last Name | Personal Details | String | — | |
| Gender | Personal Details | Enum | — | |
| Marital Status | Personal Details | Enum | ✓ | |
| Date Of Birth | Personal Details | Date | ✓ | |
| Contact No. | Personal Details | String | ✓ | |
| Personal Email ID | Personal Details | String(email) | ✓ | |
| Aadhaar No. | Personal Details | String | — | (India ID) |
| PAN No. | Personal Details | String | — | |
| Passport No. | Personal Details | String | — | |
| Communication Address | Personal Details | Text | ✓ | |
| Residential Address | Personal Details | Text | — | |
| Blood Group | Personal Details | Enum | ✓ | |
| Date Of Joining | Official Details | Date | ✓ | |
| Previous Experience | Official Details | Decimal | — | |
| Total Years of experience | Official Details | Decimal (computed) | — | display (0) |
| Official Email ID | Official Details | String(email) | ✓ | |
| Department | Official Details | Enum(FK) | ✓ | |
| Designation | Official Details | Enum(FK) | ✓ | |
| Reporting Manager | Official Details | Enum(FK) | — | |
| Base location | Official Details | String | ✓ | |
| Emp. Status | Official Details | Enum | ✓ | |
| Band | Official Details | Enum | — | |
| Emp. Rate Per Hour | Official Details | Decimal | — | |
| Phone Issued | Official Details | Enum (Yes/No) | ✓ | |
| Data Card Issued | Official Details | Enum (Yes/No) | ✓ | |
| Emergency Contact Name | Emergency Details | String | — | |
| Emergency Contact No. | Emergency Details | String | — | |
| Account No. | Bank Details | String | — | |
| Bank Name | Bank Details | String | — | |
| IFSC Code | Bank Details | String | — | |
| Branch Name | Bank Details | String | — | |
| Accounts | Account Related Details | Enum(FK) | — | GL account mapping (e.g. "employee") |
- **Actions:** Cancel · Submit.

### Employees Custom Fields sub-tab (Users → Employees → Employees Custom Fields)
- **Business meaning (product owner):** defines the **dropdown option values for the employee-form select
  fields** — e.g. **Type = "Employee Status"** → values Active / Full Time / Part time / Temporary / Seasonal /
  Leased; **Type = "Band"** → Band A–D; **Type = "Designation"** → Developer / Travel Incharger. So the
  Department/Designation/Emp.Status/Band dropdowns on Create Employee are populated from here.
- **Grid columns:** **Type · Field Name · Created By · Created Date · Updated By · Updated Date · Status · Action (⋮)**.
- **Create Employee Custom Field — fields:**
  | Field (label) | Datatype | Req | Notes |
  |---|---|---|---|
  | Field Name | String | ✓ | the dropdown option value |
  | Type | Enum | ✓ | which employee-form dropdown (Employee Status / Band / Designation / …) |
  - Actions: Cancel · **Add**.
- Prior parity: TC-EMP-CF-001.

---

# FORM: Admin-Settings → Workflows → Approval Flows  (jBPM approval engine)

- **Captured:** 2026-06-26.
- **Business meaning (product owner):** approvals run on a **jBPM engine**. Here you **define the approval flow**
  (stages, the role that performs each stage, mandatory flag); once a flow is defined, the system lets you
  **assign actual users** to the flow's stages (with due-days SLA). When a record's approval param is ON, creating
  it routes through the matching flow.
- **Prior parity:** F-0007 (customer-approval flow — `process_instance_id` NOT-NULL when a flow exists; param 147),
  param 147 Customer Approval gates customer creation through this.
- **Legacy tech hint:** `anchorTagSubmit('detailForm','/SCM/admin/workflowCreation.action', <id>)`.

### Approval Flows grid
- Columns: **Approval Type · Created Date · Updated Date · Status · Action (⋮)**. Search · pagination · **+ New** · export.
- **Action (⋮) menu:** Edit Approval Flow · Approval Flow Details · **Assign User to Approval Flow** · Delete Workflow Definition.
- **Approval Types (the entities that support approval, 41 total — captured sample):** Project Codes · Customers
  (param 147) · Contracts (Interpretations / Deliverable / Action / Issues / Contracts) · Direct Material Delivery ·
  Project Scheduling · Journal · A/R Credit Notes · Stock On Hand - Adjust Item · Travel Requests · Accounts Payable ·
  Obligations · Purchase Requisitions · … This list = the set of records that can be approval-gated.

### Create Approval Flow — fields (define the flow)
| Field (label) | Datatype | Req | Notes |
|---|---|---|---|
| Approval Type | Enum(FK) | ✓ | the entity to gate (e.g. Purchase Requisitions) |
| Stage 1 (enabled, locked) | — | — | **Stage 1 = Submission, mandatory & always on** |
| Stage N → Stage Name | String | — | per-stage label |
| Stage N → Role | Multi-select(FK→Role) | — | role(s) that perform the stage (Mobile User, Purchase approver, …) |
| Stage N → Mandatory | Boolean | — | whether the stage is required |
- Stages: Stage 1 (Submission, fixed) + Stage 2/3/4/… each toggled on via a checkbox. Actions: Cancel · Create.

### Assign User to Approval Flow — fields (assign users to a defined flow)
| Field (label) | Datatype | Req | Notes |
|---|---|---|---|
| Entity Alias | Enum(FK→Entity) | ✓ | |
| Approval Type | display | — | from the selected flow |
| Approval Name | String | — | |
| Stage N → Role | display (n selected) | — | the roles defined on the flow (read-back) |
| Stage N → User Registration Type | Multi-select(FK→User) | — | which **users** fulfill that stage's role |
| Stage N → Due Days | Integer | — | SLA / entry-cycle-time per stage |
- Actions: Cancel · Create.

---

# FORM: Admin-Settings → Form Templates  (dynamic attributes on document forms)

- **Captured:** 2026-06-26. **Form Templates** menu tabs: **Form Templates · Global Custom Fields · Stagewise
  Custom Fields · Line Item Templates · Grid Form Templates**.
- **Business meaning (product owner):** **add dynamic/custom attributes to document forms** (PO, SO, PR, etc.).
  This is the **source of the org-defined custom fields** seen on transaction forms (e.g. the Item form's "Other
  Details", PR/PO/SO custom fields). Select a **Template Type** (the document), then add fields.
- **Prior parity:** TC-FT-001 (form template CRUD), TC-FT-GCF/SCF/LIT/GFT, F-0053 (Global/Stagewise Custom Fields
  read-only detail), F-0023 (Stagewise Custom Field delete cascade).

### Form Templates tab
- **Template Type** (Enum) — selects the document form to customize (e.g. Purchase Requisitions, PO, SO…).
- **Field grid:** **Field Name · Data Type · Status · Action (edit ✏ / delete 🗑)**.
- **Add Field — fields:**
  | Field (label) | Datatype | Notes |
  |---|---|---|
  | Field Name | String | the attribute name |
  | Data Type | Enum | **Date · Drop Down · Text Area · Text Field · Memo** (+ Numeric, etc.) |
  | Mandatory | Boolean | required on the form |
  | PDF Field | Boolean | render on the printed PDF |
  | Searchable | Boolean | exposed in search |
  | Grid | Boolean | show as a grid column |
  - Actions: Cancel · **Add Field**.
- ⇒ These flags explain catalog properties elsewhere: a field's presence on PDF, in search, in grids, and its
  required marker all originate here per template type.

### Global Custom Fields tab (captured 2026-06-26)
- **Business meaning (product owner):** a **reusable** dynamic field shared **across documents** — e.g. the same
  dropdown should appear in **Sales Order AND Sales Invoice**; define it once here as a Global Custom Field. (The
  "Drop Down" fields added in Form Templates reference these for their options.)
- **Grid columns:** **Field Name · Created Date · Updated Date · Action (⋮)** (29 entries). Search · pagination · **+ New** · export.
- **Add Global Custom Field ("Dynamic Attributes Details") — fields:**
  | Field (label) | Datatype | Req | Notes |
  |---|---|---|---|
  | Field Name | String | ✓ | the reusable field name |
  | Option values → Values | String (grid) | ✓ | dropdown option value(s) — **+ Options** to add rows |
  | Option values → Descriptions | String (grid) | — | description per option |
  - Actions: Cancel · Create.
- Prior parity: TC-FT-GCF-001, F-0053 (read-only detail).

### Stagewise Custom Fields tab (captured 2026-06-26)
- **Business meaning (product owner):** define **custom fields per workflow STAGE** — built for **Sales Order
  process tracking** and **Production stage tracking**. At each operation stage, the fields shown on the
  stage form can be custom; defined here per (entity + workflow + tracking type).
- **Grid columns:** **Entity · Workflow Name · Created Date · Updated Date · Action (⋮)** (45 entries). Workflow
  names e.g. 2 Stage Approval, Production Routing, Process Tracking 01, production workflow new.
- **Legacy tech hint:** `/SCM/admin/workflowStageAttribute.action`.
- **Create Stagewise Custom Field ("Category Details") — fields:**
  | Field (label) | Datatype | Req | Notes |
  |---|---|---|---|
  | Entity Alias | Enum(FK→Entity) | ✓ | |
  | Approval | Enum(FK→Workflow/Approval Flow) | ✓ | the workflow whose stages get the fields (e.g. 2 Stage Approval) |
  | Template Type | Enum (**Process Tracking** / **Production**) | ✓ | SO process tracking vs production stage tracking |
  - Then per-stage field definition follows. Actions: Cancel · Submit.
- Prior parity: TC-FT-SCF-001, F-0023 (delete cascade: wf_level_attr_mapp → wf_level_stages → parent).

### Line Item Templates tab (captured 2026-06-26)
- **Business meaning (product owner):** documents (PO/SO/etc.) have a **line-item grid**; here you **hide/unhide
  standard line-item fields** per **Template Type** (Sales, Purchase…) so each customer sees only relevant
  columns (not all the unwanted fields).
- **Controls:** **Template Type** (Enum, e.g. Sales) + grid **Sl No. · Field Name · Hidden Field (checkbox)** ·
  **Save/Update**. Checkbox **checked = hidden**.
- **Standard line-item fields (Sales template, captured):** Additional Notes · Price History · Price Name ·
  Free Qty · Additional Free Qty · Weight · Cost Price · Margin · Selling Price · Sell Price · Selling price with
  Tax · Free Qty UOM · Warranty · Category · HSN/SAC. (In this capture most price/cost/margin fields are **hidden**;
  visible = Additional Notes, Sell Price, Free Qty UOM, HSN/SAC.)
- Prior parity: TC-FT-LIT-001.

### Grid Form Templates tab (captured 2026-06-26)
- **Business meaning (product owner):** control the document's **header-level fields** (SO/PO etc.) across both
  the **grid (list)** and the **form**:
  - **Grid** checkbox → show/hide the field **as a grid column**.
  - **Hidden** checkbox → hide the field **on the form**.
  - **Seq No** → the **order** in which columns are displayed in the grid.
- **Controls:** **Template Type** (Enum, e.g. Sales Orders) + grid **Sl No. · Field Name · Grid · Hidden · Seq No**
  · **Save/Update**.
- **Header fields (Sales Orders, captured sample):** Billing Address · Comments · Created By · Created Date ·
  Customer Contact · Customer · Customer PO Date · Customer PO No · Delivery Address · Entity Name · Group Items ·
  Grouping Item In Pdf · Individual Customer · Invoice Status · Master/Repeating Order · Master SO No. ·
  Payment Days · Payment Terms · Allow Price Change In Sale Invoice · Price List · Project Code · …
- Prior parity: TC-FT-GFT-001.

> **Form Templates family — full picture:** Form Templates (add custom fields per doc) · Global Custom Fields
> (reusable cross-doc fields) · Stagewise Custom Fields (per-workflow-stage fields) · Line Item Templates
> (show/hide standard *line-item* columns) · Grid Form Templates (grid/form visibility + grid order for *header*
> fields). Together they govern what fields/columns appear on every document form & grid — the config source for
> much of the per-field behavior catalogued elsewhere.

---

## Admin-Settings → Items (captured 2026-06-26)

> **Business meaning (product owner):** this menu maintains the two **dropdown masters consumed by the Item-creation
> form** — **UOM** (unit of measure) and **Item Categories**. Values added here populate the corresponding
> selects when creating/editing an item.

### Tab 1 — UOM (Unit of Measure)
- **Purpose:** master for the **Unit of Measure dropdown** on the Item form (and Alternate UOM / Free Qty UOM
  wherever a UOM picker appears). Each row = one selectable unit (e.g. Nos, Boxes, m², Kilogram, Mtr).
- **Grid columns:** Name · Description · Created By · Created Date · Updated By · Updated Date · **Status**
  (active/inactive toggle — green tick = active, red ✕ = inactive) · **Action** (⋮ row menu).
- **Add UOM form** (`Items › UOM › Add UOM` → **Primary Details**):

  | # | Field | Type | Req | Source | Business logic |
  |---|---|---|---|---|---|
  | 1 | **Name** | String | ● | common | The UOM value shown in the Item-form dropdown (e.g. "Nos", "Kilogram"). |
  | 2 | **Description** | String | ● | common | Human-readable expansion (e.g. "No's", "kgs", "Meter Square"). Both Name + Description are required (red `*`). |

  - Footer: **Cancel** / **Create**. Active/inactive controlled later via the grid Status toggle.
  - **Note:** data shows many duplicate/junk UOMs (STR=LTR, uommm=fghj, asdxsacscsd) — typical of accumulated
    test data; no uniqueness enforcement observed on Name.

### Tab 2 — Item Categories
- **Purpose:** master for the **Item Category dropdown** on the Item form; a **hierarchical (tree) classification**
  of items (parent → child → grandchild, unlimited depth).
- **Grid columns:** Category Code · Category Description · Created By · Modified By · Created Date · Updated Date ·
  **Status** · **Action** (⋮).
- **Add Item Category form** (`Items › Item Categories › Add Item Category` → **Category Details**):

  | # | Field | Type | Req | Source | Business logic |
  |---|---|---|---|---|---|
  | 1 | **Search** | String | ○ | ui | Filters the Category List tree (find an existing node to parent under). |
  | 2 | **Category List** | Tree | ○ | ui | Read-only tree of existing categories (General Equipments › Thermometers › mds › … ). Click a node to set it as Parent. |
  | 3 | **Category Name** | String | ● | common | The category value shown in the Item-form dropdown / used as Category Code. |
  | 4 | **Category Description** | String | ○ | common | Optional human-readable description. |
  | 5 | **Parent Category** | Enum(FK→Category) | ○ | common | Optional parent node → makes this a **sub-category** (enables the tree hierarchy). Blank = top-level category. |

  - Footer: **Cancel** / **Create**.
  - **Tree behavior:** categories nest arbitrarily deep (e.g. General Equipments → Thermometers → New → mouse →
    newmouse → EMOUSE). Item form's Category picker reflects this hierarchy.

> Both masters are pure reference-data feeders for the Item-creation form (cross-link: *Items → Add Item* §Item
> Details). Mirrors the Form-Templates-family pattern of "config screen feeds a transactional form."

---

## Admin-Settings → Inventory (captured 2026-06-26)

> Tabs: **Barcode Print Format · Warehouses · Locations · Inventory Ledger**. Captured here: Barcode Print Format
> + Warehouses. (Locations · Inventory Ledger TBD.)

### Tab 1 — Barcode Print Format
- **Purpose:** configure **what attributes get printed on item barcode labels** (the layout/content of the
  barcode sticker). One config row per barcode key.
- **Grid columns:** Barcode · Created Date · Updated Date · **Status** · **Action** (⋮). (Data: a single row,
  Barcode = "Item #".)
- **Edit Barcode Print Format form** → **Primary Details** + **Status**:

  | # | Field | Type | Req | Source | Business logic |
  |---|---|---|---|---|---|
  | 1 | **Additional Barcode** | Label/Read | — | config | The barcode key being configured (e.g. "Item #"). |
  | 2 | **Attributes** | Multi-select | ● | config | Which fields print on the label — options: **UOM · Description 1 · Description 2** (checkbox dropdown, "N selected"). Drives barcode sticker content. |
  | 3 | **Status** | Radio (Active/Inactive) | ● | common | Active = format in use. |

  - Footer: **Cancel** / **Update**. (Cross-link: Super Admin → Org → **Barcode** bulk-print screen consumes this
    format; F-0037.)

### Tab 2 — Warehouses
- **Purpose:** master of **warehouses per entity** — physical/logical stock locations that inventory is held in
  and transacted against.
- **Grid columns:** Entity · Warehouse Name · Created By · Created Date · Updated By · Updated Date · **Status**
  (active/inactive) · **Action** (⋮).
- **Create Warehouse form** → **Primary Details** + **Warehouse Detail**:

  | # | Field | Type | Req | Source | Business logic |
  |---|---|---|---|---|---|
  | 1 | **Entity** | Enum(FK→Entity) | ● | common | Which entity ("Select Company") the warehouse belongs to. Warehouses are scoped per entity. |
  | 2 | **Warehouse Name** | String | ● | common | Display name (e.g. "Main-Warehouse 1", "Prod-Warehouse 2"). |
  | 3 | **Scrap WareHouse** | Boolean | ○ | common | **Flags this as the scrap warehouse.** ⮕ **Business rule (product owner):** in **Production**, whenever a **scrap qty** is entered, that qty is **automatically moved to the Scrap WareHouse**. (Links to Scrap Item type [68] / Scrap section.) |

  - Footer: **Cancel** / **Create**.

> **Parity-relevant rule:** Scrap-warehouse routing is automatic on production scrap-qty entry — a behavior to
> assert in Production-module parity tests (scrap qty → stock lands in the flagged Scrap WareHouse, not the source
> warehouse). Cross-link: Items → Add Item §Scrap Item (68).

### Tab 3 — Locations
- **Purpose:** define **storage locations *within* a warehouse** (bins/racks/sub-locations) — a finer stock
  position than the warehouse itself. Hierarchical (tree), like Item Categories.
- **Add Location form** → **Primary Details** + **Location Details**:

  | # | Field | Type | Req | Source | Business logic |
  |---|---|---|---|---|---|
  | 1 | **Entity** | Enum(FK→Entity) | ● | common | Which entity ("Select Company"). |
  | 2 | **Warehouse** | Enum(FK→Warehouse) | ● | common | The warehouse this location sits inside (filtered by Entity). |
  | 3 | **Search** | String | ○ | ui | Filters the Storage Location List tree. |
  | 4 | **Storage Location List** | Tree | ○ | ui | Existing locations under the warehouse; click a node to set as Parent. |
  | 5 | **Name** | String | ● | common | The location/bin name. |
  | 6 | **Parent Name** | Enum(FK→Location) | ○ | common | Optional parent location → nested sub-location. Blank = top-level under the warehouse. |

  - Footer: **Cancel** / **Create**. (Same parent-tree pattern as Item Categories.)

### Tab 4 — Inventory Ledger
- **Purpose:** **map each inventory Finance Group → its GL ledger account** so that inventory-value postings hit
  the correct account. ⮕ **Business rule (product owner):** this is the mapping that controls *where the inventory
  value posting should happen* per finance group.
- **Add Inventory Ledger form** → **Ledger Details**:

  | # | Field | Type | Req | Source | Business logic |
  |---|---|---|---|---|---|
  | 1 | **Finance Group** | Enum | ● | common | The inventory finance group — options: **Consumable · Finished Good · Raw Material · Trading · Work in Progress**. (Matches the item-type finance groupings.) |
  | 2 | **Ledger Account** | Enum(FK→Ledger) | ● | §10001 | The GL account that inventory value for that group posts to. (Ledger master gated by Ledgers param 10001 — see [[global-parameter-config-and-ledgers-rule]].) |

  - Footer: **Cancel** / **Create**.
  - **Parity note:** only relevant when GL posting is enabled (Ledgers 10001 ON / org manages own accounting).
    Cross-link: Item-form Finance Group field + §29 Ledgers rule.

---

## Admin-Settings → Planning (captured 2026-06-26)

> Tabs: **Resources · Activities · Resource Capacities**. ⮕ **Business meaning (product owner):** **Resources**
> are assignable to projects; **Activities** define what those resources do (their tasks); **Resource Capacities**
> define the **capacity + capacity rate per resource type**. (Cross-link: Item type [13] Resource — items created
> there feed the resource pool.)

### Tab 1 — Resources
- **Purpose:** master of resources that can be **assigned to projects / production planning** (machines, people,
  etc.).
- **Create Resource form** → **Resource Master Details**:

  | # | Field | Type | Req | Source | Business logic |
  |---|---|---|---|---|---|
  | 1 | **Entity Alias** | Enum(FK→Entity) | ● | common | Owning entity ("Select Company"). |
  | 2 | **Name** | String | ● | common | Resource name. |
  | 3 | **Description** | String | ● | common | Resource description (required). |

  - Footer: **Cancel** / **Create**.

### Tab 2 — Activities
- **Purpose:** define the **activities/tasks resources perform** (the work items a resource can be allocated to).
- **Create Activities form** → **Resource Task Details**:

  | # | Field | Type | Req | Source | Business logic |
  |---|---|---|---|---|---|
  | 1 | **Entity Alias** | Enum(FK→Entity) | ● | common | Owning entity. |
  | 2 | **Name** | String | ● | common | Activity / task name. |
  | 3 | **Description** | String | ● | common | Activity description (required). |

  - Footer: **Cancel** / **Create**. (Same shape as Resources; this is the "Resource Task" master that Resource
    Capacities references.)

### Tab 3 — Resource Capacities
- **Purpose:** define **how much capacity (and its rate) a resource type has** over a date window — the planning
  input for scheduling/costing.
- **Create Resource Capacities form** → **Primary Details** + **Resource Details**. ⚠️ **Type-aware form** —
  fields depend on **Resource Type**:

  | # | Field | Type | Req | Source | Business logic |
  |---|---|---|---|---|---|
  | 1 | **Entity Alias** | Enum(FK→Entity) | ● | common | Owning entity. |
  | 2 | **Resource Type** | Enum | ● | common | **Resource · User Registration Type · Machine** — drives the rest of the form. |
  | 3 | **Resource Task** | Multi-select(FK→Activity) | ● | common | The activity/task(s) this capacity applies to ("Select options" / "N selected"). |
  | 4 | **User Name** | Enum(FK→User) | ●* | type:User Registration Type | **Only when Resource Type = User Registration Type** — maps capacity to a specific user. |
  | 5 | **Daily Capacity (Hours)** | Decimal | ● | common | Hours/day the resource is available. |
  | 6 | **Capacity Rate** | Decimal | ●* | type-gated | Cost rate per capacity. **Absent for plain "Resource" type; present for User Registration Type / Machine.** |
  | 7 | **Start Date** | Date | ● | common | Capacity window start. |
  | 8 | **End Date** | Date | ● | common | Capacity window end. |

  - Footer: **Cancel** / **Submit**.
  - **Type delta observed:** Resource Type = **Resource** → fields = Resource Task, Daily Capacity, Start/End
    (no Capacity Rate). Resource Type = **User Registration Type** → adds **User Name** + **Capacity Rate**.
    (Machine not captured — likely Rate without User Name; TBD.)

---

## Admin-Settings → Inspections (captured 2026-06-26)

> ⮕ **Business meaning (product owner):** drives the **inspection / quality-check** functionality, used at two
> points — **stock-inward inspection** (incoming GRN) and **inspection after a production stage completes**.
> Tab 1 defines the **inspection parameters** (the measurable characteristics); Tab 2 maps, **per item**, which
> parameters to measure and their **min / max / std / tolerance %** acceptance limits.

### Tab 1 — Inspection Parameters
- **Purpose:** master of measurable QC characteristics (e.g. Height, Weight, Diameter).
- **Add Inspection Parameter form** → **Primary Details** + **Parameter Details**:

  | # | Field | Type | Req | Source | Business logic |
  |---|---|---|---|---|---|
  | 1 | **Entity Alias** | Enum(FK→Entity) | ● | common | Owning entity. |
  | 2 | **Parameter Name** | String | ● | common | The QC characteristic name. |
  | 3 | **Parameter Description** | String | ○ | common | Optional description. |
  | 4 | **Data Type** | Enum | ● | common | How the parameter is captured/measured (e.g. **Text Field · Range** — drives whether Min/Max apply). |

  - Footer: **Cancel** / **Submit**.

### Tab 2 — Inspection Items Parameters
- **Purpose:** for a given **item**, define **which parameters to inspect** and the **acceptance limits**.
- **Create Inspection Item Parameter form** → **Primary Details** + **Parameter Details**:

  | # | Field | Type | Req | Source | Business logic |
  |---|---|---|---|---|---|
  | 1 | **Entity Alias** | Enum(FK→Entity) | ● | common | Owning entity. |
  | 2 | **Select Items** → **Item No. / Item** | Picker(FK→Item) | ● | common | Pick the item this inspection profile applies to (shows Item No. + Item name). |
  | 3 | **Sample Type** | Enum | ● | common | **All Items Inspection** (inspect every unit) vs **Sample Items Inspection** (inspect a sample). |
  | 4 | **Select Parameter** → grid | Grid | ● | common | Add parameters (from Tab 1) to measure. Per-row columns below. |

  **Parameter grid columns (per row):**
  | Col | Type | Business logic |
  |---|---|---|
  | Parameter Name | Enum(FK→Inspection Parameter) | Which characteristic (e.g. Heights, Height). |
  | Data Type | Read (from param) | e.g. Text Field, Range. |
  | UOM | Enum(FK→UOM) | Unit the measure is taken in. |
  | Min Value | Decimal | Lower acceptance bound. |
  | Max Value | Decimal | Upper acceptance bound. |
  | Std Value | Decimal | Target/standard value. |
  | Tolerance % | Decimal | Allowed deviation from Std. |

  - Footer: **Cancel** / **Submit**.

> **Parity-relevant:** QC pass/fail at GRN (stock-inward) and post-production-stage is driven by these limits —
> a value outside Min/Max (or beyond Tolerance % of Std) should fail inspection. Behavior to assert in
> GRN/Production parity tests. Cross-link: GRN receive-line (§Purchase-to-Pay) + Production module.

---

## Admin-Settings → Projects (captured 2026-06-26)

> Single menu **Project Code** with **3 sub-tabs** that each define **how a project/site code is auto-generated**
> (the composition + format of the auto-sequence). ⮕ **Business meaning (product owner):**
> - **Project Code with BOQ Sequence** — auto-sequence built around the **BOQ**.
> - **Project Code Sequence** — auto-sequence for a **manually-created project code**.
> - **Site Code Sequence** — code format when **one project has many sites** (per-site code).
>
> Same configurator pattern as the Sequence Number / Sequence Details screens, but project-specific. ⚠️ Note: the
> status-bar URL shows `staging.ipactsolutions.com/SCM/admin/viewProjectCodes.action` — this capture is from
> **legacy (.action / staging)**, the golden master.

### Shared form shape (all 3 sub-tabs)
- **Primary Details:**

  | # | Field | Type | Req | Business logic |
  |---|---|---|---|---|
  | 1 | **Delimiter** | String | ● | Separator placed between code segments (e.g. `@`, `/`, `*`). |
  | 2 | **Sequence Digits** | Integer/Mask | ● | Padding/width of the running number (e.g. `1`, `435`, `00`). |

- **Assign Auto-Generate Sequence** grid — tick which **Attributes** compose the code, set each one's **Sequence**
  (position/order), and for **Year** choose a format:

  | Col | Type | Business logic |
  |---|---|---|
  | (checkbox) | Boolean | Include this attribute in the generated code. |
  | Attributes | Label | The candidate segments (see per-tab list below). |
  | Sequence | Integer | Order/position of this segment in the final code. |
  | Year | Enum | Year format when **Year** is ticked (**YY-MM**, **MM-YYYY**, …). |

- Footer: **Update**.

### Per-sub-tab attribute lists (captured)
- **Project Code with BOQ Sequence:** Entity ✓(2) · Customer ✓(1) · Year ✓(3, YY-MM) · BOQ ☐ · BOQ DROPDOWN ☐.
  (Delimiter `@`, Sequence Digits `1`.)
- **Project Code Sequence:** Entity ✓(1) · Customer ✓(2) · Year ✓(3, MM-YYYY) · Drop down ☐ · Project Type Entity ☐ ·
  Project Code ☐. (Delimiter `/`, Sequence Digits `435`.)
- **Site Code Sequence:** Entity ✓(1) · Customer ✓(2) · Year ✓(3, MM-YYYY) · **ProjectCode Seq ✓(4)** · Drop down ☐ ·
  Project Type Entity ☐ · Project Code ☐. (Delimiter `*`, Sequence Digits `00`.) Site code nests **under** the
  project code (note ProjectCode Seq as a segment).

---

## Admin-Settings → Delivery (captured 2026-06-26)

> Tabs: **Labelling · Vehicle Master · Transporter Vehicles**. Captured: Labelling. (Vehicle Master ·
> Transporter Vehicles TBD.)

### Tab 1 — Labelling
- **Purpose:** ⮕ **(product owner)** configure **barcode print labels** — i.e. **what information is printed on a
  label** and how (which fields, their order/sequence, label-cell size, and physical dimensions). Distinct from
  Inventory → Barcode Print Format (item barcode content); this is the **label layout per document/label type**.
- **Label Details:**

  | # | Field | Type | Req | Business logic |
  |---|---|---|---|---|
  | 1 | **Label Type** | Enum | ● | Which label template to configure. Options: **Packing(NI) · Packing · Inspection · Production Inspection · Production · GRN · Stock On Hand · Stock On Hand(Items Add) · Material Delivery(Acknowledge) · Material Delivery(Return)** (and more). Each type has its own field set. |

- **Field grid** (grouped: **Static Fields · Dynamic Fields · Item Fields · Dimensions**) — per row:

  | Col | Type | Business logic |
  |---|---|---|
  | (checkbox) | Boolean | Include this field on the label. |
  | Sl No | Integer | Row number. |
  | **Fields** | Label | The field name (e.g. Packet No, Project, Dispatch Date, Item No, Label Width). |
  | **Fields Alias** | String (editable) | The label/printed caption for the field (rename for the sticker). |
  | **Is Label** | Boolean | Whether the field prints as a label (vs data only). |
  | **Seq No** | Integer | Print order on the label. |
  | **Label Size** | Integer | Cell/font size for the field. |

  - **Field groups (Packing(NI) capture):**
    - **Static Fields:** Packet No · Project · Dispatch Date · Packing Description · Vendor.
    - **Dynamic Fields:** conditiion · Pack Info · Packing · Consume · Mfd date · colour product · Date(☐) ·
      Label dimensions · DateTime(☐). *(Dynamic = org custom fields, source: Form Templates family.)*
    - **Item Fields:** Item No · Item Description · Item Image(☐).
    - **Dimensions:** Label Width (200) · Label Height (200) · Barcode Height (300). *(physical label sizing)*
  - Footer: **Save/Update**.

> Per-label-type config — same "config screen drives printed output" pattern. Cross-link: Inventory → Barcode
> Print Format (item-level) + Form Templates family (the Dynamic Fields source).

### Tab 2 — Vehicle Master
- **Purpose:** ⮕ **(product owner)** define the **capacity of vehicles** so that during **delivery** the system
  knows **how many packages fit in one vehicle**.
- **Create Vehicle Master form** → **Primary Details** + **Vehicle Details** + **Capacity** + **Summary**:

  | # | Field | Type | Req | Source | Business logic |
  |---|---|---|---|---|---|
  | 1 | **Entity Alias** | Enum(FK→Entity) | ● | common | Owning entity. |
  | 2 | **Vehicle Name** | String | ● | common | Vehicle identifier/name. |
  | 3 | **Vehicle Description** | String | ○ | common | Optional description. |
  | 4 | **Fuel Type** | Enum | ● | common | e.g. Diesel (…). |
  | 5 | **Capacity** grid → Select Items | Grid | ● | common | Per-item capacity of the vehicle. Columns below. |
  | 6 | **Comments** | Text | ○ | common | Summary notes. |

  **Capacity grid columns (per row, "Add another line"):**
  | Col | Type | Business logic |
  |---|---|---|
  | Sl No. | Integer | Row number. |
  | Items | Picker(FK→Item) | Which item/package type. |
  | UOM | Enum(FK→UOM) | Unit of the capacity figure. |
  | Capacity | Decimal | How many of that item/package fit in the vehicle. |

  - Footer: **Cancel** / **Submit**. (Capacity used by Delivery planning to fit packages into vehicles.)

### Tab 3 — Transporter Vehicles
- **Purpose:** ⮕ **(product owner)** master of transporter/vehicle records used as **dropdown values when
  creating a Delivery Note** (who transports + which vehicle + driver).
- **Create Transporter Vehicles form** → **Primary Details** + **Transporter Details** + **Vehicle Details** +
  **Summary**:

  | # | Field | Type | Req | Source | Business logic |
  |---|---|---|---|---|---|
  | 1 | **Entity Alias** | Enum(FK→Entity) | ● | common | Owning entity. |
  | 2 | **Transporter Type** | Enum | ● | common | **Own** (own fleet) vs **Transporter** (3rd-party). Drives Supplier relevance. |
  | 3 | **Supplier** | Enum(FK→Supplier) | ● | common | The transporter supplier (for 3rd-party). |
  | 4 | **Transporter Id** | String | ○ | common | Transporter reference/registration id. |
  | 5 | **Vehicle Details** grid | Grid | ● | common | One or more vehicles ("Add Another Vehicle"). Columns below. |
  | 6 | **Comments** | Text | ○ | common | Summary notes. |

  **Vehicle Details grid columns (per row):**
  | Col | Type | Business logic |
  |---|---|---|
  | Vehicle Name | Enum(FK→Vehicle Master) | The vehicle (sourced from Vehicle Master). |
  | Vehicle Description | Read (from master) | Auto from Vehicle Master. |
  | Vehicle No. | String | Registration/plate number. |
  | Driver Name | String | Assigned driver. |

  - Footer: **Cancel** / **Add**. (Feeds the Delivery Note transporter/vehicle/driver dropdowns; cross-link:
    Vehicle Master.)

---

## Admin-Settings → Contracts (captured 2026-06-26)

> ⮕ **(product owner)** masters feeding **Contract-module dropdowns** — Tab 1 = **Contract Type** dropdown,
> Tab 2 = **D & O Category** dropdown. Tabs: **Master · D & O Categories**.

### Tab 1 — Master (Contract Type)
- **Purpose:** master for the **Contract Type dropdown** on contract forms.
- **Add Contract Type form** → **Contract Details**:

  | # | Field | Type | Req | Source | Business logic |
  |---|---|---|---|---|---|
  | 1 | **Contract Type** | String | ● | common | The contract-type value shown in the dropdown. |

  - Footer: **Cancel** / **Create**.

### Tab 2 — D & O Categories
- **Purpose:** master for the **D & O Category dropdown** (Deliverables & Obligations categories) in the Contract
  module.
- **Add D & O Categories form** → **Category Details**:

  | # | Field | Type | Req | Source | Business logic |
  |---|---|---|---|---|---|
  | 1 | **Category Name** | String | ● | common | The D & O category value shown in the dropdown. |

  - Footer: **Cancel** / **Create**.

---

## Admin-Settings → Ledgers (captured 2026-06-26)

> ⚠️ **Gated by Ledgers param 10001** — this menu/its consumers only matter when the org manages its own GL
> posting (see [[global-parameter-config-and-ledgers-rule]]). Tabs: **Expense Category · Accounts Mapping ·
> Account Opening Balance**. Captured: Expense Category (Chart of Accounts). (Other 2 TBD.)

### Tab 1 — Expense Category (Chart of Accounts)
- **Purpose:** ⮕ **(product owner)** where **GL accounts are created** and the **hierarchy** is maintained for
  **GL posting**. This is the org's **Chart of Accounts** (breadcrumb: *Add Chart Of Accounts*).
- **Grid columns:** Accounts · GL Name · Created By · Modified By · Created Date · Updated Date · **Status** ·
  **Action** (⋮). Rows = GL accounts (Expense Payable, Purchase Account, TDS, Salaries & Wages, …).
- **Add Chart Of Accounts form** → **Category Details**:

  | # | Field | Type | Req | Source | Business logic |
  |---|---|---|---|---|---|
  | 1 | **Search** | String | ○ | ui | Filters the Category List (account tree). |
  | 2 | **Category List** | Tree | ○ | ui | Existing accounts hierarchy (Administrative Expenses › Delivery and Transportation › Delivery Charges …). Click a node → sets Parent GL. |
  | 3 | **Accounts** | String | ● | common | Account name/code being created. |
  | 4 | **GL Name** | String | ○ | common | GL display name. |
  | 5 | **Parent GL Code** | Enum(FK→GL) | ○ | common | Parent account → builds the GL hierarchy (blank = top-level). |
  | 6 | **Group Name** | Enum | ● | common | Top-level account class: **Assets · Income · Expense · Liability · Equity · Cost of Goods**. Drives financial-statement classification. |
  | 7 | **Customized Cash Flow** | String | ○ | common | Override mapping for the Cash Flow statement line. |
  | 8 | **Customized Income** | String | ○ | common | Override mapping for Income statement. |
  | 9 | **Customized Expense** | String | ○ | common | Override mapping for Expense. |
  | 10 | **Customized Trial Balance** | String | ○ | common | Override mapping for Trial Balance. |
  | 11 | **Customized BalanceSheet** | String | ○ | common | Override mapping for Balance Sheet. |
  | 12 | **Customized Profit/Loss** | String | ○ | common | Override mapping for P&L. |

  - Footer: **Cancel** / **Create**.
  - **Note:** the "Customized …" fields let an account be re-mapped onto specific financial-report lines (custom
    grouping for Cash Flow / Income / Expense / Trial Balance / Balance Sheet / P&L). Account tree + Group Name +
    Parent GL together define how postings roll up into statements. Cross-link: Inventory → Inventory Ledger
    (Finance Group → GL account) + Item-form Finance Group.

### Tab 2 — Accounts Mapping
- **Purpose:** ⮕ **(product owner)** **ledger mapping** — bind each **system transaction code** (the predefined
  posting events) to the **GL account** it should post to. This is what makes documents auto-post to the right
  ledger.
- **Form:** a 2-column grid — **Code** (fixed list of system posting points) → **Accounts** (pick a GL account).
  Clicking an Accounts cell opens the **Category List** modal = the same Chart-of-Accounts tree from Tab 1
  (Administrative Expenses › Delivery and Transportation › Delivery Charges …).

  | Col | Type | Business logic |
  |---|---|---|
  | **Code** | Label (system) | The predefined posting event (read-only). |
  | **Accounts** | Enum(FK→GL via tree picker) | The GL account that event posts to. |

- **Code list (captured sample):** Invoice Payable Cess Amount-Paid · Invoice Payable Shipping & Handling
  Charges-Paid · Invoice Payable Shipping Tax Amount-Paid · Invoice Payable Adjust Amount-Paid · Invoice Payable
  Discount-Paid · Invoice Payable Insurance Amount-Paid · Invoice Payable Insurance Tax Amount-Paid · Invoice
  Receivable Shipping&Handling Charges-Received · Invoice Receivable Shipping Tax Amount-Received · Invoice
  Receivable Adjust Amount-Received · Invoice Receivable Discount-Received · Invoice Receivable Cess
  Amount-Received · Invoice Receivable Insurance Amount-Received · Invoice Receivable Insurance Tax
  Amount-Received · Mode of Travel Bus GL Code · Advance Payable Amount · Payable Invoice Credit Note · Account
  Transfer · Additional Dynamic Field-Purchase Invoice · Additional Dynamic Field-Sales Invoice · Purchase
  Invoice RCM · Supplier GL Code · … (list continues).
  - Footer: **Cancel** / **Submit**.
  - **Parity note:** these mappings determine where invoice charges/taxes/discounts/RCM/credit-notes auto-post —
    a foundation for Invoice/Payment GL-posting parity. Cross-link: Purchase Invoices (WHT/Additional Fields),
    Sales Invoice.

### Tab 3 — Account Opening Balance
- **Purpose:** ⮕ **(product owner)** set the **opening balance** for a GL account at go-live — used when
  **migrating from another accounting platform** to Raptech, so transactions start from the correct carried-over
  balance.
- **Add Account Opening Balance form** → **Primary Details**:

  | # | Field | Type | Req | Source | Business logic |
  |---|---|---|---|---|---|
  | 1 | **Search** | String | ○ | ui | Filters the Category List (account tree). |
  | 2 | **Category List** | Tree | ○ | ui | Chart-of-Accounts tree (Non-Current Assets › Tangible Assets › … incl. customer/supplier sub-accounts). Click to pick the account. |
  | 3 | **Entity Alias** | Enum(FK→Entity) | ● | common | Which entity the opening balance is for. |
  | 4 | **Currency** | Enum(FK→Currency) | ● | common | Currency of the opening balance. |
  | 5 | **Accounts** | Enum(FK→GL via tree) | ● | common | The GL account receiving the opening balance. |
  | 6 | **Account Opening Balance** | Decimal | ● | common | The carried-over balance amount. |

  - Footer: **Cancel** / **Create**.
  - **Parity note:** opening balances seed the GL at migration — relevant to Trial Balance / Balance Sheet
    correctness from day one. Per-entity, per-currency. Cross-link: Financial Year (opening), Chart of Accounts.

---

## Admin-Settings → Taxes (captured 2026-06-26)

> ⮕ **(product owner)** where the **tax %** for the organization is defined. Single tab **Tax Rates**. Feeds tax
> calculation on Purchase/Sales documents. Cross-link: Super Admin → Org → **Tax Country Mapping** (which tax
> applies by geography) — this screen defines the **rates**; that one maps them to **geography/module**.

### Tab 1 — Tax Rates
- **Purpose:** define tax/levy/TDS rates, their GL posting accounts, defaults, and validity.
- **Grid columns:** Tax Type · Module · Group Name · Tax Name · Tax % · Description · Is Default · Purchase GL
  Code · Sales GL Code · **Action** (⋮). (212 rows; mix of TAX/LEVY/TDS across Sales/Purchase — VAT, IGST, GHANA
  LEVY-COVID/NHIL/GETFUND, TDS, etc.)
- **Create Tax Rates form** → **Tax Details** + **Tax Rates** (component grid):

  | # | Field | Type | Req | Source | Business logic |
  |---|---|---|---|---|---|
  | 1 | **Tax Type** | Enum | ● | common | TAX · LEVY · TDS (… class of the charge). |
  | 2 | **Group Tax** | Enum | ● | common | Tax group — e.g. **SGST/CGST**, VAT, IGST. A group can expand into multiple component rows (see grid). |
  | 3 | **Module** | Enum | ● | common | **Purchase** vs **Sales** — which side the rate applies to (drives Purchase vs Sales GL Code). |
  | 4 | **End Date** | Date | ○ | common | Validity end (rate expiry). |
  | 5 | **Is Default** | Boolean | ○ | common | Default rate for its group/module. |

  **Tax Rates component grid (per row — one per component tax in the group):**
  | Col | Type | Business logic |
  |---|---|---|
  | (Sl) | Integer | Row no. |
  | Tax Name | String | Component name (e.g. CGST, SGST). |
  | Tax Percentage | Decimal | The component %. |
  | Tax Description | String | Description. |
  | GL Code | Enum(FK→GL) | GL account the component posts to ("Select Gl Code"). |

  - Footer: **Cancel** / **Submit**.
  - **Note:** group taxes (e.g. SGST/CGST) auto-split into component rows, each with its own %, description, and
    GL Code → so a single 18% GST records as CGST 9 + SGST 9 to separate accounts. ⚠️ Param cross-ref:
    **WHT% (param 70)** on Purchase Invoices relates to TDS-type rates here.

---

## Admin-Settings → Cost Centers (captured 2026-06-26)

> ⮕ **(product owner)** where **cost centres are defined**; the same values appear as **dropdowns in main-module
> functions** (so transactions can be tagged to a cost centre). Single tab **Cost Centers**. Hierarchical (tree),
> like Item Categories / Chart of Accounts. ⚠️ Status-bar URL = `staging.ipactsolutions.com/SCM/admin/
> addCostCentre.action` → **legacy capture**.
- **Grid columns:** Cost Centre Code · Cost Centre Description · **Budget** · Created By · Modified By · Created
  Date · Updated Date · **Action** (⋮).
- **Add Cost Centre form** → **Cost Centre Details**:

  | # | Field | Type | Req | Source | Business logic |
  |---|---|---|---|---|---|
  | 1 | **Search** | String | ○ | ui | Filters the Category List tree. |
  | 2 | **Category List** | Tree | ○ | ui | Existing cost-centre hierarchy (Cost type1 › 213434 › Thala#E …). Click → sets Parent. |
  | 3 | **Cost Centre Code** | String | ● | common | The cost-centre value shown in main-module dropdowns. |
  | 4 | **Cost Centre Description** | String | ○ | common | Description. |
  | 5 | **Parent Cost Centre Code** | Enum(FK→Cost Centre) | ○ | common | Parent node → sub-cost-centre (blank = top-level). |
  | 6 | **Budget** | Decimal | ○ | common | Budget amount allocated to the cost centre (defaults 0). |

  - Footer: **Cancel** / **Create**. (Same parent-tree pattern; adds a Budget figure per node.)

---

## Admin-Settings → Banks (captured 2026-06-26)

> ⮕ **(product owner)** where **bank details and the receivable/payable accounts** are defined — the cash/bank
> accounts money is received into and paid out from. Single tab **Banks**. ⚠️ **Type-aware form** — fields depend
> on **Account Type**.
- **Add Banks form** → **Primary Details** + **Transaction Details** + **Finance Related Details**:

  | # | Field | Type | Req | Source | Business logic |
  |---|---|---|---|---|---|
  | 1 | **Entity Alias** | Multi/Enum(FK→Entity) | ● | common | Owning entity ("Select options"). |
  | 2 | **Currency** | Enum(FK→Currency) | ● | common | Account currency. |
  | 3 | **Account Type** | Enum | ● | common | **Checking/Current/Savings · Cash · POS Cash · POS Terminal** — drives the Transaction Details fields. |
  | 4 | **Is Overdraft** | Boolean | ○ | common | Marks the account as an overdraft facility. |
  | 5 | **Accounts** | Enum(FK→GL) | ● | §10001 | The GL account this bank/cash account posts to (Finance Related Details). Gated by Ledgers param 10001. |

  **Type-specific Transaction Details:**
  | Account Type | Extra fields |
  |---|---|
  | **Checking/Current/Savings** | **Bank Name** ● · **Account No.** ● · Account Holder Name ○ · IFSC ○ · Branch Name ○ |
  | **Cash** | **Cash Type** ● |
  | **POS Cash / POS Terminal** | *(not fully captured — TBD; likely POS-specific fields)* |

  - Footer: **Cancel** / **Submit**.
  - **Note:** the **Accounts** (GL) link makes each bank/cash account a posting target → receipts/payments hit the
    mapped ledger. Cross-link: Accounts Mapping, Chart of Accounts, §29 Ledgers rule.

---

## Admin-Settings → Sales (captured 2026-06-26)

> ⮕ **(product owner)** every tab under **Sales** is just a **dropdown-value master** for its respective module —
> each tab maintains a simple list (Name + Status) that populates a dropdown elsewhere. No per-tab screenshots
> needed; uniform shape.
- **Uniform grid:** `<Value> · Created By · Created Date · Updated By · Updated Date · Status (active/inactive) ·
  Action (⋮)`. **+ New** → an Add form with essentially the single value field (+ active status).
- **Tabs (each = one dropdown master), with the module/field it feeds:**
  - **Lead Source** — CRM/Lead form → Lead Source dropdown.
  - **Lead Status** — Lead form → Lead Status.
  - **Opportunity Stage** — Opportunity → Stage.
  - **Lead Rating** — Lead form → Rating.
  - **Quote Status** — Quotation → Status.
  - **Task** — Task type/category dropdown.
  - **Sales Orders** — SO-related status/dropdown.
  - **Sales Invoice** — Sales Invoice-related status/dropdown.
  - **Agents Details** — Sales agent master (agent dropdown).
  - **Status** — generic status dropdown.
  - **Booking Status** — Booking → Status (travel module).
  - **Booking Quota** — Booking → Quota.
  - **Travel Itinery** *(sic)* — Travel itinerary dropdown.
  - **Booking source** — Booking → Source.
  - **Mode of travel** — Travel request → Mode (links Item type [14] Travel Item).
  - **Asset Return Status** — Asset movement → return status (links Asset item types 1/2/3).
- Footer pattern: **Cancel** / **Create**. (Some tabs may carry a 2nd field like Description; treat as
  Name[+Description]+Status unless a screenshot shows otherwise.)

> **Not captured per-tab** (uniform master pattern, per product-owner direction). If any Sales tab later proves
> to have extra fields or behavior, capture that tab specifically.

### Modules explicitly OUT OF SCOPE (not developed — product owner, 2026-06-26)
**CRM · HRMS · Seller APIs · Integration · Data Upload · Analytics** — skip; do not capture or test.

---

## Admin-Settings → Production (captured 2026-06-26)

> ⮕ **(product owner)** masters for the **Production Planning** module. Tabs: **Delay Reason · Capacity Planning ·
> Tasks Master · Routing Master · Machine Master · Tool**. Captured: Delay Reason. (Other 5 TBD.) Cross-link:
> Planning (Resources/Activities/Resource Capacities), Item type [13] Resource / [64] Raw Material / [65] Semi-FG.

### Tab 1 — Delay Reason
- **Purpose:** master of **reasons a production task is delayed** — recorded against a task when it slips
  (e.g. Timing, Machine Service, No Resources, Materials Were Not There).
- **Grid columns:** Task Delay Reason · Created By · Created Date · Updated By · Updated Date · **Status** ·
  **Action** (⋮).
- **Create Delay Reason form** → **Primary Details**:

  | # | Field | Type | Req | Source | Business logic |
  |---|---|---|---|---|---|
  | 1 | **Delay Reason** | String | ● | common | The delay-reason value shown in the production-task delay dropdown. |

  - Footer: **Cancel** / **Create**. (Simple single-field dropdown master, like the Sales masters.)

### Tab 2 — Machine Master
- **Purpose:** ⮕ **(product owner)** where **machines are defined** (the production machines that perform tasks).
- **Create Machine Master form** → **Primary Details** + **Machine Details**:

  | # | Field | Type | Req | Source | Business logic |
  |---|---|---|---|---|---|
  | 1 | **Entity Alias** | Enum(FK→Entity) | ● | common | Owning entity. |
  | 2 | **Machine Name** | String | ● | common | Machine name (e.g. Machine Grinding). |
  | 3 | **Description** | Text | ○ | common | Description. |

  - Footer: **Cancel** / **Create**.

### Tab 3 — Tasks Master
- **Purpose:** ⮕ **(product owner)** where **production tasks are defined** (the operations a machine/resource
  performs).
- **Create Tasks Master form** → **Primary Details** + **Task Details**:

  | # | Field | Type | Req | Source | Business logic |
  |---|---|---|---|---|---|
  | 1 | **Entity Alias** | Enum(FK→Entity) | ● | common | Owning entity. |
  | 2 | **Task Name** | String | ● | common | Task/operation name. |
  | 3 | **Description** | Text | ○ | common | Description. |

  - Footer: **Cancel** / **Create**.

### Tab 4 — Capacity Planning
- **Purpose:** ⮕ **(product owner)** for each **machine or resource**, **map the tasks it can do** plus its
  **working hours, working days, hourly cost, and shift start time** — the capacity model used for production
  scheduling. ⚠️ **Type-aware form** by **Resource Type** (mirrors Planning → Resource Capacities).
- **Create Capacity Planning form** → **Primary Details** + **Resource Details**:

  | # | Field | Type | Req | Source | Business logic |
  |---|---|---|---|---|---|
  | 1 | **Entity Alias** | Enum(FK→Entity) | ● | common | Owning entity. |
  | 2 | **Resource Type** | Enum | ● | common | Resource / Machine / User Reg Type — drives next field. |
  | 3 | **Machine** | Enum(FK→Machine Master) | ●* | type:Machine | The machine being planned (when Resource Type = Machine). |
  | 4 | **Tasks** | Multi-select(FK→Tasks Master) | ● | common | The task(s) this machine/resource can perform ("N options selected"). |
  | 5 | **Total Working Hours Per Day** | Time(HH.MM) | ● | common | Hours/day the machine runs. |
  | 6 | **Working Days** | Multi-select | ● | common | Operating days (Mon–Fri / Mon–Sat / Mon–Sun). |
  | 7 | **Hourly Cost** | Decimal | ○ | common | Cost rate per hour. |
  | 8 | **Working Start Time** | Time(HH.MM) | ○ | common | Shift start time. |

  - Footer: **Cancel** / **Create**.
  - **Note:** Capacity Planning here is the **production-side** twin of Planning → Resource Capacities. Tasks +
    Machine + Tasks Master + Machine Master combine into the schedulable capacity. ⚠️ Breadcrumb reads
    "Planning › …" even though under the Production menu (shared controller).

### Tab 5 — Routing Master
- **Purpose:** ⮕ **(product owner)** create **routing details** — the **ordered sequence of tasks (operations)**
  required to produce an item, with inter-task **dependencies** and per-task **timings**. This is the
  manufacturing routing/route-card definition (a named template, optionally per item).
- **Create Routing Master form** → **Primary Details** + **Task Details** (sequence grid):

  | # | Field | Type | Req | Source | Business logic |
  |---|---|---|---|---|---|
  | 1 | **Entity Alias** | Enum(FK→Entity) | ● | common | Owning entity. |
  | 2 | **Template Name** | String | ● | common | Routing template name. |
  | 3 | **Item** | Enum(FK→Item) | ○ | common | The item this routing produces (optional → reusable template). |

  **Task Details grid (per row — one per operation in the route, "Add another"):**
  | Col | Type | Business logic |
  |---|---|---|
  | Sl No | Integer | Operation sequence number (route order). |
  | **Task** | Enum(FK→Tasks Master) | The operation (e.g. Top Drilling & Tapping, Raptech Task). |
  | **Dependency** | Enum/Int | Which prior step this task depends on (predecessor — 0 = none). Drives operation ordering. |
  | **Setup Time** | Time(HH.MM) | Time to set up before the operation. |
  | **Operation Time** | Time(HH.MM) | Run time of the operation. |
  | **Wrap-up Time** | Time(HH.MM) | Teardown/cleanup time after. |
  | **Estimated Hours** | Time(HH.MM) | Total estimated hours for the step. |

  - Footer: **Cancel** / **Create**.
  - **Note:** Tasks come from **Tasks Master**; combined with Machine Capacity Planning, the routing drives
    production scheduling & lead-time. Dependency column models predecessor steps (a simple precedence chain).

### Tab 6 — Tool ⛔ OUT OF SCOPE
- **Skip** — product owner (2026-06-26): built for a **specific customer**, **not required** for parity. Do not
  capture or test.

---

## Catalog index (forms captured)
| Form | Item types / scope | Captured | Status |
|---|---|---|---|
| Items → Add Item | Asset: Movable/Immovable/IT (1,2,3) | 2026-06-26 | 📝 fields captured; tech names + legacy diff TBD |
| Items → Add Item | Consumable (4) — variant: −Depreciation, +Issue Method, +Finance Group | 2026-06-26 | 📝 deltas captured |
| Items → Add Item | Service (5) — variant: −Depreciation, +Issue Method, −Finance Group | 2026-06-26 | 📝 deltas captured |
| Items → Add Item | Trading/Finished Goods (6) — variant: −Depreciation, +Issue Method, Finance=HSN/SAC only | 2026-06-26 | 📝 deltas captured |
| Items → Add Item | Trading Item - Batch (7) — variant: +Alternate UOM, +Catch Weight Item, Finance=HSN/SAC only | 2026-06-26 | 📝 deltas captured |
| Items → Add Item | Expense Item (10) — variant: −Issue Method, Finance=HSN/SAC only (stripped) | 2026-06-26 | 📝 deltas captured |
| Items → Add Item | Trading Item - Serial No. Split (11) — lean (serials entered at GRN; ⚠️ re-capture, param drift) | 2026-06-26 | 📝 deltas captured |
| Items → Add Item | Trading Item - Serial No. (12) — +GRN Inspection, +Catch Weight, no Issue Method | 2026-06-26 | 📝 deltas captured |
| Items → Add Item | Resource (13) — standard lean; no Issue Method/Catch Weight; Finance=HSN/SAC | 2026-06-26 | 📝 deltas captured |
| Items → Add Item | Travel Item (14) — standard; **full Finance** (HSN+Purchase+Sales Acct) | 2026-06-26 | 📝 deltas captured |
| Items → Add Item | Raw Material Item (64) — full Finance + Finance Group + Issue Method | 2026-06-26 | 📝 deltas captured |
| Items → Add Item | Trading/Semi Finished Goods (65) — full Finance + Finance Group + Issue Method | 2026-06-26 | 📝 deltas captured |
| Items → Add Item | Scrap Item (68) — Scrap section = Scrap Amount (not link grid) | 2026-06-26 | 📝 deltas captured |
| Purchase-to-Pay → GRN → receive line | serial grid + receive fields (proves 8/11/12 behavior) | 2026-06-26 | ⏳ PARTIAL — full GRN form TBD |
| Purchase-to-Pay → Purchase Invoices → Create | Reimbursement, Additional Field 1-3, WHT% (org-param fields) | 2026-06-26 | 📄 DOC-ONLY — screen capture TBD |
| Super Admin → Organization → Add Organization | full create-org form + config checkboxes + Product | 2026-06-26 | 📝 fields captured; config-checkbox logic ⏳ TBD (tester) |
| Super Admin → Organization (grid) | org list columns + tabs + Action menu (Edit/Details/Delete/View Entity/Assign Report) | 2026-06-26 | 📝 captured |
| Super Admin → Org → View Entity → Add Entity | entity create form (Primary/Address/Contact) | 2026-06-26 | 📝 captured |
| Super Admin → Org → View Entity (grid) | entity list + Action menu (Edit/Details/Sequence Details) | 2026-06-26 | 📝 captured |
| Super Admin → Org → Sequence Details + Add Sequence | seq grid (18 txn types) + add-sequence form (number format + print template) | 2026-06-26 | 📝 captured |
| Super Admin → Org → Org Pricing | subscription grid + edit (Start/End Date; F-0002, F-0038) | 2026-06-26 | 📝 captured |
| Super Admin → Org → Roles | roles grid + Add Role (Group: Company/Supplier/Customer) | 2026-06-26 | 📝 captured |
| Super Admin → Org → Role Permissions | Role+Module selectors + matrix; ALL 6 module trees (full app screen inventory) | 2026-06-26 | ✅ structure + 6 of 6 module trees |
| Super Admin → Org → Data Migration | reference-list cache refresh (Country/Currency/UOM/…); F-0011 | 2026-06-26 | 📝 captured |
| Super Admin → Org → Item Formula | Price/Qty formula grid (attributes × Costing/Quote/SO/PO); F-0005/F-0046 | 2026-06-26 | 📝 captured |
| Super Admin → Org → Tax Country Mapping | geo tax grid + Add (Tax/Group/Module + From/To geography); F-0010 | 2026-06-26 | 📝 captured |
| Super Admin → Org → Sequence Number | per-entity running counters (Current No. per sequence key) | 2026-06-26 | 📝 captured |
| Super Admin → Org → Barcode | bulk barcode print (xls upload → PDF); F-0037 | 2026-06-26 | 📝 captured |
| Admin-Settings → Users | users grid + Action menu + Create/Edit User; F-0012/13/40-44 | 2026-06-26 | 📝 captured |
| Admin-Settings → Organization → Addresses | address grid + Add Address (billing/shipping); F-0015 | 2026-06-26 | 📝 captured |
| Admin-Settings → Organization → Market Segment | segment grid + Add (customer-form dropdown master); F-0014/F-0047 | 2026-06-26 | 📝 captured |
| Admin-Settings → Organization → Line of Business | LoB grid + Add (customer-form dropdown master); ⚠️ "Function Name" label | 2026-06-26 | 📝 captured |
| Admin-Settings → General → Currency Exchanges | FX rate grid + Add (From/To/Date/Rate); F-0022 | 2026-06-26 | 📝 captured |
| Admin-Settings → General → Financial Year | FY grid + Add (Entity/Start/End/Opening); F-0021 | 2026-06-26 | 📝 captured |
| Admin-Settings → General → Transaction Date Lock | lock-window grid + Add (Entity/Lock/End Lock); blocks txns; F-0020 | 2026-06-26 | 📝 captured |
| Admin-Settings → Users → Employees | employee grid + Create Employee (HR master, 6 sections) + Custom Fields sub-tab; TC-EMP | 2026-06-26 | 📝 captured |
| Admin-Settings → Workflows → Approval Flows | jBPM approval grid + Create Flow (stages/roles/mandatory) + Assign Users (users/due-days); F-0007/147 | 2026-06-26 | 📝 captured |
| Admin-Settings → Form Templates | ALL 5 tabs: Form Templates · Global · Stagewise · Line Item · Grid Form Templates; TC-FT/F-0053/F-0023 | 2026-06-26 | ✅ all 5 tabs captured |
| Admin-Settings → Items | 2 tabs: UOM (Name/Description) + Item Categories (Name/Desc/Parent tree); Item-form dropdown masters | 2026-06-26 | ✅ both tabs captured |
| Admin-Settings → Inventory | ALL 4 tabs: Barcode Print Format · Warehouses (**Scrap WareHouse** auto-route) · Locations (in-warehouse bins, tree) · Inventory Ledger (Finance Group→GL account) | 2026-06-26 | ✅ all 4 tabs captured |
| Admin-Settings → Planning | 3 tabs: Resources · Activities · Resource Capacities (type-aware: Resource/User Reg Type/Machine; +User Name +Capacity Rate per type) | 2026-06-26 | ✅ all 3 tabs captured (Machine type TBD) |
| Admin-Settings → Inspections | 2 tabs: Inspection Parameters (Name/Desc/Data Type) + Inspection Items Parameters (per-item param grid: Min/Max/Std/Tolerance%, Sample Type) | 2026-06-26 | ✅ both tabs captured |
| Admin-Settings → Projects → Project Code | 3 sub-tabs: Project Code w/ BOQ Seq · Project Code Seq · Site Code Seq (auto-gen code composer: Delimiter/Digits + attribute grid) ⚠️ legacy/.action capture | 2026-06-26 | ✅ all 3 sub-tabs captured |
| Admin-Settings → Delivery | ALL 3 tabs: Labelling (per-Label-Type field grid) · Vehicle Master (capacity grid) · Transporter Vehicles (Own/Transporter + vehicle/driver grid → Delivery Note dropdowns) | 2026-06-26 | ✅ all 3 tabs captured |
| Admin-Settings → Contracts | 2 tabs: Master (Contract Type) + D & O Categories (Category Name) — contract-module dropdown masters | 2026-06-26 | ✅ both tabs captured |
| Admin-Settings → Ledgers | ALL 3 tabs: Expense Category = Chart of Accounts · Accounts Mapping (posting code → GL) · Account Opening Balance (migration go-live balances, per entity/currency); ⚠️ param-10001-gated | 2026-06-26 | ✅ all 3 tabs captured |
| Admin-Settings → Taxes | Tax Rates (Tax Type/Group Tax/Module + component grid: Tax Name/%/GL Code; group splits e.g. CGST+SGST); cross-link Tax Country Mapping + WHT param 70 | 2026-06-26 | ✅ single tab captured |
| Admin-Settings → Cost Centers | Cost Centre tree (Code/Desc/Parent/Budget) → main-module dropdowns; ⚠️ legacy/.action capture | 2026-06-26 | ✅ single tab captured |
| Admin-Settings → Banks | type-aware bank/cash account (Account Type: Checking/Current/Savings·Cash·POS Cash·POS Terminal) + GL Accounts link; §10001 | 2026-06-26 | ✅ single tab captured (POS subtypes TBD) |
| Admin-Settings → Sales | 16 dropdown-value masters (Lead Source/Status, Opportunity Stage, Quote Status, Agents Details, Booking*, Mode of travel, Asset Return Status, …) — uniform Name+Status shape | 2026-06-26 | ✅ family-level captured (uniform; no per-tab) |
| Admin-Settings → CRM/HRMS/Seller APIs/Integration/Data Upload/Analytics | — | 2026-06-26 | ⛔ OUT OF SCOPE — not developed (product owner) |
| Admin-Settings → Production | 5 in-scope tabs: Delay Reason · Machine Master · Tasks Master · Capacity Planning · Routing Master. Tool ⛔ OUT OF SCOPE (customer-specific) | 2026-06-26 | ✅ all in-scope tabs captured |
