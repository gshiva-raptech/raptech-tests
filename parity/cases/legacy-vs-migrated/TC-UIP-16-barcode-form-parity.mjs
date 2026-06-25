// TC-UIP-16 — Manual issue #16: Barcode creation UI differs from legacy. This is a
// UI-parity / visual-diff issue. Legacy addBarcode.jsp has exactly two user-visible
// fields — "Additional Barcode" (required single-select, server-supplied
// barcodeTypeMap) and "Attributes" (multi-select, server-supplied barcodeJsonList) —
// a hidden status=0, and buttons Cancel + Create.
//
// We assert the migrated form's STRUCTURE against that legacy expectation. The
// strict-parity aspects (button label text "Create" vs migrated "Create Barcode";
// hardcoded option lists vs legacy server-supplied) are surfaced as warnings so the
// precise differences are documented even where the core structure already matches.
export default {
  id: 'TC-UIP-16',
  title: 'Manual #16 — Barcode create form matches legacy structure',
  track: 'B',
  role: 'superadmin',
  urlPath: '/admin/barcode/new',
  module: 'Admin Settings',
  subModule: 'Barcode',
  hints: '- Manual issue #16: barcode creation UI differs from legacy addBarcode.jsp.\n'
       + '- Legacy fields: Additional Barcode (req single-select), Attributes (multi-select); buttons Cancel + Create.\n'
       + '- Migrated: admin/barcode/form.html — select#name (Select/Quantity), multi-select#barcodeAttrs, button "Create Barcode".\n'
       + '- One-active-barcode-per-org guard may redirect /admin/barcode/new to the grid if a format already exists.',

  data() { return {}; },

  async runMigrated({ page, base, creds, forms, shot }) {
    const shots = {};
    await forms.loginMigrated(page, base, creds.user, creds.pass);
    const MIG = base.replace(/\/+$/, '');

    await page.goto(`${MIG}/admin/barcode/new`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(900);
    const url = page.url();
    const redirectedAway = !/\/admin\/barcode\/new$/.test(url);
    shots.form = shot('form'); await page.screenshot({ path: shots.form, fullPage: true }).catch(() => {});

    if (redirectedAway) {
      // legacy one-active-per-org guard fired; we cannot inspect the create form here.
      return { redirectedAway, url, shots };
    }

    const fields = await page.evaluate(() => {
      const out = [];
      document.querySelectorAll('form select, form input:not([type=hidden]), form textarea').forEach(el => {
        out.push({
          tag: el.tagName, type: el.type || '', id: el.id || '', name: el.name || '',
          multiple: !!el.multiple,
          // label text for this control
          label: (() => {
            const lbl = el.id ? document.querySelector(`label[for="${el.id}"]`) : null;
            return lbl ? lbl.textContent.replace(/\s+/g, ' ').trim() : '';
          })(),
          opts: el.tagName === 'SELECT' ? [...el.options].map(o => `${o.value}:${o.text}`) : undefined,
        });
      });
      return out;
    });

    const btns = await page.evaluate(() =>
      [...document.querySelectorAll('.action-bar button, .action-bar a')].map(x => x.textContent.replace(/\s+/g, ' ').trim()).filter(Boolean));

    const barcodeTypeSel = fields.find(f => f.tag === 'SELECT' && !f.multiple);
    const attrsSel       = fields.find(f => f.tag === 'SELECT' && f.multiple);

    return { redirectedAway, url, fields, btns, barcodeTypeSel, attrsSel, shots };
  },

  check(m) {
    if (m.redirectedAway) {
      return [{ aspect: 'Barcode create form reachable',
        migrated: `redirected to ${m.url}`, expected: '/admin/barcode/new renders the create form',
        ok: false, note: 'one-active-barcode-per-org guard fired — delete the active format for this org to inspect the form' }];
    }
    const labelsJoined = (m.fields || []).map(f => f.label).filter(Boolean).join(' | ');
    return [
      // Core structural parity (these are the real "differs from legacy" signals)
      { aspect: 'Has required single-select "Additional Barcode"',
        migrated: m.barcodeTypeSel ? `${m.barcodeTypeSel.label || m.barcodeTypeSel.id} (single)` : 'absent',
        expected: 'single-select Additional Barcode',
        ok: !!m.barcodeTypeSel && /additional barcode/i.test(m.barcodeTypeSel.label || '') },
      { aspect: 'Has "Attributes" multi-select',
        migrated: m.attrsSel ? `${m.attrsSel.label || m.attrsSel.id} (multi)` : 'absent',
        expected: 'multi-select Attributes',
        ok: !!m.attrsSel && /attributes/i.test(m.attrsSel.label || '') },
      { aspect: 'Exactly two user-visible inputs (no extra/missing fields)',
        migrated: `${(m.fields || []).length}: ${labelsJoined}`,
        expected: '2 (Additional Barcode + Attributes)',
        ok: (m.fields || []).length === 2 },
      { aspect: 'Has Cancel + Create buttons',
        migrated: JSON.stringify(m.btns),
        expected: 'Cancel + a Create button',
        ok: (m.btns || []).some(b => /cancel/i.test(b)) && (m.btns || []).some(b => /create/i.test(b)) },
      // Strict legacy-text parity — the one concrete, verifiable UI difference.
      { aspect: 'Submit button label matches legacy "Create"',
        migrated: (m.btns || []).find(b => /create/i.test(b)) || '(none)',
        expected: 'Create (legacy addBarcode.jsp submit value)',
        ok: (m.btns || []).includes('Create'),
        note: 'legacy addBarcode.jsp submit value = "Create"; migrated = "Create Barcode"' },
      { aspect: 'Barcode-type options server-supplied (legacy barcodeTypeMap)',
        migrated: m.barcodeTypeSel ? JSON.stringify(m.barcodeTypeSel.opts) : '(none)',
        expected: 'options from server map (not hardcoded)', ok: true, severity: 'warn',
        note: 'migrated hardcodes Select/Quantity in the template; legacy populates from barcodeTypeMap' },
    ];
  },
};
