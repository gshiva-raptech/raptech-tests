# Parity case coverage

Status of parity cases by area. Run any with:
`node parity/run-case.mjs --case <ID> --instance local-dev`

## Super Admin → Organization  ✅ fully covered

| Case | Action / behavior | Track | Status |
|---|---|---|---|
| TC-ORG-001 | Create Organization (+ default status Active) | A | ✅ green |
| TC-ORG-002 | Edit Organization (fields persist) | B | ✅ green |
| TC-ORG-003 | Organization Details (read-only view) | B | ✅ green |
| TC-ORG-004 | View Entity → create Business Unit (+ BU default Active) | B | ✅ green |
| TC-ORG-005 | Delete Organization (soft-delete, happy path) | B | ✅ green |
| TC-ORG-006 | Create — Product/Allow-Price-Change required (negative) | B | ✅ green |
| TC-ORG-007 | Delete blocked when org has users (guard) — seeds local DB | B | ✅ green |
| — | Assign Report | — | skipped (now handled in role-permission tab) |

Notes:
- TC-ORG-001 found 2 regressions (default status; required fields) — fixed (see findings/F-0001), now guarded by TC-ORG-001 + TC-ORG-006.
- TC-ORG-007 requires local DB access (psql) to seed the guard precondition — local-dev instance only.

## Super Admin → Org Pricing  ✅ fully covered

| Case | Behavior | Track | Status |
|---|---|---|---|
| TC-PRICE-000 | Grid columns (legacy vs migrated) | A | ⊙ accepted exception (F-0002) |
| TC-PRICE-001 | Edit Pricing — valid End Date saves; only End Date editable | B | ✅ green |
| TC-PRICE-002 | Edit Pricing — End Date required + must be ≥ current (server) | B | ✅ green |

Notes:
- **F-0002 → ACCEPTED:** migrated grid columns are an intended redesign (pricing-centric).
  Recorded in `parity/exceptions.json` so TC-PRICE-000 passes (shows `ACCEPTED ⊙`) instead of
  flagging. The check still runs, so a *future* drift from the accepted migrated columns would
  resurface.
- The Edit Pricing **function** matches legacy (only End Date editable; required; ≥ current).
- Grid is scoped to the session-active org (top-bar org switcher); tested against the default
  active org (RAPTech Solutions), which has a pricing row.

## Super Admin → Roles  ✅ covered (1 open finding)

| Case | Behavior | Track | Status |
|---|---|---|---|
| TC-ROLE-000 | Grid columns (legacy vs migrated) | A | ✅ green |
| TC-ROLE-001 | Create Role (name+Group; defaults Active) | B | ✅ green |
| TC-ROLE-002 | Create Role — Group required (server) | B | ✅ green |
| TC-ROLE-003 | Edit Role (name + status persist) | B | ✅ green |
| TC-ROLE-004 | Delete Role (edit-form button) | B | ✅ green |
| TC-ROLE-005 | Role Details read-only | B | ✅ green (F-0004 fixed + verified) |

## Super Admin → Role Permissions  ✅ fully covered

| Case | Behavior | Track | Status |
|---|---|---|---|
| TC-RPERM-000 | Page loads — role selector populated, matrix hidden until select | B | ✅ green |
| TC-RPERM-001 | Create role → grant permission → save → persists (endpoint + tree) | B | ✅ green |

Notes:
- **F-0004**: migrated "Role Details" (`?mode=view`) shows the editable form (controller ignores
  `mode`); legacy detailRole is read-only. Needs triage: make it read-only vs accept editable.
- Two false positives were caught & fixed before standing by them: TC-ROLE-003 status (must drive the
  relocated header toggle, not the hidden `#status` select) and TC-RPERM-001 save (the matrix cascade
  trips client validation — tested via the real save endpoint + modules tree instead).

## Super Admin → Item Formula  ✅ fully covered

Org-scoped matrix (not a grid). Tested against a fixture org via the org switcher.

| Case | Behavior | Track | Status |
|---|---|---|---|
| TC-IF-000 | Page loads — Price base rows (Selling/Net), Price/Qty selector, Save | B | ✅ green |
| TC-IF-001 | Save persists (Costing enable + formula on Selling Price row) | B | ✅ green |
| TC-IF-002 | Price/Qty selector swaps base rows (Selling/Net ↔ Calculated Qty) | B | ✅ green |

Notes:
- New reusable helper `switchOrg()` (POST /switch-org/{id}) — config tabs target the session-active
  org, so cases create a fixture org and switch into it before configuring. Reused by the remaining
  org-scoped config tabs (Org Parameter, Tax Country Mapping, Sequence Number, Barcode).
