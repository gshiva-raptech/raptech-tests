// TC-ADDR-001 — Address create / duplicate / edit (org admin, non-superadmin) — Track B.
// Full address form (name + address1 + country/state searchable + city). Grid offers Edit +
// View (no delete). Dup-name guard ("Address name … already exists").
import { psql } from '../../lib/db.mjs';

export default {
  id: 'TC-ADDR-001',
  title: 'Address create / duplicate / edit',
  track: 'B',
  role: 'regular',
  urlPath: '/admin/organization/addresses',
  module: 'Admin Settings',
  subModule: 'Organization → Addresses',
  hints: '- OrgSettingsController addressCreate (isDuplicateAddressName), /{addressId} update. Table address; required: name, address1, country, state, city.',

  data() { return { stamp: Date.now().toString().slice(-7) }; },

  async runMigrated({ page, base, creds, data, forms, shot }) {
    const shots = {};
    page.on('dialog', d => d.accept().catch(() => {}));
    await forms.loginMigrated(page, base, creds.user, creds.pass);
    const MIG = base.replace(/\/+$/, '');
    const name = `ZZ Addr ${data.stamp}`;
    const rows = async () => page.evaluate(async (u) => { const r = await fetch(u, { headers: { Accept: 'application/json' } }); return r.ok ? await r.json() : []; }, `${MIG}/admin/organization/addresses/rows`);

    const fillCreate = async (nm) => {
      await page.goto(`${MIG}/admin/organization/addresses/new`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(700);
      // country / state / city are plain text inputs on this form (not searchable/cascading)
      await page.fill('#name', nm).catch(() => {});
      await page.fill('#address1', '1 Test Street').catch(() => {});
      await page.fill('#country', 'India').catch(() => {});
      await page.fill('#state', 'Karnataka').catch(() => {});
      await page.fill('#city', 'Test City').catch(() => {});
    };

    let id = null, inGrid = false, dupMsg = null, editPersisted = false;
    try {
      // create
      await fillCreate(name);
      shots.form = shot('form'); await page.screenshot({ path: shots.form, fullPage: true }).catch(() => {});
      await Promise.all([page.waitForLoadState('networkidle').catch(() => {}), page.getByRole('button', { name: /^create$/i }).click()]);
      await page.waitForTimeout(1500);
      id = (page.url().match(/addresses\/(\d+)/) || [])[1] || null;
      inGrid = id ? (await rows()).some(r => String(r.addressId) === String(id)) : false;

      // duplicate (same name)
      await fillCreate(name);
      await Promise.all([page.waitForLoadState('networkidle').catch(() => {}), page.getByRole('button', { name: /^create$/i }).click()]);
      await page.waitForTimeout(1200);
      dupMsg = await page.evaluate(() => { const m = document.body.innerText.match(/already exists[^<"]{0,40}/i); return m ? m[0].trim() : null; });

      // edit (change address1)
      if (id) {
        const newAddr = `99 Edited Ave ${data.stamp}`;
        await page.goto(`${MIG}/admin/organization/addresses/${id}`, { waitUntil: 'networkidle' });
        await page.waitForTimeout(700);
        await page.fill('#address1', newAddr).catch(() => {});
        await Promise.all([page.waitForLoadState('networkidle').catch(() => {}), page.getByRole('button', { name: /^update$/i }).click()]);
        await page.waitForTimeout(1200);
        await page.goto(`${MIG}/admin/organization/addresses/${id}`, { waitUntil: 'networkidle' });
        await page.waitForTimeout(600);
        editPersisted = (await page.inputValue('#address1').catch(() => '')) === newAddr;
      }
    } finally {
      try { psql(`DELETE FROM raptech_scm.address WHERE name LIKE 'ZZ Addr %'`); } catch (e) { /* best-effort (FK) */ }
    }
    return { id, inGrid, dupMsg, editPersisted, shots };
  },

  check(m) {
    return [
      { aspect: 'Create succeeded', migrated: m.id ? `id ${m.id}` : 'no id', expected: 'created', ok: !!m.id },
      { aspect: 'Appears in grid', migrated: m.inGrid, expected: true, ok: m.inGrid === true },
      { aspect: 'Duplicate blocked ("already exists")', migrated: m.dupMsg || '(none)', expected: 'already exists', ok: /already exists/i.test(m.dupMsg || '') },
      { aspect: 'Edit (address1) persisted', migrated: m.editPersisted, expected: true, ok: m.editPersisted === true },
    ];
  },
};
