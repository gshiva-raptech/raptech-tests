// TC-PROD-DR-000 — Admin → Production → Delay Reason grid — Track B (structure).
export default {
  id: 'TC-PROD-DR-000', title: 'Delay Reason grid reachable + columns', track: 'B', role: 'regular',
  urlPath: '/admin/production/delay-reason', module: 'Production', subModule: 'Production → Delay Reason',
  hints: '- ProductionController delay-reason grid + rows (custom_status type=Task Delay Reason).',
  async runMigrated({ page, base, creds, forms }) {
    await forms.loginMigrated(page, base, creds.user, creds.pass);
    const MIG = base.replace(/\/+$/, '');
    await page.goto(`${MIG}/admin/production/delay-reason`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('.ag-header-cell-text', { timeout: 12000 }).catch(() => {});
    await page.waitForTimeout(1200);
    const columns = await page.$$eval('.ag-header-cell-text', els => els.map(e => e.textContent.trim()).filter(Boolean));
    const rows = await page.evaluate(async (u) => { const r = await fetch(u, { headers: { Accept: 'application/json' } }); return r.ok ? await r.json() : null; }, `${MIG}/admin/production/delay-reason/rows`);
    return { columns, rowCount: rows ? rows.length : null };
  },
  check(m) {
    const cols = (m.columns || []).map(c => c.toLowerCase());
    return [
      { aspect: 'Grid reachable', migrated: m.rowCount, expected: 'non-null', ok: m.rowCount !== null },
      { aspect: 'Columns render', migrated: (m.columns || []).join(', ') || '(none)', expected: '>= 1', ok: (m.columns || []).length >= 1 },
      { aspect: 'Has a Name column', migrated: cols.some(c => /name|reason/.test(c)), expected: true, ok: cols.some(c => /name|reason/.test(c)) },
    ];
  },
};
