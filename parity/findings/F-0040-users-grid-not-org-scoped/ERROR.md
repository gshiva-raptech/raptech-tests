# Users module — manual issues #18–#23 (Super-Admin) — all code-verified 2026-06-24

NOTE: the stalled UI-parity agent left TC-UIP-18..23 cases that are ORG/DATA-dependent (results flip with
the switched org) — treat them as needing a hardening pass before relying on them. The ROOT CAUSES below
are confirmed directly from source (UserController + admin/users/form.html).

## F-0040 / #18 — Users grid shows ALL organizations' users (not scoped to the selected org)
`UserController.userListRows()`: `perm.isSuperAdmin() ? userService.findAllForGrid() : findAllForGridByOrg(...)`.
For superadmin it returns ALL users regardless of the switched org. Fix: scope to the active org for
superadmin too (`findAllForGridByOrg(principal.getCurrentOrgId())`).

## F-0041 / #19 — Entity dropdown empty during (superadmin) user creation
`populateModel`: `allEntities = isNew ? entityRepo.findEntitiesForUser(orgId, principal.getUserId()) : ...`.
For a superadmin (who has no entity mappings in the selected org) this returns none → empty dropdown.
Fix: for superadmin, populate from the org's active entities (`findActiveByOrg(orgId)`). (Related to F-0013.)

## F-0042 / #20 — Reset Password / Assign Report / Assign Views shown on Edit (and Detail) User
`form.html:78` wraps those links in `th:if="${!isNew}"` only → they render on BOTH edit and detail. They
are grid row-actions and should not appear on the form. Fix: remove them from the form (or gate so they
don't show on edit/detail).

## F-0043 / #21 + #23 — Delete shown on Edit User AND User Details
`form.html:631` Delete `<form th:if="${!isNew and isSuperAdmin}">` → renders on both edit and detail
(both are `!isNew`). Delete should be a grid action only. Fix: remove the Delete form from the edit/detail
template (keep delete in the grid action menu).

## F-0044 / #22 — Reporting Manager dropdown not filtered by entity
`populateModel`: `reportingManagers = userService.findReportingManagerOptions(orgId)` — org-level, not
entity-scoped → shows users outside the selected entity. Fix: filter reporting-manager options to the
selected entity (entity-scoped query / client filter on entity change).
