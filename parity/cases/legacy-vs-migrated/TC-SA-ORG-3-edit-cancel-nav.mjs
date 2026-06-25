// TC-SA-ORG-3 — Edit Organization: Cancel returns to the GRID (legacy ↔ migrated,
// UI-only). Extends manual issue #1 / F-0031 (app-wide Cancel → grid).
//
// Golden master: in legacy, leaving editOrganization (Cancel/Back) returns the
// user to the organization LIST. Migrated's edit form Cancel link points at
// /admin/organizations/{id} (the read-only Detail page), not the grid — so the
// user does NOT land back on the list as legacy did.
//
// What the user sees / does: open Edit, click Cancel, observe which page they
// land on. EXPECTED (parity): the organizations grid (URL ends /admin/organizations).
export default {
  id: 'TC-SA-ORG-3',
  title: 'Edit Organization — Cancel returns to the grid (parity)',
  track: 'A',
  role: 'superadmin',
  urlPath: '/admin/organizations/{id}?mode=edit',
  module: 'Admin Settings',
  subModule: 'Organization (super-admin)',
  hints: '- F-0031: Cancel everywhere should return to the module grid.\n'
       + '- admin/org/form.html action-bar: edit Cancel href = /admin/organizations/{orgId} (detail), not the grid.',

  data() { return {}; },

  /* ── LEGACY (golden master) ── */
  async runLegacy({ page, base, signInUrl, creds, forms, shot }) {
    const shots = {};
    await forms.loginLegacy(page, signInUrl, creds.user, creds.pass);
    const orgId = await discoverLegacyOrgId(page, base);
    await page.goto(`${base}/admin/viewOrganization.action`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(800);
    await page.evaluate((id) => window.anchorTagSubmit('detailForm', '/SCM/admin/editOrganization.action', id), orgId);
    await page.waitForLoadState('networkidle').catch(() => {});
    await page.waitForTimeout(1200);

    // Legacy's "back to list" control (Cancel/Back link) — where does it point?
    const cancelTarget = await page.evaluate(() => {
      const a = [...document.querySelectorAll('a,input[type=button]')]
        .find(x => /cancel|back/i.test((x.value || x.textContent || '')));
      if (!a) return null;
      return a.getAttribute('href') || a.getAttribute('onclick') || a.value;
    });
    // Legacy returns to the org list after edit (viewOrganization). Documented baseline.
    const landsOnGrid = true;
    shots.edit = shot('edit'); await page.screenshot({ path: shots.edit, fullPage: true }).catch(() => {});
    return { app: 'legacy', orgId, cancelTarget, landsOnGrid, shots };
  },

  /* ── MIGRATED ── */
  async runMigrated({ page, base, creds, forms, shot }) {
    const shots = {};
    await forms.loginMigrated(page, base, creds.user, creds.pass);
    const MIG = base.replace(/\/+$/, '');
    const orgId = await discoverMigratedOrgId(page);

    await page.goto(`${MIG}/admin/organizations/${orgId}?mode=edit`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(900);

    // The actual control the user clicks.
    const cancelHref = await page.evaluate(() => {
      const a = [...document.querySelectorAll('a.btn, a[role=button]')]
        .find(x => x.textContent.trim() === 'Cancel');
      return a ? a.getAttribute('href') : null;
    });
    shots.edit = shot('edit'); await page.screenshot({ path: shots.edit, fullPage: true }).catch(() => {});

    // Actually click Cancel and see where the user lands.
    let landedUrl = null;
    if (cancelHref) {
      await Promise.all([
        page.waitForLoadState('networkidle').catch(() => {}),
        page.evaluate(() => {
          const a = [...document.querySelectorAll('a.btn, a[role=button]')].find(x => x.textContent.trim() === 'Cancel');
          if (a) a.click();
        }),
      ]);
      await page.waitForTimeout(1200);
      landedUrl = page.url();
    }
    const landsOnGrid = /\/admin\/organizations(\/?|\?.*)$/.test(landedUrl || '') && !/\/\d+/.test((landedUrl || '').replace(/.*\/organizations/, ''));
    shots.landed = shot('landed'); await page.screenshot({ path: shots.landed, fullPage: true }).catch(() => {});
    return { app: 'migrated', orgId, cancelHref, landedUrl, landsOnGrid, shots };
  },

  /* ── COMPARE ── */
  compare(legacy, migrated) {
    return [
      { aspect: 'Edit Cancel lands on the organizations grid', legacy: legacy.landsOnGrid, migrated: migrated.landsOnGrid,
        ok: migrated.landsOnGrid === true,
        note: migrated.landsOnGrid ? '' : `Cancel went to ${migrated.landedUrl || migrated.cancelHref} (detail), not the grid` },
    ];
  },
};

/* ── helpers ── */
async function discoverLegacyOrgId(page, base) {
  await page.goto(`${base}/admin/viewOrganization.action`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);
  const id = await page.evaluate(() => {
    const a = [...document.querySelectorAll('a[href*="anchorTagSubmit"]')]
      .map(x => x.getAttribute('href')).find(h => /editOrganization/i.test(h));
    const m = a && a.match(/,\s*(\d+)\s*\)/);
    return m ? Number(m[1]) : null;
  });
  if (!id) throw new Error('could not discover a legacy org id');
  return id;
}
async function discoverMigratedOrgId(page) {
  const id = await page.evaluate(async () => {
    const r = await fetch('/admin/organizations/rows', { headers: { Accept: 'application/json' } });
    const j = await r.json();
    const real = j.find(o => o.name && !/^ZZ/.test(o.name)) || j[0];
    return real ? real.orgId : null;
  });
  if (!id) throw new Error('could not discover a migrated org id');
  return id;
}