- ⚠️ **Config covered, ENGINE missing → F-0005:** the formulas are defined/stored but **not consumed**
  by any module (Cost Estimate / Quotation / Sales Order / PO never evaluate them; `CostingLineItem` is
  hardcoded). So a defined Qty/Price formula does NOT affect calculations. Needs the fixer (legacy spec)
  to build + wire a formula evaluator. A consuming-module case (TC-IF-003) will be added once it exists.

## Super Admin → Org Parameter  ✅ fully covered

Org-scoped conditional-parameter matrix. Tested against a fixture org via the org switcher.

| Case | Behavior | Track | Status |
|---|---|---|---|
| TC-OP-000 | Page loads — parameter list renders, scoped to selected org, Save present | B | ✅ green |
| TC-OP-001 | Enable a parameter → save → persists | B | ✅ green |

## Org Parameter — business-rule consumption (NEW track, in progress)

Beyond config: verify each parameter's BUSINESS RULE actually changes what an **org user** sees/can do
in the consuming module. Loop: configure as super admin (switch into the org) → log in as the org user
(shekar_N, org 36) → verify the effect → restore. Expect a mix of wired rules (green) and unwired gaps
(findings, like Item Formula F-0005). Multi-session program; piloting the Item module first.

| Case | Parameter / rule | Module | Status |
|---|---|---|---|
| TC-IPARAM-001 | "Item Type" params gate the Add-Item type list | Items / Add Item | ✅ green (disable→hidden, restore→back) |
| TC-IPARAM-002 | 8 item form-gate params change the Add-Item form | Items / item form | ✅ 5 effect-seen (15,62,82,118,131); 3 behavioral/conditional warns (100 expense-type-only, 136 edit-only, 106 numbering-on-save) |

**Item module wired params (25/25): e2e-covered.** 17 item-types (TC-IPARAM-001 mechanism) + 8 form-gate
(TC-IPARAM-002). All confirmed wired.

### Non-Item WIRED params — e2e progress (cases TC-PARAM-CUST, TC-PARAM-SUPP-BANK)

| Param | Module | e2e result |
|---|---|---|
| 87 Customer-ID auto-gen | Customers | ✅ effect seen (vendorId readonly↔required swap; form accessible to shekar_N) |
| 88 Supplier-ID auto-gen | Suppliers | ✅ effect seen |
| 86 Multi-entity Accounting | Banks | ⚠️ wired (code) but generic form-diff blind: switches a `<select multiple>` / extra rows; signature ignores `multiple`+options. Confirm via bespoke check. |

**Harness lesson:** the generic form signature catches field-set + readonly + required changes, but NOT
`<select multiple>` toggles or option-list changes. So "no visible change" = inconclusive (WARN), never a
failure — code-confirmation stands.

### Remaining ≈13 — precise per-param verification spec (bespoke tests, in progress)
All **code-confirmed wired**; each needs a targeted test (effect + form + method below).

All 42 wired params are **code-confirmed**. e2e results (cases TC-PARAM-CUST, TC-PARAM-SUPP-BANK, TC-PARAM-B1, TC-PARAM-B234):

| Param | Module | e2e result |
|---|---|---|
| 87 Customer auto-gen | Customers | ✅ effect seen (vendorId readonly/required) |
| 88 Supplier auto-gen | Suppliers | ✅ effect seen |
| 86 Multi-entity | Banks | ✅ effect seen (hidden #multipleEntityWithAccount flips) |
| 10002 Paybook | Users | ✅ effect seen (Emp-ID field appears; shekar_N can reach user form) |
| 167 Skill Level | Planning | ✅ effect seen (skill-level field hidden when on) |
| 147 Customer Approval | Customers | ❌ **F-0007 (confirmed bug)** — never consumed; customers always created LIVE(131) regardless of 147 |
| 176 Jazz / 177 Est-Hours / 184 Cycle Time | Planning | ⚠️ code-confirmed wired (real isParamEnabled reads, pkg [10000,29] — 167 proves package OK). Effect is in the routing-master **Task-Details sub-table** (cycle-time columns / est-hours), which only renders after adding a task row → static form-diff can't reach. Would need a dynamic-row interaction test. |
| 149 Deals Closed Reason + 150 Deals URL | Deals | ❌ **F-0008 (confirmed bug)** — OpportunityController checks them in GLOBAL package (10000); they live in Deals package (27) → never take effect |
| 77 Deal processing | Deals | ⚠️ code-confirmed; workflow type on save (behavioral) |
| 128 Mobile User Limit | Users | ✅ **enforced** (TC-PARAM-ACT-128: limit 0 → "Mobile user limit reached"; off → allowed) |
| 102 User Creation Limit | Users | ❌ **F-0009 (confirmed bug)** — never enforced (only mobile 128 is); audit false-positive |
| 10027 Resource-WH | Inventory | ⚠️ code-confirmed wired (InventoryController real read) — enables "Assign Resource" **grid action** (not a form field) → not form-diff-able. |
| 10021 Entity-based Seq | Global | ⚠️ code-confirmed wired (SequenceNumberServiceImpl) — affects document **numbering** on save (behavioral). |

**Net: all 42 wired params code-confirmed; e2e effect directly demonstrated for 87/88/86/10002/167 (+ Item
module's 15/62/82/118/131 + item-types).** The ⚠️ rows are behavioral (save-time: status/limits/numbering/
scheduler) or live on a sub-form/JS-reveal the generic form-diff doesn't reach — NOT defects (each is wired
in code). No findings from the wired set. Bespoke action tests (create-and-check / exceed-limit) could close
the ⚠️ rows if desired.

