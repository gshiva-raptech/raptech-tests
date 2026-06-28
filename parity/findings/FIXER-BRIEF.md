# Fixer Brief — Org-Parameter "not consumed" gaps (F-0006 class)

> Hand-off for the developer/autofix agent that fixes the org-parameter findings.
> Source of findings: [ORG-PARAMETER-BEHAVIOR-SPEC.md](ORG-PARAMETER-BEHAVIOR-SPEC.md) (each section has a 🧪
> results block with pid, expected behavior, and code root-cause). Tests already exist under
> `parity/cases/legacy-vs-migrated/TC-PARAM-*`. Captured 2026-06-26 by a background test run across 8 org-param
> sections (Sales Order, Sales Invoice, Purchase Requisitions, Sales Quotes, GRN/SDN, Projects, Customers,
> Suppliers).

---

## 0. Read first
- **Findings + per-param detail:** ORG-PARAMETER-BEHAVIOR-SPEC.md → each section's 🧪 block.
- **Intended behavior (spec):** the same doc + the `Org_Parameter_*.docx` product-owner files.
- **Golden master:** the **legacy** app (`https://staging.ipactsolutions.com/SCM`). **Before wiring any param,
  open the legacy screen and confirm what it actually renders/does.** Migrated must match legacy + the doc — not a
  guess.

---

## 1. Triage each gap FIRST (before coding)
Not every gap is a regression to "fix":

- **(A) Regression → wire it.** Legacy honors the param; migrated should too. → §3 below.
- **(B) Re-architecture candidates — but DECIDED to wire for now.** The biggest case: **all "Additional Field"
  params** (SO `90/91/92/120/121/122/139/140/141/145`; SI `52/53/54/125/126/127/142/143/144/146`; PR `75/76/77`)
  — ~23 params. In migrated these *look* superseded by the Form-Template / dynamic-attribute engine
  (`dynamicAttributeService.attributesFor(orgId, docType)` → `form_attribute` table). **✅ PRODUCT DECISION
  (2026-06-27): re-wire all of them as org-params, faithful to legacy, for now** — restore legacy behavior (alias
  label + Summary-vs-Line-Item placement + the Summary **calculation type** Add/Sub/Mult + default value). The
  **migration to Form-Templates is DEFERRED until everything is tested and stable** — do NOT migrate them now. So
  for this pass they are **bucket A (wire it)**, not bucket B. *(SO `166` Sales Order Group Name is a separate
  small gap — also wire it.)*

---

## 2. Use the pattern that already works (copy, don't invent)
Two places already consume org params correctly — use them as the template:

- **Auto-sequence pattern:** `CustomerController` → param **87** → `customerIdAutoGen` drives the `#vendorId`
  field's `readonly`/`required`/placeholder in `customers/form.html`. `SuppliersController` → param **88** →
  `vendorIdAutoGen` (twin). Prefix value = `org_conditional_parameters.value_`.
- **Field-gating pattern:** `PurchaseRequisitionController.prepareForm` gates **55/84/99**; `procurement/pr/form.html`
  shows/hides accordingly.
- **Helpers:** `countEnabledParameter(pid)` (enabled state) · `org_conditional_parameters.value_` (carried value,
  e.g. prefix or validity days). Schema: `org_conditional_parameters (is_enable, value_)` joined via
  `org_conditional_packages.org_id_fk`.

---

## 3. Per-controller wiring work (bucket A regressions)

