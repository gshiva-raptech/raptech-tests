// TC-SALES-002 — Admin → Sales → Agents Details grid — Track B (structure).
// Agents Details is the structurally-distinct Sales tab (agents_details table, Edit + Details actions).
export default {
  id: 'TC-SALES-002', title: 'Sales Agents Details grid reachable + columns', track: 'B', role: 'regular',
  urlPath: '/admin/sales/agents-details', module: 'Sales', subModule: 'Agents Details',
  hints: '- SalesController agentsGrid (agents_details) + /agents-details/rows.',
  async runMigrated({ page, base, creds, forms }) {
    await forms.loginMigrated(page, base, creds.user, creds.pass);
    const MIG = base.replace(/\/+$/, '');
    await page.goto(`${MIG}/admin/sales/agents-details`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('.ag-header-cell-text', { timeout: 12000 }).catch(() => {});
    await page.waitForTimeout(1200);
    const columns = await page.$$eval('.ag-header-cell-text', els => els.map(e => e.textContent.trim()).filter(Boolean));
    const rows = await page.evaluate(async (u) => { const r = await fetch(u, { headers: { Accept: 'application/json' } }); return r.ok ? await r.json() : null; }, `${MIG}/admin/sales/agents-details/rows`);
    return { columns, rowCount: rows ? rows.length : null };
  },
  check(m) {
    const cols = (m.columns || []).map(c => c.toLowerCase());
    return [
      { aspect: 'Grid reachable (rows endpoint)', migrated: m.rowCount, expected: 'non-null', ok: m.rowCount !== null },
      { aspect: 'Columns render', migrated: (m.columns || []).join(', ') || '(none)', expected: '>= 1', ok: (m.columns || []).length >= 1 },
      { aspect: 'Has an Agent / name column', migrated: cols.some(c => /agent|name/.test(c)), expected: true, ok: cols.some(c => /agent|name/.test(c)) },
    ];
  },
};
