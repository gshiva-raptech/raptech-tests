# F-0046 — Item Formula "Save" (new row) fails: identity sequence behind table max (data-migration artifact)

**Type:** confirmed bug (data/migration) · **Severity:** high (can't add a new Item Formula row in any org)
**Case:** TC-SA-IF-3 · Verified 2026-06-24 (UI repro + DB). **Isolated** — audited ALL 437 schema sequences,
ONLY `item_formula` is out of sync.

## Symptom (on screen)
Tick Costing/Quotation/SO/PO on a matrix row that has no saved formula yet + Save → red banner:
"Failed to save: could not execute statement [ERROR: duplicate key value violates unique constraint
\"idx_1236688_primary\" Detail: Key (item_formula_id_pk)=(NNN) already exists.]" — raw SQL leaked; nothing
persists. (Editing an EXISTING formula row works — it reuses its id, no INSERT.)

## Root cause
`item_formula.item_formula_id_pk` is `@GeneratedValue(IDENTITY)` (ItemFormula.java:20-21), but the Postgres
identity sequence `raptech_scm.item_formula_item_formula_id_pk_seq` is **behind** the table's max id
(verified: seq last_value=226, MAX(item_formula_id_pk)=228). Rows were bulk-loaded during migration with
explicit ids without advancing the sequence, so each new INSERT grabs an id that already exists → dup key,
until the sequence climbs past 228. Affects every org.

## Audit (good news)
Checked all 437 identity sequences in `raptech_scm` (last_value vs owning table max via pg_depend):
**`item_formula` is the ONLY one out of sync.** Not systemic.

## Fix (DB — one statement; NOT applied, shared DB)
`SELECT setval('raptech_scm.item_formula_item_formula_id_pk_seq', (SELECT MAX(item_formula_id_pk) FROM raptech_scm.item_formula));`
Add the same to the migration's post-load sequence-reset step. (Optional app hardening: surface a friendly
message instead of the raw SQL on any save error.)

## Minor parity note (same screen)
Legacy `createOrEditItemFormula.jsp` has client-side "formula required when the box is ticked" validation
(Quotation/SO/PO); migrated has no such check. Low priority, overshadowed by the save bug.