| Controller / template | Params | What ON must do (per doc — verify vs legacy) |
|---|---|---|
| `InventoryInboundController.newGrn` + `inventory-inbound/grn-form.html` | **57** | **Whole PO-price block is missing.** Add Unit Price · PO Amount · Discount % · Tax · PO Total to `captureLines`, then gate by 57: **ON = show all 5, OFF = Unit Price only.** ⚠️ Verify ON/OFF **polarity** vs legacy (name says "Hide" but doc says ON = show more). |
| `SalesOrdersController.addFormLookups` + `so-form.html` | **166** | Use the configured **SO Group Name** when Group Items = Yes. |
| `ProjectsController` (project create + `createProjectCode`) + `projects/project-form.html`, `project-code-form.html` | **46, 47, 89** | Auto-generate Project Code from the configured composer instead of manual entry. Confirm **which wins when >1 enabled** vs legacy. |
| `SalesQuotesController` + `sales-quotes/form.html` | **178, 151** | 178 → per-section image-upload control. 151 → apply validity days (`value_151`) and make the quote **read-only after expiry** (no Edit/Amend/Cancel). |
| `PurchaseRequisitionController` + `pr/form.html` | **85, 111, 112** | 85 → Service-Order PO numbering. 111 → amount **fixed** after create. 112 → amount **editable** after create. (111/112 are an exclusive pair.) |
| `CustomerController` + `customers/form.html` | **147** (field only) | Show the **Approval field** when 147 ON. *(Routing already works via `TC-PARAM-ACT-147`; only the field is missing.)* |
| `SalesInvoiceController` + `sales-invoice/invoice-form.html` | **61, 83** | 61 → enable Avalara on the invoice (currently only in print output). 83 → confirm auto-invoice-no (already auto on save; likely parity-confirm only, low priority). |

---

## 4. Non-wiring fixes (parity polish)
- **[81] message string** — migrated emits *"Customer credit limit exceeded — …"*; legacy/doc says **"Amount
  Exceeded than Credit Limit"**. Confirm exact legacy string, align migrated. **Re-check [69]** SO credit-limit
  string too (same class — the existing `TC-PARAM-SO-069` regex is `/credit limit exceeded/i`).
- **[41–45] labelling** — migrated wires these as **Business Type** (`#salesType`) options; the doc calls them
  **"Document No. Sequence."** Confirm vs legacy which label/field is correct; relabel if legacy differs.
- **[84] phrasing** — migrated gates the **summary Trade Discount** (per-line "Disc %" always shows); doc said
  "line-item." Verify vs legacy — likely doc wording, not a code fix.

---

## 5. Verify each fix (don't mark done until green)
After wiring a param, re-run its test:
```
cd raptech-tests
node parity/run-case.mjs --case <ID> --instance local-dev --no-findings
```
Case ID prefixes by area: `TC-PARAM-SO-*` · `TC-PARAM-SI-*` · `TC-PARAM-PR-*` · `TC-PARAM-SQ-*` ·
`TC-PARAM-GRN-057-*` · `TC-PARAM-PROJ-*` · `TC-PARAM-CUST-087-*` · `TC-PARAM-SUPP-088-*`.
A wired param should flip its test from **❌ gap → ✅ honors**.

- **Deferred submit-flow tests:** **[63]** Validate Stock Qty and **[81]/[69]** credit-limit need a **seeded
  stock/balance org** — build them on a seeded org mirroring the `TC-PARAM-SO-069` submit harness to assert the
  live block/allow + exact message (e.g. *"Sales Order Qty is Exceeded than OnHand Qty"* for 63).

**Rules (non-negotiable):** UI-only verification · legacy is golden master · snapshot+restore any param you toggle
· local instance only (never india/international) · **do NOT auto-commit** — a human reviews/tests/commits.

---

## Appendix — current verdict scorecard (2026-06-26 run)

| Verdict | Params |
|---|---|
| ✅ wired-correct (no action) | SO 23/24/25/26/72/41–45/56/63*/66/158/69 · PR 55/84/99 · SI 29/31/81** · Cust 87 · Supp 88 |
| ❌ gap — wire or reconcile | SO 90/91/92/120/121/122/139/140/141/145/166 · SI 61/83 + 10 addl-fields · PR 85/111/112 · SQ 178 · GRN 57 · Cust 147(field) · Proj 46/47/89 |
| ⚪ confirmed not-implemented (controller computes flag, template ignores) | PR 110, 117 |
| ⚠️ partial / nuance | 63 & 81 submit-flow deferred · 151 (value persists, form inert) · 75/76/77 · **81 wording** · **57 polarity** · **41–45 labelling** · **84 phrasing** |

\* 63 wired in code; live submit deferred.  ** 81 wired but wording divergence (see §4).

### Fix progress (verified by UI re-test)
- **✅ [147] Customer Approval field** — FIXED + verified. Wired as a required entity-scoped **"Workflow" picker**
  (`#workflowId`). Regression case `TC-PARAM-CUST-147-workflow-picker.mjs` (7/7); `TC-PARAM-ACT-147` updated 5/5;
  `TC-PARAM-CUST-087` assertion D updated → passes.
