// TC-LED-000 — Admin → Ledgers — grids reachable + columns for all 3 sub-tabs — Track B (structure).
// Sub-tabs (LedgersController.ledgersTabs): Expense Category, Accounts Mapping, Account Opening Balance.
export default {
  id: 'TC-LED-000', title: 'Ledgers grids reachable + columns (3 sub-tabs)', track: 'B', role: 'regular',
  urlPath: '/admin/ledgers/expense-category', module: 'Admin Settings', subModule: 'Ledgers (Expense Category / Accounts Mapping / Account Opening Balance)',
  hints: '- LedgersController expense-category / accounts-mapping / account-opening-balance grids + rows.',
  async runMigrated({ page, base, creds, forms }) {
    await forms.loginMigrated(page, base, creds.user, creds.pass);
    const MIG = base.replace(/\/+$/, '');
    const grid = async (path, rowsPath) => {
      await page.goto(`${MIG}${path}`, { waitUntil: 'domcontentloaded' });
      await page.waitForSelector('.ag-header-cell-text', { timeout: 12000 }).catch(() => {});
      await page.waitForTimeout(1000);
      const columns = await page.$$eval('.ag-header-cell-text', els => els.map(e => e.textContent.trim()).filter(Boolean));
      const tabs = await page.$$eval('.grid-tab, .tab, [data-tab]', els => els.map(e => e.textContent.trim()).filter(Boolean)).catch(() => []);
      const rows = await page.evaluate(async (u) => { const r = await fetch(u, { headers: { Accept: 'application/json' } }); return r.ok ? await r.json() : null; }, `${MIG}${rowsPath}`);
      return { columns, rowCount: rows ? rows.length : null, tabs };
    };
    const ec = await grid('/admin/ledgers/expense-category', '/admin/ledgers/expense-category/rows');
    const am = await grid('/admin/ledgers/accounts-mapping', '/admin/ledgers/accounts-mapping/rows');
    const ob = await grid('/admin/ledgers/account-opening-balance', '/admin/ledgers/account-opening-balance/rows');
    return { ec, am, ob };
  },
  check(m) {
    const ecCols = (m.ec.columns || []).map(c => c.toLowerCase());
    const amCols = (m.am.columns || []).map(c => c.toLowerCase());
    const obCols = (m.ob.columns || []).map(c => c.toLowerCase());
    return [
      { aspect: 'Expense Category grid reachable', migrated: m.ec.rowCount, expected: 'non-null', ok: m.ec.rowCount !== null },
      { aspect: 'Expense Category has GL Code/Name columns', migrated: (m.ec.columns || []).join(', ') || '(none)', expected: 'GL Code + GL Name', ok: ecCols.some(c => /gl code/.test(c)) && ecCols.some(c => /gl name|name/.test(c)) },
      { aspect: 'Accounts Mapping grid reachable', migrated: m.am.rowCount, expected: 'non-null', ok: m.am.rowCount !== null },
      { aspect: 'Accounts Mapping has Code + GL Code columns', migrated: (m.am.columns || []).join(', ') || '(none)', expected: 'Code + GL Code', ok: amCols.some(c => /^code$/.test(c.trim())) && amCols.some(c => /gl code/.test(c)) },
      { aspect: 'Account Opening Balance grid reachable', migrated: m.ob.rowCount, expected: 'non-null', ok: m.ob.rowCount !== null },
      { aspect: 'Opening Balance has Entity + GL Code + Currency columns', migrated: (m.ob.columns || []).join(', ') || '(none)', expected: 'Entity + GL Code + Currency', ok: obCols.some(c => /entity/.test(c)) && obCols.some(c => /gl code/.test(c)) && obCols.some(c => /currency/.test(c)) },
    ];
  },
};
