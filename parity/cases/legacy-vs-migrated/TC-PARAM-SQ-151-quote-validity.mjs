// TC-PARAM-SQ-151 — Sales Quotes › "Quote Validity" (org param 151).
// Spec (Section 8): ON → admin configures a validity period in DAYS (value_151); on Sales
// Quote creation the period applies and once EXPIRED the quotation becomes READ-ONLY
// (no Edit/Amend/Cancel). OFF → no validity enforcement. Carries a value (days).
//
// Coverage here (UI-only, mirrors TC-PARAM-SO-069):
//   (a) CONFIG side  — assert 151 exposes a validity-DAYS value field on the admin
//       org-parameter page, that we can set it, and it round-trips (the value carrier).
//   (b) FORM side    — toggle 151 on org 36 and diff the regular user's quote-create
//       form signature (does a validity-days control surface on the create form?).
//   (c) EXPIRY LOCK  — PARTIAL: the read-only-on-expiry behavior needs a DATE-AGED quote
//       past its validity window, which can't be seeded via the UI in this run. Reported
//       as a partial/blocked aspect (severity: warn) — NOT faked as a pass.
// Snapshot+restore both the enable flag and value_151. LOCAL only; no quote rows created.
import { switchOrg, setOrgParam, readOrgParamState, formSignature } from '../../lib/fixtures.mjs';

const ORG = 36;
const QUOTE_NEW = '/sales-quotes/sales-quotes/new';
const VALIDITY_DAYS = '10';

// Read/write the validity-days value field on the admin org-parameter page (value_151).
async function readValueField(adminPage, base, orgId, pid) {
  const MIG = base.replace(/\/+$/, '');
  await adminPage.goto(`${MIG}/admin/org-parameter?orgId=${orgId}`, { waitUntil: 'networkidle' });
  await adminPage.waitForTimeout(400);
  return adminPage.evaluate(p => {
    const v = document.querySelector(`input[name="value_${p}"]`);
    return v ? { present: true, value: v.value } : { present: false, value: null };
  }, pid);
}
async function setEnableAndValue(adminPage, base, orgId, pid, enabled, value) {
  const MIG = base.replace(/\/+$/, '');
  await adminPage.goto(`${MIG}/admin/org-parameter?orgId=${orgId}`, { waitUntil: 'networkidle' });
  await adminPage.waitForTimeout(400);
  await adminPage.evaluate(({ p, en, val }) => {
    const cb = document.querySelector(`input[name="enable_${p}"]`);
    if (cb) { cb.checked = en; cb.dispatchEvent(new Event('change', { bubbles: true })); }
    const v = document.querySelector(`input[name="value_${p}"]`);
    if (v && val !== null) { v.value = val; v.dispatchEvent(new Event('input', { bubbles: true })); v.dispatchEvent(new Event('change', { bubbles: true })); }
  }, { p: pid, en: enabled, val: value });
  await Promise.all([
    adminPage.waitForLoadState('networkidle').catch(() => {}),
    adminPage.getByRole('button', { name: /save\/update/i }).click(),
  ]);
  await adminPage.waitForTimeout(900);
}

export default {
  id: 'TC-PARAM-SQ-151',
  title: 'Sales Quotes — Quote Validity (151) config value (days) + form effect; expiry-lock PARTIAL',
  track: 'B',
  role: 'superadmin',
  urlPath: QUOTE_NEW,
  module: 'Admin Settings',
  subModule: 'Org Parameter (Sales Quotes) → quote validity days + expired-quote read-only',
  hints: '- Param 151 "Quote Validity" (carries value_151 = days). Migrated consumer: SalesQuotesController (quote create + editability gate) + templates/sales-quotes/form.html. Expiry read-only needs a date-aged quote — not seedable via UI.',

  data() { return { stamp: Date.now().toString().slice(-7) }; },

  async runMigrated({ page, base, creds, forms }) {
    const MIG = base.replace(/\/+$/, '');
    await forms.loginMigrated(page, base, creds.user, creds.pass);
    await switchOrg(page, base, ORG);

    const browser = page.context().browser();
    const uctx = await browser.newContext();
    const up = await uctx.newPage();
    await forms.loginMigrated(up, base, process.env.RAPTECH_USER, process.env.RAPTECH_PASSWORD);

    const snapForm = async () => {
      const r = await up.goto(`${MIG}${QUOTE_NEW}`, { waitUntil: 'networkidle' }).catch(() => null);
      const accessible = !!(r && r.ok()) && !/signin/i.test(up.url());
      if (!accessible) return { accessible, sig: '', validityControl: false };
      await up.waitForTimeout(500);
      const sig = await formSignature(up);
      const validityControl = await up.evaluate(() => {
        const named = [...document.querySelectorAll('form [name]')]
          .some(e => /validity|valid.?days|expire/i.test(e.getAttribute('name') || ''));
        const labelled = /quote validity|validity period|valid for .*day|validity \(day/i.test(document.body.innerText);
        return named || labelled;
      });
      return { accessible, sig, validityControl };
    };

    // snapshot
    const origEnable = await readOrgParamState(page, base, ORG, 151);
    const origVal = await readValueField(page, base, ORG, 151);

    // (a) config: enable + set validity days, assert it round-trips (the value carrier)
    await setEnableAndValue(page, base, ORG, 151, true, VALIDITY_DAYS);
    const afterSet = await readValueField(page, base, ORG, 151);
    const enabledNow = await readOrgParamState(page, base, ORG, 151);
    const on = await snapForm();

    // (b) form effect with param OFF
    await setOrgParam(page, base, ORG, 151, false);
    const off = await snapForm();

    // restore enable + value
    await setEnableAndValue(page, base, ORG, 151,
      origEnable === null ? false : origEnable,
      origVal.present ? origVal.value : null);
    await uctx.close();

    return {
      accessible: on.accessible && off.accessible,
      valueFieldPresent: afterSet.present,
      valueRoundTrips: afterSet.present && String(afterSet.value) === VALIDITY_DAYS,
      enabledAfterSet: enabledNow === true,
      onValidityControl: on.validityControl,
      sigDiffers: on.sig !== off.sig,
    };
  },

  check(m) {
    return [
      { aspect: 'quote create form reachable by regular user (both states)', migrated: m.accessible, expected: true, ok: m.accessible === true },
      { aspect: '151 config exposes a validity-DAYS value field (value carrier)', migrated: m.valueFieldPresent, expected: true, ok: m.valueFieldPresent === true },
      { aspect: '151 validity days round-trips on save (set 10 → reads 10)', migrated: m.valueRoundTrips, expected: true, ok: m.valueRoundTrips === true },
      { aspect: '151 ON → validity-days control surfaces on quote create form', migrated: m.onValidityControl, expected: true, ok: m.onValidityControl === true },
      { aspect: '151 ON vs OFF → quote form signature changes', migrated: m.sigDiffers, expected: true, ok: m.sigDiffers === true },
      { aspect: 'EXPIRED quote → read-only (no Edit/Amend/Cancel)', migrated: 'not-tested', expected: 'read-only', ok: false, severity: 'warn',
        note: 'PARTIAL — needs a date-aged quote past its validity window; cannot be seeded via UI in this run. Not asserted.' },
    ];
  },
};
