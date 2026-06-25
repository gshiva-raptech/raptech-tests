# F-0028 — Sales → Agents Details edit blocked (th:replace runs before th:if → GL picker leaks onto edit)

**Type:** confirmed bug · **Severity:** medium (cannot edit an agent when GL Code is required)
**Case:** TC-SALES-003 (edit blocked; documented + worked around so the rest of the path runs)
**Found:** Admin → Sales → Agents Details → Edit, 2026-06-24 (verified by DOM + DB)

## Repro
With the org's GL-code param ON, edit an Agent → click **Update** → silent no-op (URL stays on
`/{id}`, nothing persists). The create-only required **GL Code category-picker** is present on the edit
form with an empty display, so `RaptechForm.trySubmit()` blocks on a required-but-empty field.

## Root cause
`templates/admin/sales/agents-details/form.html:150` puts BOTH attributes on one `<th:block>`:
```html
<th:block th:if="${glCodeRequired and isNew}"
          th:replace="~{layout/category-picker :: categoryPicker(... required=true)}">
```
In Thymeleaf, `th:replace` (precedence 100) executes **before** `th:if` (precedence 300), so the block
is replaced by the fragment and the `isNew` guard is discarded → the required picker renders on edit
too. Live DOM on the edit page shows a `.field[data-req="1"]` containing `catpick_parentGlCodeId`
(should be create-only); filling it via JS lets the same Update persist correctly — isolating the picker
as the blocker.

## Fix
Don't combine `th:replace` with `th:if` on the same element. Wrap the picker in a parent that carries
`th:if="${glCodeRequired and isNew}"` and put only `th:replace` on the inner block (or use `th:insert`
on a guarded wrapper). **Audit the same idiom elsewhere** — any form combining a required `th:replace`
fragment with `th:if` on one element has this latent bug.
