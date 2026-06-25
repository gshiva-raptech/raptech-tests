// TC-OUI-MSEG-2 — Market Segment create / required / duplicate / edit, UI-only.
//
// Drives the screens exactly like a manual tester and asserts only what the user
// SEES (inline field error, grid row text, on-screen "already exists" message).
//
// Legacy parity (live-verified): empty submit → inline "Required."; duplicate name
//   → on-screen "Already Exists" and stays on the add form; valid create → row
//   appears in the grid; edit name persists.
// Cleanup: edits the created row's name to a unique stamp, then soft/hard removes
//   it via the controller's own update+psql (RULE 7 — only this run's stamped row).
import * as ui from '../../lib/ui.mjs';
import { psql } from '../../lib/db.mjs';

export default {
  id: 'TC-OUI-MSEG-2', title: 'Market Segment create / required / duplicate / edit (UI-only)',
  track: 'B', role: 'regular',
  urlPath: '/admin/organization/market-segment', module: 'Admin Settings',
  subModule: 'Organization → Market Segment',
  hints: '- OrgSettingsController marketSegmentCreate (dup guard "already exists"), {id} update.',
  data() { return { stamp: 'ZZ MSEG ' + Date.now().toString().slice(-7) }; },
  async runMigrated({ page, base, creds, data, forms }) {
    await forms.loginMigrated(page, base, creds.user, creds.pass);
    const MIG = base.replace(/\/+$/, '');
    const name = data.stamp;
    let reqErr = null, createdInGrid = false, dupMsg = null, editedInGrid = false, createdId = null;
    try {
      // 1) required validation (empty submit)
      await page.goto(`${MIG}/admin/organization/market-segment/new`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(500);
      await page.getByRole('button', { name: /create/i }).click().catch(() => {});
      await page.waitForTimeout(500);
      const errs = await ui.visibleFieldErrors(page);
      reqErr = errs.length ? errs[0].msg : null;

      // 2) valid create → appears in grid
      await page.fill('#name', name);
      await Promise.all([page.waitForLoadState('networkidle').catch(() => {}),
        page.getByRole('button', { name: /create/i }).click()]);
      await page.waitForTimeout(900);
      createdId = (page.url().match(/market-segment\/(\d+)/) || [])[1] || null;
      await page.goto(`${MIG}/admin/organization/market-segment`, { waitUntil: 'domcontentloaded' });
      await ui.gridReady(page);
      createdInGrid = await ui.gridHasText(page, name);

      // 3) duplicate guard (same name) → on-screen message, stays on form
      await page.goto(`${MIG}/admin/organization/market-segment/new`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(400);
      await page.fill('#name', name);
      await Promise.all([page.waitForLoadState('networkidle').catch(() => {}),
        page.getByRole('button', { name: /create/i }).click()]);
      await page.waitForTimeout(800);
      dupMsg = await page.evaluate(() => document.body.innerText.match(/already exists[^\n]*/i)?.[0] || null);

      // 4) edit name persists (visible in grid)
      if (createdId) {
        const name2 = name + ' E';
        await page.goto(`${MIG}/admin/organization/market-segment/${createdId}`, { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(500);
        await page.fill('#name', name2);
        await Promise.all([page.waitForLoadState('networkidle').catch(() => {}),
          page.getByRole('button', { name: /update/i }).click()]);
        await page.waitForTimeout(800);
        await page.goto(`${MIG}/admin/organization/market-segment`, { waitUntil: 'domcontentloaded' });
        await ui.gridReady(page);
        editedInGrid = await ui.gridHasText(page, name2);
      }
    } finally {
      // RULE 7: remove ONLY this run's stamped rows.
      try { psql(`DELETE FROM raptech_scm.regional_master WHERE regional_name LIKE $T$${data.stamp}%$T$`); } catch (e) { /* report if blocked */ }
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