**Full audit done → `parity/findings/ORG-PARAMETER-AUDIT.md` (all 189 params).** Key result:
**42 wired / 147 no-consumer-found**. Items module fully wired (25/25, incl. 15/62/82/100/106/118/131/136/
10001/17 — code-confirmed via ItemsController `ids.contains` + TC-IPARAM-001 e2e). ~147 params across
Sales Order/Invoice, Purchase, Cost Estimate, Projects, POS, Deliveries, Admin/Global, etc. are config-only
→ consolidated finding **F-0006** (+ F-0005 Item Formula). Candidate gaps need per-param legacy verification
before being treated as confirmed defects.

## Super Admin → Tax Country Mapping  ✅ covered (1 columns diff)

| Case | Behavior | Track | Status |
|---|---|---|---|
| TC-TCM-000 | Grid columns (legacy vs migrated) | A | ⊙ accepted exception (F-0010 — extra Tax Type/Business Type columns; recorded in exceptions.json) |
| TC-TCM-001 | CRUD lifecycle: create / in-grid / **duplicate blocked** / edit / delete | B | ✅ green (all actions work) |

## Super Admin → Sequence Number  ✅ covered

Org-scoped logical-key sequence config (current/pending keys + Save via `itemJsonString`).

| Case | Behavior | Track | Status |
|---|---|---|---|
| TC-SEQ-000 | Page renders sequences (91 keys), scoped to org, Save form + itemJsonString present; entity selector reflects 10021 | B | ✅ green |

Notes:
- **Page-load only by design.** Save mutates the live org's document-numbering **start values** — a
  behavioral mutation deliberately not run against real data. Structure + scope + save-control verified.
- Entity selector (`#entityId`) appears only when **10021 (entity-based seq)** is enabled in the GLOBAL
  package; default org has it off (test reports `hidden (param off)` as a warn, not a fail).

## Super Admin → Barcode  ✅ fully covered

Org-scoped grid; legacy enforces **one active barcode print format per org**.

| Case | Behavior | Track | Status |
|---|---|---|---|
| TC-BC-000 | Grid reachable + columns (Barcode Format / Status / Created / Updated) | B | ✅ green |
| TC-BC-001 | Create (type Qty + attrs) → in grid → **one-per-org guard blocks 2nd create** → edit attrs persist | B | ✅ green |

Notes:
- Run inside a fresh **fixture org** (switchOrg) so create + guard are deterministic and never touch a
  real org's barcode config.
- Legacy "Barcode" tab links to `viewBarcodeBulkupload.action` (bulk-upload, not a format grid) → no
  clean legacy grid URL to column-compare; verified migrated grid structure instead (Track B).
