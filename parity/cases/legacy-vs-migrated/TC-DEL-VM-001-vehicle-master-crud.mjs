// TC-DEL-VM-001 — Vehicle Master create / duplicate / edit / delete — Track B.
// Create: entity + vehicleName + fuelType (capacity rows optional). Guard: one per
// org+entity+name+fuelType ("already exists"). Edit: only Status/Comments editable
// (entity/name/fuelType locked read-only). Delete via endpoint (grid shows Edit+Details only).
import { psql } from '../../lib/db.mjs';

export default {
  id: 'TC-DEL-VM-001', title: 'Vehicle Master create / duplicate / edit / delete', track: 'B', role: 'regular',
  urlPath: '/admin/delivery/vehicle-master', module: 'Admin Settings', subModule: 'Delivery → Vehicle Master',
  hints: '- DeliveryController vehicleMasterCreate (countDuplicateName guard org+entity+name+fuel), {id} update (status/comments only), {id}/delete (hard, capacity child first).',
  data() { return { stamp: Date.now().toString().slice(-7) }; },
  async runMigrated({ page, base, creds, data, forms, shot }) {
    page.on('dialog', d => d.accept().catch(() => {}));
    await forms.loginMigrated(page, base, creds.user, creds.pass);
    const MIG = base.replace(/\/+$/, '');
    const name = `ZZ Vehicle ${data.stamp}`;
    const rows = async () => page.evaluate(async (u) => { const r = await fetch(u, { headers: { Accept: 'application/json' } }); return r.ok ? await r.json() : []; }, `${MIG}/admin/delivery/vehicle-master/rows`);
    const del = async (id) => page.evaluate(async (a) => { const h = (document.querySelector('meta[name=_csrf_header]') || {}).content; const t = (document.querySelector('meta[name=_csrf]') || {}).content; await fetch(`${a.MIG}/admin/delivery/vehicle-master/${a.id}/delete`, { method: 'POST', headers: h ? { [h]: t } : {}, redirect: 'follow' }); }, { MIG, id });

    let id = null, inGrid = false, dupMsg = null, editPersisted = false, deletedGone = false, entVal = null;
    try {
      // ── create ──
      await page.goto(`${MIG}/admin/delivery/vehicle-master/new`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(700);
      entVal = await page.evaluate(() => { const e = document.querySelector('#entityId'); const o = [...(e?.options || [])].find(x => x.value); return o ? o.value : null; });
      if (entVal) await page.selectOption('#entityId', entVal).catch(() => {});
      await page.fill('#vehicleName', name).catch(() => {});
      await page.fill('#vehicleDescription', 'ZZ desc').catch(() => {});
      await page.selectOption('#fuelType', 'Diesel').catch(() => {});
      shot && shot('vm-create') && await page.screenshot({ path: shot('vm-create'), fullPage: true }).catch(() => {});
      await Promise.all([page.waitForLoadState('networkidle').catch(() => {}), page.getByRole('button', { name: /^submit$/i }).click()]);
      await page.waitForTimeout(1400);
      id = (page.url().match(/vehicle-master\/(\d+)/) || [])[1] || null;
      inGrid = id ? (await rows()).some(r => String(r.vehicleMasterId) === String(id)) : false;

      // ── duplicate (same entity + name + fuel type) ──
      await page.goto(`${MIG}/admin/delivery/vehicle-master/new`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(600);
      if (entVal) await page.selectOption('#entityId', entVal).catch(() => {});
      await page.fill('#vehicleName', name).catch(() => {});
      await page.selectOption('#fuelType', 'Diesel').catch(() => {});
      await Promise.all([page.waitForLoadState('networkidle').catch(() => {}), page.getByRole('button', { name: /^submit$/i }).click()]);
      await page.waitForTimeout(1000);
      dupMsg = await page.evaluate(() => { const m = document.body.innerText.match(/already exists[^<"]{0,60}/i); return m ? m[0].trim() : null; });

      // ── edit (change Comments — entity/name/fuel locked) ──
      if (id) {
        await page.goto(`${MIG}/admin/delivery/vehicle-master/${id}`, { waitUntil: 'networkidle' });
        await page.waitForTimeout(700);
        await page.fill('#comments', `ZZ edited ${data.stamp}`).catch(() => {});
        await Promise.all([page.waitForLoadState('networkidle').catch(() => {}), page.getByRole('button', { name: /^update$/i }).click()]);
        await page.waitForTimeout(1100);
        await page.goto(`${MIG}/admin/delivery/vehicle-master/${id}`, { waitUntil: 'networkidle' });
        await page.waitForTimeout(500);
        editPersisted = (await page.inputValue('#comments').catch(() => '')) === `ZZ edited ${data.stamp}`;
      }

      // ── delete (endpoint) ──
      if (id) {
        await del(id);
        await page.waitForTimeout(800);
        deletedGone = !(await rows()).some(r => String(r.vehicleMasterId) === String(id));
        id = deletedGone ? null : id;
      }
    } finally {
      try {
        const ids = psql(`SELECT vehicle_master_pk FROM raptech_scm.vehicle_master WHERE vehcile_name LIKE 'ZZ Vehicle %'`).trim().split(/\r?\n/).filter(Boolean);
        for (const vid of ids) psql(`DELETE FROM raptech_scm.vehicle_capactiy WHERE vehicle_master_fk=${vid}`);  // FK child first
        psql(`DELETE FROM raptech_scm.vehicle_master WHERE vehcile_name LIKE 'ZZ Vehicle %'`);
      } catch (e) { /* best-effort */ }
    }
    return { id: '(deleted)', createdInGrid: inGrid, dupMsg, editPersisted, deletedGone, entVal };
  },
  check(m) {
    return [
      { aspect: 'Create + appears in grid', migrated: m.createdInGrid, expected: true, ok: m.createdInGrid === true },
      { aspect: 'Duplicate blocked (org+entity+name+fuel)', migrated: m.dupMsg || '(none)', expected: 'already exists', ok: /already exists/i.test(m.dupMsg || '') },
      { aspect: 'Edit (comments) persisted', migrated: m.editPersisted, expected: true, ok: m.editPersisted === true },
      { aspect: 'Delete removed from grid', migrated: m.deletedGone ? 'gone' : 'still present', expected: 'gone', ok: m.deletedGone === true },
    ];
  },
};
