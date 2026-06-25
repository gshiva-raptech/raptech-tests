# Org Parameter — business-rule consumption audit (all 189 parameters)

**Run:** 2026-06-23 (overnight autonomous audit, testing session)
**Question:** for each org parameter, does the migrated app actually *consume* it (change a
module's behavior), or is it config-only (saved but ignored, like Item Formula / F-0005)?

## Method (and confidence)
The ONLY way migrated code reads `org_conditional_parameters` is via three repos:
`OrgConditionalParameterRepository` (`countEnabledParameter`, `findEnabledParameterValue`),
`ItemsRepository` (`findItemTypesForOrg`, `findEnabledOrgParameterIds`), and one query in
`BankStatementRepository` (GL-code 10001). I enumerated **every caller** of these across
service + web and the parameter ids they check (named constants + `ids.contains(...)` checks +
the `type_='Item Type'` group). A parameter with **no caller = no server-side consumer**.

- **WIRED ✅** = a consumer was found (high confidence it's used).
- **no consumer ⚠️** = no server-side consumer found → **candidate config-only gap**. Strong signal,
  but mark for verification: confirm the legacy behavior and that it isn't consumed via some path
  not traced here before treating as a confirmed defect. (Item-type pilot TC-IPARAM-001 proved the
  WIRED path works end-to-end; Item Formula F-0005 is a confirmed example of the GAP class.)

## Summary
- **40 WIRED / 149 no-consumer-found / 189 total** (~79% config-only). *(Corrected from 42: two
  false-positives removed — 147 Customer Approval (comment-matched, F-0007) and 102 User Creation Limit
  (matched unrelated RESERVED=102, F-0009). Both confirmed not consumed via action tests.)*
- The **Items** module is fully consumed (25/25). A handful elsewhere are wired (auto-gen ids,
  multi-entity, GL code, paybook, a few Deals/Planning). **Entire modules have zero consumers.**

| Module (package) | WIRED | no consumer ⚠️ |
|---|---|---|
| Tab - Items | 25 | 0 |
| Menu - Purchase Invoices | 0 | 5 |
| Tab - Sales Order | 0 | 26 |
| Tab - Sales Invoices | 0 | 16 |
| Tab - Sales Quotes | 0 | 2 |
| Tab - Purchase Requisitions | 1 | 10 |
| Tab - GRN/SDN | 0 | 1 |
| Tab - Cost Estimates | 0 | 4 |
| Tab - Labelling | 0 | 4 |
| Sub Tab - Production Routing | 0 | 2 |
| Tab - Material Requests | 0 | 2 |
| Tab - Banks | 1 | 0 |
| Tab - Customers | 1 | 1 |
| Tab - Suppliers | 1 | 0 |
| Tab - Projects | 0 | 3 |
| Tab - Direct Material Deliveries | 0 | 1 |
| Sub Tab - Stock Adjust | 0 | 2 |
| Tab - Users | 1 | 3 |
| Tab - Movable Asset Requests/Deliveries | 0 | 3 |
| Tab - Material Deliveries | 0 | 2 |
| Tab - Reorder Stocks | 0 | 3 |
| Tab - Sales Invoice (POS) | 0 | 2 |
| Sub Tab - Stock On Hand | 0 | 1 |
| Menu - Deals | 2 | 1 |
| Tab - Attendance | 0 | 1 |
| Menu - Planning | 4 | 8 |
| Tab - Travel Requests | 0 | 3 |
| Tab - Expense Requests | 0 | 1 |
| Admin / Global (10000-series) | 4 | 42 |

## Full parameter table
`pid` = parameter id. Status per the method above.

| Module | pid | Parameter | Status |
|---|---|---|---|
| Tab - Items | 1 | Asset - Movable Item | WIRED ✅ |
| Tab - Items | 2 | Asset - Immovable Item | WIRED ✅ |
| Tab - Items | 3 | Asset - IT Item | WIRED ✅ |
| Tab - Items | 4 | Consumable Item | WIRED ✅ |
| Tab - Items | 5 | Service Item | WIRED ✅ |
| Tab - Items | 6 | Trading/Finished Goods Item | WIRED ✅ |
| Tab - Items | 7 | Trading Item - Batch | WIRED ✅ |
| Tab - Items | 8 | Trading Item - Margin Calc. | WIRED ✅ |
| Tab - Items | 9 | Sales Distributed Goods | WIRED ✅ |
| Tab - Items | 10 | Expense Item | WIRED ✅ |
| Tab - Items | 11 | Trading Item - Serial No. Split | WIRED ✅ |
| Tab - Items | 12 | Trading Item - Serial No. | WIRED ✅ |
| Tab - Items | 13 | Resource | WIRED ✅ |
| Tab - Items | 14 | Travel Item | WIRED ✅ |
| Tab - Items | 15 | Alternate UOM | WIRED ✅ |
| Tab - Items | 62 | HSN Code Mandatory | WIRED ✅ |
| Tab - Items | 64 | Raw Material Item | WIRED ✅ |
| Tab - Items | 65 | Trading/Semi Finished Goods Item | WIRED ✅ |
| Tab - Items | 68 | Scrap Item | WIRED ✅ |
| Tab - Items | 82 | Item No. - Auto Sequence | WIRED ✅ |
| Tab - Items | 100 | Is Expense Category Mandatory | WIRED ✅ |
| Tab - Items | 106 | Item No. Seq. By Type | WIRED ✅ |
| Tab - Items | 118 | Price Variant | WIRED ✅ |
| Tab - Items | 131 | Bundle Link Item | WIRED ✅ |
| Tab - Items | 136 | Edit UOM | WIRED ✅ |
| Menu - Purchase Invoices | 22 | Reimpursement | no consumer ⚠️ |
| Menu - Purchase Invoices | 49 | Additional field 1 | no consumer ⚠️ |
| Menu - Purchase Invoices | 50 | Additional field 2 | no consumer ⚠️ |
| Menu - Purchase Invoices | 51 | Additional field 3 | no consumer ⚠️ |
| Menu - Purchase Invoices | 70 | WHT % | no consumer ⚠️ |
| Tab - Sales Order | 23 | Standard Order - Non-Inventory | no consumer ⚠️ |
| Tab - Sales Order | 24 | Blanket Order | no consumer ⚠️ |
| Tab - Sales Order | 25 | Service Order | no consumer ⚠️ |
| Tab - Sales Order | 26 | Standard Order - Inventory | no consumer ⚠️ |
| Tab - Sales Order | 41 | Domestic | no consumer ⚠️ |
| Tab - Sales Order | 42 | Export | no consumer ⚠️ |
| Tab - Sales Order | 43 | Scrap | no consumer ⚠️ |
| Tab - Sales Order | 44 | Return | no consumer ⚠️ |
| Tab - Sales Order | 45 | FOC | no consumer ⚠️ |
| Tab - Sales Order | 56 | Business Type | no consumer ⚠️ |
| Tab - Sales Order | 63 | Validate Stock Qty | no consumer ⚠️ |
| Tab - Sales Order | 66 | Warehouse Mandatory | no consumer ⚠️ |
| Tab - Sales Order | 69 | Validate Credit Limit | no consumer ⚠️ |
| Tab - Sales Order | 72 | Rental Order | no consumer ⚠️ |
| Tab - Sales Order | 90 | Additional field 1 | no consumer ⚠️ |
| Tab - Sales Order | 91 | Additional field 2 | no consumer ⚠️ |
| Tab - Sales Order | 92 | Additional field 3 | no consumer ⚠️ |
| Tab - Sales Order | 120 | Additional field 4 | no consumer ⚠️ |
| Tab - Sales Order | 121 | Additional field 5 | no consumer ⚠️ |
| Tab - Sales Order | 122 | Additional field 1 (Line Item) | no consumer ⚠️ |
| Tab - Sales Order | 139 | Additional field 6 | no consumer ⚠️ |
| Tab - Sales Order | 140 | Additional field 7 | no consumer ⚠️ |
| Tab - Sales Order | 141 | Additional field 8 | no consumer ⚠️ |
| Tab - Sales Order | 145 | Additional field 9 | no consumer ⚠️ |
| Tab - Sales Order | 158 | Shipping/Billing Address Change | no consumer ⚠️ |
| Tab - Sales Order | 166 | Sales Order Group Name  | no consumer ⚠️ |
| Tab - Sales Invoices | 29 | Non PO - Inventory | no consumer ⚠️ |
| Tab - Sales Invoices | 31 | Non PO - Non-Inventory | no consumer ⚠️ |
| Tab - Sales Invoices | 52 | Additional field 1 | no consumer ⚠️ |
| Tab - Sales Invoices | 53 | Additional field 2 | no consumer ⚠️ |
| Tab - Sales Invoices | 54 | Additional field 3 | no consumer ⚠️ |
| Tab - Sales Invoices | 61 | E Invoice (Avalara) | no consumer ⚠️ |
| Tab - Sales Invoices | 81 | Credit Limit - Sales Invoice | no consumer ⚠️ |
| Tab - Sales Invoices | 83 | Invoice No./Date - Auto Sequence | no consumer ⚠️ |
| Tab - Sales Invoices | 125 | Additional field 4 | no consumer ⚠️ |
| Tab - Sales Invoices | 126 | Additional field 5 | no consumer ⚠️ |
| Tab - Sales Invoices | 127 | Additional field 1 (Line Item) | no consumer ⚠️ |
| Tab - Sales Invoices | 138 | Sales Invoice Qty Editable than SO | no consumer ⚠️ |
| Tab - Sales Invoices | 142 | Additional field 6 | no consumer ⚠️ |
| Tab - Sales Invoices | 143 | Additional field 7 | no consumer ⚠️ |
| Tab - Sales Invoices | 144 | Additional field 8 | no consumer ⚠️ |
| Tab - Sales Invoices | 146 | Additional field 9 | no consumer ⚠️ |
| Tab - Sales Quotes | 151 | Quote Validity | no consumer ⚠️ |
| Tab - Sales Quotes | 178 | Quotation Section Image Upload | no consumer ⚠️ |
| Tab - Purchase Requisitions | 55 | Sales Order No. | no consumer ⚠️ |
| Tab - Purchase Requisitions | 75 | Additional field 1 | no consumer ⚠️ |
| Tab - Purchase Requisitions | 76 | Additional field 2 | no consumer ⚠️ |
| Tab - Purchase Requisitions | 77 | Additional field 3 | WIRED ✅ |
| Tab - Purchase Requisitions | 84 | PO Discount | no consumer ⚠️ |
| Tab - Purchase Requisitions | 85 | Service Order Sequence No. | no consumer ⚠️ |
| Tab - Purchase Requisitions | 99 | Manual PO No.  | no consumer ⚠️ |
| Tab - Purchase Requisitions | 110 | Service Order New Item | no consumer ⚠️ |
| Tab - Purchase Requisitions | 111 | PO Fixed Price | no consumer ⚠️ |
| Tab - Purchase Requisitions | 112 | PO Variable Price | no consumer ⚠️ |
| Tab - Purchase Requisitions | 117 | PO New Item | no consumer ⚠️ |
| Tab - GRN/SDN | 57 | Hide - PO Price | no consumer ⚠️ |
| Tab - Cost Estimates | 58 | Manufacture | no consumer ⚠️ |
| Tab - Cost Estimates | 59 | Others | no consumer ⚠️ |
| Tab - Cost Estimates | 96 | Additional field 1 | no consumer ⚠️ |
| Tab - Cost Estimates | 97 | Additional field 2 | no consumer ⚠️ |
| Tab - Labelling | 67 | Barcode Label - Size | no consumer ⚠️ |
| Tab - Labelling | 78 | Inspection Labelling | no consumer ⚠️ |
| Tab - Labelling | 79 | Production Inspection Labelling | no consumer ⚠️ |
| Tab - Labelling | 80 | Production Labelling | no consumer ⚠️ |
| Sub Tab - Production Routing - Pending | 73 | Material Request - Verification | no consumer ⚠️ |
| Sub Tab - Production Routing - Pending | 109 | Manual Batch Selection | no consumer ⚠️ |
| Tab - Material Requests | 74 | Transfer To Warehouse - Acknowledge | no consumer ⚠️ |
| Tab - Material Requests | 113 | Material Request New Item | no consumer ⚠️ |
| Tab - Banks | 86 | Multi-entity Accounting | WIRED ✅ |
| Tab - Customers | 87 | Customer ID - Auto Sequence | WIRED ✅ |
| Tab - Customers | 147 | Customer Approval | no consumer ⚠️ (corrected — was false-positive; see F-0007) |
| Tab - Suppliers | 88 | Supplier ID - Auto Sequence | WIRED ✅ |
| Tab - Projects | 46 | Project Code with BOQ Sequence | no consumer ⚠️ |
| Tab - Projects | 47 | Project Code Sequence | no consumer ⚠️ |
| Tab - Projects | 89 | Project Code - Auto Sequence | no consumer ⚠️ |
| Tab - Direct Material Deliveries | 93 | Enable Customer | no consumer ⚠️ |
| Sub Tab - Stock Adjust - Pivot | 94 | Schedule Required | no consumer ⚠️ |
| Sub Tab - Stock Adjust - Pivot | 95 | Stock Adjust Bulk Upload | no consumer ⚠️ |
| Tab - Users | 101 | Enable User Bulk Upload | no consumer ⚠️ |
| Tab - Users | 102 | User Creation Limit | no consumer ⚠️ (corrected — false-positive matched unrelated RESERVED=102; see F-0009) |
| Tab - Users | 115 | CRM | no consumer ⚠️ |
| Tab - Users | 128 | Mobile User Creation Limit | WIRED ✅ |
| Tab - Movable Asset Requests | 114 | Asset Request New Item | no consumer ⚠️ |
| Tab - Movable Asset Deliveries | 108 | Asset Delivery/Return - Acknowledgement not required | no consumer ⚠️ |
| Tab - Movable Asset Deliveries | 156 | Asset Delivery Acknowledgement Mail | no consumer ⚠️ |
| Tab - Material Deliveries | 107 | Material Delivery/Return - Acknowledgement not required | no consumer ⚠️ |
| Tab - Material Deliveries | 157 | Material Delivery Acknowledgement Mail | no consumer ⚠️ |
| Tab - Reorder Stocks | 119 | Additional field | no consumer ⚠️ |
| Tab - Reorder Stocks | 129 | Additional field 1 | no consumer ⚠️ |
| Tab - Reorder Stocks | 130 | Additional field 2 | no consumer ⚠️ |
| Tab - Sales Invoice(POS)  | 123 | POS-Inventory | no consumer ⚠️ |
| Tab - Sales Invoice(POS)  | 124 | POS-Non-Inventory | no consumer ⚠️ |
| Sub Tab - Stock On Hand | 137 | Ref. Purchase Date | no consumer ⚠️ |
| Menu - Deals | 148 | Deals Notification | no consumer ⚠️ |
| Menu - Deals | 149 | Deals Stage - Closed & Won | WIRED ✅ |
| Menu - Deals | 150 | Summary- Url | WIRED ✅ |
| Tab - Attendance | 152 | Task Update | no consumer ⚠️ |
| Menu - Planning | 167 | Skill Level Not Required | WIRED ✅ |
| Menu - Planning | 168 | Enable Order End Date | no consumer ⚠️ |
| Menu - Planning | 172 | Trucks & Transportation Bulk upload | no consumer ⚠️ |
| Menu - Planning | 174 | High Priority Before Task | no consumer ⚠️ |
| Menu - Planning | 176 | Jazz | WIRED ✅ |
| Menu - Planning | 177 | Estimated Hours Non Mandatory | WIRED ✅ |
| Menu - Planning | 179 | Enable Order Start Date | no consumer ⚠️ |
| Menu - Planning | 180 | Manual Job Scheduling | no consumer ⚠️ |
| Menu - Planning | 182 | Production Scheduler Time Interval | no consumer ⚠️ |
| Menu - Planning | 183 | Production Schedular Planned Qty | no consumer ⚠️ |
| Menu - Planning | 184 | Production Scheduler Cycle Time | WIRED ✅ |
| Menu - Planning | 185 | Manual Machine scheduling | no consumer ⚠️ |
| Tab - Travel Requests-Pending | 170 | Costing - Price Validation | no consumer ⚠️ |
| Tab - Travel Requests-Pending | 173 | GM/PM - Mandatory | no consumer ⚠️ |
| Tab - Travel Requests-Pending | 175 | Send Workflow Mail to Requester | no consumer ⚠️ |
| Tab - Expense Requests | 171 | Category - Project Code Mapping Validation | no consumer ⚠️ |
| Admin | 10000 | Cost Centre | no consumer ⚠️ |
| Admin | 10001 | Ledgers | WIRED ✅ |
| Admin | 10002 | HRMS | WIRED ✅ |
| Admin | 10003 | Additional Discount | no consumer ⚠️ |
| Admin | 10004 | Global Additional field 1 | no consumer ⚠️ |
| Admin | 10005 | Global Additional field 2 | no consumer ⚠️ |
| Admin | 10006 | Global Additional field 2 | no consumer ⚠️ |
| Admin | 10007 | Hide - Buy Price & Margin | no consumer ⚠️ |
| Admin | 10008 | Order Tracking Workflow | no consumer ⚠️ |
| Admin | 10009 | Hide - Supplier(Sales Modules) | no consumer ⚠️ |
| Admin | 10010 | Additional field 4 | no consumer ⚠️ |
| Admin | 10011 | Validate Cash Limit | no consumer ⚠️ |
| Admin | 10013 | Currency Exchange Rate - Editable | no consumer ⚠️ |
| Admin | 10016 | Digits After Decimal In Price | no consumer ⚠️ |
| Admin | 10017 | Average Item Value - Reports | no consumer ⚠️ |
| Admin | 10018 | Digits After Decimal In PDF | no consumer ⚠️ |
| Admin | 10021 | Entity Based sequence No. | WIRED ✅ |
| Admin | 10022 | Reconciliation | no consumer ⚠️ |
| Admin | 10023 | Project Code | no consumer ⚠️ |
| Admin | 10025 | Add On Cost | no consumer ⚠️ |
| Admin | 10026 | Transaction Date | no consumer ⚠️ |
| Admin | 10027 | Assign WareHouse Resource | WIRED ✅ |
| Admin | 10028 | Manufacturer Costing Uom | no consumer ⚠️ |
| Admin | 10029 | Barcode With Qty | no consumer ⚠️ |
| Admin | 10030 | E-VAT | no consumer ⚠️ |
| Admin | 10031 | Agents Commission | no consumer ⚠️ |
| Admin | 10032 | E Invoice (Vayana) | no consumer ⚠️ |
| Admin | 10033 | E-Way Bill (Vayana) | no consumer ⚠️ |
| Admin | 10034 | Search Items | no consumer ⚠️ |
| Admin | 10035 | Search PriceList-Items | no consumer ⚠️ |
| Admin | 10036 | Search Bundles | no consumer ⚠️ |
| Admin | 10037 | Advance Amount Deduction By Request No. | no consumer ⚠️ |
| Admin | 10038 | Qty Decimal Trailing Zeros | no consumer ⚠️ |
| Admin | 10039 | Clover Payment | no consumer ⚠️ |
| Admin | 10040 | Auto Realization | no consumer ⚠️ |
| Admin | 10041 | Stock By Customer (Marathon) | no consumer ⚠️ |
| Admin | 10042 | Requestor-Workflow Mail Required | no consumer ⚠️ |
| Admin | 10043 | Digit Prefix Sequence | no consumer ⚠️ |
| Admin | 10044 | Show Pdf For Saved Records | no consumer ⚠️ |
| Admin | 10045 | Asset View Not Required | no consumer ⚠️ |
| Admin | 10046 | E Invoice By IRN No. (Vayana) | no consumer ⚠️ |
| Admin | 10047 | Allow Zero Price by Price List | no consumer ⚠️ |
| Admin | 10048 | Ghana Tax Split | no consumer ⚠️ |
| Admin | 10049 | Is Grouping Pdf | no consumer ⚠️ |
| Admin | 10050 | Account Not Required | no consumer ⚠️ |
| Admin | 10051 | Tax Calculation (Ghana) | no consumer ⚠️ |
