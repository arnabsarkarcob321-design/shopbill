# ShopBill — Enterprise Implementation Plan

**Version:** 1.0  
**Status:** Draft for engineering planning  
**Basis:** ShopBill Product Requirements Document (PRD), Technical Requirements Document (TRD), Application Flow Document (APPFLOW), and UI/UX Design Brief  
**Architecture baseline:** React 18 + TypeScript PWA, Dexie/IndexedDB, FastAPI, SQLAlchemy 2, PostgreSQL 16+, S3-compatible object storage, OpenAPI 3.1

---

## 1. Executive Summary

ShopBill should be built as an **offline-first billing application with a cloud backend**, not as a server-dependent POS. The client must be able to issue bills, calculate GST, persist inventory movements and payment/ledger events, and print or export reports while disconnected. The backend begins with authentication/device registration, reference data, health endpoints and encrypted-backup storage. Multi-device synchronization, scheduled delivery and advanced integrations are later milestones.

The implementation strategy is to build and verify the highest-risk foundations first: the GST engine, financial representation, transactional invoice finalisation, invoice numbering, immutable business records, and tenant isolation. Product screens and reporting should consume stable domain services rather than implementing accounting rules inside UI components.

### Delivery phases

| Phase | Outcome | Included scope |
|---|---|---|
| **0 — Foundation** | Safe, repeatable development environment | Monorepo, CI, architecture boundaries, local PostgreSQL/object storage, migrations, API contract and baseline security checks |
| **1 — MVP** | One shop can operate fully offline | Onboarding, product catalogue/import, GST engine, POS, payments, invoice/credit-note flows, stock/purchase entry, customer/supplier ledgers, day close, on-demand Excel reports, printing, roles/audit, local backup/restore and backend skeleton/cloud backup endpoint |
| **2 — Advanced** | Reliable operation across devices and automation | Sync, multi-device/multi-branch support, server-side scheduled reports, delivery and messaging consent, batches/expiry/serials, OCR, AI assistant, voice billing and richer pricing |
| **3 — Stretch** | External compliance and ecosystem integrations | GSTR JSON, e-invoice/e-way bill adapters, Tally XML, payment/soundbox webhooks and digital receipt links |

**Release rule:** do not start a later phase merely because its UI is ready. Each phase advances only when its data integrity, security, recovery and test exit criteria pass.

## 2. Non-Negotiable Design Rules

1. **Offline-first:** Dexie/IndexedDB is the working system of record while disconnected. API unavailability must not block billing.
2. **One financial representation:** money is integer paise (`*_paise`), tax rates are basis points, quantities are integer thousandths, and intermediate GST arithmetic uses `BigInt` in the TypeScript engine.
3. **One canonical GST engine:** `packages/gst-engine` is pure, deterministic, versioned and runs in the browser. The Phase 2 Python verifier must use shared golden fixtures rather than an independently invented rule set.
4. **Immutable posted business records:** finalised invoices and event records are not edited in place. Corrections use cancellation with a reason, credit notes, debit notes or compensating events.
5. **Append-only stock and ledger events:** stock quantities, customer balances and supplier balances are derived read models and can be rebuilt from their source events.
6. **Atomic invoice finalisation:** local invoice number allocation, invoice header/lines, payments, stock events, ledger events, audit entry, draft removal and sync outbox (when enabled) commit together.
7. **Tenant isolation:** every tenant-owned backend table is shop-scoped and protected by PostgreSQL Row-Level Security (RLS) plus application-level authorization checks.
8. **Idempotent writes:** retrying a request or sync bundle must not create a second invoice, payment, stock movement or ledger entry.
9. **Reference data is versioned:** GST rates, HSN/SAC and state data are effective-dated, versioned and distributable independently of an application release.
10. **Output is a projection of saved data:** the print model and report builders must not recalculate their own divergent business logic.

## 3. Target Architecture and Repository Layout

Use the stack in the TRD and keep boundaries explicit.

