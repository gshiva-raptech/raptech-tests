# F-0039 — "Pricing" menu under Main is a dead link (manual #17)

**Type:** confirmed bug (missing route/feature) · **Severity:** medium · **Case:** TC-UIP-17 · Verified 2026-06-24
## Symptom
Clicking "Pricing" does nothing — `layout/sidebar.html:65` is `<a href="#" data-label="Pricing">` (no
`th:href`); stays on `/home#`.
## Root cause
No `/pricing` controller/route exists in raptech-web (only `OrgPricingController` at `/admin/org-pricing`,
a different super-admin grid). Legacy pointed Pricing at `/pricing/pricingDetail.action` (the org-user
plan/subscription page). Also: the migrated link is gated `@perm.isSuperAdmin()` while legacy gated it as
an org-user item — a visibility divergence.
## Fix
Add a real `th:href` + a Pricing controller/route (org-user pricing/subscription page equivalent to legacy
`pricingDetail`); reconsider the superadmin-only gating.
