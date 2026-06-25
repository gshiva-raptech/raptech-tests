// TC-DEL-VM-000 — Admin → Delivery → Vehicle Master grid — Track B (structure).
export default {
  id: 'TC-DEL-VM-000', title: 'Vehicle Master grid reachable + columns', track: 'B', role: 'regular',
  urlPath: '/admin/delivery/vehicle-master', module: 'Admin Settings', subModule: 'Delivery → Vehicle Master',
  hints: '- DeliveryController vehicleMasterGrid + rows. Columns: Entity, Vehicle Name, Vehicle Description, Fuel Type, Status, Created/Updated By/Date.',
  async runMigrated({ page, base, creds, forms }) {
    await forms.loginMigrated(page, base, creds.user, creds.pass);
    const MIG = base.replace(/\/+$/, '');
    await page.goto(`${MIG}/admin/delivery/vehicle-master`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('.ag-header-cell-text', { timeout: 12000 }).catch(() => {});
    await page.waitForTimeout(1200);
    const columns = await page.$$eval('.ag-header-cell-text', els => els.map(e => e.textContent.trim()).filter(Boolean));
    const rows = await page.evaluate(async (u) => { const r = await fetch(u, { headers: { Accept: 'application/json' } }); return r.ok ? await r.json() : null; }, `${MIG}/admin/delivery/vehicle-master/rows`);
    return { columns, rowCount: rows ? rows.length : null };
  },
  check(m) {
    const cols = (m.columns || []).map(c => c.toLowerCase());
    return [
      { aspect: 'Grid reachable (rows endpoint)', migrated: m.rowCount, expected: 'non-null', ok: m.rowCount !== null },
      { aspect: 'Columns render', migrated: (m.columns || []).join(', ') || '(none)', expected: '>= 1', ok: (m.columns || []).length >= 1 },
      { aspect: 'Has Vehicle Name column', migrated: cols.some(c => /vehicle name/.test(c)), expected: true, ok: cols.some(c => /vehicle name/.test(c)) },
      { aspect: 'Has Fuel Type column', migrated: cols.some(c => /fuel/.test(c)), expected: true, ok: cols.some(c => /fuel/.test(c)) },
    ];
  },
};
