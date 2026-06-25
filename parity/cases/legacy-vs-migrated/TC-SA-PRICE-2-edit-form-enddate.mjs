// TC-SA-PRICE-2 — Org Pricing "Edit Pricing" form, UI-only legacy↔migrated parity.
// The user opens a pricing record and edits it. Verifies what the user sees:
//   READ-ONLY STATES — Organization, Product Info, Start Date are read-only display;
//     End Date is the only editable field, marked required (*).
//   VALIDATION — clearing End Date and saving → on-screen "End Date is required."
//   F-0038 (manual #8) — the migrated End Date <input type=date> carries min=<current
//     End Date>, so the browser blocks the user from picking ANY earlier date. Legacy
//     editOrgPricing.jsp lets the user set the End Date freely (no forward-only min).
//     This is a user-visible behavioural difference (migrated is more restrictive).
// Track A so we can observe the legacy edit form too. No data is mutated to an invalid
// state permanently — the End Date is restored to its original value at the end.
import * as ui from '../../lib/ui.mjs';

export default {
  id: 'TC-SA-PRICE-2',
  title: 'Org Pricing edit — read-only fields, End Date required, forward-only min (F-0038)',
  track: 'A',
  role: 'superadmin',
  urlPath: '/admin/org-pricing/{id}',
  module: 'Admin Settings',
  subModule: 'Org Pricing',
  priority: 'Medium',
  hints: '- Migrated: only End Date (toDate) editable; min = current toDate (forward-only) + required.\n'
       + '- Legacy editOrgPricing.jsp: End Date editable with no forward-only restriction (F-0038 / manual #8).\n'
       + '- OrgPricingController.orgPricingUpdate validates blank + "on/after current End Date".',

  async runLegacy({ page, base, signInUrl, creds, forms, shot }) {
    const shots = {};
    await forms.loginLegacy(page, signInUrl, creds.user, creds.pass);
    // Open the first pricing record's edit form via the grid's Action link.
    await page.goto(`${base}/admin/viewOrgPricing.action`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2500);
    // Legacy edit link target (editOrgPricing.action); follow the first one if present.
    const editHref = await page.evaluate(() => {
      const a = [...document.querySelectorAll('a')].find(x => /editOrgPricing/i.test(x.getAttribute('href') || ''));
      return a ? a.getAttribute('href') : null;
    });
    let endDateMin = null, endDateEditable = null, found = !!editHref;
    if (editHref) {
      await page.goto(new URL(editHref, base).href, { waitUntil: 'networkidle' }).catch(() => {});
      await page.waitForTimeout(1500);
      // Legacy end-date field is a jQuery datepicker text input (id often "toDate"/"endDate").
      const sel = await page.evaluate(() => {
        const cand = ['#toDate', '#endDate', 'input[name="toDate"]', 'input[name="endDate"]']
          .map(s => document.querySelector(s)).find(Boolean);
        return cand ? { type: cand.getAttribute('type'), min: cand.getAttribute('min'),
          readOnly: cand.readOnly, disabled: cand.disabled } : null;
      });
      if (sel) { endDateMin = sel.min; endDateEditable = !(sel.readOnly || sel.disabled); }
    }
    shots.form = shot('form'); await page.screenshot({ path: shots.form, fullPage: true }).catch(() => {});
    return { found, endDateMin, endDateEditable, shots };
  },

  async runMigrated({ page, base, creds, forms, shot }) {
    const shots = {};
    await forms.loginMigrated(page, base, creds.user, creds.pass);
    const MIG = base.replace(/\/+$/, '');

    // Open the first pricing record by clicking its grid row (UI navigation).
    await page.goto(`${MIG}/admin/org-pricing`, { waitUntil: 'networkidle' });
    await ui.gridReady(page);
    await page.click('.ag-center-cols-container .ag-row[row-index="0"]').catch(() => {});
    await page.waitForTimeout(1500);
    const onForm = /\/org-pricing\/\d+/.test(page.url());

    // Enumerate fields + read-only states the user sees.
    const fields = await page.$$eval('.field', fs => fs.map(f => {
      const lab = (f.querySelector('.field-label,label')?.textContent || '').trim().split('\n')[0].trim();
      const inp = f.querySelector('input,select,textarea');
      return { label: lab, readonly: inp ? (inp.readOnly || inp.disabled) : null, required: !!f.querySelector('.req') };
    }).filter(x => x.label));
    const readOnlyLabels = fields.filter(f => f.readonly).map(f => f.label.replace(/\s*\*$/, '').trim());
    const endDateField = fields.find(f => /end date/i.test(f.label));

    const endDateMin = await page.getAttribute('#toDate', 'min').catch(() => null);
    const endDateEditable = await ui.isEditable(page, '#toDate');
    const original = await page.inputValue('#toDate').catch(() => '');

    // VALIDATION: clear End Date + submit → "End Date is required." on screen.
    let requiredMsg = null;
    await page.fill('#toDate', '').catch(() => {});
    await ui.submit(page, /update/i);
    requiredMsg = await ui.flashText(page);
    // (Server reloads the form; browser may also block via the `required` attr — either
    //  way the user is told. Capture both signals.)
    const stillRequired = await page.getAttribute('#toDate', 'required').catch(() => null);

    // Restore original value (do not leave the record blank).
    if (original) {
      await page.goto(page.url().split('?')[0], { waitUntil: 'networkidle' }).catch(() => {});
      await page.waitForTimeout(800);
      await page.fill('#toDate', original).catch(() => {});
      await ui.submit(page, /update/i);
    }

    shots.form = shot('form'); await page.screenshot({ path: shots.form, fullPage: true }).catch(() => {});
    return {
      onForm, readOnlyLabels, endDateRequired: !!(endDateField && endDateField.required),
      endDateMin, endDateEditable, requiredMsg, hasRequiredAttr: stillRequired !== null, shots,
    };
  },

  compare(legacy, migrated) {
    const ro = (migrated.readOnlyLabels || []).map(s => s.toLowerCase());
    const roHas = re => ro.some(l => re.test(l));
    return [
      { aspect: 'Organization / Product Info / Start Date are read-only',
        legacy: 'read-only display in legacy too', migrated: migrated.readOnlyLabels.join(', ') || '(none)',
        ok: roHas(/organization/) && roHas(/product/) && roHas(/start date/) },
      { aspect: 'End Date is the only editable field, marked required',
        legacy: 'End Date editable', migrated: `editable=${migrated.endDateEditable}, required=${migrated.endDateRequired}`,
        ok: migrated.endDateEditable === true && migrated.endDateRequired === true },
      { aspect: 'Clearing End Date is rejected (required)',
        legacy: 'n/a', migrated: `${migrated.requiredMsg || ''} (required attr=${migrated.hasRequiredAttr})`,
        expected: 'blocked / "End Date is required."',
        ok: /required/i.test(migrated.requiredMsg || '') || migrated.hasRequiredAttr === true },
      // F-0038 — forward-only min restriction not present in legacy.
      { aspect: 'End Date NOT forward-only restricted (legacy parity)',
        legacy: `legacy min=${legacy.endDateMin == null ? 'none' : legacy.endDateMin}`,
        migrated: `migrated min=${migrated.endDateMin == null ? 'none' : migrated.endDateMin}`,
        ok: migrated.endDateMin == null,
        note: migrated.endDateMin != null
          ? 'migrated input has min=current End Date → user cannot pick an earlier date; legacy allows it' : '' },
    ];
  },
};
