# F-0032/0033/0034 — Organization & Entity detail/edit not fully read-only (manual #3, #5, #6)

**Type:** confirmed bugs (UI parity) · **Severity:** medium · **Same family as F-0004** (mode=view ignored)
**Verified:** 2026-06-24, live + code. Cases: TC-UIP-03, TC-UIP-05, TC-UIP-06 (assert expected → fail now).

## #3 (F-0032) — Mandatory `*` markers shown on Organization Details
`OrganizationController.viewOrg(mode=view)` reuses `admin/org/form.html`. Fields ARE made read-only, but
the **16 `<span class="req">*</span>` markers are not suppressed** when `!canEdit` (only 1 is gated).
Legacy detail shows no `*`.
**Fix:** gate every `.req` with `th:if="${isNew or canEdit}"` (or hide `.req` via a read-only body class).

## #5 (F-0033) — Entity Name editable on Edit Entity
`admin/org/entity-form.html:105-106` renders `<input id="entityName" th:field="*{entityName}">` always
editable. Legacy locks the name once created.
**Fix:** on `!isNew`, render entityName as static text + hidden field (or `th:readonly="${!isNew}"`).

## #6 (F-0034) — Entity Details page fully editable (no read-only view)
`OrganizationController.entityList()` maps BOTH "Edit Entity" and "Entity Details" to the same URL
`/organizations/{orgId}/entities/{entityId}`; `viewEntity()` returns the editable `entity-form.html` with
`canEdit = perm.canEdit(BUSINESS_UNIT)` and **no `mode` distinction** → "Details" is the editable form (24
editable fields). Legacy `detailEntity.jsp` is static.
**Fix:** mirror the F-0004 pattern — `viewEntity` accepts `mode`, sets `canEdit=false` for view; point the
grid "Entity Details" action at `?mode=view`; gate `entity-form.html` inputs + `.req` on `canEdit`.

## Already-OK in current build (manual #2, #4, #7 — NOT reproduced)
- #2 Org status value displays on Edit + Detail (status switch / #statusName). ✅
- #4 Entity status value displays on Edit Entity (#status select shows current). ✅
- #7 "New Sequence" renders the create form (not blank). ✅
OBSERVATION (not blocking #2): org_id 1 has DB status=0 but renders "Inactive" because the form treats
status==1 as Active — a possible status-convention mismatch; may relate to manual #10 (role grid Inactive).
Tracking until the Roles agent reports.
