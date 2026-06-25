// TC-DEL-TV-001 — Transporter Vehicles create / duplicate / edit / delete — Track B.
// Create: entity + transporterType=Transporter + supplier (supplier list loads async per
// entity via /entity-data). Guard: one ACTIVE transporter per supplier+entity in an org.
// Edit: only Transporter Id / Comments / Status editable (entity/type/supplier locked).
// Delete via endpoint (grid shows Edit+Details only; child vehicle_details cascade first).
import { psql } from '../../lib/db.mjs';

export default {
  id: 'TC-DEL-TV-001', title: 'Transporter Vehicles create / duplicate / edit / delete', track: 'B', role: 'regular',
  urlPath: '/admin/delivery/transporter-vehicles', module: 'Admin Settings', subModule: 'Delivery → Transporter Vehicles',
  hints: '- DeliveryController transporterCreate (countActiveDuplicate guard supplier+entity), {id} update (transportersId/comments/status only), {id}/delete (hard, vehicle_details child first).',
  data() { return { stamp: Date.now().toString().slice(-7) }; },
  async runMigrated({ page, base, creds, data, forms, shot }) {
    page.on('dialog', d => d.accept().catch(() => {}));
    await forms.loginMigrated(page, base, creds.user, creds.pass);
    const MIG = base.replace(/\/+$/, '');
    const tidMark = `ZZTID${data.stamp}`;
    const rows = async () => page.evaluate(async (u) => { const r = await fetch(u, { headers: { Accept: 'application/json' } }); return r.ok ? await r.json() : []; }, `${MIG}/admin/delivery/transporter-vehicles/rows`);
    const del = async (id) => page.evaluate(async (a) => { const h = (document.querySelector('meta[name=_csrf_header]') || {}).content; const t = (document.querySelector('meta[name=_csrf]') || {}).content; await fetch(`${a.MIG}/admin/delivery/transporter-vehicles/${a.id}/delete`, { method: 'POST', headers: h ? { [h]: t } : {}, redirect: 'follow' }); }, { MIG, id });

    // Find an entity that has at least one supplier (dup-guard needs supplier+entity).
    const pickEntityWithSupplier = async () => page.evaluate(async () => {
      const ents = [...(document.querySelector('#entityId')?.options || [])].filter(o => o.value).map(o => o.value);
      for (const eid of ents) {
        const r = await fetch(`/admin/delivery/transporter-vehicles/entity-data?entityId=${eid}`);
        if (!r.ok) continue;
        const d = await r.json();
        if ((d.supplierList || []).length > 0) return { entityId: eid, supplierId: String(d.supplierList[0].supplierId) };
      }
      return null;
    });

    let id = null, inGrid = false, dupMsg = null, editPersisted = false, deletedGone = false, combo = null;
    try {
      // ── create (type Transporter + supplier) ──
      await page.goto(`${MIG}/admin/delivery/transporter-vehicles/new`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(700);
      combo = await pickEntityWithSupplier();
      if (!combo) return { skipped: 'no entity has suppliers', createdInGrid: false, dupMsg: null, editPersisted: false, deletedGone: false };
      await page.selectOption('#entityId', combo.entityId).catch(() => {});
      await page.waitForTimeout(1100); // entity-data fetch populates #supplierId
      await page.selectOption('#transporterType', 'Transporter').catch(() => {});
      await page.waitForTimeout(300);
      await page.selectOption('#supplierId', combo.supplierId).catch(() => {});
      await page.fill('#transportersId', tidMark).catch(() => {});
      shot && shot('tv-create') && await page.screenshot({ path: shot('tv-create'), fullPage: true }).catch(() => {});
      await Promise.all([page.waitForLoadState('networkidle').catch(() => {}), page.getByRole('button', { name: /^add$/i }).click()]);
      await page.waitForTimeout(1400);
      id = (page.url().match(/transporter-vehicles\/(\d+)/) || [])[1] || null;
      inGrid = id ? (await rows()).some(r => String(r.transporterId) === String(id)) : false;

      // ── duplicate (same supplier + entity, active) ──
      await page.goto(`${MIG}/admin/delivery/transporter-vehicles/new`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(700);
      await page.selectOption('#entityId', combo.entityId).catch(() => {});
      await page.waitForTimeout(1100);
      await page.selectOption('#transporterType', 'Transporter').catch(() => {});
      await page.waitForTimeout(300);
      await page.selectOption('#supplierId', combo.supplierId).catch(() => {});
      await Promise.all([page.waitForLoadState('networkidle').catch(() => {}), page.getByRole('button', { name: /^add$/i }).click()]);
      await page.waitForTimeout(1000);
      dupMsg = await page.evaluate(() => { const m = document.body.innerText.match(/already exists[^<"]{0,80}/i); return m ? m[0].trim() : null; });

      // ── edit (change Transporter Id — entity/type/supplier locked) ──
      if (id) {
        await page.goto(`${MIG}/admin/delivery/transporter-vehicles/${id}`, { waitUntil: 'networkidle' });
        await page.waitForTimeout(700);
        await page.fill('#transportersId', `${tidMark}E`).catch(() => {});
        await page.fill('#comments', `ZZ edited ${data.stamp}`).catch(() => {});
        await Promise.all([page.waitForLoadState('networkidle').catch(() => {}), page.getByRole('button', { name: /^update$/i }).click()]);
        await page.waitForTimeout(1100);
        await page.goto(`${MIG}/admin/delivery/transporter-vehicles/${id}`, { waitUntil: 'networkidle' });
        await page.waitForTimeout(500);
        editPersisted = (await page.inputValue('#comments').catch(() => '')) === `ZZ edited ${data.stamp}`;
      }

      // ── delete (endpoint) ──
      if (id) {
        await del(id);
        await page.waitForTimeout(800);
        deletedGone = !(await rows()).some(r => String(r.transporterId) === String(id));
        id = deletedGone ? null : id;
      }
    } finally {
      try {
        const ids = psql(`SELECT transporter_id_pk FROM raptech_scm.transporters WHERE transporters_id LIKE 'ZZTID%'`).trim().split(/\r?\n/).filter(Boolean);
        for (const tid of ids) psql(`DELETE FROM raptech_scm.vehicle_details WHERE transporter_id_fk=${tid}`);  // FK child first
        psql(`DELETE FROM raptech_scm.transporters WHERE transporters_id LIKE 'ZZTID%'`);
      } catch (e) { /* best-effort */ }
    }
    return { id: '(deleted)', createdInGrid: inGrid, dupMsg, editPersisted, deletedGone, combo };
  },
  check(m) {
    if (m.skipped) return [{ aspect: 'Precondition (entity with supplier)', migrated: m.skipped, expected: 'available', ok: false }];
    return [
      { aspect: 'Create + appears in grid', migrated: m.createdInGrid, expected: true, ok: m.createdInGrid === true },
      { aspect: 'Duplicate blocked (active per supplier+entity)', migrated: m.dupMsg || '(none)', expected: 'already exists', ok: /already exists/i.test(m.dupMsg || '') },
      { aspect: 'Edit (comments) persisted', migrated: m.editPersisted, expected: true, ok: m.editPersisted === true },
      { aspect: 'Delete removed from grid', migrated: m.deletedGone ? 'gone' : 'still present', expected: 'gone', ok: m.deletedGone === true },
    ];
  },
};
