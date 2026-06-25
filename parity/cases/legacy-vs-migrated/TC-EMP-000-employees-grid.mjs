// TC-EMP-000 — Users → Employees grid (org admin, non-superadmin) — Track B (structure).
// Legacy employee grid returns no headers for a regular user → verify migrated structurally.
export default {
  id: 'TC-EMP-000', title: 'Employees grid reachable + columns', track: 'B', role: 'regular',
  urlPath: '/admin/users/employees', module: 'Admin Settings', subModule: 'Users → Employees',
  hints: '- EmployeesController.employeesGrid + EmployeeDetailSchema. New menu: Create Employee / Custom Field / Export.',
  async runMigrated({ page, base, creds, forms, shot }) {
    await forms.loginMigrated(page, base, creds.user, creds.pass);
    const MIG = base.replace(/\/+$/, '');
    await page.goto(`${MIG}/admin/users/employees`, { waitUntil: 'networkidle' });
    await page.waitForSelector('.ag-header-cell-text', { timeout: 10000 }).catch(() => {});
    await page.waitForTimeout(1000);
    const columns = await page.$$eval('.ag-header-cell-text', els => els.map(e => e.textContent.trim()).filter(Boolean));
    const rows = await page.evaluate(async (u) => { const r = await fetch(u, { headers: { Accept: 'application/json' } }); return r.ok ? await r.json() : null; }, `${MIG}/admin/users/employees/rows`);
    return { columns, rowCount: rows ? rows.length : null };
  },
  check(m) {
    const cols = (m.columns || []).map(c => c.toLowerCase());
    const has = re => cols.some(c => re.test(c));
    return [
      { aspect: 'Grid reachable', migrated: m.rowCount, expected: 'non-null', ok: m.rowCount !== null },
      { aspect: 'Columns render', migrated: (m.columns || []).join(', ') || '(none)', expected: '>= 1', ok: (m.columns || []).length >= 1 },
      { aspect: 'Has Emp ID + First/Last Name columns', migrated: has(/emp\s*id/) && has(/first/) && has(/last/), expected: true, ok: has(/emp\s*id/) && has(/first/) && has(/last/) },
    ];
  },
};
