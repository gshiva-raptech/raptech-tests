// TC-TCM-001 — Tax Country Mapping CRUD lifecycle (super admin) — Track B.
// create (taxType→groupId→module + unique cityFrom) → in grid → duplicate blocked
// ("Already Exists") → edit (cityTo persists) → delete (gone from grid).
export default {
  id: 'TC-TCM-001',
  title: 'Tax Country Mapping create / duplicate / edit / delete',
  track: 'B',
  role: 'superadmin',
  urlPath: '/admin/tax-country-mapping',
  module: 'Admin Settings',
  subModule: 'Tax Country Mapping',
  hints: '- AdminMiscController taxCountryMappingCreate (dup guard isDuplicateTcm), Edit/{id}, /{id}/delete.',

  data() { const stamp = Date.now().toString().slice(-7); return { stamp }; },

  async runMigrated({ page, base, creds, data, forms, shot }) {
    const shots = {};
    page.on('dialog', d => d.accept().catch(() => {}));
    await forms.loginMigrated(page, base, creds.user, creds.pass);
    const MIG = base.replace(/\/+$/, '');
    const cityFrom = `ZZTCM${data.stamp}`;
    const firstVal = (sel) => page.evaluate(s => { const el = document.querySelector(s); if (!el) return null; const o = [...el.options].find(x => x.value); return o ? o.value : null; }, sel);

    const fillNew = async () => {
      await page.goto(`${MIG}/admin/tax-country-mapping/new`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(600);
      const tt = await firstVal('#taxType'); if (tt) await page.selectOption('#taxType', tt);
      await page.waitForTimeout(1000);                              // groupId cascade
      const gid = await firstVal('#groupId'); if (gid) await page.selectOption('#groupId', gid).catch(() => {});
      const mod = await firstVal('#module'); if (mod) await page.selectOption('#module', mod).catch(() => {});
      await page.fill('#cityFrom', cityFrom).catch(() => {});
    };

    // ── create ──
    await fillNew();
    shots.form = shot('form'); await page.screenshot({ path: shots.form, fullPage: true }).catch(() => {});
    await Promise.all([page.waitForLoadState('networkidle').catch(() => {}), page.getByRole('button', { name: /create mapping/i }).click()]);
    await page.waitForTimeout(1500);
    const afterUrl = page.url();
    const idMatch = afterUrl.match(/tax-country-mapping\/(\d+)/);
    const id = idMatch ? idMatch[1] : null;
    const rows = async () => page.evaluate(async (u) => { const r = await fetch(u, { headers: { Accept: 'application/json' } }); return r.ok ? await r.json() : []; }, `${MIG}/admin/tax-country-mapping/rows`);
    const inGrid = id ? (await rows()).some(r => String(r.taxCountryMappingId) === String(id)) : false;

    // ── duplicate (same values) → "Already Exists" ──
    await fillNew();
    await Promise.all([page.waitForLoadState('networkidle').catch(() => {}), page.getByRole('button', { name: /create mapping/i }).click()]);
    await page.waitForTimeout(1200);
    const dupMsg = await page.evaluate(() => { const m = document.body.innerText.match(/Already Exists[^<"]{0,40}/i); return m ? m[0].trim() : null; });

    // ── edit (change cityTo) ──
    let editPersisted = false;
    if (id) {
      await page.goto(`${MIG}/admin/tax-country-mapping/${id}`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(700);
      const newCityTo = `ZZEDIT${data.stamp}`;
      await page.fill('#cityTo', newCityTo).catch(() => {});
      await Promise.all([page.waitForLoadState('networkidle').catch(() => {}), page.getByRole('button', { name: /save changes/i }).click()]);
      await page.waitForTimeout(1200);
      await page.goto(`${MIG}/admin/tax-country-mapping/${id}`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(600);
      const got = await page.inputValue('#cityTo').catch(() => '');
      editPersisted = got.toUpperCase() === newCityTo.toUpperCase();
    }

    // ── delete ──
    let deletedGone = false;
    if (id) {
      await page.goto(`${MIG}/admin/tax-country-mapping/${id}`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(600);
      await Promise.all([page.waitForLoadState('networkidle').catch(() => {}), page.getByRole('button', { name: /^delete$/i }).click()]);
      await page.waitForTimeout(1200);
      deletedGone = !(await rows()).some(r => String(r.taxCountryMappingId) === String(id));
    }

    return { id, inGrid, dupMsg, editPersisted, deletedGone, shots };
  },

  check(m) {
    return [
      { aspect: 'Create succeeded', migrated: m.id ? `id ${m.id}` : 'no id', expected: 'created', ok: !!m.id },
      { aspect: 'Appears in grid', migrated: m.inGrid, expected: true, ok: m.inGrid === true },
      { aspect: 'Duplicate blocked ("Already Exists")', migrated: m.dupMsg || '(none)', expected: 'Already Exists', ok: /already exists/i.test(m.dupMsg || '') },
      { aspect: 'Edit (cityTo) persisted', migrated: m.editPersisted, expected: true, ok: m.editPersisted === true },
      { aspect: 'Delete removed from grid', migrated: m.deletedGone ? 'gone' : 'still present', expected: 'gone', ok: m.deletedGone === true },
    ];
  },
};
