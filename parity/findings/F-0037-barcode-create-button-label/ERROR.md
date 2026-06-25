# F-0037 — Barcode create form: minor parity diffs (manual #16) · LOW

**Type:** confirmed (cosmetic/parity) · **Case:** TC-UIP-16 · Verified 2026-06-24
The barcode form structure matches legacy (2 fields + Cancel/Create). Diffs:
- Submit button label is **"Create Barcode"** vs legacy **"Create"** (`admin/barcode/form.html:137`).
- Option lists hardcoded in the template (type Select/Quantity; attrs UOM/Desc1/Desc2) vs legacy's
  server-supplied `barcodeTypeMap`/attribute map (data-source diff, not a visible diff).
**Fix:** change submit label to "Create"; optionally source the option lists server-side. Low priority.
