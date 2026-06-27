// TC-PARAM-GRN-057 — GRN/SDN › "Hide - PO Price" (org param 57).
// Spec (Section 16), INVERTED-sounding name (ON = show MORE):
//   ON  → GRN/SDN receive line shows Unit Price · PO Amount · Discount % · Tax · PO Total.
//   OFF → shows ONLY Unit Price (PO Amount, Discount %, Tax, PO Total hidden).
// ⚠ Verify the ON/OFF polarity carefully; flag if migrated polarity differs from doc.
//
// Method (UI-only, mirrors TC-PARAM-SO-069): superadmin toggles 57 on org 36 via the admin
// org-parameter page; a SEPARATE regular-user context renders an ACTUAL GRN capture form
// (/inventory-inbound/grn/new?requisitionId=<real pending PO>&type=GRN) in BOTH states and
// we read which price fields the receive line renders. Org 36 = the regular user's own org.
// Snapshot+restore the param. LOCAL only; no GRN rows created (form is only rendered, never saved).
import { switchOrg, setOrgParam, readOrgParamState } from '../../lib/fixtures.mjs';
import { psql } from '../../lib/db.mjs';
// Param 57 is NOT rendered on org 36's admin org-parameter form (pkg 9), so the form-based
// setOrgParam can't toggle it — toggle directly in the DB instead (snapshot + restore).
const set57 = (org, en) => psql(`UPDATE raptech_scm.org_conditional_parameters ocp SET is_enable='${en ? 'Y' : 'N'}' `
  + `FROM raptech_scm.org_conditional_packages pk WHERE pk.org_package_id_pk=ocp.org_package_id_fk `
  + `AND pk.org_id_fk=${org} AND ocp.parameter_id_fk=57;`);
const read57 = (org) => (psql(`SELECT ocp.is_enable FROM raptech_scm.org_conditional_parameters ocp `
  + `JOIN raptech_scm.org_conditional_packages pk ON pk.org_package_id_pk=ocp.org_package_id_fk `
  + `WHERE pk.org_id_fk=${org} AND ocp.parameter_id_fk=57 LIMIT 1;`) || '').trim();

const ORG = 36;
const FALLBACK_REQ = 4275; // a known org-36 requisition with pending GRN lines (probed)

// Inspect a rendered GRN capture form: which PO-price fields appear on the receive line.
async function inspectGrnForm(page) {
  return page.evaluate(() => {
    const headers = [...document.querySelectorAll('table thead th')].map(t => (t.textContent || '').trim());
    const body = (document.body.innerText || '');
    const has = (re) => headers.some(h => re.test(h)) || re.test(body);
    return {
      headers,
      unitPrice: /unit\s*price/i.test(headers.join('|')) || /\bunit price\b/i.test(body),
      poAmount:  /po\s*amount|po\s*amt/i.test(headers.join('|')) || /\bpo amount\b/i.test(body),
      discount:  has(/discount\s*%?/i),
      tax:       headers.some(h => /\btax\b/i.test(h)) || /\btax\b/i.test(body),
      poTotal:   /po\s*total/i.test(headers.join('|')) || /\bpo total\b/i.test(body),
      capRows:   document.querySelectorAll('tr.capRow').length,
    };
  });
}

