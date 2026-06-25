// TC-FT-GFT-000 — Form Templates → Grid Form Templates grid — Track B (structure).
export default {
  id: 'TC-FT-GFT-000', title: 'Grid Form Templates grid reachable + columns', track: 'B', role: 'regular',
  urlPath: '/admin/form-templates/grid-form-templates', module: 'Admin Settings', subModule: 'Form Templates → Grid Form Templates',
  hints: '- FormTemplatesController grid-form-templates grid + rows.',
  async runMigrated({ page, base, creds, forms }) {
    await forms.loginMigrated(page, base, creds.user, creds.pass);
    const MIG = base.replace(/\/+$/, '');
    await page.goto(`${MIG}/admin/form-templates/grid-form-templates`, { waitUntil: 'networkidle' });
    await page.waitForSelector('.ag-header-cell-text', { timeout: 10000 }).catch(() => {});
    await page.waitForTimeout(900);
    const columns = await page.$$eval('.ag-header-cell-text', els => els.map(e => e.textContent.trim()).filter(Boolean));
    const rows = await page.evaluate(async (u) => { const r = await fetch(u, { headers: { Accept: 'application/json' } }); return r.ok ? await r.json() : null; }, `${MIG}/admin/form-templates/grid-form-templates/rows`);
    return { columns, rowCount: rows ? rows.length : null };
  },
  check(m) {
    return [
      { aspect: 'Grid reachable', migrated: m.rowCount, expected: 'non-null', ok: m.rowCount !== null },
      { aspect: 'Columns render', migrated: (m.columns || []).join(', ') || '(none)', expected: '>= 1', ok: (m.columns || []).length >= 1 },
    ];
  },
};
