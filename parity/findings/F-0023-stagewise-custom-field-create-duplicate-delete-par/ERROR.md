# F-0023 — Stagewise Custom Field delete fails (FK on wf_level_stages — no cascade)

**Type:** confirmed bug
**Severity:** medium — the **Delete** action on Form Templates → Stagewise Custom Fields throws and the
row stays. Affects every stagewise mapping that has stage rows — which is all of them (selecting a
workflow on create persists its stages).
**Case:** TC-FT-SCF-001 (create ✅, duplicate ✅, **delete ❌**)
**Found:** Admin → Form Templates → Stagewise Custom Fields, 2026-06-24

## Repro
1. Create a Stagewise Custom Field (pick an entity + workflow) → saved (also writes one
   `wf_level_stages` row per workflow stage).
2. Delete it from the grid → "Failed to delete: …" (DB foreign-key violation); the row remains.

## Verified (DB)
```
DELETE FROM raptech_scm.workflow_level_attributes WHERE wf_level_attr_id_pk = <id>;
ERROR: update or delete on table "workflow_level_attributes" violates foreign key constraint
       "wf_level_stages_ibfk_2" on table "wf_level_stages"
DETAIL: Key (wf_level_attr_id_pk)=(<id>) is still referenced from table "wf_level_stages".
```
The created field had a `wf_level_stages` child; the parent-only delete fails.

## Root cause
`FormTemplatesController.stagwiseCustomFieldDelete` deletes only the parent:
```java
wfLevelAttrRepo.deleteById(id);   // children not removed → FK violation, caught, "Failed to delete"
```
It never deletes the child rows in `wf_level_stages` (and their grandchildren in `wf_level_attr_mapp`).
`saveStagewiseRows` always creates `wf_level_stages` rows for the workflow's stages on create, so a
normally-created stagewise field can never be deleted. (Create + the one-per-org+entity+workflow
duplicate guard both work — only delete is broken.)

## Fix → see INSTRUCTIONS.md
Delete the children first (FK order: `wf_level_attr_mapp` → `wf_level_stages` → `workflow_level_attributes`),
or add cascade, inside the delete handler (ideally `@Transactional`).