```text
apps/
  web/                 React PWA, routes, UI, Zustand, TanStack Query, workers
  api/                 FastAPI routers, services, repositories, SQLAlchemy models
  worker/              Phase 2 scheduled jobs and report/message delivery
packages/
  gst-engine/          Pure TypeScript GST calculations and validators
  print-model/         Canonical invoice print model and output renderers
  reports-core/        Deterministic report builders and report fixtures
  api-client/          Generated TypeScript client from OpenAPI
  i18n/                English/Hindi/Bengali strings and number/date formatting
fixtures/
  gst/                 Golden input/output vectors
  reports/             Reconciliation datasets and expected workbook totals
infra/                 Docker, deployment, CI and operational configuration
docs/                   PRD, TRD, APPFLOW, SPEC, GST assumptions, ADRs, runbooks
```

### Backend request path

`Router → Pydantic request/response schema → domain service → repository → PostgreSQL transaction`

- Keep routes thin; do not put business rules in routers or ORM event hooks.
- Use SQLAlchemy 2 and Alembic. Every schema change must be a reviewed, numbered migration.
- Publish OpenAPI 3.1 as the source of truth and generate the TypeScript client from it.
- Use UUIDv7 identifiers, UTC ISO-8601 timestamps, RFC 9457 problem details, cursor pagination (default 100, maximum 500), and bounded request sizes.
- Keep third-party integrations behind interfaces/adapters so Gemini, messaging, IRP/GSP and payment providers can be replaced or mocked.

## 4. Milestones and Implementation Order

### M0 — Project Foundation and Developer Workflow

**Build**
- Create the pnpm/Turborepo workspace for JavaScript packages and `uv`-managed Python projects.
- Create `apps/web`, `apps/api`, `apps/worker`, shared packages, fixtures and docs directories.
- Add formatting, linting, strict TypeScript checks, Python type/lint checks, unit tests and dependency-boundary checks to CI.
- Configure Docker Compose for PostgreSQL and MinIO in development.
- Add environment configuration validation; keep secrets out of source control.
- Add an initial OpenAPI document, API version prefix `/v1`, health/readiness endpoints and structured logs.
- Establish a decision log for changes to the TRD; update the SPEC when technical requirements change.

**Exit criteria**
- A new developer can start the web app, API and local services from documented steps.
- CI blocks failed tests, type checks, lint checks and unintended breaking OpenAPI changes.
- Database migrations can create an empty database and roll forward in a clean environment.

### M1 — Domain Contracts, Database, Identity and Security Baseline

**Build**
- Finalise the domain glossary and enums for tax scheme, document type/status, payment method, stock movement type, ledger direction, user role and sync status.
- Create core PostgreSQL models and initial Alembic migrations for shops, memberships/users, devices, refresh-token families, idempotency records, shop settings, reference-data versions and audit metadata.
- Implement shop creation, login, refresh, logout, current-session and device registration endpoints.
- Implement short-lived EdDSA-signed JWT access tokens bound to a device; store only hashes of random refresh tokens, rotate each refresh and detect reuse.
- Add login/request rate limits and request body limits from the TRD.
- Implement RLS for tenant-owned tables and a per-request transaction dependency that sets the current tenant context. Test both RLS and service-layer checks.
- Add permission checks for Owner/Admin, Cashier and Accountant/CA-view roles. Do not treat UI route hiding as authorization.
- Implement idempotency-key storage for write endpoints, retaining the response for 24 hours as specified.

**Exit criteria**
- Automated tests prove a user from Shop A cannot read or mutate Shop B data, including through direct repository queries.
- Refresh-token rotation and token-family revocation work under replay/reuse tests.
- Every write endpoint covered by the contract supports idempotent retries.
- Security-sensitive actions are auditable without logging passwords, tokens or secrets.

### M2 — Reference Data, GST Engine and Financial Invariants

**Build**
- Build `packages/gst-engine` as a pure TypeScript package independent of React and API code.
- Implement GSTIN, PAN, HSN/SAC, state code, UPI ID and mobile validators.
- Implement tax-inclusive and tax-exclusive pricing, line and invoice discounts, composition Bill of Supply behaviour, intra-state CGST/SGST or UTGST, inter-state IGST, cess, exempt/nil/non-GST classifications, place-of-supply override reason, and explicit round-off.
- Store money in integer paise, tax rates in basis points, and quantity in thousandths; use BigInt intermediates. Define an explicit rounding policy and test it at line and invoice level.
- Snapshot product name, HSN/SAC, tax rate, discount and all tax components on each invoice line.
- Create signed/versioned reference bundles for states, HSN/SAC and effective-dated tax rates, with manifest, ETag and signature verification.
- Add a server-side reference verifier only when required by the backend contract; do not create a second conflicting source of tax truth.
- Create fixtures jointly reviewed against `docs/GST_ASSUMPTIONS.md` and Chartered Accountant-approved expected results.

