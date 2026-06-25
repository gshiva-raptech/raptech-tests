// TC-SA-ORG-2 — Organization DETAILS must be read-only with NO mandatory (*)
// markers (legacy ↔ migrated, UI-only). Extends manual issue #3 / F-0032.
//
// Golden master (live-verified): legacy detailOrganization.action renders the org
// as title/value text — 0 "*" markers, no editable inputs, no Save button.
// Migrated reuses the editable admin/org/form.html for mode=view, so the read-only
// Detail page LEAKS the 16 ".req" asterisks the create/edit form carries.
//
// EXPECTED (legacy parity): the migrated Organization Details page shows
//   • zero mandatory (*) markers, and
//   • no Save button, and
//   • no editable data inputs.
// The (*) markers are the user-visible regression this case guards.
export default {
  id: 'TC-SA-ORG-2',
  title: 'Organization Details — read-only, no mandatory (*) markers (parity)',
  track: 'A',
  role: 'superadmin',
  urlPath: '/admin/organizations/{id}?mode=view',
  module: 'Admin Settings',
  subModule: 'Organization (super-admin)',
  hints: '- Legacy detailOrganization.action: title/value text, 0 stars, no Save.\n'
       + '- Migrated reuses admin/org/form.html for mode=view → .req spans leak.\n'
       + '- Root: admin/org/form.html renders <span class="req">*</span> unconditionally.',

  data() { return {}; },

  /* ── LEGACY (golden master) ── */
  async runLegacy({ page, base, signInUrl, creds, forms, shot }) {
    const shots = {};
    await forms.loginLegacy(page, signInUrl, creds.user, creds.pass);
    const orgId = await discoverLegacyOrgId(page, base, forms);

    await page.goto(`${base}/admin/viewOrganization.action`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(900);
    await page.evaluate((id) => window.anchorTagSubmit('detailForm', '/SCM/admin/detailOrganization.action', id), orgId);
    await page.waitForLoadState('networkidle').catch(() => {});
    await page.waitForTimeout(1200);

    const info = await readDetailState(page);
    shots.detail = shot('detail'); await page.screenshot({ path: shots.detail, fullPage: true }).catch(() => {});
    return { app: 'legacy', orgId, ...info, shots };
  },

  /* ── MIGRATED ── */
  async runMigrated({ page, base, creds, forms, shot }) {
    const shots = {};
    await forms.loginMigrated(page, base, creds.user, creds.pass);
    const MIG = base.replace(/\/+$/, '');
    const orgId = await discoverMigratedOrgId(page, MIG);

    await page.goto(`${MIG}/admin/organizations/${orgId}?mode=view`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(900);

    // Count ONLY the org form's own markers/inputs (exclude page chrome + search widgets).
    const info = await page.evaluate(() => {
      const form = document.querySelector('form[data-raptech-form]') || document;
      const stars = form.querySelectorAll('.req').length;
      const editable = [...form.querySelectorAll('input,select,textarea')].filter(e => {
        if (e.type === 'hidden') return false;
        if (e.classList.contains('ms-search-input') || e.classList.contains('company-menu-search')) return false;
        return !(e.disabled || e.readOnly);
      }).length;
      const hasSave = [...document.querySelectorAll('button')]
        .some(b => /save changes|update|create/i.test((b.textContent || '')));
      return { stars, editable, hasSave };
    });
    shots.detail = shot('detail'); await page.screenshot({ path: shots.detail, fullPage: true }).catch(() => {});
    return { app: 'migrated', orgId, ...info, shots };
  },

  /* ── COMPARE ── */
  compare(legacy, migrated) {
    return [
      { aspect: 'Org Details: mandatory (*) markers', legacy: legacy.stars, migrated: migrated.stars,
        ok: migrated.stars === 0,
        note: migrated.stars > 0 ? `migrated leaks ${migrated.stars} (*) onto read-only Details (legacy=0)` : '' },
      { aspect: 'Org Details: editable data inputs', legacy: legacy.editable, migrated: migrated.editable,
        ok: migrated.editable === 0,
        note: migrated.editable > 0 ? 'read-only Details should have no editable inputs' : '' },
      { aspect: 'Org Details: no Save button', legacy: !legacy.hasSave, migrated: !migrated.hasSave,
        ok: migrated.hasSave === false,
        note: migrated.hasSave ? 'read-only Details should not offer Save' : '' },
    ];
  },
};

/* ── helpers ── */
async function readDetailState(page) {
  return page.evaluate(() => {
    const stars = [...document.querySelectorAll('label,td,th,span')]
      .filter(e => /\*/.test(e.textContent || '') && e.children.length === 0).length;
    const editable = [...document.querySelectorAll('input[type=text],textarea,select')]
      .filter(i => i.offsetParent && !(i.disabled || i.readOnly)).length;
    const hasSave = [...document.querySelectorAll('input[type=submit],button')]
      .some(b => /save|update|create/i.test((b.value || b.textContent || '')));
    return { stars, editable, hasSave };
  });
}

// Legacy: read an org id off a row-action href on the list.
async function discoverLegacyOrgId(page, base, forms) {
  await page.goto(`${base}/admin/viewOrganization.action`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);
  const id = await page.evaluate(() => {
    const a = [...document.querySelectorAll('a[href*="anchorTagSubmit"]')]
      .map(x => x.getAttribute('href')).find(h => /detailOrganization|editOrganization/i.test(h));
    const m = a && a.match(/,\s*(\d+)\s*\)/);
    return m ? Number(m[1]) : null;
  });
  if (!id) throw new Error('could not discover a legacy org id');
  return id;
}

// Migrated: discover an existing org id (prerequisite discovery only — not a pass/fail check).
async function discoverMigratedOrgId(page, MIG) {
  const id = await page.evaluate(async () => {
    const r = await fetch('/admin/organizations/rows', { headers: { Accept: 'application/json' } });
    const j = await r.json();
    const real = j.find(o => o.name && !/^ZZ/.test(o.name)) || j[0];
    return real ? real.orgId : null;
  });
  if (!id) throw new Error('could not discover a migrated org id');
  return id;
}
