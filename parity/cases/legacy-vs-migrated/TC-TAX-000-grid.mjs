// TC-TAX-000 — Admin → Taxes → Tax Rates grid reachable + columns — Track B (structure).
// TaxesController grid + /tax-rates/rows (flattened tax_master + tax_rates).
export default {
  id: 'TC-TAX-000', title: 'Tax Rates grid reachable + columns', track: 'B', role: 'regular',
  urlPath: '/admin/taxes/tax-rates', module: 'Admin Settings', subModule: 'Taxes → Tax Rates',
  hints: '- TaxesController tax-rates grid + rows.',
  async runMigrated({ page, base, creds, forms }) {
    await forms.loginMigrated(page, base, creds.user, creds.pass);
    const MIG = base.replace(/\/+$/, '');
    await page.goto(`${MIG}/admin/taxes/tax-rates`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('.ag-header-cell-text', { timeout: 12000 }).catch(() => {});
    await page.waitForTimeout(1200);
    const columns = await page.$$eval('.ag-header-cell-text', els => els.map(e => e.textContent.trim()).filter(Boolean));
    const rows = await page.evaluate(async (u) => { const r = await fetch(u, { headers: { Accept: 'application/json' } }); return r.ok ? await r.json() : null; }, `${MIG}/admin/taxes/tax-rates/rows`);
    return { columns, rowCount: rows ? rows.length : null };
  },
  check(m) {
    const cols = (m.columns || []).map(c => c.toLowerCase());
    return [
      { aspect: 'Grid reachable (rows endpoint)', migrated: m.rowCount, expected: 'non-null', ok: m.rowCount !== null },
      { aspect: 'Columns render', migrated: (m.columns || []).join(', ') || '(none)', expected: '>= 1', ok: (m.columns || []).length >= 1 },
      { aspect: 'Has a Tax column', migrated: cols.some(c => /tax/.test(c)), expected: true, ok: cols.some(c => /tax/.test(c)) },
    ];
  },
};
