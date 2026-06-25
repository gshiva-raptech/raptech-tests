// TC-PROJ-000 — Admin → Projects — all 3 config-form sub-tabs reachable + structure — Track B.
// NOTE: Projects is NOT a grid feature. Each of the 3 sub-tabs renders a single sequence-config
// form (Primary Details: delimiter + sequenceDigits; plus an "Assign Auto-Generate Sequence" table).
// This case asserts each tab is reachable and renders its form skeleton (subtab strip, the two
// primary fields, and the attribute table with the fixed Entity/Customer/Year rows).
export default {
  id: 'TC-PROJ-000', title: 'Projects config-form sub-tabs reachable + structure (3 tabs)', track: 'B', role: 'regular',
  urlPath: '/admin/projects/project-code-boq-sequence', module: 'Admin Settings', subModule: 'Projects → sequence config',
  hints: '- ProjectsController: 3 flat config-form tabs (boq / code / site sequence). No grid.',
  async runMigrated({ page, base, creds, forms }) {
    await forms.loginMigrated(page, base, creds.user, creds.pass);
    const MIG = base.replace(/\/+$/, '');

    const probe = async (tab) => {
      await page.goto(`${MIG}/admin/projects/${tab}`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(800);
      return page.evaluate(() => ({
        hasDelimiter: !!document.querySelector('#delimiter'),
        hasSeqDigits: !!document.querySelector('#sequenceDigits'),
        seqTable:     !!document.querySelector('#seqAttrTable'),
        subtabCount:  document.querySelectorAll('#projectTabNav .subtab').length,
        attrNames:    [...document.querySelectorAll('#seqAttrTable tbody .seq-field-name')].map(e => e.value),
        saveBtn:      !![...document.querySelectorAll('button')].find(b => /save|update/i.test(b.textContent)),
      }));
    };

    const boq  = await probe('project-code-boq-sequence');
    const code = await probe('project-code-sequence');
    const site = await probe('site-code-sequence');
    return { boq, code, site };
  },
  check(m) {
    const out = [];
    for (const [label, r] of [['BOQ Sequence', m.boq], ['Project Code Sequence', m.code], ['Site Code Sequence', m.site]]) {
      out.push({ aspect: `${label}: form reachable (delimiter + sequenceDigits)`, migrated: r.hasDelimiter && r.hasSeqDigits, expected: true, ok: r.hasDelimiter && r.hasSeqDigits });
      out.push({ aspect: `${label}: 3 sub-tabs in strip`, migrated: r.subtabCount, expected: 3, ok: r.subtabCount === 3 });
      out.push({ aspect: `${label}: sequence table w/ fixed rows`, migrated: (r.attrNames || []).join(',') || '(none)', expected: 'Entity,Customer,Year present', ok: ['Entity', 'Customer', 'Year'].every(n => (r.attrNames || []).includes(n)) });
      out.push({ aspect: `${label}: Save/Update button present`, migrated: r.saveBtn, expected: true, ok: r.saveBtn === true });
    }
    // Site Code tab additionally carries the "ProjectCode Seq" default row.
    out.push({ aspect: 'Site Code Sequence: adds ProjectCode Seq row', migrated: (m.site.attrNames || []).includes('ProjectCode Seq'), expected: true, ok: (m.site.attrNames || []).includes('ProjectCode Seq') });
    return out;
  },
};
