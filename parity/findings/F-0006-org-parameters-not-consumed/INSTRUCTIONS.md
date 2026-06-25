# Fix request — F-0006: wire Org Parameter consumption across modules

> For the FIXING session (needs LEGACY source). Read `parity/FIXER_BRIEF.md` first.
> Large program — scope per module; do NOT bulk-"fix" without verifying each against legacy.

## The gap
147 of 189 org parameters have no migrated consumer — saved but ignored. See `ERROR.md` +
`parity/findings/ORG-PARAMETER-AUDIT.md` (full per-parameter table). Items module is the wired exception.

## Where to look
- **Migrated read helpers:** `OrgConditionalParameterRepository.countEnabledParameter / findEnabledParameterValue`,
  `ItemsRepository.findEnabledOrgParameterIds / findItemTypesForOrg`. Wire new consumers through these.
- **Consuming modules (to add gating):** Sales Order, Sales Invoice, Purchase Invoice/Requisition,
  Cost Estimate, Projects, POS, Deliveries, Reorder, Labelling, etc. — match the legacy
  `retrieveOrgConditionalPackage(...)` checks in each legacy screen/action.
- **Reference pattern that works:** `ItemsController` (`ids.contains(P_*)`) + `findItemTypesForOrg`.

## Approach
1. Pick a module (start high-impact: Sales Order types + Validate Stock Qty/Warehouse Mandatory/Credit Limit).
2. Read the legacy screen/action to see exactly how each parameter gates behavior.
3. Wire the migrated controller/service/template to read the param and apply the rule.
4. Update the catalog row to WIRED; re-verify with the org-user harness (TC-IPARAM-001 pattern).

## Definition of done (per parameter)
- Enabling/disabling the param changes the org user's behavior in the module, matching legacy.
- A parity case proves it (configure → login as org user → verify → restore).
- Catalog + INDEX updated. `summary.md` logged. No `git commit`.