**Exit criteria**
- Golden test vectors pass in TypeScript.
- Invariants hold: grand total equals taxable value + taxes + cess + round-off; no floating-point currency calculations exist in the canonical path.
- Regression tests cover composition scheme, B2B place of supply, discount apportionment, inclusive pricing, multiple tax rates, zero-rated/exempt cases and rounding boundaries.
- Production GST scope is not signed off until assumptions and reference data have CA review.

### M3 — Local Data Layer, Product Catalogue and Import/Export

**Build**
- Define numbered Dexie schema versions and migrations for products, barcode indexes, parties, invoices, lines, payments, stock events/levels, ledgers, counters, held bills, audit records, metadata and outbox.
- Build repository and domain-service layers; only repositories may access Dexie directly.
- Implement product create/edit/archive, categories/brands/units, multiple barcodes, HSN lookup, pricing, tax-inclusive setting and minimum stock.
- Build search indexing in a Web Worker for English/Hindi/Bengali names and transliterations, SKU and barcodes. Benchmark lookup over 50,000 products.
- Build CSV/XLSX import in a Worker with schema validation, duplicate detection, paise conversion, row-by-row errors, preview, error workbook and explicit confirmation.
- Make bulk price/GST changes previewable and undoable for the documented 24-hour window.
- Generate a stock opening movement for products created with opening stock; never silently set a mutable stock number without an event.
- Build demo mode and one-tap clearing that cannot mix sample transactions with a live shop.

**Exit criteria**
- Search p95 is under 100 ms across a 50,000-product fixture on a representative supported device.
- Duplicate SKU/barcode and invalid GST/HSN data are rejected or clearly surfaced before commit.
- Import cancellation leaves no partial writes; confirmed imports are transactionally consistent.
- Every Dexie migration is tested from every supported prior fixture database.

### M4 — POS, Numbering, Payments, Documents and Printing

**Build**
- Implement a single-screen POS with barcode burst detection, camera scanning with BarcodeDetector and ZXing fallback, keyboard shortcuts and mobile touch controls.
- Implement cart line updates, quantities, price edits, line/invoice discounts and live calculation via the GST engine.
- Implement held bills with autosave no slower than 300 ms and crash/reload recovery.
- Implement per-device document series and counters keyed by series, document type and financial year. Use Web Locks for cross-tab access and never reuse a finalised/cancelled number.
- Implement a single atomic Dexie transaction for finalising invoice header, lines, payments, stock events, ledger events, counter, audit entry, held-bill removal and outbox event when enabled.
- Support cash tender/change, UPI QR, card, cheque, credit and split payments. Credit sales require a named customer. Payment amount allocations must reconcile to invoice paid/due totals.
- Implement tax invoice, Bill of Supply, quotation/estimate and other planned document types; estimates must not affect inventory or ledgers until converted.
- Build one canonical `PrintModel` and thin renderers for browser print, 58/80 mm thermal, A4/A5 and PDF. Add WhatsApp/Web Share handoff without making bill finalisation dependent on the share succeeding.
- Implement invoice cancellation with required reason and role restriction. Corrections after posting use credit/debit notes or compensating records, not edits to financial snapshots.

**Exit criteria**
- A bill can be finalised offline and the app remains correct if the process stops before, during or after commit.
- Parallel tabs cannot create duplicate numbers.
- An invoice is either fully committed or not committed; no partial stock/payment/ledger effects remain after rollback.
- Printed/PDF totals equal the stored invoice totals and report reconciliation totals.
- Median scan-based billing time is targeted below 30 seconds in pilot measurement.

### M5 — Inventory, Purchase Entry, Returns and Party Ledgers

