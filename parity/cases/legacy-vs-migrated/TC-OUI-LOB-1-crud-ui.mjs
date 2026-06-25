// TC-OUI-LOB-1 — Line of Business create / required / duplicate / edit, UI-only.
//
// Legacy parity (live-verified, functions.action / addFunction.action):
//   • Grid column "Line of Business"; row actions "Edit Line of Business",
//     "Line of Business Details".
//   • Empty submit → inline "Required."; duplicate name → "Already Exists" and
//     stays on the add form.
// Asserts only what the user SEES (inline error, grid row text, on-screen dup msg).
// Cleanup (RULE 7): delete only this run's stamped rows from raptech_scm.functions.
import * as ui from '../../lib/ui.mjs';
import { psql } from '../../lib/db.mjs';

export default {
  id: 'TC-OUI-LOB-1', title: 'Line of Business create / required / duplicate / edit (UI-only)',
  track: 'B', role: 'regular',
  urlPath: '/admin/organization/line-of-business', module: 'Admin Settings',
  subModule: 'Organization → Line of Business',
  hints: '- OrgSettingsController lineOfBusinessCreate (dup guard), {id} update. table raptech_scm.functions (value_).',
  data() { return { stamp: 'ZZ LOB ' + Date.now().toString().slice(-7) }; },
  async runMigrated({ page, base, creds, data, forms }) {
    await forms.loginMigrated(page, base, creds.user, creds.pass);
    const MIG = base.replace(/\/+$/, '');
    const name = data.stamp;
    let reqErr = null, createdInGrid = false, dupMsg = null, editedInGrid = false, id = null;
    try {
      await page.goto(`${MIG}/admin/organization/line-of-business/new`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(500);
      await page.getByRole('button', { name: /create/i }).click().catch(() => {});
      await page.waitForTimeout(500);
      const errs = await ui.visibleFieldErrors(page);
      reqErr = errs.length ? errs[0].msg : null;

      await page.fill('#name', name);
      await Promise.all([page.waitForLoadState('networkidle').catch(() => {}),
        page.getByRole('button', { name: /create/i }).click()]);
      await page.waitForTimeout(900);
      id = (page.url().match(/line-of-business\/(\d+)/) || [])[1] || null;
      await page.goto(`${MIG}/admin/organization/line-of-business`, { waitUntil: 'domcontentloaded' });
      await ui.gridReady(page);
      createdInGrid = await ui.gridHasText(page, name);

      await page.goto(`${MIG}/admin/organization/line-of-business/new`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(400);
      await page.fill('#name', name);
      await Promise.all([page.waitForLoadState('networkidle').catch(() => {}),
        page.getByRole('button', { name: /create/i }).click()]);
      await page.waitForTimeout(800);
      dupMsg = await page.evaluate(() => document.body.innerText.match(/already exists[^\n]*/i)?.[0] || null);

      if (id) {
        const name2 = name + ' E';
        await page.goto(`${MIG}/admin/organization/line-of-business/${id}`, { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(500);
        await page.fill('#name', name2);
        await Promise.all([page.waitForLoadState('networkidle').catch(() => {}),
          page.getByRole('button', { name: /update/i }).click()]);
        await page.waitForTimeout(800);
        await page.goto(`${MIG}/admin/organization/line-of-business`, { waitUntil: 'domcontentloaded' });
        await ui.gridReady(page);
        editedInGrid = await ui.gridHasText(page, name2);
      }
    } finally {
      try { psql(`DELETE FROM raptech_scm.functions WHERE value_ LIKE $T$${data.stamp}%$T$`); } catch (e) { /* report if blocked */ }
    }
    return { reqErr, createdInGrid, dupMsg, editedInGrid };
  },
  check(m) {
    return [
      { aspect: 'Empty submit shows inline required error', migrated: m.reqErr || '(none)',
        expected: 'required', ok: /required/i.test(m.reqErr || '') },
      { aspect: 'Valid create appears in grid', migrated: m.createdInGrid, expected: true, ok: m.createdInGrid === true },
      { aspect: 'Duplicate name blocked with on-screen message', migrated: m.dupMsg || '(none)',
        expected: 'already exists', ok: /already exists/i.test(m.dupMsg || '') },
      { aspect: 'Edited name persists in grid', migrated: m.editedInGrid, expected: true, ok: m.editedInGrid === true },
    ];
  },
};
