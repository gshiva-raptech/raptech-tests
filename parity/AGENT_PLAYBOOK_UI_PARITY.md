# UI-parity playbook addendum (manual-found Super-Admin issues)

Read `parity/AGENT_PLAYBOOK.md` first for the base conventions (run with `--no-findings`, no INDEX/COVERAGE
edits, cleanup, report format). This addendum covers the DIFFERENT assertion style needed for the
manually-found UI/behavior bugs.

## What's different here
These bugs are NOT about whether create/edit/delete persists — they're about **UI parity / behavior**:
status DISPLAY, read-only enforcement, action-menu visibility, grid org-scoping, dropdown
population/filtering, cell VALUES, navigation, blank pages, dead menus. Your case should assert the
**EXPECTED** behavior — so it FAILS now (reproducing the bug) and goes GREEN once the fixer fixes it.
That failing case IS the regression guard.

## Role
These are Super-Admin screens → `role: 'superadmin'` (the runner logs in as superadmin). For pages that
operate on a selected org, use the org switcher (`fixtures.switchOrg`) or the existing default active org.
Some issues are about the org user view — if an issue clearly needs the org user, use `role:'regular'` and
note it.

## Assertion patterns (DOM-level, Track B)
- **Field displayed:** `page.locator('#status, [name=status], .status-switch').count() > 0` AND it shows a
  value (read the rendered text/value), not just a label.
- **Read-only / non-editable:** the input is `disabled` or `readonly` (or rendered as static text). Assert
  `await el.isEditable() === false` for every field on a Detail page (and for Entity Name on Edit Entity).
- **Mandatory marker absent on Detail:** `page.locator('.req, .field-label .req').count() === 0` on the
  detail page.
- **Action NOT present:** the action/button is absent on that page, e.g. on Edit User no "Reset Password" /
  "Assign Views" / "Assign Reports" / "Delete" buttons or links; on Detail no "Delete".
- **Grid org-scoped:** fetch the rows endpoint and assert every row belongs to the selected org (compare
  an org field, or count vs a DB query for that org via `psql`).
- **Dropdown populated / filtered:** read `<select>` option count (>0), or that options match the
  expected scope (e.g. Reporting Manager options all belong to the selected entity — cross-check `psql`).
- **Cell value correct:** read the grid cell / rows JSON and assert the value is NOT the bug value
  (e.g. Business Type !== "0"; resolve the expected label from DB).
- **Navigation:** click Cancel / a menu item and assert `page.url()` changed to the expected grid/page
  (for "blank page" / "dead menu", assert the page rendered real content, not empty / same URL).
- **Verify the bug is real** before writing the assertion: reproduce it live; for server errors check
  `/Users/gshiva/Projects/raptech_v_1-0/spring.log`. If a manual issue does NOT reproduce (already fixed,
  or you can't repro), say so clearly — do not write a passing case that hides it.

## Naming
Case id prefix `TC-UIP-<n>` (UI-Parity), one case per manual issue number, e.g. `TC-UIP-02-org-status-display`.
Put the manual issue number + title in the case `title` and `hints`.

## Report (per the base playbook) — and additionally:
For EACH manual issue you were given: `{issue#, REPRODUCED? (yes/no), case id, the expected assertion,
current result (fails=bug confirmed / passes=already-ok), root cause if you found it (file:line +
spring.log/DB evidence), suggested fix}`. Clean up any data you created.