**Build**
- Implement append-only `stock_movements` and a derived `stock_levels` read model, with an integrity job to rebuild levels from events.
- Implement purchase bills with supplier invoice reference/date, lines, purchase cost, stock-in movements and supplier ledger effects.
- Implement stock adjustment with mandatory reason tags and audit entry.
- Implement customer and supplier parties with normalised search keys, contact details, GSTIN and party type.
- Implement append-only `ledger_entries` for invoice debits, receipts/credits, supplier purchases and settlements. Derive balances from entries; do not maintain the balance as the authoritative record.
- Implement sales return against original invoice lines, validating returned quantity against net previously returned quantities. Issue linked credit notes and support restock vs damaged disposition and cash/UPI/udhaar settlement.
- Implement customer payment receipts, partial receipts, due ageing and reminder message preparation.

**Exit criteria**
- Stock and ledger balances are rebuildable and match their event streams.
- Return quantity cannot exceed the unreturned invoice quantity, including concurrent/duplicate attempts.
- Purchase, sale, return and cancellation side effects are atomic and fully audited.
- Walk-in customers cannot be used for credit sales.

### M6 — Dashboard, Day Close, Reports and Backup/Restore

**Build**
- Build deterministic report builders in `packages/reports-core` and execute heavy Excel generation in a Web Worker.
- Implement daily sales summary, payment-mode summaries, stock/low-stock reports, ledger ageing, sales/purchase registers and the monthly CA/GST pack.
- For the CA workbook, deliver the seven planned tabs: Summary & Reconciliation; B2B Invoices; B2C Large & Small; Credit & Debit Notes; HSN Summary; Document Issued Summary; Cancelled & Nil/Exempt Register.
- Reconcile the sum of line totals, invoice headers and tax summary before exporting; expose a clear failure state instead of silently exporting inconsistent data.
- Implement day close with opening cash, cash sales, cash recoveries, refunds/expenses, expected drawer cash, actual count, variance and audit entry.
- Implement local encrypted backup and restore (`.shopbill.enc`) with documented key derivation, authenticated encryption, schema version and integrity checks.
- Implement cloud backup metadata/upload/download/delete APIs. Store backup blobs in shop-namespaced object storage, use expiring pre-signed downloads, server-side encryption and retention policy.
- Add storage quota warning at the specified 80% threshold and daily backup prompts.

**Exit criteria**
- Generated workbooks reconcile exactly with database totals for fixed fixtures and representative pilot data.
- Backup/restore round-trip succeeds on a fresh browser profile and does not duplicate invoice numbers.
- A wrong passphrase or modified backup fails safely without partially replacing current data.
- The day-close cash variance is audited and traceable.

### M7 — MVP Hardening, Pilot and Release

**Build**
- Complete owner/cashier/accountant access matrix on every route and operation.
- Validate all error states: printer disconnect, storage quota, import failure, invalid reference data, backup failure, duplicate request and offline API.
- Add health (`/healthz`, `/readyz`) and metrics (`/metrics`), structured logs, error reporting and secret-safe diagnostics.
- Run database migration tests, OpenAPI/Schemathesis tests, dependency/security scans, cross-tenant authorization tests, browser/device checks and restore drills.
- Pilot with 3–5 shopkeepers and a Chartered Accountant, consistent with the PRD review plan. Capture timings and usability issues without collecting unnecessary personal data.
- Prepare deployment and rollback runbooks, backup retention settings, incident contact and support process.

**MVP release gate**
- GST reference cases are signed off by the reviewing CA; no known critical tax defects remain.
- No known critical/high-severity security issues remain open.
- Offline invoice preservation and no-duplicate-number tests pass.
- The app is usable on target Android Chrome/Edge and Windows Chrome/Edge.
- Core PRD targets are measured: onboarding under 10 minutes, interactive bill screen under 2 seconds on a low-end Android device, product search under 100 ms at 50,000 products, and report reconciliation at 100% for the release fixtures.

### M8 — Phase 2: Multi-Device Sync and Automation

