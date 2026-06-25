// TC-GEN-EC-000 — General → Email Configuration grid — Track B (structure).
// Legacy viewEmailConfigs.action renders no column headers for a regular user → verify the
// migrated grid structurally instead.
export default {
  id: 'TC-GEN-EC-000', title: 'Email Configuration grid reachable + columns', track: 'B', role: 'regular',
  urlPath: '/admin/general/email-configuration', module: 'Admin Settings', subModule: 'General → Email Configuration',
  hints: '- Migrated: GeneralController.emailConfigList + EmailConfigSchema. Cols: Name, Subject, Status.',
  async runMigrated({ page, base, creds, forms, shot }) {
    await forms.loginMigrated(page, base, creds.user, creds.pass);
    const MIG = base.replace(/\/+$/, '');
    await page.goto(`${MIG}/admin/general/email-configuration`, { waitUntil: 'networkidle' });
    await page.waitForSelector('.ag-header-cell-text', { timeout: 10000 }).catch(() => {});
    await page.waitForTimeout(1000);
    const columns = await page.$$eval('.ag-header-cell-text', els => els.map(e => e.textContent.trim()).filter(Boolean));
    const rows = await page.evaluate(async (u) => { const r = await fetch(u, { headers: { Accept: 'application/json' } }); return r.ok ? await r.json() : null; }, `${MIG}/admin/general/email-configuration/rows`);
    return { columns, rowCount: rows ? rows.length : null };
  },
  check(m) {
    const cols = (m.columns || []).map(c => c.toLowerCase());
    const has = re => cols.some(c => re.test(c));
    return [
      { aspect: 'Grid reachable', migrated: m.rowCount, expected: 'non-null', ok: m.rowCount !== null },
      { aspect: 'Columns render', migrated: (m.columns || []).join(', ') || '(none)', expected: '>= 1', ok: (m.columns || []).length >= 1 },
      { aspect: 'Has Name + Subject columns', migrated: has(/name/) && has(/subject/), expected: true, ok: has(/name/) && has(/subject/) },
    ];
  },
};
