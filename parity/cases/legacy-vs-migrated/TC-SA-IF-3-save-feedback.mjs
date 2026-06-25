// TC-SA-IF-3 — Item Formula Save shows on-screen success + persists (UI-only) — Track B.
// Manual-tester view: in a real org, tick Costing on a matrix row that has no saved
// formula yet (so Save must INSERT a new row), set a formula, click Save / Update, and
// assert the USER sees a SUCCESS banner in the form (not an error). This asserts the
// EXPECTED behavior; a duplicate-key DB error surfacing to the user is a finding.
//
// Cleanup: this case only flips a checkbox/formula it set; in a `finally` it restores
// the row to its original state via the UI (un-tick + clear) and re-saves. No psql,
// no new stamped rows (a failed INSERT creates nothing).
import { switchOrg } from '../../lib/fixtures.mjs';

const ORG_ID = 36;

// The actual styled success/error banner the user reads (matches the form's flash divs).
async function banner(page) {
  return page.evaluate(() => {
    const ok = [...document.querySelectorAll('div[style*="status-success"]')].filter(d => d.offsetParent && d.textContent.trim()).map(d => d.textContent.trim());
    const err = [...document.querySelectorAll('div[style*="status-danger"]')].filter(d => d.offsetParent && d.textContent.trim()).map(d => d.textContent.trim());
    return { success: ok[0] || null, error: err[0] || null };
  });
}

export default {
  id: 'TC-SA-IF-3',
  title: 'Item Formula — Save shows success + persists (UI-only)',
  track: 'B',
  role: 'superadmin',
  urlPath: '/admin/item-formula',
  module: 'Admin Settings',
  subModule: 'Item Formula',

  async runMigrated({ page, base, creds, forms, shot }) {
    const shots = {};
    await forms.loginMigrated(page, base, creds.user, creds.pass);
    const MIG = base.replace(/\/+$/, '');
    await switchOrg(page, base, ORG_ID);

    const open = async () => { await page.goto(`${MIG}/admin/item-formula?type=Price`, { waitUntil: 'networkidle' }); await page.waitForTimeout(600); };

    let bannerAfterSave = { success: null, error: null };
    let savedRowName = null, persistedChecked = null, persistedFormula = null;
    let targetIdx = null;
    try {
      await open();
      // Find a matrix row that currently has NO saved itemFormulaId → Save must INSERT.
      const target = await page.evaluate(() => {
        const trs = [...document.querySelectorAll('form table tbody tr')];
        for (let i = 0; i < trs.length; i++) {
          const idIn = trs[i].querySelector('input[name^="itemFormulaId_"]');
          const name = trs[i].querySelector('span')?.textContent?.trim();
          if (idIn && !idIn.value) return { idx: i, name };
        }
        return null;
      });
      if (!target) throw new Error('no insert-needed row found on Item Formula matrix for org ' + ORG_ID);
      targetIdx = target.idx; savedRowName = target.name;

      const tr = page.locator('form table tbody tr').nth(target.idx);
      await tr.locator('input[type=checkbox][name^="isCosting_"]').first().check();
      await tr.locator('input[name^="costingFormula_"]').first().fill('1');
      await Promise.all([page.waitForLoadState('networkidle').catch(() => {}), page.getByRole('button', { name: /save \/ update/i }).click()]);
      await page.waitForTimeout(1000);
      bannerAfterSave = await banner(page);
      shots.save = shot('save'); await page.screenshot({ path: shots.save, fullPage: true }).catch(() => {});

      // Reload and read back what the user sees on that row.
      await open();
      const tr2 = page.locator('form table tbody tr').nth(target.idx);
      persistedChecked = await tr2.locator('input[type=checkbox][name^="isCosting_"]').first().isChecked().catch(() => null);
      persistedFormula = await tr2.locator('input[name^="costingFormula_"]').first().inputValue().catch(() => null);
    } finally {
      // Restore via UI: if the row now has a saved row (success case), un-tick + clear and re-save.
      try {
        if (targetIdx != null) {
          await open();
          const tr = page.locator('form table tbody tr').nth(targetIdx);
          const cb = tr.locator('input[type=checkbox][name^="isCosting_"]').first();
          if (await cb.isChecked()) await cb.uncheck();
          await tr.locator('input[name^="costingFormula_"]').first().fill('');
          await Promise.all([page.waitForLoadState('networkidle').catch(() => {}), page.getByRole('button', { name: /save \/ update/i }).click()]);
          await page.waitForTimeout(800);
        }
      } catch { /* best-effort restore */ }
    }

    return { savedRowName, bannerAfterSave, persistedChecked, persistedFormula, shots };
  },

  check(m) {
    return [
      { aspect: 'Save shows a SUCCESS message to the user (no error)', migrated: m.bannerAfterSave.error ? `ERROR: ${m.bannerAfterSave.error.slice(0, 120)}` : (m.bannerAfterSave.success || '(none)'), expected: 'Item Formula saved successfully.', ok: !!m.bannerAfterSave.success && !m.bannerAfterSave.error },
      { aspect: 'No DB error leaked to the user', migrated: m.bannerAfterSave.error ? m.bannerAfterSave.error.slice(0, 160) : '(none)', expected: '(none)', ok: !m.bannerAfterSave.error },
      { aspect: `Costing persisted on "${m.savedRowName}" after Save`, migrated: m.persistedChecked, expected: true, ok: m.persistedChecked === true },
      { aspect: 'Costing formula persisted', migrated: m.persistedFormula, expected: '1', ok: m.persistedFormula === '1' },
    ];
  },
};