**Build in this order**
1. Finalise the transaction-bundle format and HLC metadata for mutable master data.
2. Implement `POST /v1/sync/push`, `GET /v1/sync/pull` and snapshot/bootstrap. Limit batches to 500 operations and apply bundles in one PostgreSQL transaction.
3. Validate device-bound tokens and recompute invoice totals with the Python verifier using the same golden fixtures.
4. Make every operation idempotent; persist server acknowledgement, change log, cursor and conflicts. Never merge append-only invoices/payments/stock/ledger events by overwriting them.
5. Add last-write-wins with HLC for mutable master data such as products and parties; document conflict UI and resolution policy.
6. Test initial restore, two devices offline independently, network retry, duplicate push, out-of-order delivery, long disconnection, clock skew and partial-batch rejection.
7. Add multi-branch/location support only after the branch ownership model and stock-transfer semantics are explicitly designed.
8. Add the worker for scheduled Excel reports, delivery, nightly backups, reminder jobs and retention. Jobs must be idempotent, have three retries with exponential backoff, run history and dead-letter handling. Scheduler coordination uses a PostgreSQL advisory lock; schedules use `Asia/Kolkata`.
9. Add messaging endpoints only after consent tracking and unsubscribe/revocation behaviour are implemented.
10. Add batch/expiry/serial/IMEI and FEFO support; then purchase-photo OCR and the read-only AI assistant with tenant-scoped tools and numeric grounding verification.

**Exit criteria**
- Repeated sync push returns the same acknowledgements and never duplicates business events.
- Every acknowledged offline invoice survives a multi-device sync and restore cycle.
- HLC tests show that device clock skew does not cause stale master data to overwrite newer data.
- Scheduled tasks are observable, retry-safe and cannot run concurrently from multiple scheduler instances.
- AI answers contain only figures grounded in tool results and cannot execute arbitrary user-generated SQL.

### M9 — Phase 3: Compliance and External Integrations

**Build**
- Implement GSTR-1/3B export payloads and Tally XML export against versioned schemas and fixtures.
- Implement e-invoice/e-way bill provider adapters behind interfaces. Start with mock providers and contract tests before production credentials or live calls.
- Implement payment gateway/soundbox webhook verification, replay protection and idempotent event handling.
- Add digital receipt links with explicit access and retention controls.
- Keep final legal/tax interpretation and provider onboarding as explicit release gates; do not equate generated payloads with filing or statutory acceptance.

**Exit criteria**
- All payloads pass schema/contract fixtures and reconcile to the underlying invoices and credit/debit notes.
- Webhook signature failures and duplicate deliveries are rejected/handled safely.
- A production adapter cannot be enabled without configuration, provider certification/contract tests and operational monitoring.

## 5. Illustrative Sprint Sequence for the MVP

This is a suggested order for a small team using two-week sprints; it is a planning aid, not a delivery promise. The GST and transaction test work must run throughout rather than being left to the final sprint.

| Sprint | Primary goal | Expected demo |
|---|---|---|
| 0 | Repository, CI, local services, OpenAPI conventions | One-command development setup and green pipeline |
| 1 | Auth/device foundation, tenant model, RLS, audit structure | Shop setup and isolated authenticated API calls |
| 2 | GST engine, reference data model and golden fixtures | Deterministic tax calculations with breakdowns |
| 3 | Dexie repositories, products, barcode/search and import preview | Import 50,000-product fixture and find items quickly |
| 4 | POS cart, held bills, document counters and atomic finalisation | Complete an offline bill and recover a held draft |
| 5 | Split payments, returns/cancellations, print/PDF model | Print invoice; issue a linked credit note; test rollback |
| 6 | Purchases, stock movements, ledgers and day close | Sale/purchase/return flows reconcile stock and khata |
| 7 | Excel report factory, local/cloud backup and restore | Export CA workbook and restore onto a clean profile |
| 8 | Security, performance, cross-browser QA and pilot fixes | Release candidate passes the MVP gate |

If capacity is lower than assumed, split each sprint into smaller increments and preserve the dependency order. Do not drop data-integrity, tax, tenant-isolation or restore tests to save time.

## 6. Workstream Ownership

One person may own more than one workstream, but every item must have a named accountable owner in the issue tracker.

