# F-0008 — Deals params 149 + 150 checked in the WRONG package — never take effect

| Field | Value |
|---|---|
| Case | TC-PARAM-ACT-149 |
| Instance | local-dev |
| URL path | /opportunity/opportunity/new |
| Module / Sub Module | Deals / Org Parameter 149 (Closed Reason) + 150 (Deal URL) |
| Priority | High |
| Status | Open |
| Found | parity testing session, 2026-06-23 (behavioral action test) |

## Expected (legacy = source of truth)
- **149 (Deals Stage Closed Reason) ON** → selecting a "Closed Won"/"Closed Lost" stage reveals the
  **Closed Reason** field on the Opportunity form.
- **150 (Deal URL) ON** → the **URL** column appears in the Opportunity attachments table.

## Actual (migrated) — CONFIRMED via action test + code
- 149 ON → Closed-Reason field stays hidden even on a "Closed Lost"/"Closed Won" stage (stage labels
  match exactly). 150 ON → URL column does not appear (earlier TC-PARAM-B234 warn).
- Root cause: `OpportunityController` checks both via
  `orgParamRepo.countEnabledParameter(orgId, List.of(GLOBAL_PACKAGE_ID), 149/150)` (lines ~618, 623).
  But 149/150 are **Deals-package (27)** parameters; the org-parameter screen saves them under package 27.
  `countEnabledParameter` filters `package_id_fk IN (:packageIds)`, and 27 ∉ [10000] → always 0 → the
  feature gate (`stageReasonEnable` / `dealUrlEnable`) is always false.
- Contrast: `CustomerController` correctly uses `List.of(GLOBAL_PACKAGE_ID, CUSTOMER_PACKAGE_ID)` for its
  package-scoped params (87 works).

## Evidence / how observed
- DB: with 149 enabled, `org_conditional_packages.package_id_fk = 27` for org 36.
- Form: inlined `stageReasonEnable = false` even with 149 ON; closed-stage select → `#stageReasonField`
  stays `display:none`.
- `countEnabledParameter` query filters by `package_id_fk IN (:packageIds)` (confirmed).

## Notes for triage / fixer
- Fix: include the **Deals package id (27)** in the packageIds for the 149 and 150 checks in
  `OpportunityController` (e.g., `List.of(GLOBAL_PACKAGE_ID, DEALS_PACKAGE_ID)`), matching the
  Customer/Bank pattern. Re-run TC-PARAM-ACT-149 (and the 150 column check in TC-PARAM-B234) to confirm.
- Audit note: 149/150 are genuinely WIRED (real reads) but **buggy** (wrong package) — a different class
  from F-0007 (147 not read at all). No wired-count change.
