// TC-DM-001 — Data Migration = reference-lookup CACHE REFRESH — Track B (behavioral).
//
// Context (from product owner): "Data Migration" is a misleading name. The real job is
// the cache load: reference/master data is served from cache (legacy = Redis) instead of
// hitting the DB on every form load. When records are bulk-loaded straight into the DB in
// the backend (bypassing the app), the cache is stale until "Data Migration" is run to
// refresh it. The migrated dev replaced Redis with an in-process Caffeine cache
// (CacheConfig + CacheNames; repo finders @Cacheable). This test verifies the FULL cache
// contract end-to-end on the `countries` cache:
//   1. baseline (cache populated, no test row)
//   2. INSERT a throwaway country directly in the DB (simulates a backend bulk load)
//   3. the org-create Country dropdown still does NOT show it  → cache is serving (caching real)
//   4. run Data Migration → Country (COUNTRY_STATE) → evicts the countries cache
//   5. the dropdown now SHOWS it                              → refresh works
// Cleanup deletes the throwaway row and re-evicts. Zero blast radius (throwaway row only).
//
// Cache read path: OrganizationController.populateFormDropdowns →
// countryRepo.findAllByOrderByNameAsc() (@Cacheable countries) → <select#country> options.
import { psql } from '../../lib/db.mjs';

const TEST_ID   = 99001;
const TEST_NAME = 'ZZ Cache Test Country';

export default {
  id: 'TC-DM-001',
  title: 'Data Migration refreshes the reference-lookup cache (countries)',
  track: 'B',
  role: 'superadmin',
  urlPath: '/admin/data-migration',
  module: 'Admin Settings',
  subModule: 'Data Migration',
  hints: '- AdminMiscController.dataMigrationSubmit → refreshLookupCaches → CacheNames.cachesForMigrationType.\n- Caffeine cache (CacheConfig), @Cacheable on CountryRepository.findAllByOrderByNameAsc.',

  async runMigrated({ page, base, creds, forms, shot }) {
    const shots = {};
    await forms.loginMigrated(page, base, creds.user, creds.pass);
    const MIG = base.replace(/\/+$/, '');

    const delRow = () => psql(`DELETE FROM raptech_scm.countries WHERE id=${TEST_ID}`);
    const insRow = () => psql(`INSERT INTO raptech_scm.countries (id, sortname, name, phonecode) VALUES (${TEST_ID}, 'ZZ', '${TEST_NAME}', 999)`);

    // Open the org-create form and read the Country dropdown option names (cache read path).
    const readCountryOptions = async () => {
      await page.goto(`${MIG}/admin/organizations`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(500);
      await page.click('#btnNew');
      await page.waitForTimeout(1500);
      return page.$$eval('#country option', els => els.map(e => (e.value || '').trim()).filter(Boolean));
    };
    const hasTest = (opts) => opts.some(o => o === TEST_NAME);

    // Run the Data Migration screen for a given type; return the flash message shown.
    const runMigration = async (type) => {
      await page.goto(`${MIG}/admin/data-migration`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(500);
      await page.selectOption('#migrationType', type);
      await Promise.all([page.waitForLoadState('networkidle').catch(() => {}), page.click('#dataMigrationBtn')]);
      await page.waitForTimeout(800);
      return page.evaluate(() => {
        // flash divs are leaf nodes (th:text, no child elements) with inline status styling
        const leaves = [...document.querySelectorAll('div')]
          .filter(d => d.children.length === 0 && /refreshed|read live|already current|select a data migration/i.test(d.textContent || ''));
        leaves.sort((a, b) => a.textContent.trim().length - b.textContent.trim().length);
        return leaves.length ? leaves[0].textContent.trim() : null;
      });
    };

    let presentBefore = null, presentAfterInsert = null, presentAfterRefresh = null;
    let refreshMsg = null, noopMsg = null, cleanupPresent = null;
    try {
      // ── baseline: clean state, evict so the cache holds the real (no-test-row) list ──
      await delRow();
      await runMigration('COUNTRY_STATE');
      presentBefore = hasTest(await readCountryOptions());   // expect false (and populates cache)

      // ── 2. backend DB insert (simulates bulk load bypassing the app) ──
      await insRow();

      // ── 3. dropdown must STILL not show it (cache is serving stale = caching works) ──
      const optsStale = await readCountryOptions();
      presentAfterInsert = hasTest(optsStale);               // expect false → caching proven
      shots.stale = shot('stale'); await page.screenshot({ path: shots.stale, fullPage: true }).catch(() => {});

      // ── 4. Data Migration → Country: evict the countries cache ──
      refreshMsg = await runMigration('COUNTRY_STATE');
      shots.refresh = shot('refresh'); await page.screenshot({ path: shots.refresh, fullPage: true }).catch(() => {});

      // ── 5. dropdown now shows the new row (refresh works) ──
      presentAfterRefresh = hasTest(await readCountryOptions());  // expect true → refresh proven

      // a "read live / no-op" type reports the other message (SUPPLIERS is not cached)
      noopMsg = await runMigration('SUPPLIERS');
    } finally {
      try { delRow(); } catch { /* ignore */ }
      try { await runMigration('COUNTRY_STATE'); } catch { /* re-evict so no stale row lingers */ }
      try { cleanupPresent = hasTest(await readCountryOptions()); } catch { cleanupPresent = null; }
    }

    return { presentBefore, presentAfterInsert, presentAfterRefresh, refreshMsg, noopMsg, cleanupPresent, shots };
  },

  check(m) {
    return [
      { aspect: 'Baseline: test row absent before insert', migrated: m.presentBefore, expected: false, ok: m.presentBefore === false },
      { aspect: 'CACHE serves stale after backend DB insert (caching is real)', migrated: m.presentAfterInsert ? 'shown (not cached!)' : 'absent (served from cache)', expected: 'absent (served from cache)', ok: m.presentAfterInsert === false },
      { aspect: 'Data Migration reports "Reference data refreshed."', migrated: m.refreshMsg || '(none)', expected: 'Reference data refreshed.', ok: /refreshed/i.test(m.refreshMsg || '') },
      { aspect: 'REFRESH works: new row visible after Data Migration', migrated: m.presentAfterRefresh ? 'visible' : 'still stale', expected: 'visible', ok: m.presentAfterRefresh === true },
      { aspect: 'Non-cached type ("Suppliers") reports read-live no-op', migrated: m.noopMsg || '(none)', expected: 'read live / already current', ok: /read live|already current/i.test(m.noopMsg || ''), severity: 'warn' },
      { aspect: 'Cleanup: throwaway row removed', migrated: m.cleanupPresent ? 'STILL PRESENT' : 'removed', expected: 'removed', ok: m.cleanupPresent === false },
    ];
  },
};
