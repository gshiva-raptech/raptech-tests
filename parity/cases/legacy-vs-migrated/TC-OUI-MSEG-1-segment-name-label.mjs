// TC-OUI-MSEG-1 — Market Segment field/column label parity (UI-only).
//
// Golden master (legacy viewRegional.action / addRegional.action — live-verified):
//   • Grid column header  : "Segment Name"
//   • Create-form field   : label "Segment Name" (input id=regionalName, maxlength 100)
//   • Row actions (kebab) : "Edit Market Segment", "Market Segment Details"
//
// Migrated (admin/organization/market-segment) renders the SAME field/column as
// "Regional Name" instead of "Segment Name". A user who knew the legacy screen
// sees a different label for the same thing → user-visible parity diff.
//
// SCOPE: the GRID-COLUMN diff ("Regional Name" header) is an already-accepted
// exception (F-0014 / TC-MSEG-000 — "migrated is the source of truth for this
// grid's columns"), so it is reported here only as context (warn). The
// CREATE-FORM field label, however, is NOT covered by that exception: legacy's
// add form labels the input "Segment Name", migrated labels it "Regional Name".
// That form-label diff is the outstanding user-visible regression this case guards.
//
// EXPECTED (legacy parity): the create-form field label reads "Segment Name".
// This case FAILS on migrated where it reads "Regional Name".
import * as ui from '../../lib/ui.mjs';

export default {
  id: 'TC-OUI-MSEG-1', title: 'Market Segment — "Segment Name" label parity (grid + form)',
  track: 'B', role: 'regular',
  urlPath: '/admin/organization/market-segment', module: 'Admin Settings',
  subModule: 'Organization → Market Segment',
  hints: '- Legacy grid col + add-form label = "Segment Name". Migrated uses "Regional Name".\n'
       + '- Files: OrgSettingsController market-segment, MarketSegmentSchema (col), '
       + 'templates/admin/org-settings/market-segment/form.html (label "Regional Name").',
  data() { return {}; },
  async runMigrated({ page, base, creds, forms }) {
    await forms.loginMigrated(page, base, creds.user, creds.pass);
    const MIG = base.replace(/\/+$/, '');

    // Grid column header text
    await page.goto(`${MIG}/admin/organization/market-segment`, { waitUntil: 'domcontentloaded' });
    await ui.gridReady(page);
    const cols = await ui.gridColumns(page);
    const hasSegmentCol = cols.some(c => /^segment name$/i.test(c));

    // Create-form field label
    await page.goto(`${MIG}/admin/organization/market-segment/new`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(600);
    const formLabel = await page.evaluate(() => {
      const l = document.querySelector('label[for="name"]');
      return l ? l.textContent.replace(/\s+/g, ' ').replace('*', '').trim() : null;
    });
    const formSaysSegment = /^segment name$/i.test(formLabel || '');

    return { cols, formLabel, hasSegmentCol, formSaysSegment };
  },
  check(m) {
    return [
      // Grid header diff is accepted under F-0014 → report as warn (context only).
      { aspect: 'Grid column header is "Segment Name" (legacy) [accepted F-0014]', migrated: JSON.stringify(m.cols),
        expected: 'Segment Name', ok: m.hasSegmentCol === true, severity: 'warn',
        note: 'accepted grid-column exception F-0014 — context only' },
      // Form-label diff is the outstanding, un-accepted regression.
      { aspect: 'Create-form field label is "Segment Name" (legacy)', migrated: m.formLabel,
        expected: 'Segment Name', ok: m.formSaysSegment === true },
    ];
  },
};
