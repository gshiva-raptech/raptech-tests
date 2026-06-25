# F-0035 — Roles grid: an Active role (status 0) renders as "Inactive" (manual #10)

**Type:** confirmed bug (UI parity) · **Severity:** medium · **Case:** TC-UIP-10 · Verified 2026-06-24 (code+DB)

## Symptom
A newly-created (Active) role shows the red "Inactive" status icon in the Roles grid, though DB
`roles_.status = 0` (Active) and the rows endpoint returns `status: 0`.

## Root cause (a convention mismatch, NOT a systemic inversion)
Status conventions differ by entity: **Organization 1=Active**, but **Role 0=Active**. The grid icon
renderer `raptech-grid.js:373` ("value===1 ⇒ green; else red") expects 1=Active. Peer endpoints
normalise before returning (ItemsController/FormTemplatesController/PlanningController map `0/null→1`),
but `RolePermissionController.roleListRows()` (`RolePermissionController.java:98`) returns the **raw**
status (`r.getStatus()`), so an Active role (0) → red icon.

## Fix
In `roleListRows()` map the STATUS_ICON value `0/null → 1` (Active), `1 → 0` (Inactive), mirroring
`ItemsController`. (Org grid is already correct under its 1=Active convention.)
