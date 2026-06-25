# F-0009 — User Creation Limit (param 102) not enforced

| Field | Value |
|---|---|
| Case | code audit + action test (TC-PARAM-ACT-128 covers the mobile sibling 128) |
| Instance | local-dev |
| URL path | /admin/users/new (POST create) |
| Module / Sub Module | Users / Org Parameter 102 (User Creation Limit) |
| Priority | Medium-High |
| Status | Open |
| Found | parity testing session, 2026-06-23 |

## Expected (legacy = source of truth)
Org parameter **102 (User Creation Limit)** caps the total number of users an org can create — creating
beyond the configured limit should be blocked (like the mobile sibling 128).

## Actual (migrated)
- **Param 102 is never read.** `UserServiceImpl.createInternal` enforces only the **mobile** limit
  (`enforceMobileUserLimit`, param 128). There is no total-user-count check against param 102.
- The only "102" references in the codebase are unrelated: `Modules.CONTRACT_TYPE = 102` and
  `ProspectsController.RESERVED = 102` (a prospect mapping status). So creating users is unlimited
  regardless of the User Creation Limit setting.

## Evidence / how observed
- `grep '102 | USER_CREATION_LIMIT | RESERVED'` across service+web → only the unrelated hits above.
- `UserServiceImpl.createInternal` validates password/userName/entity then calls only
  `enforceMobileUserLimit(...128...)`; no 102 check.

## Notes for triage / fixer
- **Audit correction:** ORG-PARAMETER-AUDIT.md marked 102 WIRED — a FALSE POSITIVE (matched the
  unrelated `RESERVED = 102`). 102 is actually **config-only / not consumed**. Wired total 41 → 40
  (after F-0007's 147 correction).
- Fix: add a total-user-creation-limit check in `UserServiceImpl.createInternal` reading param 102
  (`findEnabledParameterValue(orgId, 102)`) and comparing to `userRepo.countByOrg(orgId)`, mirroring
  `enforceMobileUserLimit`. The mobile limit (128) is correctly enforced — see TC-PARAM-ACT-128.