- **✅ [57] GRN Hide-PO-Price** — FIXED + verified. ON → 5 price cols, OFF → Unit Price only; polarity intentional.
  `TC-PARAM-GRN-057` 11/11 green. ⚠️ Still open: **57 not exposed on the admin org-parameter form** (package-9
  config gap) — separate from the wiring fix.
- Remaining ❌ gaps from §3 (SO 166, Proj 46/47/89, SQ 178/151, PR 85/111/112, SI 61/83) — not yet fixed.

---

## Notes to the fixer (patterns from the 147 + 57 verification — please check on the remaining gaps)

1. **Both fixes were correct first time — keep the instinct.** 147 was wired as a proper *entity-scoped* Workflow
   picker (not a static field), and 57 got the *inverted* polarity right (ON = show more) by checking **legacy**
   rather than trusting the param name. Do that on every ambiguous param.

2. **Wiring a param that adds a REQUIRED field breaks existing create-flow tests/automation.** The 147 fix turned
   `TC-PARAM-ACT-147` red because the now-required Workflow field blocked submit until something picked it — the
   test catching up, not a regression. **When a fix adds a required field, update the matching `TC-PARAM-*` case
   (and any seed/automation that creates that record) in the same change.** Expect this on SO/PR fields.

3. **Wiring the consumer is NOT enough if the param isn't on the admin form.** 57 turned out **not to be exposed
   on the admin org-parameter screen at all** (GRN/SDN *package 9*) — so even wired, an admin can't toggle it from
   the UI (only via DB). **For every gap you fix, confirm the param is actually rendered/toggleable on the admin
   org-parameter form;** if not, that's a second fix (expose it) or it ships invisible. Sweep package-9 (and check
   other packages) — 57 is unlikely to be the only one.

4. **Additional-Fields decision is MADE — wire them as org-params for now (§1 bucket B).** The ~23 "Additional
   Field" params across SO/SI/PR: **✅ re-wire faithful to legacy** (alias + Summary/Line-Item placement + Summary
   calc type Add/Sub/Mult + default). The Form-Templates migration is **deferred until everything is tested**. Pay
   special attention to the **Summary calculation type** — that's the part that feeds the document total, so it
   must match legacy's math exactly (test both the field rendering AND the total it produces).

5. **Expose param 57 on the migrated org-parameter form — CONFIRMED REGRESSION (fact-find done).** Package 9
   (GRN/SDN) contains **exactly one** param — **57** (verified in `conditional_parameters`). **Legacy exposes it**
   (verified on live staging): a **"Tab - GRN/SDN"** section renders `id="parameterId_57"` / label "Hide - PO
   Price"; legacy's screen is **fully data-driven** (no exclusion). ⇒ **Action: render 57 as a checkbox under a
   GRN/SDN section on the migrated org-parameter form** so admins can toggle it via UI (today it's DB-only).
   🚩 **Systemic check:** legacy's form is data-driven but migrated dropped 57 → the migrated org-param form is
   **not rendering every param/package legacy does.** Audit the migrated org-param form's package/param source and
   confirm it isn't filtering out OTHER params too — fix the rendering at the source, not just by special-casing 57.

5. **Trust legacy over the doc wording on ambiguous params.** The doc has minor inaccuracies we already found:
   `41–45` labelled "Document No. Sequence" but wired as **Business Type** options; `84` called "line-item" but
   it's the **summary** Trade Discount. When the doc and the form disagree, **verify against legacy** and treat
   the doc as intent, not spec.

6. **Cheap win — string parity.** `[81]` (and re-check `[69]`) emit *"Customer credit limit exceeded"* but
   legacy/doc says *"Amount Exceeded than Credit Limit"*. Align the **exact** strings, not paraphrases — they're
   user-visible and a manual tester diffs them.

7. **Side-observation (not on the gap list):** after tightening the auto-seq test to UI-only, the **generated
   Customer ID never surfaces anywhere in the migrated customer UI** (detail field empty, no grid column) —
   whereas **Supplier shows it fine** (`ZSUP814`). Check whether legacy displays the generated customer code; if
   so, that's a small UX/parity gap on the customer side.
