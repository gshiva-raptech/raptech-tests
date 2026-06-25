# Fix request — F-0008: Deals params 149 + 150 checked in the wrong package (one-line fix)

> FIXING session. Read `parity/FIXER_BRIEF.md` first (legacy = source of truth; do NOT `git commit`;
> leave changes for the human to build/test/commit). See `ERROR.md` for evidence.

## The gap
Two Deals org parameters never take effect:
- **149 "Deals Stage Closed Reason"** → the Closed-Reason field should appear on a "Closed Won/Lost" stage.
- **150 "Deal URL"** → the URL column should appear in the Opportunity attachments table.

## Root cause (confirmed)
`raptech-web/.../web/controller/l2q/OpportunityController.java` checks both with
`orgParamRepo.countEnabledParameter(orgId, List.of(GLOBAL_PACKAGE_ID), 149 / 150)` (~lines 618, 623).
`GLOBAL_PACKAGE_ID = 10000`, but 149/150 are stored under the **Deals package (27)**. `countEnabledParameter`
filters `package_id_fk IN (:packageIds)`, so 27 ∉ [10000] → always 0 → `stageReasonEnable` / `dealUrlEnable`
are always false. (Contrast: `CustomerController` correctly uses `List.of(GLOBAL_PACKAGE_ID, CUSTOMER_PACKAGE_ID)`.)

## Fix (one line each)
1. Add a constant `DEALS_PACKAGE_ID = 27` in `OpportunityController`.
2. Change both checks to `List.of(GLOBAL_PACKAGE_ID, DEALS_PACKAGE_ID)` (lines ~618 stageReasonEnable and
   ~623 dealUrlEnable). Also the `findEnabledParameterValue(...149...)` checklist read is package-agnostic,
   so it's fine; just the count gates need the package.
3. **Check `ProspectsController`** and any other Deals/L2Q screen for the same `List.of(GLOBAL_PACKAGE_ID)`
   pattern on deals-package params and fix those too. Verify 27 is the right package id via the
   `conditional_packages` table.

## Definition of done
- 149 ON → selecting a "Closed Won/Lost" stage reveals `#stageReasonField`; 150 ON → URL column appears.
- Re-run: `node parity/run-case.mjs --case TC-PARAM-ACT-149 --instance local-dev` (149) and
  `node parity/run-case.mjs --case TC-PARAM-B234 --instance local-dev` (150 URL column).
- Update this finding's row in `parity/findings/INDEX.md` → Fixed; log in the migrated repo `summary.md`.
  Do NOT `git commit`.
