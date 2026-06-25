// TC-PROD-TM-000 — Admin → Production → Tasks Master grid — Track B (structure).
export default {
  id: 'TC-PROD-TM-000', title: 'Tasks Master grid reachable + columns', track: 'B', role: 'regular',
  urlPath: '/admin/production/tasks-master', module: 'Production', subModule: 'Production → Tasks Master',
  hints: '- ProductionController tasks-master grid + rows (task_management_tasks).',
  async runMigrated({ page, base, creds, forms }) {
    await forms.loginMigrated(page, base, creds.user, creds.pass);
    const MIG = base.replace(/\/+$/, '');
    await page.goto(`${MIG}/admin/production/tasks-master`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('.ag-header-cell-text', { timeout: 12000 }).catch(() => {});
    await page.waitForTimeout(1200);
    const columns = await page.$$eval('.ag-header-cell-text', els => els.map(e => e.textContent.trim()).filter(Boolean));
    const rows = await page.evaluate(async (u) => { const r = await fetch(u, { headers: { Accept: 'application/json' } }); return r.ok ? await r.json() : null; }, `${MIG}/admin/production/tasks-master/rows`);
    return { columns, rowCount: rows ? rows.length : null };
  },
  check(m) {
    const cols = (m.columns || []).map(c => c.toLowerCase());
    return [
      { aspect: 'Grid reachable', migrated: m.rowCount, expected: 'non-null', ok: m.rowCount !== null },
      { aspect: 'Columns render', migrated: (m.columns || []).join(', ') || '(none)', expected: '>= 1', ok: (m.columns || []).length >= 1 },
      { aspect: 'Has Task + Entity columns', migrated: cols.join(','), expected: 'task & entity', ok: cols.some(c => /task/.test(c)) && cols.some(c => /entity/.test(c)) },
    ];
  },
};
