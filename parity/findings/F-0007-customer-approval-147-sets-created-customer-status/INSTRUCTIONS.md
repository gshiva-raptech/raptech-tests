# Fix request — F-0007 (reopened): raise() NOT-NULL on workflow_audit.process_instance_id

> FIXING session. Read `parity/FIXER_BRIEF.md` first (legacy = source of truth; do NOT `git commit`;
> leave changes for the human to build/test/commit). See `ERROR.md` for full evidence.

## The gap (one line)
`WorkflowRaiseService.raise()` never sets `processInstanceId`, but `workflow_audit.process_instance_id`
is NOT NULL → every raise() throws once an approval flow exists → customer create fails (147 ON +
flow). The earlier pass only tested org 36 (no flow), so this never fired.

## Fix
`raptech-service/.../service/admin/WorkflowRaiseService.java`, in `raise(RaiseRequest req)`, before
`auditRepo.saveAndFlush(audit)`:

```java
audit.setStatus(AUDIT_ACTIVE);
audit.setCreatedDate(OffsetDateTime.now(ZoneOffset.UTC));
audit.setProcessInstanceId(0);   // <-- ADD: no jBPM in this stack; sentinel 0 (column is NOT NULL).
                                 //     Routing uses workflow_audit_track, not this value.
audit = auditRepo.saveAndFlush(audit);
```

(If a more meaningful value is preferred, the audit's own id works too — but that needs a second
save after flush; `0` is simplest and matches "no external process instance". Do NOT make the column
nullable via migration unless the team prefers a schema change.)

## Why this is safe
Nothing in the migrated stack reads `process_instance_id` for routing/approval — the active stage and
status come from `workflow_audit_track` (opened by `openTrack`). `process_instance_id` was only the
legacy jBPM handle.

## Definition of done
1. Rebuild + restart.
2. `node parity/run-case.mjs --case TC-PARAM-ACT-147 --instance local-dev`
   The case **auto-seeds** a cloned wtype-48 flow on org 36/entity 34 and tears it down. Expect:
   - `147 OFF → status LIVE (131)` ✅
   - `147 ON → status NOT auto-LIVE (approval)` ✅ (customer saved, status = PENDING 103, create
     redirects to `/customers/customers/{id}`, a `workflow_audit` + first-stage `workflow_audit_track`
     row exist).
3. Update this finding's row in `parity/findings/INDEX.md` → **Fixed**.
4. Log root cause + file changed in the migrated repo's `summary.md`.
5. Do **NOT** `git commit`.

## Note
This is the same `raise()` used by other documents (Purchase Requisition, Deals, etc.). The NOT-NULL
throw would affect **any** approval raise, not just customers — fixing it here fixes all of them.
