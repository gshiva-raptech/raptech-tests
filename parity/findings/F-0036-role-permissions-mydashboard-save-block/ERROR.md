# F-0036 — Role Permissions can't be saved: mandatory "My Dashboard" tab blocks validation (manual #13)

**Type:** confirmed bug · **Severity:** high (role permissions cannot be saved at all) · **Case:** TC-UIP-13
Verified 2026-06-24 (UI repro + code).

## Symptom
Saving a role's permissions shows "Please select at least one permission for: Tab - My Dashboard" and no
success; the My Dashboard tab checkbox can't be toggled even when clicked → Save is permanently blocked.

## Root cause
"Tab - My Dashboard" (module 2) and "Menu - My Dashboard" (212) are mandatory (`modules.is_mandatory='Y'`).
`permissions.html:467` renders mandatory tab checkboxes **checked + disabled** (hence "can't select"). For
a role with no existing permission row, all CRUD flags default false. `validatePermissions()` iterates
**every checked** `.perm-tab-cb` — including the disabled mandatory My Dashboard tab — and requires ≥1 CRUD
flag, which the user has no way to set on a disabled control → save can never pass.

## Fix
In `validatePermissions()` skip mandatory/disabled tab checkboxes; and/or default mandatory tabs to
`view=true` in `collectPermissions()` (or the service tree) so they satisfy the rule — legacy auto-grants
the mandatory dashboard modules.
