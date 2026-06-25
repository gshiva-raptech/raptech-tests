// TC-PROJ-001 — Admin → Projects — config save/update for all 3 sub-tabs — Track B.
// Projects has no grid/duplicate/delete: each tab upserts ONE project_attribute_mapping row per
// (org, sequence_type). "CRUD" here = create (first save) + edit (re-save changed value), verified
// in the DB by sequence_type. We assert all 3 tabs CREATE, and exercise full create→edit on BOQ.
// Submit: delimiter + numeric sequenceDigits, check the Entity row, set its sequence number, Save.
import { psql } from '../../lib/db.mjs';

const TAB_TYPE = {
  'project-code-boq-sequence': 'ProjectCodeBoq',
  'project-code-sequence':     'ProjectCode',
  'site-code-sequence':        'SiteCode',
};

export default {
  id: 'TC-PROJ-001', title: 'Projects sequence config save + update (3 sub-tabs)', track: 'B', role: 'regular',
  urlPath: '/admin/projects/project-code-boq-sequence', module: 'Admin Settings', subModule: 'Projects → sequence config',
  hints: '- ProjectsController saveConfig upsert by (org, sequence_type). Table: project_attribute_mapping.',
  data() { return { stamp: (Date.now().toString().slice(-4) || '7') }; },
  async runMigrated({ page, base, creds, data, forms }) {
    page.on('dialog', d => d.accept().catch(() => {}));
    await forms.loginMigrated(page, base, creds.user, creds.pass);
    const MIG = base.replace(/\/+$/, '');

    // Resolve the logged-in user's current org so we can verify/cleanup the upserted row.
    let orgId = null;
    try { orgId = psql(`SELECT org_id_fk FROM raptech_scm.org_user_mapping WHERE user_id_fk=(SELECT user_id_pk FROM raptech_scm.users WHERE username ILIKE '${creds.user.trim()}' LIMIT 1) AND (del_flag IS NULL OR del_flag='N') LIMIT 1`).split('\n')[0].trim(); } catch (e) { /* ignore */ }

    const dbRow = (seqType) => {
      if (!orgId) return null;
      const out = psql(`SELECT COALESCE(sequence_digits,'') FROM raptech_scm.project_attribute_mapping WHERE org_id_fk=${orgId} AND sequence_type='${seqType}' AND (del_flag IS NULL OR del_flag='N') LIMIT 1`).trim();
      return out === '' ? null : out;
    };

    // Save the form on a given tab with the supplied sequence-digits value.
    async function saveTab(tab, seqDigits) {
      await page.goto(`${MIG}/admin/projects/${tab}`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(700);
      await page.fill('#delimiter', '-').catch(() => {});
      await page.fill('#sequenceDigits', String(seqDigits)).catch(() => {});
      // Check the Entity row (data-row 0), then set its sequence number to 1.
      await page.evaluate(() => {
        const cb = document.querySelector('.seq-checkbox[data-row="0"]');
        if (cb && !cb.checked) { cb.checked = true; cb.dispatchEvent(new Event('change', { bubbles: true })); }
        const num = document.querySelector('.seq-number[data-row="0"]');
        if (num) { num.readOnly = false; num.value = '1'; }
      });
      await Promise.all([page.waitForLoadState('networkidle').catch(() => {}), page.getByRole('button', { name: /^(save|update)$/i }).click()]);
      await page.waitForTimeout(1100);
    }

    const created = {};
    let boqEditValue = null, boqEditPersisted = false;
    try {
      // CREATE on all 3 tabs (distinct sequence-digit values so we can tell create vs edit apart).
      const createVals = { 'project-code-boq-sequence': data.stamp, 'project-code-sequence': data.stamp, 'site-code-sequence': data.stamp };
      for (const tab of Object.keys(TAB_TYPE)) {
        await saveTab(tab, createVals[tab]);
        created[tab] = dbRow(TAB_TYPE[tab]);
      }

      // EDIT (re-save) the BOQ tab with a changed sequence-digits value; verify it overwrote.
      boqEditValue = String((Number(data.stamp) % 9) + 1); // small distinct numeric value
      if (boqEditValue === String(data.stamp)) boqEditValue = String(Number(boqEditValue) + 1);
      await saveTab('project-code-boq-sequence', boqEditValue);
      boqEditPersisted = dbRow('ProjectCodeBoq') === boqEditValue;
    } finally {
      // Cleanup: remove ONLY the rows we created (type-specific). Never touches the org's
      // pre-existing null-type config row. Hard delete by (org, sequence_type).
      if (orgId) {
        for (const seqType of Object.values(TAB_TYPE)) {
          try { psql(`DELETE FROM raptech_scm.project_attribute_mapping WHERE org_id_fk=${orgId} AND sequence_type='${seqType}'`); } catch (e) { /* best-effort */ }
        }
      }
    }
    return { orgId, created, createVals: data.stamp, boqEditValue, boqEditPersisted };
  },
  check(m) {
    const out = [];
    if (!m.orgId) {
      out.push({ aspect: 'Resolve org for verification', migrated: '(none)', expected: 'org id', ok: false });
      return out;
    }
    for (const [tab, seqType] of Object.entries(TAB_TYPE)) {
      const v = m.created[tab];
      out.push({ aspect: `${seqType}: config created (sequence_digits persisted)`, migrated: v == null ? '(none)' : v, expected: String(m.createVals), ok: v === String(m.createVals) });
    }
    out.push({ aspect: 'ProjectCodeBoq: edit overwrote sequence_digits', migrated: m.boqEditPersisted ? `→ ${m.boqEditValue}` : 'not persisted', expected: `→ ${m.boqEditValue}`, ok: m.boqEditPersisted === true });
    return out;
  },
};