| Workstream | Responsibilities | Primary dependencies |
|---|---|---|
| Domain & GST | GST assumptions, money/quantity types, golden fixtures, validators and engine versioning | CA review, reference datasets |
| Client/PWA | UI routes, Dexie, workers, PWA/offline lifecycle, scan and print interactions | Domain contracts, UX specification |
| API & data | FastAPI, SQLAlchemy, Alembic, RLS, auth, idempotency and backup APIs | Domain models, OpenAPI contract |
| Inventory & ledger | Stock and ledger event model, purchase, sales return and settlement rules | Product and invoice model |
| Reports | Report datasets, reconciliation rules, XLSX formatting, day close | Stable invoice/stock/ledger services |
| QA & security | CI, property tests, tenant isolation, threat testing, device/browser matrix and release gates | All workstreams |
| Operations | Deployment, secrets, backup retention, metrics, restore drills and incident runbooks | API/data and security baseline |

## 7. API Build Order

Implement the endpoint groups in dependency order, not simply in screen-navigation order.

### Phase 1 — Backend skeleton
- `GET /healthz`, `GET /readyz`, `GET /metrics`
- `POST /v1/auth/shops`
- `POST /v1/auth/login`, `POST /v1/auth/refresh`, `POST /v1/auth/logout`, `GET /v1/auth/me`
- `POST /v1/devices`
- `GET /v1/reference/manifest`, `GET /v1/reference/{bundle}`
- `POST /v1/backups`, `GET /v1/backups`, `GET /v1/backups/{id}/download`, `DELETE /v1/backups/{id}`

### Phase 2 — Sync and automation
- `POST /v1/sync/push`, `GET /v1/sync/pull`, `GET /v1/sync/snapshot`
- `GET/POST/PATCH /v1/users` and device revocation
- Report jobs, schedules and report-file access
- Messaging and consent endpoints
- Assistant query and purchase-photo OCR draft endpoints
- Data export/erase requests

### Phase 3 — Integrations
- E-invoice and e-way bill submission adapters
- GSTR-1 export and related compliance payloads
- Payment webhooks and related receipt/status handling

Every write route needs request validation, tenant authorization, idempotency behaviour, a stable error code, audit policy, rate/size controls and tests before it is considered complete.

## 8. Test Strategy and Quality Gates

### Unit tests
- GST calculation branches, validators, discount allocation, rounding and invariants.
- Numbering, invoice state transitions, payment allocation, stock/ledger projections and return quantity limits.
- Reference bundle verification, HLC ordering and idempotency-key behaviour.

### Property and golden tests
- Use `fast-check` for TypeScript GST engine property tests.
- Use shared GST/report fixtures between TypeScript and Python.
- Use Hypothesis for Python verifier and backend invariants, consistent with the TRD.
- Generate edge values for paise boundaries, quantities, discounts, rate slabs and very large/small invoices.

### Integration tests
- Finalise invoice transaction; force failures at each write and verify full rollback.
- Tenant RLS tests using multiple shops and roles.
- Auth refresh rotation and revocation.
- Backup upload/download/restore metadata and permission checks.
- Import all-valid, mixed valid/invalid, duplicate, cancelled and interrupted cases.

### End-to-end tests
- First-run setup → product import → test print → offline sale → payment → return → report → backup/restore.
- Cash, UPI, split payment, partial payment and credit sale.
- Cancelled invoice numbering and audit history.
- Multi-tab numbering and storage-quota warning.
- Online/offline/online transition with no missing or duplicate transaction.

### Performance and compatibility
- Product search benchmark for 50,000 products with p95 below 100 ms.
- Bill-screen interactive load under 2 seconds on a representative low-end Android device.
- Billing route JavaScript no more than 300 KB gzipped; total precache no more than 5 MB per the TRD.
- Browser matrix: Android Chrome/Edge, Windows Chrome/Edge, plus documented best-effort testing for Firefox, desktop Safari and installed iOS Safari.
- Export memory bounded to the specified target, and report outputs reconciled against fixtures.

### CI gates
- Formatting, linting, strict type checks and unit tests.
- Alembic migration checks against a clean DB and supported prior migration fixtures.
- OpenAPI diff check; breaking changes require explicit versioning/review.
- Schemathesis API contract tests.
- Dependency and secret scanning; security tests for authorization, RLS and rate limiting.
- Build and smoke test of the production PWA/API images.

## 9. Security and Data Integrity Checklist

