// TC-PARAM-SI-NOCON — Sales Invoice "no-consumer" org params: E-Invoice [61],
//   Invoice-No auto-sequence [83], and Additional Fields [52][53][54][125][126][127]
//   [142][143][144][146].
//
// Spec (Section 3) wants each of these to gate something on the Sales Invoice create
// form (E-Invoice/Avalara toggle, auto-generated Invoice No., alias-configurable Summary
// or Line-Item additional columns). Code audit (this run) shows NONE of these params is
// consulted by the SI form:
//   • [61] E-Invoice (Avalara): grep for avalara/e-invoice in SI create code path → only
//     PRINT output (print-e-invoice.html / IRN block on already-created invoices). No
//     create-form toggle, no param-61 read.  → no consumer.
//   • [83] Invoice No auto-sequence: SalesInvoiceController invoice package never reads 83.
//     The create form has NO Invoice No. input at all (template: the Invoice No. field is
//     th:if="${mode != 'new'}" and even then readonly). Number is assigned server-side on
//     save regardless of the param → the param has no ON/OFF effect.  → no consumer.
//   • Additional Fields [52][53][54][125][126][127][142][143][144][146]: the SI "Other
//     Details" section is driven by dynamicAttributeService.attributesFor(orgId, 16) reading
//     the form-template (form_attribute table), NOT by these org params. None of these ids
//     is referenced in SalesInvoiceController. So the param toggle cannot show/hide a field
//     nor place it Summary-vs-Line-Item.  → no consumer.
//
// Per the brief: "A migrated app NOT honoring a no-consumer param = real expected FINDING
// (gap)." This case asserts the OBSERVABLE consequence of the gap on the rendered create
// form (read-only): the E-Invoice control is absent, no manual Invoice-No input exists, and
// the only additional-field section present is the form-template-driven one (not param-gated).
//
// Track B (migrated-only); read-only; no DB writes; no param changes.

import * as formsLib from '../../lib/forms.mjs';

export default {
  id: 'TC-PARAM-SI-NOCON',
  title: 'Sales Invoice no-consumer params [61][83] + addl-fields — gaps confirmed on create form',
  track: 'B',
  role: 'regular',                 // SI create form requires a NON-super-admin user
  urlPath: '/sales-invoice/sales-invoices/new',
  module: 'Admin Settings',
  subModule: 'Org Parameter (Sales Invoice) → no-consumer gaps [61][83][52][53][54][125][126][127][142][143][144][146]',
  hints: '- [61] avalara/e-invoice only in print output (print-e-invoice.html); [83] no Invoice-No input on create (template th:if mode!=new + readonly); addl fields via dynamicAttributeService.attributesFor(orgId,16) on form_attribute, not org params. No param read in SalesInvoiceController for any of these.',

  data() { return {}; },

  async runMigrated({ page, base, creds, forms }) {
    const MIG = base.replace(/\/+$/, '');
    const f = forms || formsLib;
    await f.loginMigrated(page, base, creds.user, creds.pass);

    const r = await page.goto(`${MIG}/sales-invoice/sales-invoices/new`, { waitUntil: 'networkidle' }).catch(() => null);
    const accessible = !!(r && r.ok()) && !/signin/i.test(page.url());

    const probe = await page.evaluate(() => {
      const text = (document.body.innerText || '').toLowerCase();
      // [61] E-Invoice / Avalara control on the CREATE form
      const eInvoiceControl = !!document.querySelector(
        '[name*="avalara" i],[id*="avalara" i],[name*="einvoice" i],[id*="einvoice" i],[name*="e-invoice" i]');
      const eInvoiceWord = /\bavalara\b/.test(text); // create form should not mention Avalara
      // [83] manual Invoice-No INPUT (editable) on the CREATE form
      const invNoInputs = [...document.querySelectorAll('input,select')].filter(el => {
        const n = ((el.name || '') + ' ' + (el.id || '')).toLowerCase();
        return /invoiceno|invoice_no|invoicenumber/.test(n);
      });
      const editableInvNo = invNoInputs.some(el => !el.readOnly && !el.disabled && el.type !== 'hidden');
      // additional-field / dynamic section: count param-style addl-field labels vs the
      // form-template "Other Details" section (the only addl-field mechanism present).
      const otherSection = !!document.querySelector('#sec-other');
      const addlFieldLabels = [...document.querySelectorAll('label')]
        .map(l => l.textContent.trim())
        .filter(t => /add(itional|l)\.?\s*field/i.test(t));
      return {
        eInvoiceControl, eInvoiceWord,
        editableInvNo, invNoInputCount: invNoInputs.length,
        otherSection, addlFieldLabelCount: addlFieldLabels.length,
        addlFieldLabels: addlFieldLabels.slice(0, 12),
      };
    });

    return { accessible, ...probe };
  },

  check(m) {
    return [
      { aspect: 'SI create form renders for org user',
        migrated: m.accessible, expected: true, ok: m.accessible === true },
      // [61] expected GAP: no E-Invoice/Avalara control on the create form
      { aspect: '[61] E-Invoice (Avalara) toggle on SI create form',
        migrated: m.eInvoiceControl || m.eInvoiceWord ? 'present' : 'absent',
        expected: 'absent (no consumer — Avalara only in print output)',
        ok: !m.eInvoiceControl && !m.eInvoiceWord, severity: 'warn',
        note: 'GAP: spec wants a create-form E-Invoice toggle; migrated has none. Param 61 has no SI-form consumer.' },
      // [83] expected GAP: create form has NO editable Invoice-No (auto/server-side); param unused
      { aspect: '[83] manual Invoice No. input on SI create form (should be absent / auto)',
        migrated: m.editableInvNo ? 'editable input present' : 'no editable input (auto server-side)',
        expected: 'no editable input',
        ok: m.editableInvNo === false, severity: 'warn',
        note: 'Invoice-No is auto-assigned on save regardless of param 83; param has no ON/OFF effect (no consumer).' },
      // Additional fields: only the form-template-driven section may exist; no param-gated addl-field columns
      { aspect: 'Additional-field columns gated by [52][53][54][125][126][127][142][143][144][146]',
        migrated: m.addlFieldLabelCount > 0 ? ('param-style addl-field labels: ' + m.addlFieldLabels.join(', '))
                                            : 'none (only form-template Other-Details section drives addl fields)',
        expected: 'no param-gated addl-field columns (driven by form_attribute, not org params)',
        ok: m.addlFieldLabelCount === 0, severity: 'warn',
        note: 'GAP: these 10 params have no SI-form consumer; additional fields come from the form-template (attributesFor type 16), so Summary-vs-Line-Item placement is not param-driven.' },
    ];
  },
};