export default {
  id: 'TC-PARAM-GRN-057',
  title: 'GRN/SDN — Hide - PO Price (57): ON shows 5 price fields, OFF shows only Unit Price (verify polarity)',
  track: 'B',
  role: 'superadmin',
  urlPath: '/inventory-inbound/grn/new',
  module: 'Admin Settings',
  subModule: 'Org Parameter (GRN/SDN) → PO-price field visibility on the receive line',
  hints: '- Param 57 "Hide - PO Price" (inverted: ON = show MORE). Migrated consumer: InventoryInboundController.newGrn + templates/inventory-inbound/grn-form.html (captureLines). Spec ON: Unit Price+PO Amount+Discount%+Tax+PO Total; OFF: only Unit Price. Verify polarity vs legacy.',

  data() { return { stamp: Date.now().toString().slice(-7) }; },

  async runMigrated({ page, base, creds, forms }) {
    const MIG = base.replace(/\/+$/, '');
    await forms.loginMigrated(page, base, creds.user, creds.pass);
    await switchOrg(page, base, ORG);

    // regular-user context renders the actual GRN capture form
    const browser = page.context().browser();
    const uctx = await browser.newContext();
    const up = await uctx.newPage();
    await forms.loginMigrated(up, base, process.env.RAPTECH_USER, process.env.RAPTECH_PASSWORD);

    // Discover a real requisitionId with a pending GRN (UI grid feed); fall back to a known one.
    let reqId = FALLBACK_REQ;
    try {
      await up.goto(`${MIG}/inventory-inbound/grn-sdn-pending`, { waitUntil: 'networkidle' });
      const rows = await up.evaluate(async () => {
        const r = await fetch('/inventory-inbound/grn-sdn-pending/rows', { headers: { Accept: 'application/json' } });
        if (!r.ok) return [];
        const j = await r.json();
        return (j.rows || j.data || j || []);
      });
      const grn = rows.find(r => /GRN/i.test(r.deliveryType || r.deliveryTypeRaw || '') && r.requisitionId);
      if (grn) reqId = grn.requisitionId;
    } catch { /* keep fallback */ }

    const grnUrl = `${MIG}/inventory-inbound/grn/new?requisitionId=${reqId}&type=GRN`;
    const snap = async () => {
      const r = await up.goto(grnUrl, { waitUntil: 'networkidle' }).catch(() => null);
      const rendered = !!(r && r.ok()) && /grn\/new/i.test(up.url()) && (await up.locator('tr.capRow').count()) > 0;
      if (!rendered) return { rendered: false };
      await up.waitForTimeout(400);
      return { rendered: true, ...(await inspectGrnForm(up)) };
    };

    const orig = read57(ORG);

    set57(ORG, true);
    const on = await snap();

    set57(ORG, false);
    const off = await snap();

    set57(ORG, orig === 'Y');   // restore original DB state
    await uctx.close();

    return {
      reqId,
      rendered: !!(on.rendered && off.rendered),
      onHeaders: JSON.stringify(on.headers || []),
      offHeaders: JSON.stringify(off.headers || []),
      // ON should show all five
      onUnitPrice: !!on.unitPrice, onPoAmount: !!on.poAmount, onDiscount: !!on.discount, onTax: !!on.tax, onPoTotal: !!on.poTotal,
      // OFF should show only Unit Price
      offUnitPrice: !!off.unitPrice, offPoAmount: !!off.poAmount, offDiscount: !!off.discount, offTax: !!off.tax, offPoTotal: !!off.poTotal,
      formChanges: JSON.stringify(on.headers || []) !== JSON.stringify(off.headers || []),
    };
  },

  check(m) {
    if (!m.rendered) {
      return [{ aspect: 'GRN capture form renders for a pending PO (req ' + m.reqId + ')', migrated: m.rendered, expected: true, ok: false, severity: 'warn',
        note: 'BLOCKER — could not render a GRN/SDN capture form with line items; price-field assertions skipped (not faked).' }];
    }
    return [
      { aspect: '57 ON → Unit Price shown', migrated: m.onUnitPrice, expected: true, ok: m.onUnitPrice === true },
      { aspect: '57 ON → PO Amount shown', migrated: m.onPoAmount, expected: true, ok: m.onPoAmount === true },
      { aspect: '57 ON → Discount % shown', migrated: m.onDiscount, expected: true, ok: m.onDiscount === true },
      { aspect: '57 ON → Tax shown', migrated: m.onTax, expected: true, ok: m.onTax === true },
      { aspect: '57 ON → PO Total shown', migrated: m.onPoTotal, expected: true, ok: m.onPoTotal === true },
      { aspect: '57 OFF → Unit Price shown (the one field that stays)', migrated: m.offUnitPrice, expected: true, ok: m.offUnitPrice === true },
      { aspect: '57 OFF → PO Amount hidden', migrated: m.offPoAmount, expected: false, ok: m.offPoAmount === false },
      { aspect: '57 OFF → Discount % hidden', migrated: m.offDiscount, expected: false, ok: m.offDiscount === false },
      { aspect: '57 OFF → Tax hidden', migrated: m.offTax, expected: false, ok: m.offTax === false },
      { aspect: '57 OFF → PO Total hidden', migrated: m.offPoTotal, expected: false, ok: m.offPoTotal === false },
      { aspect: '57 ON vs OFF → GRN receive-line columns change', migrated: m.formChanges, expected: true, ok: m.formChanges === true,
        note: `ON headers=${m.onHeaders} | OFF headers=${m.offHeaders}` },
    ];
  },
};
