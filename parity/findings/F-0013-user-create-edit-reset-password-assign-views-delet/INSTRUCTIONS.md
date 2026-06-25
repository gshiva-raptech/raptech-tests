# Fix request — F-0013: Superadmin-created users are orphaned (no org_user_mapping)

> For the FIXING Claude session. Read `parity/FIXER_BRIEF.md` first (standing rules:
> legacy is source of truth, match it exactly, do NOT git commit, leave for human build).

## The gap
A **superadmin** creating a user via `/admin/users/new` produces a user with **no
`org_user_mapping`** — no org, no entity (Business Unit). The entity multiselect posts correctly,
but the mapping is silently dropped. See `ERROR.md` for full evidence.

## Root cause (one line)
`dto.orgId` is null for superadmin create → `UserServiceImpl.create`'s `if (dto.getOrgId() != null)`
mapping block is skipped. The form has no org field; `UserController` only sets orgId for
non-superadmin.

## Fix (recommended — match the rest of the admin UI: operate on the session-active org)
`raptech-web/.../web/controller/admin/UserController.java`

**`createUser(...)`** — replace:
```java
if (!perm.isSuperAdmin()) {
    dto.setOrgId(principal.getCurrentOrgId());
}
```
with:
```java
// Create in the session-active org (top-bar switcher) for everyone — matches every
// other admin tab. Superadmin had no org field, so the mapping was never written (F-0013).
if (dto.getOrgId() == null) {
    dto.setOrgId(principal.getCurrentOrgId());
}
```
Apply the **same** change in **`newUserForm(...)`** so the form's entity list and the saved org
agree. (Optionally harden `updateUser(...)` too so superadmin edits keep the org binding.)

### Alternative (only if legacy let superadmin pick any org here)
Add an Organization `<select>` (superadmin only) to `admin/users/form.html`, bound to `*{orgId}`,
entity list reloading on change. Heavier — prefer the session-org approach unless the legacy screen
had an explicit org picker.

## Definition of done
- Rebuild + restart, then `node parity/run-case.mjs --case TC-USER-001 --instance local-dev`
  → aspect **"Org/entity mapping persisted (F-0013)"** goes green
  (`org_user_mapping` has a row with `entity_id_fk` for the new user).
- Re-open the created user → Entity field **pre-selected** with the assigned BU; save not blocked.
- Update this finding's row in `parity/findings/INDEX.md` → **Fixed** with a one-line note.
- Log root cause + files changed in the migrated repo's `summary.md` (per its CLAUDE.md).
- Do **NOT** `git commit`. Leave changes uncommitted for the human to build/test/commit.
