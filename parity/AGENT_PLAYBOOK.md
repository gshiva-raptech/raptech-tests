# Parity test agent playbook (Admin-Settings modules)

> ⚠️ **READ `parity/TESTING_RULES.md` FIRST — it OVERRIDES anything here.** We now test **UI-only, like a
> manual tester**, and **verify what the user SEES** (grid DOM, on-screen messages, field/button states,
> navigation) — NOT via the JSON `rows` endpoint or `psql`. Any "verify via the rows endpoint" guidance
> below is superseded: use it only as a sanity aid, never as the pass/fail proof. `psql` is for cleanup /
> last-resort seeding only. Also test ALL validations + EVERY function, and diff legacy↔migrated from the
> user's view.

You are writing/running parity tests for ONE migrated SaaS-ERP module. The migrated Spring Boot app
is **already running** at `http://localhost:8080` — DO NOT rebuild/restart it. Legacy app is reference
only. Migrated source: `/Users/gshiva/Projects/raptech_v_1-0`. Test harness: `/Users/gshiva/Projects/raptech-tests`.

## Goal
For each sub-tab of your module: write a **grid case** (reachable + columns) and a **CRUD case**
(create / duplicate-guard / edit / delete), run them, and make them green — OR surface a *real* bug.

## Hard rules
- Run cases ONLY with: `cd /Users/gshiva/Projects/raptech-tests && node parity/run-case.mjs --case <ID> --instance local-dev --no-findings`
  (ALWAYS pass `--no-findings` — prevents finding-number races across parallel agents.)
- Case files go in `parity/cases/legacy-vs-migrated/` named `TC-<PREFIX>-<slug>.mjs` using the EXACT id
  prefix you were given (avoids collisions with other agents).
- Every case: `track: 'B'`, `role: 'regular'` (these are org-user modules). The runner logs in as the
  regular user automatically from `creds`.
- DO NOT edit `parity/findings/INDEX.md` or `parity/cases/COVERAGE.md` (the lead consolidates those).
- DO NOT `git commit`. DO NOT rebuild the app. DO NOT touch other agents' module files.
- Clean up ALL test data you create (see Cleanup).

## How to build a case (study these existing ones as templates)
- Simple CRUD: `parity/cases/legacy-vs-migrated/TC-ITEM-UOM-001-uom-crud.mjs`
- Dates + entity select + one-per-entity guard + endpoint delete: `TC-GEN-DL-001-date-lock-crud.mjs`
- Grid (Track B): `TC-ITEM-UOM-000-grid.mjs`
- Heavy form + DB-seeded prerequisites + FK-ordered cleanup: `TC-EMP-001-employee-lifecycle.mjs`
- Cascading selects / find-a-free-combo: `TC-FT-SCF-001-stagewise-custom-field-crud.mjs`
- Libs: `parity/lib/forms.mjs` (`loginMigrated`, `migratedChooseMs`, `fillById`), `parity/lib/db.mjs`
  (`psql(sql)` — synchronous, returns string; use `$TAG$...$TAG$` quoting), `parity/lib/fixtures.mjs`.

## Process per sub-tab
1. **Explore the controller** (`raptech-web/.../web/controller/admin/<X>Controller.java`): get
   `@GetMapping`/`@PostMapping` routes, `GridAction.of(...)` (which actions exist — Edit/View/Delete?),
   `newUrl`, the rows `m.put("<idField>", ...)` keys, dup-guard messages (`countDuplicate...` →
   "already exists"), and the form template returned. Note soft (`setDelFlag("Y")`) vs hard (`deleteById`).
2. **Inspect the form** (`raptech-web/.../resources/templates/admin/<...>/form.html`): required fields
   (`data-req`), input ids, the submit button text (`th:text="${isNew ? 'X' : 'Y'}"`, driven by
   `onclick="RaptechForm.trySubmit()"` → click via `page.getByRole('button',{name:/X/i})`).
3. **Probe live** if unsure: write a tiny inline node script (see other agents' style) to read option
   counts / field ids / grid columns as the regular user before committing to selectors.
4. Write grid case + CRUD case; run with `--no-findings`; iterate until green or a real bug is confirmed.

## Driving tips (these bit us before)
- Buttons are `type=button onclick=RaptechForm.trySubmit()` → `getByRole('button',{name:/create.../i})`.
- **Date inputs cap at `max=today`** → use dates ≤ today (e.g. 2026-01-01); a future date silently blocks submit.
- **`data-multiselect`** widget: drive the UI, not the native select — `page.click('.ms-wrap .multiselect')`
  then `page.click('.ms-wrap .ms-option')` (idempotent: only click if nothing selected).
- Plain `<select>`: `page.selectOption('#id', value)`. Searchable country/state: `forms.migratedChooseMs`.
- Some selects **cascade** (workflow depends on entity) — select parent, wait ~900ms, then child.
- Required dropdowns with **0 options** mean missing master data → seed prerequisites (DB or via the
  relevant create flow) like `TC-EMP-001` does, or pick an org/row that already has them.
- Verify create via the rows endpoint `GET /admin/<base>/<tab>/rows` (match your created id).
- Delete via the grid action's POST `/{id}/delete` (fetch with CSRF meta — copy the `del` helper from
  `TC-GEN-DL-001`). Check it actually leaves the grid.
- One-active-per-X guards: pick a free X (read existing rows, choose an unused option) — see
  `TC-WF-001` / `TC-FT-GFT-001`.

## Cleanup (mandatory, in a `finally`)
- Name test rows with a `ZZ` prefix. Delete them via `psql` FK-ordered (children first). Find table
  names from the domain `@Table(name=...)` and child FKs (query `information_schema.columns`). If the
  UI delete is soft, hard-delete in the finally so runs don't accumulate. Confirm 0 leftovers.

## Real bug vs harness issue (be rigorous — don't cry wolf)
A failure is a REAL bug only if you confirm it: check `/Users/gshiva/Projects/raptech_v_1-0/spring.log`
for a 500/400/stacktrace, or verify via DB that data didn't persist / an action errored. Common causes
of REAL bugs seen so far: `@ModelAttribute` name colliding with a field (400), delete without child
cascade (FK), a guard checked in the wrong package, a value never consumed. If instead it's a wrong
selector / unfilled required field / date-max / undriven widget — that's YOUR test; fix it and retry.

## Report back (your final message — this is the only thing the lead sees)
Return a concise structured summary:
- Module + the sub-tabs you covered, with the case IDs you created.
- For each case: GREEN, or the failing aspects.
- Any REAL bug: `{tab, action, symptom, root cause (file:line + evidence), suggested fix}`.
- Any tab you could NOT test and why (e.g., needs master data you couldn't seed).
- Confirm test data cleaned up (0 leftovers).
Do not claim a bug you didn't verify against the log/DB.
