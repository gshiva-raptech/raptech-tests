# F-0031 — App-wide: Cancel → grid, and after-save → popup → grid (consistent across all modules)

**Type:** app-wide UX-pattern change (manual-test issues #1 and #9; applies to every create/edit form)
**Severity:** medium (consistency/UX) · **Owner:** fixer — do as ONE coordinated change, not per-module.

## Desired behavior (from product owner)
- **Cancel** on Create / Edit (and Detail) discards unsaved changes and returns to the module's **grid**.
- **After a successful create/edit**, show a **success popup**; closing it leaves the user on the **grid**.
- A success/failure message must actually be visible (today "no message appears in the form heading").

## Current state (verified)
- Forms are consistent: each has a Cancel `<a>` + a `RaptechForm.trySubmit()` save button (~30 forms).
- **157 handlers** redirect to `/{id}` (the detail/edit page) on success, with a flash `successMsg`.
- Cancel targets are inconsistent — e.g. `admin/org/form.html` edit Cancel → `/admin/organizations/{orgId}`
  (the detail page), not the grid.
- `layout/grid-page.html:46` already renders `${successMsg}` as `.alert-success`. **No popup/toast exists**,
  and form pages don't surface the flash → the "no message" symptom.

## Fix (3 parts — low risk, mostly mechanical)
1. **Cancel → grid.** Point every form's Cancel link at the module grid list URL (not `/{id}`/detail).
   ~30 templates, one line each. (If a dirty-state JS handler ever blocks the click, fix it once centrally.)
2. **Success redirect → grid.** Change the success branch of the ~157 create/update handlers from
   `return "redirect:/admin/<x>/" + id;` → `return "redirect:/admin/<x>";` (the grid). Uniform per module;
   scriptable. Keep error branches as-is (stay on form with errorMsg). Flash `successMsg` already carries.
3. **Popup.** In the single `layout/grid-page.html`, render the `successMsg` (and `errorMsg`) flash as a
   dismissible **toast/popup** instead of (or in addition to) the inline banner. Because success now lands
   on the grid, "popup shown → close → on the grid" is automatic. One centralized change + CSS/JS.

## Also (so the error path shows feedback)
Ensure the shared form layout has a visible flash region for the **error** case (redirect back to the form
with `errorMsg`) — today it isn't surfaced.

## Verify
After the change: create/edit any record → lands on the grid with a success popup; Cancel anywhere →
grid; an error → stays on the form with a visible error. The harness will add UI-parity assertions
(cancel-nav + post-save-nav + flash visibility) to regression-guard this across modules.

## Scope note
This subsumes manual issues #1 (Org Cancel) and #9 (Role Cancel) and standardizes the same behavior for
every create/edit/detail form in the app.
