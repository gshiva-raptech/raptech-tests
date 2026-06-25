# Fix request — F-0001: Create Organization parity (default status + required fields)

> Worked example — already fixed this session (see `ERROR.md` → Fix). Kept as the handoff format model.
> Read `parity/FIXER_BRIEF.md` first for the standing rules.

## The gap (was)
- New org defaulted **Inactive**; legacy = **Active**.
- Create did **not** require Product / Allow-Price-Change; legacy requires both.

## Where it was fixed (migrated repo)
- `raptech-service/.../service/admin/OrganizationServiceImpl.java` — `create()` default status = 1 (Active).
- `raptech-web/.../web/controller/admin/OrganizationController.java` — `createOrg()` + `validateProductAndPrice()`.
- `raptech-web/.../templates/admin/org/form.html` — required markers on Product + Allow-Price-Change.

## Definition of done
- Re-run passes: `node parity/run-case.mjs --case TC-ORG-001 --instance local-dev` (after rebuild).
- INDEX row = Fixed. Logged in migrated repo `summary.md` (2026-06-23). Left uncommitted for the human.
