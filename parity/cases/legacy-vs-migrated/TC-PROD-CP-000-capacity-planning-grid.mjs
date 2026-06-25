// TC-PROD-CP-000 — Admin → Production → Capacity Planning grid — Track B (structure).
export default {
  id: 'TC-PROD-CP-000', title: 'Capacity Planning grid reachable + columns', track: 'B', role: 'regular',
  urlPath: '/admin/production/capacity-planning', module: 'Production', subModule: 'Production → Capacity Planning',
  hints: '- ProductionController capacity-planning grid + rows (task_resource_master). Level column hidden when SKILL_LEVEL_NOT_REQUIRED param on.',
  async runMigrated({ page, base, creds, forms }) {
    await forms.loginMigrated(page, base, creds.user, creds.pass);
    const MIG = base.replace(/\/+$/, '');
    await page.goto(`${MIG}/admin/production/capacity-planning`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('.ag-header-cell-text', { timeout: 12000 }).catch(() => {});
    await page.waitForTimeout(1200);
    const columns = await page.$$eval('.ag-header-cell-text', els => els.map(e => e.textContent.trim()).filter(Boolean));
    const rows = await page.evaluate(async (u) => { const r = await fetch(u, { headers: { Accept: 'application/json' } }); return r.ok ? await r.json() : null; }, `${MIG}/admin/production/capacity-planning/rows`);
    return { columns, rowCount: rows ? rows.length : null };
  },
  check(m) {
    const cols = (m.columns || []).map(c => c.toLowerCase());
    return [
      { aspect: 'Grid reachable', migrated: m.rowCount, expected: 'non-null', ok: m.rowCount !== null },
      { aspect: 'Columns render', migrated: (m.columns || []).join(', ') || '(none)', expected: '>= 1', ok: (m.columns || []).length >= 1 },
      { aspect: 'Has Entity + Resource/Working columns', migrated: cols.join(','), expected: 'entity & resource/working', ok: cols.some(c => /entity/.test(c)) && cols.some(c => /resource|working|hour/.test(c)) },
    ];
  },
};
