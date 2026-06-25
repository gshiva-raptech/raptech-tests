// TC-PLAN-CAP-000 — Admin → Planning → Resource Capacities grid — Track B (structure).
export default {
  id: 'TC-PLAN-CAP-000', title: 'Resource Capacities grid reachable + columns', track: 'B', role: 'regular',
  urlPath: '/admin/planning/resource-capacities', module: 'Admin Settings', subModule: 'Planning → Resource Capacities',
  hints: '- PlanningController resource-capacities grid + rows.',
  async runMigrated({ page, base, creds, forms }) {
    await forms.loginMigrated(page, base, creds.user, creds.pass);
    const MIG = base.replace(/\/+$/, '');
    await page.goto(`${MIG}/admin/planning/resource-capacities`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('.ag-header-cell-text', { timeout: 12000 }).catch(() => {});
    await page.waitForTimeout(1200);
    const columns = await page.$$eval('.ag-header-cell-text', els => els.map(e => e.textContent.trim()).filter(Boolean));
    const rows = await page.evaluate(async (u) => { const r = await fetch(u, { headers: { Accept: 'application/json' } }); return r.ok ? await r.json() : null; }, `${MIG}/admin/planning/resource-capacities/rows`);
    return { columns, rowCount: rows ? rows.length : null };
  },
  check(m) {
    const cols = (m.columns || []).map(c => c.toLowerCase());
    return [
      { aspect: 'Grid reachable', migrated: m.rowCount, expected: 'non-null', ok: m.rowCount !== null },
      { aspect: 'Columns render', migrated: (m.columns || []).join(', ') || '(none)', expected: '>= 1', ok: (m.columns || []).length >= 1 },
      { aspect: 'Has a Resource Type / Date column', migrated: cols.some(c => /type|date|entity/.test(c)), expected: true, ok: cols.some(c => /type|date|entity/.test(c)) },
    ];
  },
};
