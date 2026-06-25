// TC-GEN-FY-000 — General → Financial Year grid (org admin, non-superadmin) — Track A.
export default {
  id: 'TC-GEN-FY-000', title: 'Financial Year grid columns', track: 'A', role: 'regular',
  urlPath: '/admin/general/financial-year', module: 'Admin Settings', subModule: 'General → Financial Year',
  hints: '- Legacy: /admin/viewFinancialYear.action. Migrated: GeneralController.financialYearList + FinancialYearSchema.',
  async runLegacy({ page, base, signInUrl, creds, forms, shot }) {
    await forms.loginLegacy(page, signInUrl, creds.user, creds.pass);
    await page.goto(`${base}/admin/viewFinancialYear.action`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    const columns = await page.$$eval('[role=columnheader]', els => els.map(e => e.textContent.trim()).filter(Boolean));
    return { columns };
  },
  async runMigrated({ page, base, creds, forms, shot }) {
    await forms.loginMigrated(page, base, creds.user, creds.pass);
    const MIG = base.replace(/\/+$/, '');
    await page.goto(`${MIG}/admin/general/financial-year`, { waitUntil: 'networkidle' });
    await page.waitForSelector('.ag-header-cell-text', { timeout: 10000 }).catch(() => {});
    await page.waitForTimeout(1000);
    const columns = await page.$$eval('.ag-header-cell-text', els => els.map(e => e.textContent.trim()).filter(Boolean));
    const rows = await page.evaluate(async (u) => { const r = await fetch(u, { headers: { Accept: 'application/json' } }); return r.ok ? await r.json() : null; }, `${MIG}/admin/general/financial-year/rows`);
    return { columns, rowCount: rows ? rows.length : null };
  },
  compare(legacy, migrated) {
    const norm = arr => arr.map(s => s.toLowerCase().replace(/\./g, '').replace(/\s+/g, ' ').trim()).filter(s => s && !/^actions?$/.test(s));
    const L = norm(legacy.columns), M = norm(migrated.columns);
    const missing = L.filter(c => !M.includes(c)), extra = M.filter(c => !L.includes(c));
    return [
      { aspect: 'Grid columns match legacy', legacy: L.join(', ') || '(none)', migrated: M.join(', ') || '(none)', ok: missing.length === 0 && extra.length === 0, note: [missing.length ? `missing: ${missing.join(', ')}` : '', extra.length ? `extra: ${extra.join(', ')}` : ''].filter(Boolean).join(' | ') },
      { aspect: 'Migrated grid reachable', legacy: 'n/a', migrated: migrated.rowCount, ok: migrated.rowCount !== null, severity: 'warn' },
    ];
  },
};
