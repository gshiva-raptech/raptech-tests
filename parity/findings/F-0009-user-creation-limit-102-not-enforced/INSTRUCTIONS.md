# Fix request — F-0009: enforce User Creation Limit (org parameter 102)

> FIXING session. Read `parity/FIXER_BRIEF.md` first (legacy = source of truth; do NOT `git commit`;
> leave changes for the human to build/test/commit). See `ERROR.md` in this folder for evidence.

## The gap
Org parameter **102 "User Creation Limit"** is never enforced — an org can create unlimited users
regardless of the configured limit. Only the **mobile** limit (param 128) is enforced today.

## Root cause (confirmed)
- `raptech-service/.../service/admin/UserServiceImpl.java` → `createInternal(...)` validates
  password / userName / entity, then calls only `enforceMobileUserLimit(orgId, userAccess, null)` (param 128).
- There is **no read of param 102** anywhere (the only "102" hits are unrelated: `Modules.CONTRACT_TYPE`,
  `ProspectsController.RESERVED`).

## Fix (mirror the working mobile-limit code)
1. In `UserServiceImpl`, add a constant `USER_CREATION_LIMIT_PARAMETER_ID = 102` and a method
   `enforceUserCreationLimit(Long orgId, Long excludeUserId)` modeled on `enforceMobileUserLimit`:
   - `value = orgParameterRepo.findEnabledParameterValue(orgId.intValue(), 102)`; if null/blank → return
     (no limit). Parse to int.
   - `current = userRepo.countByOrg(orgId)` (total active users for the org).
   - if `current >= limit` → `throw new IllegalArgumentException("User creation limit (" + limit + ") reached for this organization.")`.
2. Call it in `createInternal(...)` alongside `enforceMobileUserLimit` (and on bulk create if legacy did).
3. **Check legacy** for exact semantics: which user count the limit compares against (all users vs active),
   whether edit is excluded, and the exact message — match it.

## Definition of done
- With 102 enabled + a limit below the org's user count, creating a user is blocked with the limit message;
  with 102 off, unlimited (matches legacy).
- Add/extend a parity case (model on `TC-PARAM-ACT-128`) and confirm it passes:
  `node parity/run-case.mjs --case <ID> --instance local-dev`.
- Update this finding's row in `parity/findings/INDEX.md` → Fixed; log in the migrated repo `summary.md`.
  Do NOT `git commit`.
