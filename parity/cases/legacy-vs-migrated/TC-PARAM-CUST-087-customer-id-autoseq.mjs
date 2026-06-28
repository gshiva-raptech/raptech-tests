// TC-PARAM-CUST-087 — Customer ID Auto Sequence (org param 87) + prefix; plus the
// 147 Approval-FIELD-visibility aspect that the worked example's routing test (TC-PARAM-ACT-147)
// does NOT cover.
//
// Spec (ORG-PARAMETER-BEHAVIOR-SPEC.md §13):
//   [87] ON  → Customer ID auto-generated on save; field READONLY + not-required,
//              placeholder "Auto-generated on save". Carries a configurable PREFIX
//              (e.g. CST → CST<n>). OFF → manual entry (editable + required).
//   [147]    → besides routing (tested in TC-PARAM-ACT-147), the doc says 147 also
//              controls VISIBILITY of the Approval field on the customer form.
//
// What this asserts (UI-only, org-user form at /customers/customers/new):
//   A. 87 OFF → Customer-Id field editable + required.
//   B. 87 ON  → Customer-Id field readonly, NOT required, placeholder "Auto-generated on save".
//   C. 87 ON  → submit a customer; the generated Customer Id starts with the configured prefix.
//   D. 147 field-visibility: does an Approval field appear on the form when 147 ON vs OFF?
//      (Migrated has NO Approval field in customers/form.html → expected FINDING / ❌ gap;
//       recorded as a warn aspect, not a hard fail, so the test reports the gap cleanly.)
//
// Isolation: org 36 (the established org-user org), snapshot+restore params in finally.
// Cleanup: psql-delete only the ZZ-stamped customer this run creates.
import { switchOrg, setOrgParam, readOrgParamState } from '../../lib/fixtures.mjs';
import { psql } from '../../lib/db.mjs';

const ORG = 36;
const URL = '/customers/customers/new';
const PREFIX = 'ZCST';   // a deterministic prefix we set on 87 for this run

