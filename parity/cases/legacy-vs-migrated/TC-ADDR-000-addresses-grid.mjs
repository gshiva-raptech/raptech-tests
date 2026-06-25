// TC-ADDR-000 — Addresses grid (org admin tab, non-superadmin) — Track A.
export default {
  id: 'TC-ADDR-000',
  title: 'Addresses grid columns',
  track: 'A',
  role: 'regular',
  urlPath: '/admin/organization/addresses',
  module: 'Admin Settings',
  subModule: 'Organization → Addresses',
  hints: '- Legacy: /admin/address.action (module 38).\n- Migrated: OrgSettingsController.addressList() + address rows.',

  async runLegacy({ page, base, signInUrl, creds, forms, shot }) {
    const shots = {};
    await forms.loginLegacy(page, signInUrl, creds.user, creds.pass);
    await page.goto(`${base}/admin/address.action`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    const columns = await page.$$eval('[role=columnheader]', els => els.map(e => e.textContent.trim()).filter(Boolean));
    shots.grid = shot('grid'); await page.screenshot({ path: shots.grid, fullPage: true }).catch(() => {});
    return { columns, shots };
  },

  async runMigrated({ page, base, creds, forms, shot }) {
    const shots = {};
    await forms.loginMigrated(page, base, creds.user, creds.pass);
    const MIG = base.replace(/\/+$/, '');
    await page.goto(`${MIG}/admin/organization/addresses`, { waitUntil: 'networkidle' });
    await page.waitForSelector('.ag-header-cell-text', { timeout: 10000 }).catch(() => {});
    await page.waitForTimeout(1000);
    const columns = await page.$$eval('.ag-header-cell-text', els => els.map(e => e.textContent.trim()).filter(Boolean));
    const rows = await page.evaluate(async (u) => { const r = await fetch(u, { headers: { Accept: 'application/json' } }); return r.ok ? await r.json() : null; }, `${MIG}/admin/organization/addresses/rows`);
    shots.grid = shot('grid'); await page.screenshot({ path: shots.grid, fullPage: true }).catch(() => {});
    return { columns, rowCount: rows ? rows.length : null, shots };
  },

  compare(legacy, migrated) {
    const norm = arr => arr.map(s => s.toLowerCase().replace(/\./g, '').replace(/\s+/g, ' ').trim()).filter(s => s && !/^actions?$/.test(s));
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
