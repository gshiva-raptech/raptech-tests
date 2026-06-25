# F-0001 — Create Organization: default status + required fields

| Field | Value |
|---|---|
| Case | TC-ORG-001 |
| Instance | local-dev |
| URL path | /admin/organizations/new |
| Module / Sub Module | Admin Settings / Organization |
| Priority | High |
| Status | Fixed (by testing session, 2026-06-23) — pending build/verify |
| Found | parity testing (VM session + local re-verification) |

> Worked example. These two gaps were found by parity testing and fixed in this session on
> branch `fix/item-master-creation` (migrated repo). Kept here as the format reference and record.

## Expected (legacy = source of truth)
1. A newly created organization is **Active**.
2. The create form **requires** at least one **Product** and an **Allow Price Change in Purchase
   Invoice** choice (PO No / Yes) — legacy `saveOrUpdateOrganization` rejects with "Required." otherwise.

## Actual (migrated, before fix)
1. New org persisted **Inactive** (TOTAL +1, ACTIVE +0; detail `#statusToggle` = Inactive on a fresh org).
2. Org **created successfully with neither Product nor Allow-Price-Change** selected (→ `/admin/organizations/514`, no error) — neither was enforced.

## Evidence / how observed
- Fresh org id 514: counters TOTAL 426→427, ACTIVE 30→30; detail toggle `checked:false / "Inactive"`.
- Same org created with Product + price omitted and still succeeded.
- Verified live against `localhost:8080` (migrated) and staging (legacy).

## Screenshots
- (captured live during verification; see migrated repo `summary.md` 2026-06-23 entry)

## Fix (applied this session — uncommitted)
1. **Default status Active** — `OrganizationServiceImpl.create()` forces `status = 1` (Active) when
   `dto.getStatus()` is null (the New form has no status toggle, so it was defaulting to 0/Inactive;
   migrated model: status 1 = Active per `OrganizationRepository.countActiveStatus`).
2. **Required Product + Allow-Price-Change** — server-side validation in
   `OrganizationController.createOrg()` (new `validateProductAndPrice(dto)` helper): blocks create with a
   flash error when no Product or no price option is chosen (mirrors legacy's server-side enforcement —
   these are checkbox groups the client `.field[data-req]` tracker doesn't cover). UI: Product section +
   Allow-Price-Change label marked required in `admin/org/form.html`.

Open follow-ups (separate decisions): extend validation to the edit path; make the price field a true
single-choice (radio) like legacy. Re-run `node parity/run-case.mjs --case TC-ORG-001 --instance local-dev`
after the human rebuilds to confirm parity.
