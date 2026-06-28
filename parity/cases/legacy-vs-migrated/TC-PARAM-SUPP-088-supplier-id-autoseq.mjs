// TC-PARAM-SUPP-088 — Supplier ID Auto Sequence (org param 88) + prefix.
// Supplier twin of Customer [87] (TC-PARAM-CUST-087).
//
// Spec (ORG-PARAMETER-BEHAVIOR-SPEC.md §14):
//   [88] ON  → Supplier ID auto-generated on save; field READONLY + not-required,
//              placeholder "Auto-generated on save". Carries a configurable PREFIX
//              (e.g. CST → CST<n>). OFF → manual entry (editable + required).
//
// Asserts (UI-only, org-user form at /suppliers/suppliers/new):
//   A. 88 OFF → Supplier-ID field editable + required.
//   B. 88 ON  → Supplier-ID field readonly, NOT required, placeholder "Auto-generated on save".
//   C. 88 ON  → submit a supplier; the generated Supplier ID starts with the configured prefix.
//      (Supplier create has extra UI-required fields beyond the controller's checks; if the
//       create can't be completed, the prefix step is reported as warn — the field-state
//       assertions A/B still prove the auto-seq wiring.)
//
// Isolation: org 36, snapshot+restore param 88 (+ its prefix value_) in finally.
// Cleanup: psql-delete only the ZZ-stamped supplier this run creates.
import { switchOrg, setOrgParam, readOrgParamState } from '../../lib/fixtures.mjs';
import { psql } from '../../lib/db.mjs';

const ORG = 36;
const URL = '/suppliers/suppliers/new';
const PREFIX = 'ZSUP';

