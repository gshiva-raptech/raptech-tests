// TC-BC-001 — Barcode create / one-per-org guard / edit — Track B.
// Legacy validateBarcodeExist: only ONE active barcode print format per org. Migrated
// enforces this on BOTH GET and POST /barcode/new (countActiveByOrgId > 0 → redirect to
// /admin/barcode with "An active barcode print format already exists.").
//   create (type Qty + attrs) → in grid → /new blocked (guard) → edit attrs persist.
// Org-scoped → run inside a fresh fixture org (switchOrg) so the create + guard are
// deterministic and never touch a real org's barcode config.
import { makeOrgData, createMigratedOrg, switchOrg } from '../../lib/fixtures.mjs';

export default {
  id: 'TC-BC-001',
  title: 'Barcode create / one-per-org guard / edit',
  track: 'B',
  role: 'superadmin',
  urlPath: '/admin/barcode',
  module: 'Admin Settings',
  subModule: 'Barcode',
  hints: '- AdminMiscController.barcodeCreate (guard countActiveByOrgId), barcodeUpdate; attrs via barcodeAttrSel.',

  async runMigrated({ page, base, creds, forms, shot }) {
    const shots = {};
    page.on('dialog', d => d.accept().catch(() => {}));
    await forms.loginMigrated(page, base, creds.user, creds.pass);
    const MIG = base.replace(/\/+$/, '');

    // fresh fixture org → guaranteed no existing barcode format
    const org = await createMigratedOrg(page, base, forms, makeOrgData('ZZ BC Org'));
    await switchOrg(page, base, org.orgId);

    const rows = async () => page.evaluate(async (u) => {
      const r = await fetch(u, { headers: { Accept: 'application/json' } }); return r.ok ? await r.json() : [];
    }, `${MIG}/admin/barcode/rows`);
    const before = (await rows()).length;

    // ── create ──
    await page.goto(`${MIG}/admin/barcode/new`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(700);
    await page.selectOption('#name', 'Qty').catch(() => {});
    await page.selectOption('#barcodeAttrs', ['UOM', 'Desc 1']).catch(() => {});
    shots.form = shot('form'); await page.screenshot({ path: shots.form, fullPage: true }).catch(() => {});
    await Promise.all([page.waitForLoadState('networkidle').catch(() => {}), page.getByRole('button', { name: /create barcode/i }).click()]);
    await page.waitForTimeout(1500);
    const afterUrl = page.url();
    const idMatch = afterUrl.match(/barcode\/(\d+)/);
    const id = idMatch ? idMatch[1] : null;
    const inGrid = id ? (await rows()).some(r => String(r.barcodeId) === String(id)) : false;

    // ── one-per-org guard: GET /new must redirect to list with "already exists" ──
    await page.goto(`${MIG}/admin/barcode/new`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);
    const guardUrl = page.url();
    const guardBlocked = !/\/barcode\/new$/.test(guardUrl); // bounced off the new form
    const guardMsg = await page.evaluate(() => {
      const m = document.body.innerText.match(/already exists[^<"]{0,40}/i); return m ? m[0].trim() : null;
    });

    // ── edit: add an attribute, save, verify persisted ──
    let editPersisted = false;
    if (id) {
      await page.goto(`${MIG}/admin/barcode/${id}`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(700);
      await page.selectOption('#barcodeAttrs', ['UOM', 'Desc 1', 'Desc 2']).catch(() => {});
      await Promise.all([page.waitForLoadState('networkidle').catch(() => {}), page.getByRole('button', { name: /save changes/i }).click()]);
      await page.waitForTimeout(1200);
      await page.goto(`${MIG}/admin/barcode/${id}`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(700);
      const selected = await page.evaluate(() => [...document.querySelectorAll('#barcodeAttrs option')].filter(o => o.selected).map(o => o.value));
      editPersisted = selected.includes('Desc 2');
    }

    return { orgId: org.orgId, before, id, inGrid, guardBlocked, guardMsg, editPersisted, shots };
  },

  check(m) {
    return [
      { aspect: 'Fixture org starts with no barcode', migrated: m.before, expected: 0, ok: m.before === 0 },
      { aspect: 'Create succeeded', migrated: m.id ? `id ${m.id}` : 'no id', expected: 'created', ok: !!m.id },
      { aspect: 'Appears in grid', migrated: m.inGrid, expected: true, ok: m.inGrid === true },
      { aspect: 'One-per-org guard blocks 2nd create', migrated: m.guardBlocked ? 'blocked' : 'allowed', expected: 'blocked', ok: m.guardBlocked === true },
      { aspect: 'Guard message ("already exists")', migrated: m.guardMsg || '(none)', expected: 'already exists', ok: /already exists/i.test(m.guardMsg || '') },
      { aspect: 'Edit (attributes) persisted', migrated: m.editPersisted, expected: true, ok: m.editPersisted === true },
    ];
  },
};
