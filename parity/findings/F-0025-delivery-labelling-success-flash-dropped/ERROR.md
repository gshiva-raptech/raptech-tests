# F-0025 — Delivery → Labelling: "saved" banner dropped for label types containing spaces

**Type:** confirmed bug · **Severity:** low (cosmetic — the save itself commits)
**Case:** TC-DEL-LB-001 · **Found:** Admin → Delivery → Labelling, 2026-06-24 (verified: 302 header + DB)

## Symptom
Saving a Labelling config for a type whose value contains a space (8 of 10 types, e.g. "Stock On Hand",
"Packing Non Inventory") does NOT show the "Label configuration saved successfully." banner. Space-free
types ("Production", "Grn") show it. The DB rows persist correctly either way — only the confirmation
flash is lost.

## Root cause
`DeliveryController.java:391` (and `:355`): `return "redirect:/admin/delivery/labelling?type=" + labelType;`
builds the redirect with the **raw, un-encoded** `labelType`. The 302 `Location` carries literal spaces
(`?type=Stock On Hand`), so Spring's `FlashMap` lookup on the decoded follow-up GET doesn't match and the
`successMsg` flash attribute is never retrieved.

## Fix
URL-encode the param or let Spring do it:
`ra.addAttribute("type", labelType); return "redirect:/admin/delivery/labelling";`
(or `UriUtils.encodeQueryParam(labelType, UTF_8)`). Apply to both lines 355 and 391.
