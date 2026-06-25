// TC-SA-ORG-5 — Create Organization: required-field validation parity on EMPTY
// submit (legacy ↔ migrated, UI-only).
//
// A manual tester clicks Create on a blank New-Organization form. In BOTH apps the
// save must be BLOCKED and the user must see required-field feedback:
//   • Legacy addOrganization.action: stays on the form, shows inline "Required."
//     against each required field.
//   • Migrated /admin/organizations/new: stays on the form, shows inline "Required"
//     field-errors on every data-req field (Organization Name, First Name, Address
//     Line 1, Contact Number, Email, Country, State, City, Postal Code, Entity
//     Alias, View Alias, Enterprise Plan, Currency, Date Format).
//
// EXPECTED (parity): migrated blocks the empty submit AND surfaces required-field
// errors — i.e. the legacy validation is NOT lost. This complements TC-ORG-006
// (Product / Allow-Price-Change server-side guard); here we cover the data-req
// field-level inline validation the user sees.
import * as ui from '../../lib/ui.mjs';

const REQUIRED_LABELS = [
  'Organization Name', 'First Name', 'Address Line 1', 'Contact Number', 'Email',
  'Country', 'State', 'City', 'Postal Code', 'Entity Alias', 'View Alias',
  'Enterprise Plan', 'Currency', 'Date Format',
];

export default {
  id: 'TC-SA-ORG-5',
  title: 'Create Organization — empty submit blocked + required-field errors (parity)',
  track: 'A',
  role: 'superadmin',
  urlPath: '/admin/organizations/new',
  module: 'Admin Settings',
  subModule: 'Organization (super-admin)',
  hints: '- Legacy addOrganization shows inline "Required." on empty submit.\n'
       + '- Migrated admin/org/form.html data-req → RaptechForm blocks + inline "Required".',

  data() { return {}; },

  /* ── LEGACY (golden master) ── */
  async runLegacy({ page, base, signInUrl, creds, forms, shot }) {
    const shots = {};
    await forms.loginLegacy(page, signInUrl, creds.user, creds.pass);
    await page.goto(`${base}/admin/addOrganization.action`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1200);

    const before = page.url();
    await page.locator('input[type=submit][value="Create"], input[value="Create"]').first().click().catch(() => {});
    await page.waitForTimeout(1500);
    const afterUrl = page.url();
    const blocked = afterUrl === before || /addOrganization/i.test(afterUrl);
    const inlineErrs = await page.evaluate(() =>
      [...document.querySelectorAll('.error,.errorMessage,.field-error,label.error,span.error,font[color="red"]')]
        .filter(e => e.offsetParent && /required/i.test(e.textContent || '')).length);
    shots.empty = shot('empty'); await page.screenshot({ path: shots.empty, fullPage: true }).catch(() => {});
    return { app: 'legacy', blocked, requiredErrorCount: inlineErrs, shots };
  },

  /* ── MIGRATED ── */
  async runMigrated({ page, base, creds, forms, shot }) {
    const shots = {};
    await forms.loginMigrated(page, base, creds.user, creds.pass);
    const MIG = base.replace(/\/+$/, '');
    await page.goto(`${MIG}/admin/organizations/new`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(900);

    const before = page.url();
    await page.getByRole('button', { name: /create organization/i }).click().catch(() => {});
    await page.waitForTimeout(1200);
    const afterUrl = page.url();
    const blocked = /\/admin\/organizations\/new/.test(afterUrl) && !/\/\d+(\?|$)/.test(afterUrl.replace(/.*\/new/, ''));

    const fieldErrors = await ui.visibleFieldErrors(page);
    // Which required labels got a visible "Required" error the user can see?
    const covered = {};
    for (const lbl of REQUIRED_LABELS) {
      covered[lbl] = fieldErrors.some(fe =>
        fe.label.toLowerCase().includes(lbl.toLowerCase()) && /required|select/i.test(fe.msg));
    }
    const requiredErrorCount = fieldErrors.filter(fe => /required|select/i.test(fe.msg)).length;
    shots.empty = shot('empty'); await page.screenshot({ path: shots.empty, fullPage: true }).catch(() => {});
    return { app: 'migrated', blocked, requiredErrorCount, covered, fieldErrors, shots };
  },

  /* ── COMPARE ── */
  compare(legacy, migrated) {
    const out = [
      { aspect: 'Empty submit blocked (stays on New form)', legacy: legacy.blocked, migrated: migrated.blocked,
        ok: legacy.blocked === true && migrated.blocked === true },
      { aspect: 'Required-field errors shown to user', legacy: legacy.requiredErrorCount, migrated: migrated.requiredErrorCount,
        ok: migrated.requiredErrorCount > 0,
        note: migrated.requiredErrorCount === 0 ? 'no required feedback (legacy shows "Required.")' : '' },
    ];
    // Each legacy-required field must surface an error in migrated too (no lost validation).
    for (const lbl of REQUIRED_LABELS) {
      out.push({ aspect: `Required error on: ${lbl}`, legacy: 'Required', migrated: migrated.covered[lbl],
        ok: migrated.covered[lbl] === true,
        note: migrated.covered[lbl] ? '' : 'missing inline required error vs legacy', severity: 'warn' });
    }
    return out;
  },
};
