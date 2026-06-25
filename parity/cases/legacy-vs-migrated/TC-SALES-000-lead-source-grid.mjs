// TC-SALES-000 — Admin → Sales → Lead Source (custom-status) grid — Track B (structure).
// Lead Source is the canonical custom_status-backed Sales tab (15 share this path).
export default {
  id: 'TC-SALES-000', title: 'Sales Lead Source grid reachable + columns', track: 'B', role: 'regular',
  urlPath: '/admin/sales/lead-source', module: 'Sales', subModule: 'Lead Source (custom-status)',
  hints: '- SalesController tabGrid (custom_status) + /{tab}/rows.',
  async runMigrated({ page, base, creds, forms }) {
    await forms.loginMigrated(page, base, creds.user, creds.pass);
    const MIG = base.replace(/\/+$/, '');
    await page.goto(`${MIG}/admin/sales/lead-source`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('.ag-header-cell-text', { timeout: 12000 }).catch(() => {});
    await page.waitForTimeout(1200);
    const columns = await page.$$eval('.ag-header-cell-text', els => els.map(e => e.textContent.trim()).filter(Boolean));
    const rows = await page.evaluate(async (u) => { const r = await fetch(u, { headers: { Accept: 'application/json' } }); return r.ok ? await r.json() : null; }, `${MIG}/admin/sales/lead-source/rows`);
    return { columns, rowCount: rows ? rows.length : null };
  },
  check(m) {
    const cols = (m.columns || []).map(c => c.toLowerCase());
    return [
      { aspect: 'Grid reachable (rows endpoint)', migrated: m.rowCount, expected: 'non-null', ok: m.rowCount !== null },
      { aspect: 'Columns render', migrated: (m.columns || []).join(', ') || '(none)', expected: '>= 1', ok: (m.columns || []).length >= 1 },
      { aspect: 'Has a Lead Source / name column', migrated: cols.some(c => /lead source|name|status/.test(c)), expected: true, ok: cols.some(c => /lead source|name|status/.test(c)) },
    ];
  },
};