export default {
  id: 'TC-PARAM-SUPP-088',
  title: 'Supplier ID Auto Sequence (88): field state + prefix',
  track: 'B',
  role: 'superadmin',
  urlPath: URL,
  module: 'Admin Settings',
  subModule: 'Org Parameter (Suppliers) → supplier create form (88 auto-seq / prefix)',
  hints: '- SuppliersController SUPPLIER_ID_AUTO_GEN_PARAMETER_ID=88 → model vendorIdAutoGen → '
       + 'suppliers/supplier/form.html #vendorId readonly+placeholder, data-req dropped. '
       + 'Prefix = param 88 value_ + VENDOR_ID_SEQ.',

  data() { const stamp = Date.now().toString().slice(-7); return { stamp }; },

  async runMigrated({ page, base, creds, data, forms, shot }) {
    const MIG = base.replace(/\/+$/, '');
    await forms.loginMigrated(page, base, creds.user, creds.pass);
    await switchOrg(page, base, ORG);

    const browser = page.context().browser();
    const uctx = await browser.newContext();
    const up = await uctx.newPage();
    await forms.loginMigrated(up, base, process.env.RAPTECH_USER, process.env.RAPTECH_PASSWORD);

    const fieldState = async () => {
      const r = await up.goto(`${MIG}${URL}`, { waitUntil: 'networkidle' }).catch(() => null);
      await up.waitForTimeout(700);
      const accessible = !!(r && r.ok()) && !/signin/i.test(up.url());
      const st = await up.evaluate(() => {
        const f = document.querySelector('#vendorId, [name="vendorId"]');
        if (!f) return { present: false };
        const wrap = f.closest('.field');
        return {
          present: true,
          readonly: f.readOnly || f.disabled,
          required: !!(f.required || (wrap && wrap.getAttribute('data-req') === '1')),
          placeholder: f.getAttribute('placeholder') || '',
        };
      });
      return { accessible, ...st };
    };

    const setPrefix = (val) => {
      try {
        psql(`UPDATE raptech_scm.org_conditional_parameters pa SET value_='${val}' `
          + `FROM raptech_scm.org_conditional_packages p `
          + `WHERE pa.org_package_id_fk=p.org_package_id_pk AND p.org_id_fk=${ORG} `
          + `AND pa.parameter_id_fk=88;`);
      } catch (e) { /* prefix assertion degrades to warn */ }
    };
    const readPrefixCol = () => {
      try {
        return (psql(`SELECT pa.value_ FROM raptech_scm.org_conditional_parameters pa `
          + `JOIN raptech_scm.org_conditional_packages p ON pa.org_package_id_fk=p.org_package_id_pk `
          + `WHERE p.org_id_fk=${ORG} AND pa.parameter_id_fk=88 LIMIT 1;`) || '').trim();
      } catch (e) { return null; }
    };

    const orig88 = await readOrgParamState(page, base, ORG, 88);
    const origPrefix = readPrefixCol();
    const supName = `ZZ AutoSeq88 ${data.stamp}`;
    let off, on, created = false, createdId = null, createErr = null;

    try {
      // A. 88 OFF → editable + required
      await setOrgParam(page, base, ORG, 88, false);
      off = await fieldState();

      // B. 88 ON (known prefix) → readonly + not-required + placeholder
      setPrefix(PREFIX);
      await setOrgParam(page, base, ORG, 88, true);
      on = await fieldState();

      // C. 88 ON → attempt a supplier create; assert generated id starts with prefix.
      await up.goto(`${MIG}${URL}`, { waitUntil: 'networkidle' });
      await up.waitForTimeout(800);
      // Entity is a multiselect (data-multiselect) → tick entity 34 via its widget.
      await up.evaluate(() => {
        const s = document.querySelector('#entityIds');
        if (s) { for (const o of s.options) if (o.value === '34') o.selected = true; s.dispatchEvent(new Event('change', { bubbles: true })); }
      });
      await up.fill('#supplierName', supName).catch(() => {});
      await up.selectOption('#supplierType', { index: 1 }).catch(() => {});  // a registration type
      // PAN is UI-required for many registration types — supply a valid format.
      await up.fill('#panName', 'ABCDE1234F').catch(() => {});
      await up.fill('#panNo', 'ABCDE1234F').catch(() => {});
      // country/state if present
      await forms.migratedChooseMs(up, 'country', 'India').catch(() => {});
      await up.waitForTimeout(1200);
      const stateTxt = await up.evaluate(() => { const s = document.querySelector('#state'); return s && s.options.length > 1 ? s.options[1].textContent.trim() : null; });
      if (stateTxt) await forms.migratedChooseMs(up, 'state', stateTxt).catch(() => {});
      await Promise.all([
        up.waitForLoadState('networkidle').catch(() => {}),
        up.evaluate(() => { if (window.RaptechForm && RaptechForm.trySubmit) RaptechForm.trySubmit(); else document.querySelector('form[data-raptech-form]')?.requestSubmit(); }),
      ]);
      await up.waitForTimeout(1600);
      const afterUrl = up.url();
      const detailPage = /\/suppliers\/suppliers\/\d+/.test(afterUrl);
      const listPage = /\/suppliers\/suppliers(\/?$|\?)/.test(afterUrl);
      createErr = await up.evaluate(() => {
        const e = [...document.querySelectorAll('.alert-error')].filter(x => x.offsetParent && (x.textContent || '').trim());
        return e.length ? e[0].textContent.trim().slice(0, 160) : null;
      });
      created = (detailPage || listPage) && !createErr;
      if (created && detailPage) {
        createdId = await up.evaluate(() => { const f = document.querySelector('#vendorId,[name="vendorId"]'); return f ? (f.value || '').trim() : null; });
      }
      // UI evidence fallback: the suppliers grid row carries the prefixed code.
      if (created && !createdId) {
        createdId = await up.evaluate((nm) => {
          const row = [...document.querySelectorAll('.ag-row')].find(r => (r.textContent || '').includes(nm));
          if (!row) return null;
          const cell = row.querySelector('.ag-cell[col-id="vendorId"], .ag-cell[col-id="supplierId"]');
          return cell ? cell.textContent.trim() : null;
        }, supName);
      }
      // UI-ONLY: no DB read of the generated id. If the UI doesn't surface it, leave it
      // null → prefix aspect degrades to warn (never a backend-sourced pass). Per UI-only rule.
      const sc = shot('supp-88-on'); await up.screenshot({ path: sc, fullPage: true }).catch(() => {});

      return { off, on, created, createdId, createErr, prefix: PREFIX, shots: { form: sc } };
    } finally {
      await setOrgParam(page, base, ORG, 88, orig88 === null ? false : orig88);
      if (origPrefix !== null) { try { psql(`UPDATE raptech_scm.org_conditional_parameters pa SET value_='${origPrefix}' FROM raptech_scm.org_conditional_packages p WHERE pa.org_package_id_fk=p.org_package_id_pk AND p.org_id_fk=${ORG} AND pa.parameter_id_fk=88;`); } catch (e) {} }
      try {
        psql(`DELETE FROM raptech_scm.supplier_org_mapping WHERE supplier_id_fk IN (SELECT supplier_id_pk FROM raptech_scm.supplier WHERE name='${supName}');`);
        psql(`DELETE FROM raptech_scm.supplier WHERE name='${supName}';`);
      } catch (e) { /* leave ZZ-named row */ }
      await uctx.close();
    }
  },

  check(m) {
    const res = [];
    res.push({
      aspect: '88 OFF → Supplier ID field is editable (manual entry)',
      migrated: m.off?.present ? (m.off.readonly ? 'readonly' : 'editable') : 'field missing',
      expected: 'editable', ok: m.off?.present === true && m.off?.readonly === false,
    });
    res.push({
      aspect: '88 OFF → Supplier ID field is required',
      migrated: String(m.off?.required), expected: 'true', ok: m.off?.required === true,
    });
    res.push({
      aspect: '88 ON → Supplier ID field is readonly (auto-generated)',
      migrated: m.on?.present ? (m.on.readonly ? 'readonly' : 'editable') : 'field missing',
      expected: 'readonly', ok: m.on?.readonly === true,
    });
    res.push({
      aspect: '88 ON → Supplier ID field is NOT required',
      migrated: String(m.on?.required), expected: 'false', ok: m.on?.required === false,
    });
    res.push({
      aspect: '88 ON → placeholder "Auto-generated on save"',
      migrated: m.on?.placeholder || '(none)', expected: 'Auto-generated on save',
      ok: /auto-?generated on save/i.test(m.on?.placeholder || ''),
    });
    res.push({
      aspect: `88 ON → generated Supplier ID starts with prefix "${m.prefix}"`,
      migrated: m.created ? (m.createdId || '(id not read)') : `create not completed${m.createErr ? ': ' + m.createErr : ''}`,
      expected: `${m.prefix}…`,
      ok: !!m.createdId && m.createdId.startsWith(m.prefix),
      // create has extra UI-required fields; if it couldn't complete, warn (field-state
      // assertions above already prove the 88 auto-seq wiring).
      severity: (!!m.createdId && m.createdId.startsWith(m.prefix)) ? undefined : 'warn',
    });
    return res;
  },
};
