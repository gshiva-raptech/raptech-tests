// TC-BANK-000 — Admin → Banks grid reachable + columns — Track B (structure).
// BanksController grid + /banks/banks/rows.
export default {
  id: 'TC-BANK-000', title: 'Banks grid reachable + columns', track: 'B', role: 'regular',
  urlPath: '/admin/banks/banks', module: 'Admin Settings', subModule: 'Banks',
  hints: '- BanksController grid + rows (bank_details + org_account_mapping).',
  async runMigrated({ page, base, creds, forms }) {
    await forms.loginMigrated(page, base, creds.user, creds.pass);
    const MIG = base.replace(/\/+$/, '');
    await page.goto(`${MIG}/admin/banks/banks`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('.ag-header-cell-text', { timeout: 12000 }).catch(() => {});
    await page.waitForTimeout(1200);
    const columns = await page.$$eval('.ag-header-cell-text', els => els.map(e => e.textContent.trim()).filter(Boolean));
    const rows = await page.evaluate(async (u) => { const r = await fetch(u, { headers: { Accept: 'application/json' } }); return r.ok ? await r.json() : null; }, `${MIG}/admin/banks/banks/rows`);
    return { columns, rowCount: rows ? rows.length : null };
  },
  check(m) {
    const cols = (m.columns || []).map(c => c.toLowerCase());
    return [
      { aspect: 'Grid reachable (rows endpoint)', migrated: m.rowCount, expected: 'non-null', ok: m.rowCount !== null },
      { aspect: 'Columns render', migrated: (m.columns || []).join(', ') || '(none)', expected: '>= 1', ok: (m.columns || []).length >= 1 },
      { aspect: 'Has a Bank/Account column', migrated: cols.some(c => /bank|account/.test(c)), expected: true, ok: cols.some(c => /bank|account/.test(c)) },
    ];
  },
};
