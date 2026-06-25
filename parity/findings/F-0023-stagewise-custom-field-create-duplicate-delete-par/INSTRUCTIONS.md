# Fix request — F-0023: Stagewise Custom Field delete fails (no child cascade)

> FIXING session. Read `parity/FIXER_BRIEF.md` first (do NOT git commit; leave for human build).
> See ERROR.md for evidence.

## The gap (one line)
`stagwiseCustomFieldDelete` calls `wfLevelAttrRepo.deleteById(id)` only, but the field always has child
`wf_level_stages` rows (and their `wf_level_attr_mapp` grandchildren) → FK violation → delete fails.

## Fix
`raptech-web/.../web/controller/admin/FormTemplatesController.java`, `stagwiseCustomFieldDelete` — remove
the children first (FK-safe order: `wf_level_attr_mapp` → `wf_level_stages` → `workflow_level_attributes`),
wrapped in `@Transactional`. Use the existing repos (`wfLevelStageRepo`, `wfLevelAttrMappingRepo`); add
`deleteByWfLevelAttrId` / `deleteByWorkflowLevelStageId` finders if needed. Alternatively configure JPA
cascade / `orphanRemoval` on `WorkflowLevelAttribute → wf_level_stages → wf_level_attr_mapp` and delete the
aggregate root.

## Verify
1. Rebuild + restart.
2. `node parity/run-case.mjs --case TC-FT-SCF-001 --instance local-dev` → all 3 aspects green
   (create / duplicate / **delete removed from grid**).
3. Update this finding's INDEX row → Fixed. Log in migrated `summary.md`. Do NOT git commit.

## Scope note
Only Stagewise **delete** is broken. The other Form Templates tabs pass fully: Form Templates + Global
Custom Fields (create/dup/edit/delete), Line Item + Grid Form Templates (create/dup/delete). Stagewise
create + the one-per-org+entity+workflow duplicate guard also work.
