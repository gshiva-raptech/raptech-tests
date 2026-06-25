# F-0047 — Market Segment create/edit FORM field labeled "Regional Name" vs legacy "Segment Name"

**Type:** UI-parity (low) · **Case:** TC-OUI-MSEG-1 · Verified 2026-06-24 (legacy↔migrated UI)
Migrated New/Edit Market Segment form labels the name input **"Regional Name"**; legacy `addRegional`
labels it **"Segment Name"** (and the tab is "Market Segment"). Root: `templates/admin/org-settings/
market-segment/form.html:67`.

Relationship to F-0014: F-0014 accepted the **grid column** header "Regional Name" as the intended
migrated label — but that exception covers only the grid, NOT this create-form field. Decision needed:
either accept "Regional Name" here too (consistency with F-0014) or rename to "Segment Name" (legacy).
Low priority.

## Observation (not a code bug) — Currency Exchanges / Email Config legacy access
The legacy REGULAR user gets "Permission denied / Access Denied" on viewCurrencyRate.action and
viewEmailConfigs.action, while the migrated regular user has full access (migrated controllers gate to
non-superadmin). Likely a per-user permission/role config difference, not a code defect — lead to confirm
whether the legacy regular user *should* have these modules. Migrated side verified independently
(required-field validation works; date capped at today; no-Delete actions).
