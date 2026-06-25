# F-0007 (reopened) — Customer Approval raise() fails: workflow_audit.process_instance_id NOT-NULL

**Type:** confirmed bug (fix from the previous pass is INCOMPLETE)
**Severity:** high — when an org has a CUSTOMER approval flow configured AND param 147 is on, creating
a customer **errors out** ("Customer is not created: …"); the customer row is left orphaned at status
131 (LIVE) with no `customer_org_mapping`. Affects every org with a wtype-48 flow (362, 397, 496,
498, 504, 505).
**Case:** TC-PARAM-ACT-147 (seeds a cloned wtype-48 flow on org 36 so the ON path is exercised)

## What the previous pass got right
- 147 OFF → 131 (LIVE). ✅
- 147 ON, **no flow configured** → stays 131 (safe-by-default). ✅ (this is what was tested on org 36)

## What's still broken (the ON-with-flow path was never exercised)
The previous verification only ran against **org 36, which has no wtype-48 flow**, so
`WorkflowRaiseService.raise()` returned `Optional.empty()` and never reached the audit INSERT. As
soon as a flow exists, `raise()` runs the INSERT and **throws**:

```
ERROR: null value in column "process_instance_id" of relation "workflow_audit" violates not-null constraint
insert into workflow_audit (completed_date,created_by,created_date,operation_id,org_id_fk,
                            process_instance_id,process_name,request_no,status,wf_id_fk)
values (?,?,?,?,?, null ,?,?,?,?)
```

## Root cause
`WorkflowRaiseService.raise()` builds the `WorkflowAudit` but never sets `processInstanceId`:

```java
WorkflowAudit audit = new WorkflowAudit();
audit.setOperationId(req.operationId());
audit.setProcessName(req.processName());
audit.setOrgId(req.orgId());
audit.setCreatedBy(req.createdBy());
audit.setWorkflowId(wfId);
audit.setRequestNo(req.requestNo());
audit.setStatus(AUDIT_ACTIVE);
audit.setCreatedDate(...);
// ← processInstanceId is never set
audit = auditRepo.saveAndFlush(audit);   // throws: process_instance_id NOT NULL
```

`WorkflowAudit.processInstanceId` (`@Column(name="process_instance_id")`) maps to a **NOT NULL,
no-default** column (`workflow_audit.process_instance_id int4 NOT NULL`). Legacy populated it with the
jBPM process-instance id; the migrated stack has no jBPM, so it's left null → constraint violation on
every raise.

Because the customer create calls `raise()` *after* saving the customer (status 131), the throw is
caught by `CustomerController`'s outer try/catch → "Customer is not created" + redirect to `/new`, but
the partial customer row (131) is already committed and has **no org mapping** (the mapping loop runs
after the raise block and never executes).

## How verified
Cloned an existing wtype-48 flow (org 362's `workflow` 5488 + its 4 stages) onto **org 36 / entity 34**,
enabled 147, created a customer as the org user → create failed with the NOT-NULL error above;
customer left at 131, no audit, no mapping. Removing the clone restores the (passing) no-flow path.
TC-PARAM-ACT-147 now seeds/tears down this clone automatically.

## Fix → see INSTRUCTIONS.md
Set a non-null `processInstanceId` in `raise()` before `saveAndFlush` (the migrated stack doesn't use
the jBPM value; a sentinel `0` is sufficient — nothing reads it for routing, which is driven by
`workflow_audit_track`).
