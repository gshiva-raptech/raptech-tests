// TC-SA-DM-1 — Data Migration: select a type + Submit shows on-screen feedback
// (UI-only) — Track B. Manual-tester view: open the screen, pick a migration type,
// click Submit, and assert the USER sees the result banner — "Reference data
// refreshed." for a cached type, or the "read live / already current" no-op for an
// uncached one. Also: page render (dropdown + Submit) and empty-submit is blocked.
// Legacy ref: dataMigration.jsp (type dropdown + Submit; success dialog).
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
  id: 'TC-SA-DM-1',
  title: 'Data Migration — Submit shows on-screen feedback (UI-only)',
  track: 'B',
  role: 'superadmin',
  urlPath: '/admin/data-migration',
  module: 'Admin Settings',
  subModule: 'Data Migration',

  async runMigrated({ page, base, creds, forms, shot }) {
    const shots = {};
    await forms.loginMigrated(page, base, creds.user, creds.pass);
    const MIG = base.replace(/\/+$/, '');
    await switchOrg(page, base, ORG_ID);

    const open = async () => { await page.goto(`${MIG}/admin/data-migration`, { waitUntil: 'networkidle' }); await page.waitForTimeout(400); };

    // ── render ──
    await open();
    const typeCount = await page.$$eval('#migrationType option', o => o.filter(e => e.value).length);
    const hasSubmit = await page.locator('#dataMigrationBtn').count();
    shots.page = shot('page'); await page.screenshot({ path: shots.page, fullPage: true }).catch(() => {});

    // ── empty submit blocked (required dropdown) ──
    await open();
    await page.click('#dataMigrationBtn');
    await page.waitForTimeout(400);
    const emptyNativeBlocked = await page.evaluate(() => {
      const s = document.querySelector('#migrationType');
      return s ? !s.checkValidity() : null;
    });

    // ── cached type → "Reference data refreshed." ──
    await open();
    await page.selectOption('#migrationType', 'COUNTRY_STATE');   // Country (cached)
    await Promise.all([page.waitForLoadState('networkidle').catch(() => {}), page.click('#dataMigrationBtn')]);
    await page.waitForTimeout(800);
    const cachedBanner = await banner(page);
    shots.refreshed = shot('refreshed'); await page.screenshot({ path: shots.refreshed, fullPage: true }).catch(() => {});

    // ── uncached type → "read live / already current" no-op ──
    await open();
    await page.selectOption('#migrationType', 'SUPPLIERS');       // Suppliers (read live)
    await Promise.all([page.waitForLoadState('networkidle').catch(() => {}), page.click('#dataMigrationBtn')]);
    await page.waitForTimeout(800);
    const noopBanner = await banner(page);
    shots.noop = shot('noop'); await page.screenshot({ path: shots.noop, fullPage: true }).catch(() => {});

    return { typeCount, hasSubmit, emptyNativeBlocked, cachedBanner, noopBanner, shots };
  },

  check(m) {
    return [
      { aspect: 'Type dropdown has options', migrated: m.typeCount, expected: '>=1', ok: (m.typeCount || 0) >= 1 },
      { aspect: 'Submit button present', migrated: m.hasSubmit, expected: '>=1', ok: m.hasSubmit >= 1 },
      { aspect: 'Empty submit blocked (required type)', migrated: m.emptyNativeBlocked, expected: true, ok: m.emptyNativeBlocked === true },
      { aspect: 'Cached type Submit shows "Reference data refreshed."', migrated: m.cachedBanner.error ? `ERROR: ${m.cachedBanner.error.slice(0, 100)}` : (m.cachedBanner.success || '(none)'), expected: 'Reference data refreshed.', ok: /refreshed/i.test(m.cachedBanner.success || '') && !m.cachedBanner.error },
      { aspect: 'Uncached type Submit shows read-live no-op message', migrated: m.noopBanner.success || m.noopBanner.error || '(none)', expected: 'read live / already current', ok: /read live|already current/i.test(m.noopBanner.success || ''), severity: 'warn' },
    ];
  },
};
