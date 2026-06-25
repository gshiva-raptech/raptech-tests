// TC-PROD-MM-000 — Admin → Production → Machine Master grid — Track B (structure).
export default {
  id: 'TC-PROD-MM-000', title: 'Machine Master grid reachable + columns', track: 'B', role: 'regular',
  urlPath: '/admin/production/machine-master', module: 'Production', subModule: 'Production → Machine Master',
  hints: '- ProductionController machine-master grid + rows (task_management_machine).',
  async runMigrated({ page, base, creds, forms }) {
    await forms.loginMigrated(page, base, creds.user, creds.pass);
    const MIG = base.replace(/\/+$/, '');
    await page.goto(`${MIG}/admin/production/machine-master`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('.ag-header-cell-text', { timeout: 12000 }).catch(() => {});
    await page.waitForTimeout(1200);
    const columns = await page.$$eval('.ag-header-cell-text', els => els.map(e => e.textContent.trim()).filter(Boolean));
    const rows = await page.evaluate(async (u) => { const r = await fetch(u, { headers: { Accept: 'application/json' } }); return r.ok ? await r.json() : null; }, `${MIG}/admin/production/machine-master/rows`);
    return { columns, rowCount: rows ? rows.length : null };
  },
  check(m) {
    const cols = (m.columns || []).map(c => c.toLowerCase());
    return [
      { aspect: 'Grid reachable', migrated: m.rowCount, expected: 'non-null', ok: m.rowCount !== null },
      { aspect: 'Columns render', migrated: (m.columns || []).join(', ') || '(none)', expected: '>= 1', ok: (m.columns || []).length >= 1 },
      { aspect: 'Has Machine + Entity columns', migrated: cols.join(','), expected: 'machine & entity', ok: cols.some(c => /machine/.test(c)) && cols.some(c => /entity/.test(c)) },
    ];
  },
};
