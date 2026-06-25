# F-0013 — Superadmin-created users are orphaned (no org_user_mapping)

**Type:** confirmed bug
**Severity:** high — a user created by a superadmin has **no org and no entity (Business Unit)
assignment**, so the user is effectively unusable (can't be scoped to an org, won't appear under
the org, likely can't operate). The entity multiselect on the form posts correctly, but the
mapping is silently dropped.
**Case:** TC-USER-001 (aspect "Org/entity mapping persisted (F-0013)" → ORPHAN)
**Found:** super admin → Users → New User · 2026-06-24

## Repro
1. As **superadmin**, go to `/admin/users/new`.
2. Fill the required fields (User Name, password, First/Last name, Email, Contact Number) and
   select an **Entity** in the multiselect.
3. Submit → "User created."
4. Query the DB:
   `SELECT * FROM raptech_scm.org_user_mapping WHERE user_id_fk = <new id>;`
   → **zero rows.** No org link, no entity link. The user shows in the grid with a blank Org.
5. Re-open the user for edit → the Entity field is empty (placeholder "Select Entity"), because
   there is no mapping to pre-select. Any save is then blocked by the "Select at least one entity"
   client validation until the admin re-picks an entity.

## Root cause
`UserServiceImpl.create(...)` only writes the org/entity mapping when `dto.getOrgId()` is set:

```java
// 5. Org mapping — legacy writes one row per selected entity (status 0)
if (dto.getOrgId() != null) {                    // <-- null for superadmin
    orgRepo.findById(dto.getOrgId()).ifPresent(org -> { ... save OrgUserMapping ... });
}
```

But `UserController.createUser(...)` (and `newUserForm`) only bind `orgId` for **non**-superadmin:

```java
if (!perm.isSuperAdmin()) {
    dto.setOrgId(principal.getCurrentOrgId());
}
```

The superadmin new-user form has **no org field at all** (no `#orgId`, no selector). So for a
superadmin, `dto.orgId` stays `null` → the `if (dto.getOrgId() != null)` guard is false → no
`org_user_mapping` rows are created → the user is orphaned. The entity multiselect value
(`entityIds`) is posted but never used because the whole mapping block is skipped.

Legacy `addUser` scoped the new user to an organization (session org / selector), so the mapping
was always written.

## Fix
Bind `dto.orgId` to the session-active org for superadmin too (consistent with every other admin
tab, which operate on the org switcher's active org). Then the existing mapping block runs and the
selected entities are saved. See INSTRUCTIONS.md.

## Screenshots
- `screenshots/migrated-form.png`
