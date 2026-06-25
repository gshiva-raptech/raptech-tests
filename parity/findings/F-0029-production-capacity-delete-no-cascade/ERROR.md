# F-0029 — Production → Capacity Planning delete endpoint FK-fails (no child cascade)

**Type:** confirmed bug · **Severity:** low (endpoint NOT exposed in the UI — Capacity menu is Edit+Details only)
**Case:** TC-PROD-CP-001 (recorded as an informational check) · **Found:** 2026-06-24 (verified spring.log)
**Same class as F-0023** (deleteById without removing children).

## Symptom
`POST /admin/production/capacity-planning/{id}/delete` on a resource that has task mappings throws and
the row stays. Not reachable from the grid (so no user impact today), but the endpoint exists.

## Root cause
`ProductionController.java:645` `capacityDelete` calls a bare `capacityRepo.deleteById(id)` without
first removing child `production_task_resource_mapping` rows.
spring.log: `violates foreign key constraint "production_task_resource_mapping_ibfk_1" … Key
(task_resource_master_id_pk)=(…) is still referenced`.

## Fix
Mirror `routingDelete` (`ProductionController.java:1007`, which removes children before `deleteById`):
delete/soft-delete `production_task_resource_mapping` rows for the resource, then `deleteById`. (Low
priority since the action isn't surfaced; fix opportunistically alongside F-0023, same family.)