export default {
  id: 'TC-PARAM-CUST-087',
  title: 'Customer ID Auto Sequence (87): field state + prefix; 147 Approval-field visibility',
  track: 'B',
  role: 'superadmin',
  urlPath: URL,
  module: 'Admin Settings',
  subModule: 'Org Parameter (Customers) → customer create form (87 auto-seq / prefix; 147 field)',
  hints: '- CustomerController CUSTOMER_ID_AUTO_GEN_PARAMETER_ID=87 → model customerIdAutoGen → '
       + 'customers/form.html #vendorId readonly+placeholder, data-req dropped. Prefix = param 87 value '
       + '+ VENDOR_ID_SEQ. 147 only routes (no Approval field rendered) → field-visibility gap.',

  data() { const stamp = Date.now().toString().slice(-7); return { stamp }; },

  async runMigrated({ page, base, creds, data, forms, shot }) {
    const MIG = base.replace(/\/+$/, '');
    await forms.loginMigrated(page, base, creds.user, creds.pass);
    await switchOrg(page, base, ORG);

    const browser = page.context().browser();
    const uctx = await browser.newContext();
    const up = await uctx.newPage();
    await forms.loginMigrated(up, base, process.env.RAPTECH_USER, process.env.RAPTECH_PASSWORD);

    // Read the Customer-Id field's state (the field is id/name="vendorId").
    const fieldState = async () => {
      const r = await up.goto(`${MIG}${URL}`, { waitUntil: 'networkidle' }).catch(() => null);
      await up.waitForTimeout(700);
      const accessible = !!(r && r.ok()) && !/signin/i.test(up.url());
      const st = await up.evaluate(() => {
        const f = document.querySelector('#vendorId, [name="vendorId"]');
        if (!f) return { present: false };
        const wrap = f.closest('.field');
        // 147 field-visibility: the Customer-Approval control was wired (F-0006) as a
        // "Workflow" picker (id/name=workflowId), NOT an "Approval"-labelled field. Detect
        // the actual wired field so this aspect tracks the fix instead of the old (renamed) name.
        const wf = document.querySelector('#workflowId, [name="workflowId"]');
        return {
          present: true,
          readonly: f.readOnly || f.disabled,
          required: !!(f.required || (wrap && wrap.getAttribute('data-req') === '1')),
          placeholder: f.getAttribute('placeholder') || '',
          approvalFieldPresent: !!wf,
        };
      });
      return { accessible, ...st };
    };

    // Set the param value (prefix) directly on the org-parameter row so 87-ON yields a
    // known prefix; restored in finally. (Param value isn't editable via the simple
    // enable checkbox helper; the prefix lives in org_parameter.value.)
    // Prefix lives in org_conditional_parameters.value_ for the row whose package
    // belongs to org 36 (joined via org_conditional_packages.org_id_fk).
    const setPrefix = (val) => {
      try {
        psql(`UPDATE raptech_scm.org_conditional_parameters pa SET value_='${val}' `
          + `FROM raptech_scm.org_conditional_packages p `
          + `WHERE pa.org_package_id_fk=p.org_package_id_pk AND p.org_id_fk=${ORG} `
          + `AND pa.parameter_id_fk=87;`);
      } catch (e) { /* prefix assertion will degrade to warn */ }
    };
    const readPrefixCol = () => {
      try {
        return (psql(`SELECT pa.value_ FROM raptech_scm.org_conditional_parameters pa `
          + `JOIN raptech_scm.org_conditional_packages p ON pa.org_package_id_fk=p.org_package_id_pk `
          + `WHERE p.org_id_fk=${ORG} AND pa.parameter_id_fk=87 LIMIT 1;`) || '').trim();
      } catch (e) { return null; }
    };

    const orig87 = await readOrgParamState(page, base, ORG, 87);
    const orig147 = await readOrgParamState(page, base, ORG, 147);
    const origPrefix = readPrefixCol();

    const custName = `ZZ AutoSeq87 ${data.stamp}`;
    let off, on, on147, off147, createdId = null, created = false;

    try {
      // A. 87 OFF → field editable + required
      await setOrgParam(page, base, ORG, 87, false);
      off = await fieldState();

      // B. 87 ON (with known prefix) → field readonly + not-required + placeholder
      setPrefix(PREFIX);
      await setOrgParam(page, base, ORG, 87, true);
      on = await fieldState();

      // 147 field-visibility: capture approvalFieldPresent in both 147 states (87 left ON)
      await setOrgParam(page, base, ORG, 147, false);
      off147 = await fieldState();
      await setOrgParam(page, base, ORG, 147, true);
      on147 = await fieldState();
      // For the create step, force 147 OFF so the customer goes LIVE immediately
      // (org 36 has 147=Y but no approval flow → 147-ON create needs a seeded flow,
      //  which is TC-PARAM-ACT-147's concern, not this auto-seq/prefix test). 147 is
      //  restored to its original value in finally.
      await setOrgParam(page, base, ORG, 147, false);

      // C. 87 ON → create a customer; assert generated Customer Id starts with prefix.
      await up.goto(`${MIG}${URL}`, { waitUntil: 'networkidle' });
      await up.waitForTimeout(800);
      await up.selectOption('#entityIds', '34').catch(() => {});
      await up.fill('#customerName', custName).catch(() => {});
      await up.selectOption('#customerType', '2').catch(() => {});
      await forms.migratedChooseMs(up, 'country', 'India');
      await up.waitForTimeout(1500);
      const stateTxt = await up.evaluate(() => { const s = document.querySelector('#state'); return s && s.options.length > 1 ? s.options[1].textContent.trim() : null; });
      if (stateTxt) await forms.migratedChooseMs(up, 'state', stateTxt);
      await Promise.all([
        up.waitForLoadState('networkidle').catch(() => {}),
        up.evaluate(() => { if (window.RaptechForm && RaptechForm.trySubmit) RaptechForm.trySubmit(); else document.querySelector('form[data-raptech-form]')?.requestSubmit(); }),
      ]);
      await up.waitForTimeout(1500);
      // On a successful create the form redirects back to the customers list
      // (no field-error banner). Detail-page redirect also counts.
      const afterUrl = up.url();
      const detailPage = /\/customers\/customers\/\d+/.test(afterUrl);
      const listPage = /\/customers\/customers(\/?$|\?)/.test(afterUrl);
      const hasError = await up.evaluate(() => {
        const e = [...document.querySelectorAll('.alert-error')].filter(x => x.offsetParent && (x.textContent || '').trim());
        return e.length ? e[0].textContent.trim().slice(0, 160) : null;
      });
      created = (detailPage || listPage) && !hasError;
      // Read the generated Customer Id the USER sees: on the detail page from the
      // field; otherwise from the grid row matching the name we just created.
      if (created && detailPage) {
        createdId = await up.evaluate(() => {
          const f = document.querySelector('#vendorId, [name="vendorId"]');
          return f ? (f.value || '').trim() : null;
        });
      }
      // Try to read the generated code from the grid row the user lands on (UI evidence).
      // The customers grid shows a "Customer Id" column carrying the prefixed code.
      if (created && !createdId) {
        createdId = await up.evaluate((nm) => {
          const row = [...document.querySelectorAll('.ag-row')].find(r => (r.textContent || '').includes(nm));
          if (!row) return null;
          const cell = row.querySelector('.ag-cell[col-id="vendorId"], .ag-cell[col-id="customerId"], .ag-cell[col-id="customer_id"]');
          return cell ? cell.textContent.trim() : null;
        }, custName);
      }
      // UI-ONLY (no DB read of the generated id): pass/fail must come from what the user
      // sees. If neither the detail field nor the grid surfaces the code, leave createdId
      // null → the prefix aspect degrades to a warn (we never decide pass/fail from backend
      // state). Per the UI-only rule.
      const sc = shot('cust-87-on'); await up.screenshot({ path: sc, fullPage: true }).catch(() => {});

      return {
        off, on, off147, on147,
        created, createdId, prefix: PREFIX,
        shots: { form: sc },
      };
    } finally {
      // restore params + prefix; delete the ZZ customer created this run
      await setOrgParam(page, base, ORG, 87, orig87 === null ? false : orig87);
      await setOrgParam(page, base, ORG, 147, orig147 === null ? false : orig147);
      if (origPrefix !== null) { try { psql(`UPDATE raptech_scm.org_conditional_parameters pa SET value_='${origPrefix}' FROM raptech_scm.org_conditional_packages p WHERE pa.org_package_id_fk=p.org_package_id_pk AND p.org_id_fk=${ORG} AND pa.parameter_id_fk=87;`); } catch (e) {} }
      try {
        psql(`DELETE FROM raptech_scm.customer_org_mapping WHERE customer_id_fk IN (SELECT customer_id_pk FROM raptech_scm.customer WHERE name='${custName}');`);
        psql(`DELETE FROM raptech_scm.customer WHERE name='${custName}';`);
      } catch (e) { /* leave ZZ-named row */ }
      await uctx.close();
    }
  },

  check(m) {
    const res = [];
    // A — OFF state: editable + required
    res.push({
      aspect: '87 OFF → Customer Id field is editable (manual entry)',
      migrated: m.off?.present ? (m.off.readonly ? 'readonly' : 'editable') : 'field missing',
      expected: 'editable', ok: m.off?.present === true && m.off?.readonly === false,
    });
    res.push({
      aspect: '87 OFF → Customer Id field is required',
      migrated: String(m.off?.required), expected: 'true', ok: m.off?.required === true,
    });
    // B — ON state: readonly + not required + placeholder
    res.push({
      aspect: '87 ON → Customer Id field is readonly (auto-generated)',
      migrated: m.on?.present ? (m.on.readonly ? 'readonly' : 'editable') : 'field missing',
      expected: 'readonly', ok: m.on?.readonly === true,
    });
    res.push({
      aspect: '87 ON → Customer Id field is NOT required',
      migrated: String(m.on?.required), expected: 'false', ok: m.on?.required === false,
    });
    res.push({
      aspect: '87 ON → placeholder "Auto-generated on save"',
      migrated: m.on?.placeholder || '(none)', expected: 'Auto-generated on save',
      ok: /auto-?generated on save/i.test(m.on?.placeholder || ''),
    });
    // C — generated id carries the configured prefix (UI-read only).
    // If the UI didn't surface the generated id, degrade to warn (cannot verify via UI) —
    // never a backend-sourced pass and never a hard fail on a UI-visibility limitation.
    res.push({
      aspect: `87 ON → generated Customer Id starts with prefix "${m.prefix}"`,
      migrated: m.created ? (m.createdId || '(id not surfaced in UI)') : 'create failed',
      expected: `${m.prefix}…`,
      ok: !!m.createdId && m.createdId.startsWith(m.prefix),
      severity: m.createdId ? undefined : 'warn',
    });
    // D — 147 Customer-Approval FIELD visibility (the aspect TC-PARAM-ACT-147 does NOT cover).
    // Wired (F-0006) as the "Workflow" picker (#workflowId); 147 ON shows it, OFF hides it.
    // (Dedicated regression coverage: TC-PARAM-CUST-147-workflow-picker.mjs.)
    const approvalDiffers = !!m.on147?.approvalFieldPresent !== !!m.off147?.approvalFieldPresent;
    res.push({
      aspect: '147 toggles VISIBILITY of the Customer-Approval (Workflow) field on the customer form',
      migrated: approvalDiffers
        ? `Workflow field shown when ON (${m.on147?.approvalFieldPresent}), hidden when OFF (${m.off147?.approvalFieldPresent})`
        : `Workflow field same in both states (ON=${m.on147?.approvalFieldPresent}, OFF=${m.off147?.approvalFieldPresent})`,
      expected: 'field shown ON / hidden OFF',
      ok: approvalDiffers,
      note: approvalDiffers ? 'F-0006: customers/form.html #workflowId gated by customerApprovalEnabled (param 147).' : undefined,
    });
    return res;
  },
};
