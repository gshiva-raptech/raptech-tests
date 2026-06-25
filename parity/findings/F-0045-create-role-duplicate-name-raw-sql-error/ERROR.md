# F-0045 — Create/Edit Role: duplicate name leaks a raw SQL error (no app-level validation)

**Type:** confirmed bug (UI parity + UX) · **Severity:** medium · **Case:** TC-SA-ROLE-2 · Verified 2026-06-24 (UI + code)

## Symptom (on screen)
New Role → enter an existing name → submit. User sees the raw DB error: "Failed to create role: could
not execute statement [ERROR: duplicate key value violates unique constraint "idx_1238548_name_" …]".
Insert is blocked (integrity OK) but the message is a leaked SQL exception.

## Expected (legacy)
Legacy validates case-insensitively, per-org, excluding self (UserDAOImpl.validateRoleName via
validRoleNameUrl) and blocks with a friendly message; the DB error is never shown.

## Root cause
RolePermissionController.roleCreate()/roleUpdate() have NO app-level duplicate check (grep: none). Only
the DB unique constraint catches it, surfaced verbatim.

## Fix
Add a case-insensitive, per-org, exclude-self dup-name check → "Role name already exists." (+ inline field
validation), mirroring legacy.
