// TC-SA-TCM-2 — Tax Country Mapping form: UI-only validations + full CRUD lifecycle,
// verified through what the user sees (inline field errors, on-screen flash/banner,
// the grid DOM the user is returned to). Track B (migrated). FK-ordered ZZ cleanup.
//
// What a manual tester checks here:
//   FIELDS / REQUIRED MARKERS — Tax Type*, Group Tax*, Module* (required); Business
//     Type, Country/State/City From+To (optional). Asserts the three * markers render.
//   VALIDATION 1 (required) — submit the empty form → the three required fields show
//     their inline "Required" error and the save is blocked (still on /new).
//   VALIDATION 2 (cascade) — Group Tax is empty until a Tax Type is chosen (legacy
//     configureGroupTaxList parity); picking a Tax Type populates it.
//   VALIDATION 3 (duplicate) — re-submitting identical values → on-screen
//     "This Country Mapping Already Exists." and no second row created.
//   ACTIONS — Create Mapping, Save Changes, Delete (with confirm), Cancel.
//   LIFECYCLE — create → row visible in grid → duplicate blocked → edit (City To)
//     persists on reload → delete removes the row from the grid the user sees.
import * as ui from '../../lib/ui.mjs';
import { psql } from '../../lib/db.mjs';

// Read the green success banner the user sees (the controller's successMsg div), not the
// generic flash sniff (which can grab the form-progress "All required fields complete").
async function successBanner(page) {
  return page.evaluate(() => {
    const el = [...document.querySelectorAll('div')]
      .find(d => /status-success/.test(d.getAttribute('style') || '') && d.textContent.trim());
    return el ? el.textContent.trim() : null;
  });
}

// Type into the grid's quick-search box (what a manual tester does to find a row in a
// large list) and return how many rows the user is left looking at containing `text`.
async function gridSearchCount(page, text) {
  await page.fill('#quickSearch', '').catch(() => {});
  await page.fill('#quickSearch', text).catch(() => {});
  await page.waitForTimeout(1000);
  const rows = await ui.gridRows(page);
  return rows.filter(r => r.cells.some(c => c.includes(text))).length;
}

