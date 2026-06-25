// TC-CC-000 — Admin → Cost Centers grid reachable + columns — Track B (structure).
// CostCentersController grid + /cost-centers/cost-centers/rows.
export default {
  id: 'TC-CC-000', title: 'Cost Centers grid reachable + columns', track: 'B', role: 'regular',
  urlPath: '/admin/cost-centers/cost-centers', module: 'Admin Settings', subModule: 'Cost Centers',
  hints: '- CostCentersController grid + rows (category type_=3, group "Cost Centre").',
  async runMigrated({ page, base, creds, forms }) {
    await forms.loginMigrated(page, base, creds.user, creds.pass);
    const MIG = base.replace(/\/+$/, '');
    await page.goto(`${MIG}/admin/cost-centers/cost-centers`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('.ag-header-cell-text', { timeout: 12000 }).catch(() => {});
    await page.waitForTimeout(1200);
    const columns = await page.$$eval('.ag-header-cell-text', els => els.map(e => e.textContent.trim()).filter(Boolean));
    const rows = await page.evaluate(async (u) => { const r = await fetch(u, { headers: { Accept: 'application/json' } }); return r.ok ? await r.json() : null; }, `${MIG}/admin/cost-centers/cost-centers/rows`);
    return { columns, rowCount: rows ? rows.length : null };
  },
  check(m) {
    const cols = (m.columns || []).map(c => c.toLowerCase());
    return [
      { aspect: 'Grid reachable (rows endpoint)', migrated: m.rowCount, expected: 'non-null', ok: m.rowCount !== null },
      { aspect: 'Columns render', migrated: (m.columns || []).join(', ') || '(none)', expected: '>= 1', ok: (m.columns || []).length >= 1 },
      { aspect: 'Has a Code/Description column', migrated: cols.some(c => /code|description/.test(c)), expected: true, ok: cols.some(c => /code|description/.test(c)) },
    ];
  },
};
