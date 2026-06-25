// TC-NEW-001 — New-customer smoke — Track B (MIGRATED ONLY, no legacy compare)
//
// Track B is for testing a brand-new customer set up directly in the migrated app
// (net-new — there is no legacy record to compare against). The runner calls
// runMigrated(ctx) then check(result, data); check() returns pass/fail rows the
// same shape as Track A's compare(), but judged against EXPECTED values you encode
// in the case (not against legacy).
//
// This file is a TEMPLATE: it logs in and verifies the org list loads. Copy it per
// use case (create item, create supplier, raise PO, …) and fill in the real steps
// + expectations as we design the new-customer journey.
export default {
  id: 'TC-NEW-001',
  title: 'New customer smoke (migrated only)',
  track: 'B',
  role: 'superadmin',
  urlPath: '/admin/organizations',
  module: 'Admin Settings',
  subModule: 'Organization',

  data() {
    const stamp = Date.now().toString().slice(-7);
    return { stamp };
  },

  async runMigrated({ page, base, creds, data, forms, shot }) {
    const shots = {};
    await forms.loginMigrated(page, base, creds.user, creds.pass);
    const MIG = base.replace(/\/+$/, '');

    await page.goto(`${MIG}/admin/organizations`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(800);
    const counters = await forms.readCounters(page);
    const landedOnList = /\/admin\/organizations\b/.test(page.url());
    shots.list = shot('list'); await page.screenshot({ path: shots.list, fullPage: true }).catch(() => {});

    return { landedOnList, counters, shots };
  },

  // Judge migrated against EXPECTED values (Track B has no legacy side).
  check(mig, data) {
    return [
      { aspect: 'Org list reachable', migrated: mig.landedOnList, expected: true, ok: mig.landedOnList === true },
      { aspect: 'TOTAL counter present', migrated: mig.counters?.total, expected: '>0',
        ok: typeof mig.counters?.total === 'number' && mig.counters.total > 0, severity: 'warn' },
    ];
  },
};
