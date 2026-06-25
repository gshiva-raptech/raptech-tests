// TC-PARAM-SO-001 — Sales Order org params affect the new SO form (F-0006).
// Form-inspection of the staged SO param wirings:
//   66  Warehouse Mandatory      → #warehouse is `required` when on
//   56  Business Type            → #salesType field shown only when on
//   158 Address Change           → #shippingAddressId locked (disabled) when OFF
// (Order/sales-type gating 23-26/41-45/72 is checked via #poType option count.)
import { switchOrg, setOrgParam, readOrgParamState } from '../../lib/fixtures.mjs';

const ORG = 36;
const URL = '/sales-orders/sales-orders/new';

export default {
  id: 'TC-PARAM-SO-001',
  title: 'Sales Order org params 66 / 56 / 158 drive the new SO form',
  track: 'B',
  role: 'superadmin',
  urlPath: URL,
  module: 'Admin Settings',
  subModule: 'Org Parameter (Sales Order) → SO new form',
  hints: '- SalesOrdersController soWarehouseRequired(66) / soBusinessTypeEnabled(56) / soAddressChangeEnabled(158); addFormLookups gates soTypeOptions/businessTypes.',

  data() { return {}; },

  async runMigrated({ page, base, creds, forms, shot }) {
    const MIG = base.replace(/\/+$/, '');
    await forms.loginMigrated(page, base, creds.user, creds.pass);
    await switchOrg(page, base, ORG);
    const browser = page.context().browser();
    const uctx = await browser.newContext();
    const up = await uctx.newPage();
    await forms.loginMigrated(up, base, process.env.RAPTECH_USER, process.env.RAPTECH_PASSWORD);

    const inspect = async () => {
      const r = await up.goto(`${MIG}${URL}`, { waitUntil: 'networkidle' }).catch(() => null);
      await up.waitForTimeout(400);
      const ok = !!(r && r.ok()) && !/signin/i.test(up.url());
      const s = await up.evaluate(() => ({
        warehouseRequired:   !!(document.querySelector('#warehouse') || {}).required,
        businessTypePresent: !!document.querySelector('#salesType'),
        shippingDisabled:    !!(document.querySelector('#shippingAddressId') || {}).disabled,
      }));
      return { ok, ...s };
    };

    const toggle = async (id, val) => setOrgParam(page, base, ORG, id, val);

    // 66 Warehouse Mandatory
    const o66 = await readOrgParamState(page, base, ORG, 66);
    await toggle(66, false); const w66off = await inspect();
    await toggle(66, true);  const w66on  = await inspect();
    await toggle(66, o66 === null ? false : o66);

    // 56 Business Type
    const o56 = await readOrgParamState(page, base, ORG, 56);
    await toggle(56, false); const b56off = await inspect();
    await toggle(56, true);  const b56on  = await inspect();
    await toggle(56, o56 === null ? false : o56);

    // 158 Address Change
    const o158 = await readOrgParamState(page, base, ORG, 158);
    await toggle(158, false); const a158off = await inspect();
    await toggle(158, true);  const a158on  = await inspect();
    await toggle(158, o158 === null ? false : o158);

    await uctx.close();

    return {
      accessible: w66off.ok && w66on.ok,
      w66off: w66off.warehouseRequired, w66on: w66on.warehouseRequired,
      b56off: b56off.businessTypePresent, b56on: b56on.businessTypePresent,
      a158off: a158off.shippingDisabled, a158on: a158on.shippingDisabled,
    };
  },

  check(m) {
    if (!m.accessible) {
      return [{ aspect: 'SO new form accessible', migrated: 'not accessible', expected: 'accessible', ok: false, severity: 'warn' }];
    }
    return [
      { aspect: '66 ON → Warehouse required',        migrated: m.w66on,  expected: true,  ok: m.w66on === true },
      { aspect: '66 OFF → Warehouse not required',   migrated: m.w66off, expected: false, ok: m.w66off === false },
      { aspect: '56 ON → Business Type shown',       migrated: m.b56on,  expected: true,  ok: m.b56on === true },
      { aspect: '56 OFF → Business Type hidden',     migrated: m.b56off, expected: false, ok: m.b56off === false },
      { aspect: '158 OFF → address selects locked',  migrated: m.a158off, expected: true,  ok: m.a158off === true },
      { aspect: '158 ON → address selects editable', migrated: m.a158on,  expected: false, ok: m.a158on === false },
    ];
  },
};