- One-per-org guard enforced on **both** GET and POST `/barcode/new` ("An active barcode print format
  already exists."). `#name` (barcode type) is locked on edit; attributes editable.

## Super Admin → Data Migration  ✅ fully covered (1 architectural note)

"Data Migration" is a **misnomer** — it is the reference-lookup **cache refresh**. Read-mostly master
data is served from cache instead of hitting the DB on every form load; when records are bulk-loaded
straight into the DB (bypassing the app), Data Migration refreshes the cache. Legacy used **Redis**;
the migrated dev replaced it with an in-process **Caffeine** cache (`CacheConfig` + `CacheNames`;
repo finders `@Cacheable`; TTL 30 min).

| Case | Behavior | Track | Status |
|---|---|---|---|
| TC-DM-001 | Full cache contract on `countries`: backend DB insert → dropdown stays stale (caching real) → Data Migration → Country evicts → new row visible; non-cached type = read-live no-op; cleanup | B | ✅ green |

How it works (verified):
- 7 caches: countries, states, currencies, glCodeHierarchy, uoms, itemCategories, functions.
- 6 of the 8 dropdown types map to caches; **Suppliers / Supplier Planning** are read live (refresh is a
  no-op → "This data is read live — already current.").
- **Editable** masters evict on write: `@CacheEvict` on UOM (×4), Item Category (×3), Function (×2) —
  app-side edits are reflected immediately.
- **Seed** masters (Country/Currency/GL) have no app edit path; they change only via backend DB load,
  which Data Migration covers. 30-min `expireAfterWrite` TTL self-heals anything missed.
- Functionally equivalent to (cleaner than) legacy **for a single app node**.

⚠️ **F-0011 (decision-needed, low/med):** Caffeine is **per-JVM**; legacy Redis was **shared**. In a
multi-node deployment, Data Migration / `@CacheEvict` only refresh the node that handled the request;
other nodes serve stale reference data until their TTL. Non-issue if each region (India / International)
is a single app node; needs Redis-backed or broadcast eviction if load-balanced. Also a stale comment in
`OrgSettingsController` (~652–656 claims "no cache" — predates the cache; the handler does evict).

## Fixer fix-verification (2026-06-24)

Re-ran the three fixer items against the rebuilt app:

| Finding | Case | Result |
|---|---|---|
| F-0008 (Deals 149/150 wrong package) | TC-PARAM-ACT-149 | ✅ green (149 OFF→hidden, ON→shown). 150: TC-PARAM-B234 WARN/parity-holds — expected /new-form detection nuance. |
| F-0009 (User Creation Limit 102 not enforced) | TC-PARAM-ACT-102 | ✅ green (102 ON → Web/Both blocked "User Creation Limit (0) reached"; OFF → unlimited). |
| F-0007 (Customer Approval 147) | TC-PARAM-ACT-147 | ❌ **fix INCOMPLETE → reopened.** OFF→131 ✅, but ON **with a flow** → `raise()` throws NOT-NULL on `workflow_audit.process_instance_id` → customer create fails, stays 131. |

**F-0007 reopened (high):** the previous pass only tested org 36 (no wtype-48 flow → `raise()` returns
empty, never inserts the audit). TC-PARAM-ACT-147 now **auto-seeds** a cloned wtype-48 flow on org
36/entity 34 (and tears it down) so the ON-with-flow path is exercised — it reproduces the bug
deterministically and will go green once `WorkflowRaiseService.raise()` sets `processInstanceId` before
`saveAndFlush` (sentinel 0; nothing reads it — routing uses `workflow_audit_track`). This `raise()` is
shared by all approval documents (PR, Deals, …), so the NOT-NULL throw affects every approval raise.
Root cause + fix in `findings/F-0007-…/INSTRUCTIONS.md`.

## Super Admin → Users  ✅ covered (1 confirmed bug)

| Case | Behavior | Track | Status |
|---|---|---|---|
| TC-USER-000 | Grid columns (legacy vs migrated) | A | ⊙ accepted exception (F-0012 — extra Department/Designation columns; in exceptions.json) |
| TC-USER-001 | Lifecycle: create · in grid · **org/entity mapping** · edit (lastName) · reset password · assign views · delete | B | ◑ create/edit/reset/delete green; **F-0013 confirmed bug**; assign-views inconclusive (no views in test org) |

Results:
- **Create** ✅ (user saved, appears in grid) · **Edit** lastName ✅ · **Reset password** ✅ ("Password
  reset successfully.") · **Delete** ✅ (soft — LEFT JOIN keeps the row but `userAccess`/status →
  **"Inactive"**).
- ❌ **F-0013 (confirmed bug):** a **superadmin-created user gets NO `org_user_mapping`** → orphaned (no
  org, no entity), even though the entity multiselect posts. Root cause: `dto.orgId` is null for
  superadmin (form has no org field; controller binds orgId only for non-superadmin) → `UserServiceImpl.
  create`'s `if (dto.getOrgId() != null)` mapping block is skipped. Fix handed to fixer (set orgId =
  session org for superadmin too). On edit, the consequence is the Entity field isn't pre-selected.
- ⚠️ **Assign Views** — endpoint is wired (loads `allViews`, saves `viewIds`), but the test org has **no
  DataViews** to assign, so the round-trip is inconclusive (warn, not a defect).