export default {
  id: 'TC-SA-TCM-2',
  title: 'Tax Country Mapping form — required/cascade/duplicate validations + CRUD',
  track: 'B',
  role: 'superadmin',
  urlPath: '/admin/tax-country-mapping/new',
  module: 'Admin Settings',
  subModule: 'Tax Country Mapping',
  priority: 'Medium',
  hints: '- Required: Tax Type / Group Tax / Module (data-req). Dup guard isDuplicateTcm → "This Country Mapping Already Exists."\n'
       + '- Group Tax cascade depends on Tax Type. Buttons: Create Mapping / Save Changes / Delete (confirm) / Cancel.',

  data() { return { stamp: Date.now().toString().slice(-7) }; },

  async runMigrated({ page, base, creds, data, forms, shot }) {
    const shots = {};
    page.on('dialog', d => d.accept().catch(() => {}));
    await forms.loginMigrated(page, base, creds.user, creds.pass);
    const MIG = base.replace(/\/+$/, '');
    const cityFrom = `ZZTCM${data.stamp}`;
    const firstVal = (sel) => page.evaluate(s => {
      const el = document.querySelector(s); if (!el) return null;
      const o = [...el.options].find(x => x.value); return o ? o.value : null;
    }, sel);

    // ── enumerate fields + required markers (what the user sees on a blank form) ──
    await page.goto(`${MIG}/admin/tax-country-mapping/new`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(700);
    const fields = await page.$$eval('.field', fs => fs.map(f => ({
      label: (f.querySelector('.field-label,label')?.textContent || '').trim().split('\n')[0].trim(),
      required: !!f.querySelector('.req'),
    })).filter(x => x.label));
    const reqLabels = fields.filter(f => f.required).map(f => f.label.replace(/\s*\*$/, '').trim());
    shots.blank = shot('blank'); await page.screenshot({ path: shots.blank, fullPage: true }).catch(() => {});

    // ── VALIDATION 1: submit empty → inline required errors, save blocked ──
    await ui.submit(page, /create mapping/i);
    const fieldErrors = await ui.visibleFieldErrors(page);
    const blockedEmpty = /\/tax-country-mapping\/new$/.test(page.url());
    shots.required = shot('required'); await page.screenshot({ path: shots.required, fullPage: true }).catch(() => {});

    // ── VALIDATION 2: Group Tax cascade — empty until Tax Type chosen ──
    await page.goto(`${MIG}/admin/tax-country-mapping/new`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(600);
    const groupBefore = await page.$$eval('#groupId option', o => o.filter(x => x.value).length);
    const tt = await firstVal('#taxType'); if (tt) await page.selectOption('#taxType', tt);
    await page.waitForTimeout(1000);
    const groupAfter = await page.$$eval('#groupId option', o => o.filter(x => x.value).length);

    // ── CREATE (valid) ──
    const fillNew = async () => {
      await page.goto(`${MIG}/admin/tax-country-mapping/new`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(600);
      const t = await firstVal('#taxType'); if (t) await page.selectOption('#taxType', t);
      await page.waitForTimeout(1000);
      const g = await firstVal('#groupId'); if (g) await page.selectOption('#groupId', g).catch(() => {});
      const m = await firstVal('#module'); if (m) await page.selectOption('#module', m).catch(() => {});
      await page.fill('#cityFrom', cityFrom).catch(() => {});
    };
    await fillNew();
    await ui.submit(page, /create mapping/i);
    const createFlash = await successBanner(page);
    const id = (page.url().match(/tax-country-mapping\/(\d+)/) || [])[1] || null;

    // appears in the grid the user is returned to (UI verification — grid quick-search)
    await page.goto(`${MIG}/admin/tax-country-mapping`, { waitUntil: 'networkidle' });
    await ui.gridReady(page);
    const inGrid = (await gridSearchCount(page, cityFrom)) >= 1;

    // ── VALIDATION 3: duplicate → on-screen "Already Exists", grid unchanged ──
    await fillNew();
    await ui.submit(page, /create mapping/i);
    // Duplicate is rejected by re-rendering the form with an error banner (errorMsg).
    const dupFlash = await page.evaluate(() => {
      const el = [...document.querySelectorAll('div')]
        .find(d => /status-danger/.test(d.getAttribute('style') || '') && d.textContent.trim());
      return el ? el.textContent.trim() : null;
    });
    const dupBlocked = /already exists/i.test(dupFlash || '');
    await page.goto(`${MIG}/admin/tax-country-mapping`, { waitUntil: 'networkidle' });
    await ui.gridReady(page);
    const dupCount = await gridSearchCount(page, cityFrom);

    // ── EDIT: read-only fields? required markers still shown; change City To, persist ──
    let editPersisted = false, editFlash = null, saveBtnPresent = false, deleteBtnPresent = false;
    const newCityTo = `ZZED${data.stamp}`;
    if (id) {
      await page.goto(`${MIG}/admin/tax-country-mapping/${id}`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(700);
      saveBtnPresent = (await page.getByRole('button', { name: /save changes/i }).count()) > 0;
      deleteBtnPresent = (await page.getByRole('button', { name: /^delete$/i }).count()) > 0;
      await page.fill('#cityTo', newCityTo).catch(() => {});
      await ui.submit(page, /save changes/i);
      editFlash = await successBanner(page);
      await page.goto(`${MIG}/admin/tax-country-mapping/${id}`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(600);
      const got = await page.inputValue('#cityTo').catch(() => '');
      editPersisted = got.toUpperCase() === newCityTo.toUpperCase();
    }

    // ── DELETE: confirm → row gone from the grid the user sees ──
    let deletedGone = false;
    if (id) {
      await page.goto(`${MIG}/admin/tax-country-mapping/${id}`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(600);
      await ui.submit(page, /^delete$/i);
      await page.goto(`${MIG}/admin/tax-country-mapping`, { waitUntil: 'networkidle' });
      await ui.gridReady(page);
      deletedGone = (await gridSearchCount(page, cityFrom)) === 0;
    }

    // ── Cleanup (mandatory): hard-delete any ZZ test row left behind, by cityFrom. ──
    // Delete in the flow is a soft delete (del_flag=Y); this guarantees 0 leftovers.
    try {
      psql(`DELETE FROM raptech_scm.tax_country_mapping WHERE city_from = '${cityFrom.toUpperCase()}';`);
    } catch { /* cleanup is best-effort; never fail the case on it */ }

    return {
      reqLabels, fieldErrors, blockedEmpty, groupBefore, groupAfter,
      id, createFlash, inGrid, dupFlash, dupBlocked, dupCount,
      saveBtnPresent, deleteBtnPresent, editFlash, editPersisted, deletedGone, shots,
    };
  },

  check(m) {
    const reqSet = (m.reqLabels || []).map(s => s.toLowerCase());
    const reqHas = re => reqSet.some(l => re.test(l));
    return [
      { aspect: 'Required markers on Tax Type / Group Tax / Module',
        migrated: m.reqLabels.join(', ') || '(none)', expected: 'Tax Type, Group Tax, Module marked *',
        ok: reqHas(/tax type/) && reqHas(/group tax/) && reqHas(/module/) },
      { aspect: 'Empty submit blocked with inline errors',
        migrated: `blocked=${m.blockedEmpty}, errors=${m.fieldErrors.length}`, expected: 'blocked + >=3 errors',
        ok: m.blockedEmpty === true && m.fieldErrors.length >= 3 },
      { aspect: 'Group Tax cascades from Tax Type (empty until chosen)',
        migrated: `before=${m.groupBefore} after=${m.groupAfter}`, expected: 'before 0, after >0',
        ok: m.groupBefore === 0 && m.groupAfter > 0 },
      { aspect: 'Create succeeds with success message',
        migrated: m.id ? `id ${m.id} — ${m.createFlash || ''}` : 'no id', expected: 'created',
        ok: !!m.id && /success|created/i.test(m.createFlash || '') },
      { aspect: 'New mapping visible in grid', migrated: m.inGrid, expected: true, ok: m.inGrid === true },
      { aspect: 'Duplicate blocked ("Already Exists") + no 2nd row',
        migrated: `${m.dupFlash || '(none)'} | rows=${m.dupCount}`, expected: 'Already Exists, 1 row',
        ok: m.dupBlocked === true && m.dupCount === 1 },
      { aspect: 'Edit form shows Save + Delete actions',
        migrated: `save=${m.saveBtnPresent} delete=${m.deleteBtnPresent}`, expected: 'both present',
        ok: m.saveBtnPresent && m.deleteBtnPresent },
      { aspect: 'Edit (City To) persists on reload',
        migrated: `${m.editFlash || ''} persisted=${m.editPersisted}`, expected: true, ok: m.editPersisted === true },
      { aspect: 'Delete removes the row from the grid', migrated: m.deletedGone ? 'gone' : 'still present',
        expected: 'gone', ok: m.deletedGone === true },
    ];
  },
};
