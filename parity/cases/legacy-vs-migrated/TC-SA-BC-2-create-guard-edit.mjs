// TC-SA-BC-2 — Barcode create / one-per-org guard / edit, UI-only (super admin). Track B.
// Verified through what the user sees: the rendered form (required marker, locked type
// on edit), on-screen guard/flash messages, and the grid DOM the user returns to.
// Runs inside a FRESH fixture org (switchOrg) so the one-active-per-org guard is
// deterministic and never touches a real org's barcode config.
//
//   FORM — "Additional Barcode" type is required (marked *); Attributes is an optional
//          multi-select (UOM / Description 1 / Description 2).
//   CREATE — pick Quantity + two attributes → on-screen success, row appears in grid.
//   GUARD (legacy validateBarcodeExist) — opening "New Barcode" again is blocked with
//          "An active barcode print format already exists." and bounces to the list.
//   EDIT — the barcode type select is LOCKED (disabled) on edit (legacy editBarcode.jsp);
//          changing the attributes persists across a reload.
import { makeOrgData, createMigratedOrg, switchOrg } from '../../lib/fixtures.mjs';
import * as ui from '../../lib/ui.mjs';
import { psql } from '../../lib/db.mjs';

// Read the controller's flash banner the user sees (success = green status-success,
// error/guard = red status-danger), not the generic flash sniff (which can pick up the
// form-progress "All required fields complete").
async function banner(page, kind) {
  return page.evaluate(k => {
    const el = [...document.querySelectorAll('div')]
      .find(d => new RegExp(`status-${k}`).test(d.getAttribute('style') || '') && d.textContent.trim());
    return el ? el.textContent.trim() : null;
  }, kind);
}

export default {
  id: 'TC-SA-BC-2',
  title: 'Barcode create / one-per-org guard / locked type on edit / attrs persist',
  track: 'B',
  role: 'superadmin',
  urlPath: '/admin/barcode/new',
  module: 'Admin Settings',
  subModule: 'Barcode',
  priority: 'Medium',
  hints: '- AdminMiscController.barcodeNewForm/Create guard countActiveByOrgId>0 → "An active barcode print format already exists."\n'
       + '- Edit: #name select disabled (type locked). Attributes posted as barcodeAttrSel; stored in barcode_json.',

  async runMigrated({ page, base, creds, forms, shot }) {
    const shots = {};
    page.on('dialog', d => d.accept().catch(() => {}));
    await forms.loginMigrated(page, base, creds.user, creds.pass);
    const MIG = base.replace(/\/+$/, '');

    // fresh fixture org → guaranteed no existing barcode format
    const org = await createMigratedOrg(page, base, forms, makeOrgData('ZZ BC Org'));
    await switchOrg(page, base, org.orgId);

    // ── enumerate the create form (required marker on the type) ──
    await page.goto(`${MIG}/admin/barcode/new`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(700);
    const typeRequired = await page.evaluate(() => {
      const f = [...document.querySelectorAll('.field')].find(x => x.querySelector('#name'));
      return !!(f && f.querySelector('.req'));
    });
    shots.form = shot('form'); await page.screenshot({ path: shots.form, fullPage: true }).catch(() => {});

    // ── create ──
    await page.selectOption('#name', 'Qty').catch(() => {});
    await page.selectOption('#barcodeAttrs', ['UOM', 'Desc 1']).catch(() => {});
    await ui.submit(page, /create barcode/i);
    const createFlash = await banner(page, 'success');
    const id = (page.url().match(/barcode\/(\d+)/) || [])[1] || null;

    // appears in the grid (UI verification — grid DOM)
    await page.goto(`${MIG}/admin/barcode`, { waitUntil: 'networkidle' });
    await ui.gridReady(page);
    const inGrid = (await ui.gridRows(page)).length >= 1;

    // ── one-per-org guard: GET /new bounces to the list with the message ──
    await page.goto(`${MIG}/admin/barcode/new`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(900);
    const guardBlocked = !/\/barcode\/new$/.test(page.url());
    // The grid page renders the flash differently from the form pages; read the visible
    // guard text the user sees on the list page.
    const guardMsg = await page.evaluate(() => {
      const m = document.body.innerText.match(/[^.\n]*already exists[^.\n]*\.?/i);
      return m ? m[0].trim() : null;
    });

    // ── edit: type locked + attributes persist ──
    let typeLocked = null, editPersisted = false, editFlash = null;
    if (id) {
      await page.goto(`${MIG}/admin/barcode/${id}`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(700);
      typeLocked = (await ui.isEditable(page, '#name')) === false; // disabled select = not editable
      await page.selectOption('#barcodeAttrs', ['UOM', 'Desc 1', 'Desc 2']).catch(() => {});
      await ui.submit(page, /save changes/i);
      editFlash = await banner(page, 'success');
      await page.goto(`${MIG}/admin/barcode/${id}`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(700);
      const selected = await page.$$eval('#barcodeAttrs option', o => o.filter(x => x.selected).map(x => x.value));
      editPersisted = selected.includes('Desc 2');
    }

    // ── Cleanup (mandatory): hard-delete the barcode row created in the fixture org. ──
    // (The fixture org itself follows the harness's ZZ-prefixed throwaway-org pattern.)
    try {
      psql(`DELETE FROM raptech_scm.barcode_detail WHERE org_id_fk = ${Number(org.orgId)};`);
    } catch { /* best-effort cleanup */ }

    return { orgId: org.orgId, typeRequired, id, createFlash, inGrid, guardBlocked, guardMsg, typeLocked, editFlash, editPersisted, shots };
  },

  check(m) {
    return [
      { aspect: 'Type ("Additional Barcode") marked required', migrated: m.typeRequired, expected: true, ok: m.typeRequired === true },
      { aspect: 'Create succeeds with success message',
        migrated: m.id ? `id ${m.id} — ${m.createFlash || ''}` : 'no id', expected: 'created',
        ok: !!m.id && /success|created/i.test(m.createFlash || '') },
      { aspect: 'New barcode visible in grid', migrated: m.inGrid, expected: true, ok: m.inGrid === true },
      { aspect: 'One-per-org guard blocks a 2nd create',
        migrated: m.guardBlocked ? 'blocked' : 'allowed', expected: 'blocked', ok: m.guardBlocked === true },
      { aspect: 'Guard message ("already exists")', migrated: m.guardMsg || '(none)',
        expected: 'An active barcode print format already exists.', ok: /already exists/i.test(m.guardMsg || '') },
      { aspect: 'Barcode type is locked on edit', migrated: m.typeLocked, expected: true, ok: m.typeLocked === true },
      { aspect: 'Edit (attributes) persists on reload',
        migrated: `${m.editFlash || ''} persisted=${m.editPersisted}`, expected: true, ok: m.editPersisted === true },
    ];
  },
};