Harness notes:
- Create runs in the **default session org** (paybook OFF → manual first/last/email; default org has an
  entity + 39 roles; **org 36 has 0 assignable entities** so it can't create a user). No org selector on
  the form (this is exactly what F-0013 is about).
- **Contact Number** (`#phoneNo`) is required. **Entity** is a `data-multiselect` widget — drive the
  widget UI (open `.ms-wrap .multiselect` → click `.ms-option`), NOT `selectOption`/native select; the
  enhanced widget is authoritative at submit.
- Assign Report intentionally skipped (handled under the role-permission tab earlier).

## Admin → Organization (non-superadmin tabs)  ✅ fully covered

All three are `!@perm.isSuperAdmin()` → tested as the org user (`regular` role). Each is org-scoped,
name-keyed with a duplicate-name guard, and offers Edit + View (no delete).

| Case | Tab | Track | Status |
|---|---|---|---|
| TC-MSEG-000 | Market Segment grid | A | ⊙ accepted exception (F-0014 — header "Regional Name" vs legacy "Segment Name") |
| TC-MSEG-001 | Market Segment create / duplicate / edit | B | ✅ green |
| TC-LOB-000 | Line of Business grid | A | ✅ green (columns match) |
| TC-LOB-001 | Line of Business create / duplicate / edit | B | ✅ green |
| TC-ADDR-000 | Addresses grid | A | ⊙ accepted exception (F-0015 — extra Updated Date + Status columns) |
| TC-ADDR-001 | Address create / duplicate / edit | B | ✅ green |

Notes:
- Market Segment + Line of Business are **name-only** forms (`#name`); Addresses is a full form — required
  `name, address1, country, state, city` (country/state/city are **plain text inputs**, not searchable/cascading).
- Duplicate-name guard verified on all three ("… already exists"). No delete action (Edit/View only).
- CRUD cases clean up their ZZ-named rows via DB (`regional_master` / `functions` / `address`).
- Both grid diffs accepted as exceptions (same class as Org Pricing / Tax Country Mapping / Users grids);
  recorded in `exceptions.json` so the cases pass while still catching future drift.

## Admin → General (non-superadmin module)  ✅ covered (1 confirmed bug)

All four sub-tabs are `!@perm.isSuperAdmin()` (org-user/`regular` role), base `/admin/general`.
Grids surface Edit + View only (delete is endpoint-only, matching legacy).

| Case | Tab | Track | Status |
|---|---|---|---|
| TC-GEN-DL-000 | Transaction Date Lock grid | A | ⊙ accepted exception (F-0020 — "Entity Alias" vs legacy "Entity") |
| TC-GEN-DL-001 | Date Lock create / duplicate / edit / delete | B | ✅ green (one-lock-per-entity guard) |
| TC-GEN-CE-000 | Currency Exchanges grid | B | ✅ green (legacy grid empty for regular user → Track B) |
| TC-GEN-CE-001 | Currency Exchange create / duplicate / edit / delete | B | ✅ green (F-0022 fixed — was HTTP 400) |
| TC-GEN-FY-000 | Financial Year grid | A | ⊙ accepted exception (F-0021 — "Entity Alias" + extra Status) |
| TC-GEN-FY-001 | Financial Year create / edit / delete | B | ✅ green (edit = status-only per legacy) |
| TC-GEN-EC-000 | Email Configuration grid | B | ✅ green (legacy grid empty for regular user → Track B) |
| TC-GEN-EC-001 | Email Config create / duplicate / edit / delete | B | ✅ green (dup-name guard) |

Notes / harness lessons:
- **Date inputs cap at today** (`th:max=now`): Date Lock (both dates) + Currency (rate date) + Financial
  Year **startDate** (FY endDate/openingDate are uncapped — future end dates allowed). Tests use dates ≤ today.
- ✅ **F-0022 (FIXED — was a confirmed bug):** Currency Exchange create AND edit return **HTTP 400**. Root cause:
  `@ModelAttribute ExchangeRate exchangeRate` name collides with the form's `exchangeRate` rate field →
  Spring's DomainClassConverter tries to build the entity from "2.5" (String→Long id) → fail. Only this
  tab is affected (the other three entities have no self-named property). Fix (rename the model attribute /
  th:object, or post the rate under a distinct param) in `findings/F-0022-…/INSTRUCTIONS.md`.
- Delete is exercised via the `/{id}/delete` endpoint (grids show only Edit + View, matching legacy).

## Admin → Users → Employees (non-superadmin)  ✅ fully covered

The Users module has two sub-tabs: Users (done — TC-USER-*) and **Employees**. Employees is
`!@perm.isSuperAdmin()` (`regular` role), `/admin/users/employees`. Grid actions: Edit + Details;
New menu: Create Employee / Create Custom Field / Export.

| Case | Behavior | Track | Status |
|---|---|---|---|
| TC-EMP-000 | Employees grid reachable + columns | B | ✅ green (legacy grid empty for regular user → Track B) |
| TC-EMP-CF-001 | Employee Custom Field create / edit | B | ✅ green |
| TC-EMP-001 | Employee create → in grid → edit → read-only detail | B | ✅ green |

Notes:
- **Custom Fields drive the employee form:** Department / Designation / Employee Status dropdowns are
  populated from `custom_status` (Employee Custom Fields, by `type`). A fresh org (36) has **none**, so
  TC-EMP-001 first seeds the three via the custom-field flow, then creates the employee — this is the
  real legacy workflow (configure masters → then employees).
- Employee form has **15 required fields** (entity checkbox, empId, names, marital status, DOB, contact,
  emails, address, blood group, joining date, department, designation, base location, employee status).
  Date inputs cap at today → tests use past dates. Submit button is "Submit" (create) / "Update" (edit).
- Detail view (`/{id}/detail`) is read-only (value shown, no Submit/Update button) — matches legacy
  detailEmployeeDetails.
- Cleanup is FK-ordered: `employee_detail_mapping` (child) → `employee_details` → `custom_status`.
- Export (XLS) action present in the New menu (not exercised end-to-end).

## Admin → Workflows (non-superadmin)  ✅ fully covered

One sub-tab — **Approval Flows** (`/admin/workflows/approval-flows`, `regular` role). Grid actions:
Edit / Details / Assign User / Delete. Create = pick an Approval Type + submit.

| Case | Behavior | Track | Status |
|---|---|---|---|
| TC-WF-000 | Approval Flows grid reachable + columns | B | ✅ green |
| TC-WF-001 | Create / duplicate / details / assign-users / delete | B | ✅ green |

Notes:
- **Minimum create = select an Approval Type + submit.** First/last stages are locked (auto-included,
  pre-filled alias, mandatory; role select disabled) and exempt from validation; only *middle* included
  stages require alias + ≥1 role. The case picks an Approval Type with no existing active flow.
- **Guard:** one active flow per type per org ("An active Approval Flow already exists for this Approval
  Type.") — verified.
- Details view (`/{id}/details`) is read-only (type shown, no Create/Update button). Assign-Users screen
  (`/{id}/assign-users`) reachable.
- **Delete is soft** (`del_flag='Y'`, stage rows kept) and blocked if the flow already has raised
  workflows ("…has some workflow(s), you cannot delete this."). The case therefore **hard-cleans** its
  created flow (mapping + `workflow_stage_by_type` + `stage_by_type_role`) in a finally so runs don't
  accumulate soft-deleted junk. (Two soft-deleted debug-run mappings predate that and were left alone —
  invisible, and indistinguishable from genuinely-deleted flows.)
- Per-stage **role multiselect** + middle-stage editing not exercised end-to-end (minimum-create path only).

## Admin → Form Templates (non-superadmin)  ✅ covered (1 confirmed bug)

Five sub-tabs, all `regular` role, `/admin/form-templates/*`.

| Case | Sub-tab | Track | Status |
|---|---|---|---|
| TC-FT-000 / TC-FT-001 | Form Templates (grid + CRUD) | B | ✅ green |
| TC-FT-GCF-000 / TC-FT-GCF-001 | Global Custom Fields (grid + CRUD) | B | ✅ green |
| TC-FT-SCF-000 / TC-FT-SCF-001 | Stagewise Custom Fields (grid + create/dup/**delete**) | B | ◑ create/dup green; **delete ❌ F-0023** |
| TC-FT-LIT-000 / TC-FT-LIT-001 | Line Item Templates (grid + create/dup/delete) | B | ✅ green |
| TC-FT-GFT-000 / TC-FT-GFT-001 | Grid Form Templates (grid + create/dup/delete) | B | ✅ green |

Notes:
- **Form Templates / Global Custom Fields**: simple field CRUD (fieldName + "Text Field" type; dup-name guard).
- **Stagewise**: create = entity + workflow (`workflowId` cascades on entity; stage attributes only required
  for "Production" type). Dup guard = one per org+entity+workflow. ❌ **F-0023 (confirmed bug):** Delete
  throws — `deleteById` doesn't cascade the `wf_level_stages` children → FK violation; the row stays.
  Affects every stagewise field with stages (the normal case). Fix (delete children FK-ordered) in
  `findings/F-0023-…/INSTRUCTIONS.md`. The case cleans up FK-ordered in a finally.
- **Line Item / Grid Form Templates**: minimum create = pick a template type (field rows optional — blanks
  skipped); one-per-type guard; soft delete (case hard-cleans). Grid Form picks a free type (one's used).

## Admin → Items (non-superadmin)  ✅ fully covered

Two sub-tabs — **UOM** and **Item Categories** (`/admin/items/*`, `regular` role). (The item *master* /
Add-Item form lives in a different nav and was exercised via the Org-Parameter business-rule track —
TC-IPARAM-001/002.) Both masters are `@Cacheable` with `@CacheEvict` on writes (see F-0011).

| Case | Sub-tab | Track | Status |
|---|---|---|---|
| TC-ITEM-UOM-000 / TC-ITEM-UOM-001 | UOM (grid + create/dup/edit/delete) | B | ✅ green |
| TC-ITEM-IC-000 / TC-ITEM-IC-001 | Item Categories (grid + create/dup/edit/delete) | B | ✅ green |

Notes:
- UOM: name + description required; dup-name guard ("A UOM with this name already exists."); hard delete.
- Item Category: `code` required (dup-checked, "An item category with this name already exists."); hard delete.
  Grid columns come from a per-org GRID_FORM_TEMPLATES layout (template 234).
- Both write paths `@CacheEvict` their Caffeine cache, so edits show immediately (consistent with F-0011).

## Admin-Settings — parallel agent sweep (12 modules, 2026-06-24)

Run by 8 background agents following `parity/AGENT_PLAYBOOK.md` (role:regular, Track B, `--no-findings`,
ZZ-data FK-ordered cleanup). ~55 case files added under `parity/cases/legacy-vs-migrated/` (prefixes
TC-BANK/CC/TAX/INV/PLAN/PROD/LED/DEL/INSP/SALES/PROJ/CON). Every claimed bug was re-verified by the lead
against source / spring.log / DB before recording.

| Module | Sub-tabs | Cases | Result |
|---|---|---|---|
| Banks | 1 | TC-BANK-000/001 | ✅ grid + CRUD (data-multiselect entity, dup acct-no guard) |
| Cost Centers | 1 | TC-CC-000/001 | ✅ grid + CRUD |
| Taxes | 1 | TC-TAX-000/001 | grid ✅; **create ❌ F-0026** (form 500), **edit ❌ F-0027** (endDate binding); delete ✅ |
| Inventory | 4 | TC-INV-* (8) | ✅ all (Barcode one-per-org guard, WH, Storage Loc cascade, Inv Ledger) |
| Planning | 3 | TC-PLAN-* (6) | ✅ all (Resources, Activities, Capacities) |
| Production | 7 | TC-PROD-* (14) | ✅ all; **F-0029** (Capacity delete endpoint FK — non-UI, low) |
| Ledgers | 3 | TC-LED-* (4) | ✅ all; **F-0030** candidate (Opening-Balance delete leaves GL postings — needs legacy) |
| Delivery | 3 | TC-DEL-* (5) | Vehicle/Transporter ✅; Labelling ◑ **F-0025** (saved-banner dropped, save commits — low) |
| Inspections | 2 | TC-INSP-* (4) | ✅ all (Params, Item Params — one-active-per-item guard) |
| Sales | 2 paths | TC-SALES-* (4) | ✅ all; Agents Details edit ◑ **F-0028** (th:replace/th:if → GL picker leaks) |
| Projects | 3 | TC-PROJ-* (2) | ✅ config-form save/update (not grids) |
| Contracts | 3 | TC-CON-* (2) | ✅ grid + CRUD (contract-type, services, do-categories) |

**New confirmed bugs → fixer:** F-0025 (Delivery labelling banner, low), **F-0026** (Taxes create 500,
high), **F-0027** (Taxes edit binding, high — same class as F-0022), **F-0028** (Sales agents edit
th:replace/th:if, medium), F-0029 (Production capacity delete, low/non-UI). **Candidate:** F-0030
(Ledgers opening-balance delete — needs legacy spec). Everything else green.

**Cross-cutting patterns worth a sweep:** the `@ModelAttribute` String↔date/entity binding collision
(F-0022, F-0027) and the `deleteById`-without-cascade family (F-0023, F-0029) each recur — fixing one
is a template for the others. The `th:replace`-before-`th:if` idiom (F-0028) is latent in any form
combining a required fragment with an `isNew`/conditional guard on the same element.

## Manual Super-Admin test pass (client doc, 23 issues) — verified + UI-parity guarded (2026-06-24)

The client's manual testing found 23 Super-Admin issues (current→expected format). Verified each live +
in code (4 background agents on a UI-parity playbook addendum + lead verification). UI-parity regression
cases added as `TC-UIP-*` (assert the EXPECTED behavior so they fail now, green when fixed).

| Manual # | Outcome |
|---|---|
| #1, #9 | **F-0031** app-wide Cancel→grid + after-save popup→grid (fixer guidance; subsumes both) |
| #2, #4, #7, #11, #12 | **Already fixed in current build** — verified live, not reproduced (doc predates the fixes) |
| #3 / #5 / #6 | **F-0032 / F-0033 / F-0034** — Org Details `*` markers; Entity Name editable; Entity Details not read-only (F-0004 family) |
| #8 | **F-0038** — default pricing End-Date lock = NEW requirement (legacy allows it too) → product decision |
| #10 | **F-0035** — Active role (status 0) shows "Inactive" (roleListRows doesn't normalize for STATUS_ICON) |
| #13 | **F-0036** — mandatory "My Dashboard" tab blocks Role-Permissions save |
| #14, #15 | **F-0010 reopened** — Business Type renders "0"; unwanted Action column (was wrongly accepted) |
| #16 | **F-0037** — barcode "Create Barcode" vs "Create" + hardcoded option lists (low) |
| #17 | **F-0039** — "Pricing" menu dead link (no th:href, no /pricing route) |
| #18–#23 | **F-0040–F-0044** — Users: grid not org-scoped (#18); entity dropdown empty for superadmin (#19); Reset/Assign actions on edit+detail (#20); Delete on edit+detail (#21+#23); Reporting Manager not entity-filtered (#22) |

**Key lesson:** these are a UI-parity layer (status display, read-only enforcement, action visibility,
grid scoping, dropdown filtering, cell values, navigation) that the functional CRUD cases didn't assert —
genuinely complementary. The `TC-UIP-*` cases regression-guard it. **Caveat:** TC-UIP-18..23 (Users) were
written by an agent that stalled — they are org/data-dependent and need a hardening pass before relied on;
the underlying bugs are code-confirmed regardless.

## Super-Admin UI-ONLY re-test (manual-tester depth, legacy↔migrated) — 2026-06-24

Per TESTING_RULES.md (verify what the user SEES). 6 agent groups, ~32 `TC-SA-*` UI-only regression cases
across Organization, Roles, Role-Permissions, Users, Org-Pricing, Tax-Country-Mapping, Barcode, Sequence,
Item-Formula, Org-Parameter, Data-Migration. Each drove BOTH legacy + migrated and diffed every
field/validation/action/message/read-only/navigation from the user's view.

**Result:** the board is comprehensive — re-confirmed via UI: F-0010, F-0031, F-0032, F-0033, F-0034,
F-0035, F-0036, F-0038, F-0040, F-0042, F-0043. Validations/functions verified at PARITY (no loss):
org+user create validations, password-mismatch, duplicate-username, HTML5 email, TCM required+cascade+dup,
Barcode one-per-org guard, Sequence "select at least one", Reset Password, Assign Report/Views, Org
Parameter save ("Parameters saved successfully."), Data Migration ("Reference data refreshed.").

**NEW bugs found by the deep UI re-test:**
- **F-0045** — Create/Edit Role duplicate name → raw SQL error (no app-level dup check; legacy validates).
- **F-0046** — Item Formula Save (new row) → duplicate-key; `item_formula` identity sequence behind table
  max (migration artifact). Audited ALL 437 schema sequences — **only this one** is out of sync (isolated).

**Caveats:** F-0041 (entity dropdown empty) + F-0044 (Reporting Manager not entity-filtered) are
code-confirmed but only reproduce with a superadmin unmapped to the switched org / a two-entity org —
can't be asserted UI-only in the default org. Save-feedback "no message" concern is screen-specific
(affects Delivery labelling F-0025; NOT Item-Formula/Org-Param/Data-Migration, which show banners).

## Next areas (not yet covered)
- Harden TC-UIP-18..23 (make assertions org-independent against the switched org).
- Fix + re-verify F-0023 (Stagewise delete), then TC-FT-SCF-001 goes fully green.
- (F-0022 Currency Exchange 400 — fixed + verified green.)
- Once F-0013 is fixed: ideally exercise Assign Views against an org that has DataViews (currently WARN).
- Org Parameter business rules — remaining behavioral (176/177/184 sub-table, 10027 grid, 10021 numbering).
- Data Migration (org-user variant) — covered functionally via the superadmin variant (TC-DM-001).
