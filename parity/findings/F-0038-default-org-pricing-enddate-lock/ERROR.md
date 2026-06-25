# F-0038 — Default Org Pricing record: End Date editable (manual #8) — NEW REQUIREMENT, not legacy parity

**Type:** product-requirement change (NOT a legacy regression) · **Severity:** low/medium · **Case:** TC-UIP-08
Verified 2026-06-24 (code + DB + legacy golden master).

## Observation
The default pricing record (the org-creation TRIAL row, `txn_id IS NULL`) has an editable End Date on the
Edit Pricing form (`#toDate` editable); `OrgPricingController.orgPricingUpdate` has no default-record guard.

## IMPORTANT caveat
**Legacy makes the End Date editable on EVERY record, including the default** (`editOrgPricing.jsp:99-105`,
no conditional; no DEFAULT_FLAG column). So "lock the default's End Date" is a **new requirement** the
product owner stated in the manual doc — it is NOT strict legacy parity. Confirm before implementing.

## Fix (if the requirement stands)
Mark the row default when `txnId == null`; render `#toDate` disabled for it; reject edits to it in
`orgPricingUpdate()`.
