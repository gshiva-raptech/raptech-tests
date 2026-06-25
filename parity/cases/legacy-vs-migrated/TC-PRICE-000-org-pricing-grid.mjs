// TC-PRICE-000 — Org Pricing grid (super admin tab)
// Track A: live legacy-vs-migrated column comparison (no guessed spec).
// Reads the column headers from BOTH apps and compares the sets/labels, and
// checks the migrated grid has rows. The grid is scoped to the session-active org
// on the migrated side (top-bar org switcher); legacy lists org pricing too.
export default {
  id: 'TC-PRICE-000',
  title: 'Org Pricing grid columns',
  track: 'A',
  role: 'superadmin',
  urlPath: '/admin/org-pricing',
  module: 'Admin Settings',
  subModule: 'Org Pricing',
  hints: '- Legacy: /admin/viewOrgPricing.action grid (gridColumnArray).\n'
       + '- Migrated: OrgPricingController + OrgPricingSchema (AG-grid column defs).',

  async runLegacy({ page, base, signInUrl, creds, forms, shot }) {
    const shots = {};
    await forms.loginLegacy(page, signInUrl, creds.user, creds.pass);
    await page.goto(`${base}/admin/viewOrgPricing.action`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    const columns = await page.$$eval('[role=columnheader]', els => els.map(e => e.textContent.trim()).filter(Boolean));
    shots.grid = shot('grid'); await page.screenshot({ path: shots.grid, fullPage: true }).catch(() => {});
    return { columns, shots };
  },

  async runMigrated({ page, base, creds, forms, shot }) {
    const shots = {};
    await forms.loginMigrated(page, base, creds.user, creds.pass);
    const MIG = base.replace(/\/+$/, '');
    await page.goto(`${MIG}/admin/org-pricing`, { waitUntil: 'networkidle' });
    await page.waitForSelector('.ag-header-cell-text', { timeout: 10000 }).catch(() => {});
    await page.waitForTimeout(1000);
    const columns = await page.$$eval('.ag-header-cell-text', els => els.map(e => e.textContent.trim()).filter(Boolean));
    const rows = await page.evaluate(async (u) => {
      const r = await fetch(u, { headers: { Accept: 'application/json' } }); return r.ok ? await r.json() : null;
    }, `${MIG}/admin/org-pricing/rows`);
    shots.grid = shot('grid'); await page.screenshot({ path: shots.grid, fullPage: true }).catch(() => {});
    return { columns, rowCount: rows ? rows.length : null, shots };
  },

  compare(legacy, migrated) {
    // normalise: lowercase, collapse spaces, drop the action column
    const norm = arr => arr.map(s => s.toLowerCase().replace(/\s+/g, ' ').trim()).filter(s => s && !/^actions?$/.test(s));
    const L = norm(legacy.columns), M = norm(migrated.columns);
    const missing = L.filter(c => !M.includes(c));   // legacy columns absent in migrated
    const extra = M.filter(c => !L.includes(c));     // migrated columns not in legacy
    return [
      { aspect: 'Grid columns match legacy', legacy: L.join(', ') || '(none read)', migrated: M.join(', ') || '(none read)',
        ok: missing.length === 0 && extra.length === 0,
        note: [missing.length ? `missing: ${missing.join(', ')}` : '', extra.length ? `extra: ${extra.join(', ')}` : ''].filter(Boolean).join(' | ') },
      { aspect: 'Migrated grid has rows', legacy: 'n/a', migrated: migrated.rowCount, ok: (migrated.rowCount || 0) >= 1, severity: 'warn' },
    ];
  },
};
