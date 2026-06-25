// TC-TCM-000 — Tax Country Mapping grid (super admin tab) — Track A column comparison.
export default {
  id: 'TC-TCM-000',
  title: 'Tax Country Mapping grid columns',
  track: 'A',
  role: 'superadmin',
  urlPath: '/admin/tax-country-mapping',
  module: 'Admin Settings',
  subModule: 'Tax Country Mapping',
  hints: '- Legacy: /admin/viewTaxCountryMapping.action.\n- Migrated: AdminMiscController.taxCountryMappingList() + TaxCountryMappingSchema.',

  async runLegacy({ page, base, signInUrl, creds, forms, shot }) {
    const shots = {};
    await forms.loginLegacy(page, signInUrl, creds.user, creds.pass);
    await page.goto(`${base}/admin/viewTaxCountryMapping.action`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    const columns = await page.$$eval('[role=columnheader]', els => els.map(e => e.textContent.trim()).filter(Boolean));
    shots.grid = shot('grid'); await page.screenshot({ path: shots.grid, fullPage: true }).catch(() => {});
    return { columns, shots };
  },

  async runMigrated({ page, base, creds, forms, shot }) {
    const shots = {};
    await forms.loginMigrated(page, base, creds.user, creds.pass);
    const MIG = base.replace(/\/+$/, '');
    await page.goto(`${MIG}/admin/tax-country-mapping`, { waitUntil: 'networkidle' });
    await page.waitForSelector('.ag-header-cell-text', { timeout: 10000 }).catch(() => {});
    await page.waitForTimeout(1000);
    const columns = await page.$$eval('.ag-header-cell-text', els => els.map(e => e.textContent.trim()).filter(Boolean));
    const rows = await page.evaluate(async (u) => {
      const r = await fetch(u, { headers: { Accept: 'application/json' } }); return r.ok ? await r.json() : null;
    }, `${MIG}/admin/tax-country-mapping/rows`);
    shots.grid = shot('grid'); await page.screenshot({ path: shots.grid, fullPage: true }).catch(() => {});
    return { columns, rowCount: rows ? rows.length : null, shots };
  },

  compare(legacy, migrated) {
    const norm = arr => arr.map(s => s.toLowerCase().replace(/\s+/g, ' ').trim()).filter(s => s && !/^actions?$/.test(s));
    const L = norm(legacy.columns), M = norm(migrated.columns);
    const missing = L.filter(c => !M.includes(c));
    const extra = M.filter(c => !L.includes(c));
    return [
      { aspect: 'Grid columns match legacy', legacy: L.join(', ') || '(none)', migrated: M.join(', ') || '(none)',
        ok: missing.length === 0 && extra.length === 0,
        note: [missing.length ? `missing: ${missing.join(', ')}` : '', extra.length ? `extra: ${extra.join(', ')}` : ''].filter(Boolean).join(' | ') },
      { aspect: 'Migrated grid reachable', legacy: 'n/a', migrated: migrated.rowCount, ok: migrated.rowCount !== null, severity: 'warn' },
    ];
  },
};