- [ ] Apply tenant context to every request and enforce RLS for every tenant-owned database table.
- [ ] Never trust `shop_id`, role or device identity supplied in a request body; derive or verify them from authenticated claims and database membership.
- [ ] Store password hashes with a suitable password-hashing algorithm; never log credentials or tokens.
- [ ] Store refresh tokens only as hashes; rotate on refresh and detect reuse.
- [ ] Require `Idempotency-Key` on all write routes and retain the response for 24 hours.
- [ ] Use parameterised queries and fixed, read-only SQL tools for the assistant; never expose arbitrary SQL execution.
- [ ] Encrypt backup objects at rest and use expiring pre-signed URLs; verify shop namespace and ownership on every download/delete.
- [ ] Record actor, device, action, target, reason, timestamp and correlation ID in audit events; hash-chain/tamper-evidence the audit trail in Phase 2 as planned.
- [ ] Make financial business events append-only; use compensating events for corrections.
- [ ] Validate webhook signatures and implement replay/idempotency controls before enabling live integrations.
- [ ] Define backup retention, report expiry, deletion workflow and restore drills before public launch.

## 10. Data Integrity Rules to Encode as Tests

1. `invoice.grand_total_paise = taxable_total_paise + CGST + SGST/UTGST + IGST + cess + round_off`.
2. Payment allocations must reconcile to the recorded tender amount; overpayment/change is represented explicitly and not silently counted as sales.
3. Invoice numbers are unique within `(shop, series, doc_type, financial_year)` and are never reused, including after cancellation.
4. Finalised invoice snapshots cannot be altered by a later product-name, HSN, tax-rate or selling-price update.
5. Stock level is the projection of stock movements, adjusted for the defined sellable/damaged dispositions.
6. Party balance is the projection of ledger entries; receipt/settlement cannot be applied twice.
7. Returns cannot exceed the remaining returnable quantity from the original invoice line.
8. A quotation/estimate does not affect stock or party ledger until conversion to a real business document.
9. Replaying the same idempotency key or sync operation produces no duplicate side effects.
10. Tenant-scoped entities cannot reference another tenant's shop, party, product, invoice or file.
11. Reports reconcile invoice-level totals, line totals, tax totals and credit-note adjustments before export.
12. Backup restore preserves all business events and advances counters so no invoice number is reused.

## 11. Deployment and Operations

### Environments
- **Local:** Docker Compose, PostgreSQL and MinIO; seeded synthetic data only.
- **CI/test:** disposable PostgreSQL database; migration and contract suites run automatically.
- **Staging/pilot:** restricted tenant set, separate secrets/object bucket, automated backup and restore verification.
- **Production:** India-region hosting where feasible, TLS, secret manager/environment injection, encrypted object storage, database backups and documented rollback.

### Release process
1. Merge reviewed changes with passing CI and migration review.
2. Apply backward-compatible database migration before deploying code that depends on new fields.
3. Deploy API and verify `/healthz`, `/readyz`, core auth and reference-data routes.
4. Deploy/update PWA using the Workbox update policy; do not force an update while a bill is open.
5. Run smoke checks, monitor error rate and database health, then enable the feature for the pilot cohort.
6. Keep rollback instructions for both code and migrations. Avoid destructive migration rollback; use forward repair migrations where data has been written.
7. Test at least one backup restore in staging before a material data-model release.

### Operational dashboards and alerts
- API request/error rates and latency.
- PostgreSQL availability, slow queries, connection pool saturation and migration status.
- Backup upload failures, backup age and restore-test outcomes.
- Sync lag, failed bundles, duplicate/idempotency counts and dead-letter jobs (Phase 2).
- Report job failures, delivery retries and expiring report objects (Phase 2).
- Reference bundle signature/expiry validation failures.

## 12. Main Risks and Mitigations

