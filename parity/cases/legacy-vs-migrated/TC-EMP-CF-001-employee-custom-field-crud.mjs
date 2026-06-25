// TC-EMP-CF-001 — Users → Employees → Employee Custom Field create / edit — Track B.
// Custom fields (type Department/Designation/Employee Status/Band + a value) populate the
// employee form's dropdowns. Form: statusName + fieldType. Grid action: Edit only.
import { psql } from '../../lib/db.mjs';

export default {
  id: 'TC-EMP-CF-001', title: 'Employee Custom Field create / edit', track: 'B', role: 'regular',
  urlPath: '/admin/users/employees/custom-fields', module: 'Admin Settings', subModule: 'Users → Employees → Custom Fields',
  hints: '- EmployeesController createCustomField/updateCustomField → custom_status (org-scoped, type). Form: statusName + fieldType.',
  data() { return { stamp: Date.now().toString().slice(-7) }; },
  async runMigrated({ page, base, creds, data, forms, shot }) {
    page.on('dialog', d => d.accept().catch(() => {}));
    await forms.loginMigrated(page, base, creds.user, creds.pass);
    const MIG = base.replace(/\/+$/, '');
    const name = `ZZ CF ${data.stamp}`;
    const rows = async () => page.evaluate(async (u) => { const r = await fetch(u, { headers: { Accept: 'application/json' } }); return r.ok ? await r.json() : []; }, `${MIG}/admin/users/employees/custom-fields/rows`);

    let id = null, inGrid = false, editPersisted = false;
    try {
      // create
      await page.goto(`${MIG}/admin/users/employees/custom-fields/new`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(600);
      await page.fill('#statusName', name).catch(() => {});
      await page.selectOption('#fieldType', { label: 'Department' }).catch(() => {});
      await Promise.all([page.waitForLoadState('networkidle').catch(() => {}), page.getByRole('button', { name: /^add$/i }).click()]);
      await page.waitForTimeout(1200);
      const r1 = await rows();
      const row = r1.find(x => JSON.stringify(x).includes(name));
      id = row ? (row.customStatusId || row.id) : null;
      inGrid = !!row;

      // edit (rename)
      if (id) {
        const nn = `ZZ CF Edit ${data.stamp}`;
        await page.goto(`${MIG}/admin/users/employees/custom-fields/${id}`, { waitUntil: 'networkidle' });
        await page.waitForTimeout(600);
        await page.fill('#statusName', nn).catch(() => {});
        await Promise.all([page.waitForLoadState('networkidle').catch(() => {}), page.getByRole('button', { name: /^update$/i }).click()]);
        await page.waitForTimeout(1000);
        editPersisted = (await rows()).some(x => JSON.stringify(x).includes(nn));
      }
    } finally {
      try { psql(`DELETE FROM raptech_scm.custom_status WHERE status_name LIKE 'ZZ CF %'`); } catch (e) { /* best-effort */ }
    }
    return { id, inGrid, editPersisted };
  },
  check(m) {
    return [
      { aspect: 'Create succeeded + in grid', migrated: m.inGrid, expected: true, ok: m.inGrid === true },
      { aspect: 'Edit (rename) persisted', migrated: m.editPersisted, expected: true, ok: m.editPersisted === true },
    ];
  },
};
