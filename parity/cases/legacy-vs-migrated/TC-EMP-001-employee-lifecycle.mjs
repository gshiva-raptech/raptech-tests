// TC-EMP-001 — Employee create / edit / detail — Track B.
// The employee form needs Department / Designation / Employee Status options, which come from
// Employee Custom Fields. So seed those 3 via the custom-field flow first, then create an employee
// (15 required fields), verify in grid, edit (firstName), and view the read-only detail. Cleanup DB.
import { psql } from '../../lib/db.mjs';

export default {
  id: 'TC-EMP-001', title: 'Employee create / edit / detail', track: 'B', role: 'regular',
  urlPath: '/admin/users/employees', module: 'Admin Settings', subModule: 'Users → Employees',
  hints: '- EmployeesController create/{id}/{id}/detail. Dept/Designation/Emp-Status come from custom_status (Employee Custom Fields).',
  data() { return { stamp: Date.now().toString().slice(-7) }; },
  async runMigrated({ page, base, creds, data, forms, shot }) {
    page.on('dialog', d => d.accept().catch(() => {}));
    await forms.loginMigrated(page, base, creds.user, creds.pass);
    const MIG = base.replace(/\/+$/, '');
    const empId = `ZZEMP${data.stamp}`;
    const rows = async () => page.evaluate(async (u) => { const r = await fetch(u, { headers: { Accept: 'application/json' } }); return r.ok ? await r.json() : []; }, `${MIG}/admin/users/employees/rows`);
    const selFirst = async (sel) => { const v = await page.evaluate(s => { const e = document.querySelector(s); const o = [...(e?.options || [])].find(x => x.value); return o ? o.value : null; }, sel); if (v) await page.selectOption(sel, v).catch(() => {}); return v; };
    const seedCF = async (type, value) => {
      await page.goto(`${MIG}/admin/users/employees/custom-fields/new`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(500);
      await page.fill('#statusName', value).catch(() => {});
      await page.selectOption('#fieldType', { label: type }).catch(() => {});
      await Promise.all([page.waitForLoadState('networkidle').catch(() => {}), page.getByRole('button', { name: /^add$/i }).click()]);
      await page.waitForTimeout(900);
    };

    let id = null, inGrid = false, editPersisted = false, detailReadOnly = null, deptOpts = 0;
    try {
      // seed prerequisite custom fields (org 36 has none)
      await seedCF('Department',      `ZZ Dept ${data.stamp}`);
      await seedCF('Designation',     `ZZ Desig ${data.stamp}`);
      await seedCF('Employee Status', `ZZ EmpStat ${data.stamp}`);

      // create employee
      await page.goto(`${MIG}/admin/users/employees/new`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(1000);
      deptOpts = await page.evaluate(() => [...(document.querySelector('#departmentId')?.options || [])].filter(o => o.value).length);
      await page.locator('input[name=entityIds]').first().check().catch(() => {});
      await page.fill('#empId', empId).catch(() => {});
      await page.fill('#firstName', 'ZZ').catch(() => {});
      await selFirst('#maritalStatus');
      await page.fill('#dateOfBirth', '2000-01-01').catch(() => {});
      await page.fill('#contactNo', '9999999999').catch(() => {});
      await page.fill('#personalEmailId', `zzp${data.stamp}@example.com`).catch(() => {});
      await page.fill('#communicationAddress', '1 Test Street').catch(() => {});
      await selFirst('#bloodGroup');
      await page.fill('#dateOfJoining', '2020-01-01').catch(() => {});
      await page.fill('#officialEmailId', `zzo${data.stamp}@example.com`).catch(() => {});
      await selFirst('#departmentId');
      await selFirst('#designationId');
      await page.fill('#baseLocation', 'HQ').catch(() => {});
      await selFirst('#empStatusId');
      shot('form') && await page.screenshot({ path: shot('form'), fullPage: true }).catch(() => {});
      await Promise.all([page.waitForLoadState('networkidle').catch(() => {}), page.getByRole('button', { name: /^submit$/i }).click()]);
      await page.waitForTimeout(1800);
      let row = (await rows()).find(r => String(r.empId) === empId);
      id = row ? row.employeeDetailId : null;
      inGrid = !!row;

      // edit (change firstName)
      if (id) {
        await page.goto(`${MIG}/admin/users/employees/${id}`, { waitUntil: 'networkidle' });
        await page.waitForTimeout(800);
        await page.fill('#firstName', `ZZEdit${data.stamp}`).catch(() => {});
        await Promise.all([page.waitForLoadState('networkidle').catch(() => {}), page.getByRole('button', { name: /^update$/i }).click()]);
        await page.waitForTimeout(1500);
        editPersisted = (await rows()).some(r => String(r.employeeDetailId) === String(id) && String(r.firstName) === `ZZEdit${data.stamp}`);
      }

      // detail (read-only)
      if (id) {
        await page.goto(`${MIG}/admin/users/employees/${id}/detail`, { waitUntil: 'networkidle' });
        await page.waitForTimeout(700);
        detailReadOnly = await page.evaluate(() => {
          const empVal = document.querySelector('#empId')?.value || '';
          const hasUpdate = !![...document.querySelectorAll('button')].find(b => /^(submit|update)$/i.test((b.textContent || '').trim()));
          return { empShown: empVal.length > 0, hasUpdateBtn: hasUpdate };
        });
      }
    } finally {
      try {
        const ids = psql(`SELECT employee_detail_id_pk FROM raptech_scm.employee_details WHERE emp_id LIKE 'ZZEMP%'`).trim().split(/\r?\n/).filter(Boolean);
        for (const eid of ids) psql(`DELETE FROM raptech_scm.employee_detail_mapping WHERE employee_detail_id_fk=${eid}`);  // FK child first
        psql(`DELETE FROM raptech_scm.employee_details WHERE emp_id LIKE 'ZZEMP%'`);
      } catch (e) { /* best-effort */ }
      try { psql(`DELETE FROM raptech_scm.custom_status WHERE status_name LIKE 'ZZ %'`); } catch (e) { /* best-effort */ }
    }
    return { id, inGrid, deptOpts, editPersisted, detailReadOnly };
  },
  check(m) {
    return [
      { aspect: 'Custom field seeded → Department options available', migrated: m.deptOpts, expected: '>= 1', ok: m.deptOpts >= 1 },
      { aspect: 'Create + appears in grid', migrated: m.inGrid, expected: true, ok: m.inGrid === true },
      { aspect: 'Edit (firstName) persisted', migrated: m.editPersisted, expected: true, ok: m.editPersisted === true },
      { aspect: 'Detail view renders read-only (value shown, no Submit/Update btn)', migrated: JSON.stringify(m.detailReadOnly || {}), expected: 'empShown + no edit btn', ok: !!m.detailReadOnly && m.detailReadOnly.empShown && !m.detailReadOnly.hasUpdateBtn },
    ];
  },
};