| Risk | Impact | Mitigation / decision gate |
|---|---|---|
| Ambiguous or unreviewed GST assumptions | Incorrect statutory invoice/tax output | Complete `docs/GST_ASSUMPTIONS.md`, build CA-reviewed fixtures and gate release on review |
| Local and server logic drift | Conflicting reports or rejected sync | Shared fixtures; a single canonical TS engine; Python verifier added in Phase 2 |
| Offline transaction is only partly written | Lost or duplicate financial events | One Dexie transaction, crash tests and idempotent sync bundles |
| Tenant data leakage | Severe confidentiality failure | RLS plus service-layer authorization and cross-tenant tests on every tenant table |
| Duplicate numbering across devices | Invoice/audit inconsistency | Per-device series, UUIDv7 business IDs, local locking and restore counter advancement |
| Sync conflict handling is underspecified | Data loss or confusing state | Append-only event model; HLC only for mutable master data; conflict UX defined before Phase 2 |
| Backup passphrase/key loss | Data unrecoverable | Clear user-facing recovery limits, export verification and restore exercises; never store the passphrase server-side |
| Slow low-end devices | Queue delays and low adoption | Web Workers, virtualisation, code splitting and measured performance gates |
| Integration provider changes | Delivery/compliance disruption | Adapter interfaces, mocks, contract tests, provider versioning and feature flags |
| Report mismatch | Incorrect CA handoff | Reconciliation checks fail closed; golden workbook fixtures and CA review |

## 13. Decisions Required Before Production

These issues are not fully resolved by the four design documents and should be recorded rather than silently guessed:

1. Final reviewed content for `docs/SPEC.md` and `docs/GST_ASSUMPTIONS.md`, including CA-approved expected tax results and effective dates.
2. Exact account recovery policy and production password-hashing parameters, including MFA or step-up authentication for sensitive owner actions if adopted.
3. Tenant model for multi-branch businesses: whether each branch is a first-class location under one shop tenant and how inventory transfers are represented.
4. Financial-year boundary behaviour, invoice series character limits, and how a restored device receives a new unique series.
5. Exact retention/legal requirements for invoices, audit history, backups, data export/erasure and generated report files.
6. Reference data source, licensing, update/signing key ownership and emergency rollback process.
7. Provider selection and production approval process for WhatsApp/SMS/email, Gemini, payment webhooks, IRP/GSP and e-way bill adapters.
8. Whether the phase-one cloud service is limited to auth/reference/backup or stores any business transaction data before Phase 2 sync.

## 14. MVP Definition of Done

The MVP is ready for controlled pilot when all statements below are true:

- [ ] A shop can onboard, select English/Hindi/Bengali, configure tax settings and print a test bill.
- [ ] All core billing and inventory workflows work offline after installation and initial setup.
- [ ] GST calculations are deterministic, versioned, documented and CA-reviewed against golden cases.
- [ ] Finalised documents are immutable; cancellations, returns and adjustments are traceable and role-controlled.
- [ ] Stock and party balances are rebuildable from append-only events.
- [ ] Split payments, partial credit, receipts, purchase entry and returns reconcile.
- [ ] Product import/export and search meet the PRD acceptance targets.
- [ ] Day-close and the monthly CA workbook pass reconciliation fixtures.
- [ ] Local backup/restore works, and cloud backup endpoints are tenant-protected and encrypted.
- [ ] Audit logging, authentication, idempotency, request limits, rate limits and tenant RLS are tested.
- [ ] CI, migrations, OpenAPI checks, health endpoints, deployment and rollback runbooks are in place.
- [ ] Pilot feedback from 3–5 shopkeepers has been reviewed and launch-blocking defects are closed.

## 15. Suggested First 15 Engineering Tickets

1. Create monorepo scaffold and CI baseline.
2. Add Docker Compose for PostgreSQL and MinIO.
3. Define UUIDv7, timestamp, paise, basis-point and quantity conventions.
4. Create API OpenAPI skeleton and standard error response model.
5. Add Alembic and base `shops`/membership/device tables.
6. Add tenant transaction context and PostgreSQL RLS tests.
7. Implement auth token issue/refresh/revocation lifecycle.
8. Implement idempotency middleware/service for write endpoints.
9. Create GST engine package and the first approved golden fixtures.
10. Implement money/quantity types and GST invariant/property tests.
11. Create Dexie schema v1 and migration fixture harness.
12. Implement product repository/service and barcode uniqueness checks.
13. Implement product import worker with preview/error model.
14. Implement document counter service and test concurrent tab numbering.
15. Implement invoice-finalisation transaction and fault-injection rollback tests.

---

**Implementation principle:** ship a trustworthy vertical slice before adding breadth: onboard one shop → create/import products → complete an offline GST bill → account for payment and stock → print/export → back up → restore. Then add the remaining Phase 1 workflows, followed by sync and automation.
