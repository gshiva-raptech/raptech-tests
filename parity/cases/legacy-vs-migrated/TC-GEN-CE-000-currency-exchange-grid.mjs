// TC-GEN-CE-000 — General → Currency Exchanges grid — Track B (structure).
// Legacy viewCurrencyRate.action renders no column headers for a regular user (needs a
// currency filter selection first) → verify the migrated grid structurally instead.
export default {
  id: 'TC-GEN-CE-000', title: 'Currency Exchanges grid reachable + columns', track: 'B', role: 'regular',
  urlPath: '/admin/general/currency-exchanges', module: 'Admin Settings', subModule: 'General → Currency Exchanges',
  hints: '- Migrated: GeneralController.exchangeRateList + ExchangeRateSchema. Cols: From/To Currency, Date, Rate.',
  async runMigrated({ page, base, creds, forms, shot }) {
    await forms.loginMigrated(page, base, creds.user, creds.pass);
    const MIG = base.replace(/\/+$/, '');
    await page.goto(`${MIG}/admin/general/currency-exchanges`, { waitUntil: 'networkidle' });
    await page.waitForSelector('.ag-header-cell-text', { timeout: 10000 }).catch(() => {});
    await page.waitForTimeout(1000);
    const columns = await page.$$eval('.ag-header-cell-text', els => els.map(e => e.textContent.trim()).filter(Boolean));
    const rows = await page.evaluate(async (u) => { const r = await fetch(u, { headers: { Accept: 'application/json' } }); return r.ok ? await r.json() : null; }, `${MIG}/admin/general/currency-exchanges/rows`);
    return { columns, rowCount: rows ? rows.length : null };
  },
  check(m) {
    const cols = (m.columns || []).map(c => c.toLowerCase());
    const has = re => cols.some(c => re.test(c));
    return [
      { aspect: 'Grid reachable', migrated: m.rowCount, expected: 'non-null', ok: m.rowCount !== null },
      { aspect: 'Columns render', migrated: (m.columns || []).join(', ') || '(none)', expected: '>= 1', ok: (m.columns || []).length >= 1 },
      { aspect: 'Has From/To currency + Rate columns', migrated: has(/from/) && has(/to/) && has(/rate/), expected: true, ok: has(/from/) && has(/to/) && has(/rate/) },
    ];
  },
};
