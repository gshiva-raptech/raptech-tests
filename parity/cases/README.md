# Writing cases

A case is one `.mjs` file under `cases/legacy-vs-migrated/` (Track A) or `cases/new-instance/` (Track B).
The runner finds it by matching the case **id** against the filename, so keep the id in the filename
(e.g. `TC-ORG-001-create-organization.mjs`).

It exports a default object:

```js
export default {
  id: 'TC-ORG-001',           // matched against --case and the filename
  title: 'Create Organization',
  track: 'A',                 // 'A' = legacy vs migrated, 'B' = migrated only
  role: 'superadmin',         // which credential set to use
  urlPath, module, subModule, // metadata copied into any finding
  hints: '...',               // optional: where in the code a fixer should look

  data() { return { /* dataset; add a unique stamp so reruns don't collide */ }; },

  // Track A needs runLegacy + runMigrated + compare:
  async runLegacy(ctx)  { /* ...; return { ...observations, shots } }, */ },
  async runMigrated(ctx){ /* ...; return { ...observations, shots } }, */ },
  compare(legacy, migrated, data) { return [ row, ... ]; },

  // Track B needs runMigrated + check:
  // async runMigrated(ctx) { ... },
  // check(migrated, data) { return [ row, ... ]; },
};
```

**ctx** passed to `runLegacy` / `runMigrated`:
- `page` — a Playwright page (already in its own context)
- `base` — migrated/legacy base URL for the instance · `signInUrl` (legacy only)
- `creds` — `{ user, pass }` resolved from `.env`
- `data` — the dataset from `data()`
- `forms` — shared helpers (`loginMigrated`, `migratedChooseMs`, `legacyAutocomplete`, `readCounters`, …) — see `lib/forms.mjs`
- `shot(name)` — returns a screenshot file path; call `await page.screenshot({ path: ctx.shot('x') })` and record it on `result.shots = { x: <path> }` so the runner can attach it to a finding.

**Result rows** returned by `compare()` / `check()`:
```js
{ aspect: 'Default status of new org',
  legacy: 'Active', migrated: 'Inactive',   // Track A: both sides; Track B: migrated + expected
  ok: false,                                 // false → mismatch
  severity: 'fail',                          // 'fail' (default) blocks; 'warn' reports only
  note: 'migrated must match legacy' }
```

On any `ok:false` row with non-`warn` severity (Track A), the runner writes a finding and exits 1.

Keep app-driving logic in `lib/forms.mjs` (shared, proven), not inline per case.
