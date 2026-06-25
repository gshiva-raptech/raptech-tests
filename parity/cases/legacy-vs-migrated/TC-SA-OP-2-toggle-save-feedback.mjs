// TC-SA-OP-2 — Org Parameter toggle + Save shows on-screen success and persists
// (UI-only, real org) — Track B. Manual-tester view: flip ONE parameter checkbox,
// click Save/Update, and assert the USER sees a SUCCESS banner in the form; reload
// and confirm the new state stuck. Then RESTORE the checkbox to its original state
// (this-run change only) and re-save. No psql; no new stamped rows (toggle only).
import { switchOrg } from '../../lib/fixtures.mjs';

const ORG_ID = 36;

async function banner(page) {
  return page.evaluate(() => {
    const ok = [...document.querySelectorAll('div[style*="status-success"]')].filter(d => d.offsetParent && d.textContent.trim()).map(d => d.textContent.trim());
    const err = [...document.querySelectorAll('div[style*="status-danger"]')].filter(d => d.offsetParent && d.textContent.trim()).map(d => d.textContent.trim());
    return { success: ok[0] || null, error: err[0] || null };
  });
}

export default {
  id: 'TC-SA-OP-2',
  title: 'Org Parameter — toggle + Save shows success and persists (UI-only)',
  track: 'B',
  role: 'superadmin',
  urlPath: '/admin/org-parameter',
  module: 'Admin Settings',
  subModule: 'Org Parameter',

  async runMigrated({ page, base, creds, forms, shot }) {
    const shots = {};
    await forms.loginMigrated(page, base, creds.user, creds.pass);
    const MIG = base.replace(/\/+$/, '');
    await switchOrg(page, base, ORG_ID);

    const open = async () => { await page.goto(`${MIG}/admin/org-parameter`, { waitUntil: 'networkidle' }); await page.waitForTimeout(600); };
    const saveBtn = () => page.getByRole('button', { name: /save\/update/i });

    let bannerAfterSave = { success: null, error: null };
    let orig = null, cbName = null, persistedAfter = null, restoredOk = null;
    try {
      await open();
      const firstCb = page.locator('input.op-param-toggle').first();
      cbName = await firstCb.getAttribute('name');
      orig = await firstCb.isChecked();

      // Flip it (the user's action).
      if (orig) await firstCb.uncheck(); else await firstCb.check();
      await Promise.all([page.waitForLoadState('networkidle').catch(() => {}), saveBtn().click()]);
      await page.waitForTimeout(900);
      bannerAfterSave = await banner(page);
      shots.save = shot('save'); await page.screenshot({ path: shots.save, fullPage: true }).catch(() => {});

      // Reload, confirm the flipped state persisted (what the user sees on the checkbox).
      await open();
      persistedAfter = await page.locator(`input[name="${cbName}"]`).first().isChecked().catch(() => null);
    } finally {
      // Restore to original (this-run change only) and re-save.
      try {
        await open();
        const fc = page.locator(`input[name="${cbName}"]`).first();
        if ((await fc.isChecked()) !== orig) { if (orig) await fc.check(); else await fc.uncheck(); }
        await Promise.all([page.waitForLoadState('networkidle').catch(() => {}), saveBtn().click()]);
        await page.waitForTimeout(800);
        await open();
        restoredOk = (await page.locator(`input[name="${cbName}"]`).first().isChecked().catch(() => null)) === orig;
      } catch { restoredOk = null; }
    }

    return { cbName, orig, bannerAfterSave, persistedAfter, restoredOk, shots };
  },

  check(m) {
    return [
      { aspect: 'Save shows a SUCCESS message to the user (no error)', migrated: m.bannerAfterSave.error ? `ERROR: ${m.bannerAfterSave.error.slice(0, 120)}` : (m.bannerAfterSave.success || '(none)'), expected: 'Parameters saved successfully.', ok: !!m.bannerAfterSave.success && !m.bannerAfterSave.error },
      { aspect: `Toggled state persisted on ${m.cbName}`, migrated: m.persistedAfter, expected: !m.orig, ok: m.persistedAfter === !m.orig },
      { aspect: 'Restored to original state (this-run change only)', migrated: m.restoredOk, expected: true, ok: m.restoredOk === true, severity: 'warn' },
    ];
  },
};
