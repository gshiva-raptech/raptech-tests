// TC-INV-LEDGER-000 — Admin → Inventory → Inventory Ledger grid — Track B (structure).
export default {
  id: 'TC-INV-LEDGER-000', title: 'Inventory Ledger grid reachable + columns', track: 'B', role: 'regular',
  urlPath: '/admin/inventory/inventory-ledger', module: 'Admin Settings', subModule: 'Inventory → Inventory Ledger',
  hints: '- InventoryController ledgerList grid + rows.',
  async runMigrated({ page, base, creds, forms }) {
    await forms.loginMigrated(page, base, creds.user, creds.pass);
    const MIG = base.replace(/\/+$/, '');
    await page.goto(`${MIG}/admin/inventory/inventory-ledger`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('.ag-header-cell-text', { timeout: 12000 }).catch(() => {});
    await page.waitForTimeout(1200);
    const columns = await page.$$eval('.ag-header-cell-text', els => els.map(e => e.textContent.trim()).filter(Boolean));
    const rows = await page.evaluate(async (u) => { const r = await fetch(u, { headers: { Accept: 'application/json' } }); return r.ok ? await r.json() : null; }, `${MIG}/admin/inventory/inventory-ledger/rows`);
    return { columns, rowCount: rows ? rows.length : null };
  },
  check(m) {
    const cols = (m.columns || []).map(c => c.toLowerCase());
    return [
      { aspect: 'Grid reachable', migrated: m.rowCount, expected: 'non-null', ok: m.rowCount !== null },
      { aspect: 'Columns render', migrated: (m.columns || []).join(', ') || '(none)', expected: '>= 1', ok: (m.columns || []).length >= 1 },
      { aspect: 'Has Finance Group / Ledger Account column', migrated: cols.some(c => /finance|ledger|account/.test(c)), expected: true, ok: cols.some(c => /finance|ledger|account/.test(c)) },
    ];
  },
};
