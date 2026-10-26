# ShopBill — Technical Requirements Document

*0**Architecture, data, interfaces, security, quality and operations · Version 1.0 (Draft) · 26 October 2026 · Technical owner: Arnab Sarkar*

| Item | Detail |
| --- | --- |
| Product | ShopBill (working name) |
| Status | Draft v1.0, ready for technical review |
| Audience | Developers, AI coding agents (Antigravity), reviewers and the reviewing CA |
| Companion documents | PRD (what and why), docs/SPEC.md (build specification and acceptance criteria), docs/GST\_ASSUMPTIONS.md (tax rules implemented) |
| Conventions | MUST, SHOULD and MAY follow RFC 2119. Requirement IDs look like TR-CLI-3; PRD IDs such as GST-5 are mapped in section 19. Phase tags 1, 2 and 3 match the PRD. |

## 1. Purpose and scope

This document turns the PRD into an implementable technical design: how the system is structured, how money and GST are represented and calculated, how data is stored and synchronised, and how the system is secured, tested, deployed and operated. It covers all three phases and tags each requirement with the phase in which it ships. Where it refines docs/SPEC.md, the change is recorded in section 3.3 and the SPEC should be updated to match. Visual design, pricing, go-to-market and legal terms are out of scope.

## 2. Design drivers and constraints

| Driver | Technical consequence |
| --- | --- |
| Billing must work offline and survive power cuts | The device database is the system of record while offline; the server is a replica, sync hub, report factory and backup target |
| Money and tax must be exactly right | Integer arithmetic, one pure GST engine, invariants checked at runtime, in tests and again on the server |
| Low-end Android phones on 2G to 4G | Small bundles, Web Workers, virtualised lists, lazy loading, bounded memory during exports |
| Cheap, shared hosting during the pilot | Stateless API, PostgreSQL as the only stateful service, object storage for files, free-tier-friendly deployment |
| Small team working with AI agents | Monorepo, strict typing, generated API client, golden test vectors, small modules with explicit interfaces |
| Frequent regulatory change | Rates, HSN codes and thresholds are signed, versioned reference data; the engine is versioned; invoices store snapshots |
| Many shops and staff roles | Row-level security, role-based access control, tamper-evident audit trail |

**Constraints:** pilot budget close to free tiers; Chrome or Edge on Android 8+ and Windows 10+ as primary targets; no native app in Phase 1; India-region hosting where available; the Gemini API is called only from the backend.

## 3. Architecture overview

### 3.1 Components

| Component | Responsibility | Technology | Phase |
| --- | --- | --- | --- |
| PWA client | UI, local database, GST engine, printing, scanning, offline reports, sync outbox | React 18, TypeScript, Vite, Tailwind CSS, Dexie, Workbox | 1 |
| Core packages | Pure logic used by the client: GST engine, print model, report builders, validators, formatters | TypeScript packages in the monorepo | 1 |
| API service | Auth, devices, reference data, backups, sync, report jobs, assistant, messaging | FastAPI, SQLAlchemy 2, Pydantic v2 | 1 (skeleton), 2 |
| Worker service | Scheduled reports and delivery, nightly backups, reminders, retention jobs | Python, APScheduler (Celery optional) | 2 |
| PostgreSQL | Server system of record with tenant isolation | PostgreSQL 16 or newer | 1–2 |
| Object storage | Backups, generated reports, purchase-bill images | S3-compatible (MinIO in development) | 1–2 |
| Adapters | Gemini API, WhatsApp Cloud API, SMS, SMTP, IRP/GSP (mock), payment gateways (mock) | HTTP clients behind interfaces | 2–3 |

### 3.2 Key data flows

1. **Create a bill (offline):** cart state → GST engine (pure) → one local transaction (counter, invoice, lines, payments, stock movements, ledger entry, audit entry) → print model → HTML, PDF or ESC/POS renderer.
2. **Sync (Phase 2):** outbox → idempotent push to the API → server verification and storage → change log → pull by every other device.
3. **Reports:** on demand in the browser (local data → report builder → Excel writer in a Web Worker); scheduled on the server (PostgreSQL → report builder → Excel writer → object storage → email or WhatsApp share).
4. **AI question (Phase 2):** UI → assistant endpoint → Gemini function calling → read-only, shop-scoped tools → grounded answer with the data shown.

### 3.3 Architecture decisions

| ID | Decision | Rationale and alternatives |
| --- | --- | --- |
| TD-1 | The device database (Dexie over IndexedDB) is the system of record while offline | Offline billing is the core promise. Rejected: server-first with a cache (fails offline); SQLite WASM on OPFS (newer, with header and fallback complications) |
| TD-2 | Installable PWA in Phase 1 | One codebase for Android and Windows, instant updates, no store review; a Capacitor or TWA wrapper stays an option if Bluetooth printing needs it |
| TD-3 | The canonical GST engine is TypeScript and runs on the device; a Python verifier joins in Phase 2; both pass the same golden vectors | The engine must run offline. Refines the SPEC: engine property tests use fast-check, while Hypothesis covers the Python verifier and backend |
| TD-4 | Money in integer paise, rates in basis points, quantities in thousandths, BigInt intermediates | Exactly reproducible results with no floating-point error |
| TD-5 | Business events are append-only; balances and stock are derived | Conflict-free sync and a natural audit trail |
| TD-6 | The sync unit is a business transaction bundle (invoice, lines, payments, stock movements, ledger entries) | No half-applied transactions across devices |
| TD-7 | Master-data conflicts use last-write-wins with a hybrid logical clock | Tolerates wrong device clocks; CRDT libraries are heavy for this need |
| TD-8 | One invoice series per device | Offline-safe numbering without coordination; central numbering would need connectivity |
| TD-9 | One print model with thin renderers (HTML/CSS, PDF, ESC/POS) | The printed bill always equals the stored invoice; renderers hold no business logic |
| TD-10 | Reports are pure builders plus thin writers: TypeScript in the browser (Phase 1), Python for scheduled jobs (Phase 2), checked against shared fixtures | Avoids a Node worker in Phase 1; see open decision OD-1 |
| TD-11 | PostgreSQL row-level security isolates tenants, with application checks as a second layer | Defence in depth against cross-shop leaks |
| TD-12 | Rates, HSN codes and states ship as signed reference-data bundles, separate from app releases | A rate change must not need a new app version |
| TD-13 | Gemini is reached only from the backend through fixed read-only tools, with a numeric grounding check | Limits hallucination, prompt-injection and data-leak risk |
| TD-14 | OpenAPI 3.1 is the API contract and the TypeScript client is generated from it | One source of truth for client and server |

## 4. Repository and module structure

A pnpm and Turborepo workspace for JavaScript, with uv for Python. Packages MUST NOT import from apps, and dependency-cruiser enforces the layering UI → state → services → repositories → database access.

| Path | Contents |
| --- | --- |
| apps/web | React PWA: routes, screens, state, Web Workers, service worker |
| apps/api | FastAPI service: routers, services, repositories, Alembic migrations |
| apps/worker | Scheduled jobs and delivery, sharing code with apps/api |
| packages/gst-engine | Pure TypeScript GST engine, validators, place-of-supply and rounding utilities |
| packages/print-model | Invoice print model and renderers (HTML, PDF, ESC/POS) |
| packages/reports-core | Report builders and the house-style specification for browser exports |
| packages/api-client | TypeScript client generated from the OpenAPI schema |
| packages/i18n | Translation resources, number, date and amount-in-words helpers |
| fixtures | Golden GST vectors, report datasets and expected outputs used by TypeScript and Python tests |
| infra | Dockerfiles, Docker Compose, deployment manifests, CI workflows |
| docs | PRD, TRD, SPEC, GST\_ASSUMPTIONS and architecture decision records |

## 5. Client architecture (PWA)

### 5.1 Layers

- **UI:** React components, React Router and Tailwind; presentation only.
- **State:** Zustand for cart and UI state, TanStack Query for server reads, Dexie live queries for reactive local data.
- **Domain services:** BillingService, StockService, LedgerService, NumberingService and ReportService; no UI imports; every write is a transaction.
- **Repositories:** the only code that touches Dexie; owns schema versions and writes the outbox.
- **Web Workers:** search index, Excel export, import parsing and validation, PIN key derivation, image compression.
- **Service worker (Workbox):** precaching, runtime caching, Background Sync where available, controlled updates.

### 5.2 Local database (Dexie)

| Store | Keys and indexes | Notes |
| --- | --- | --- |
| products | id; sku; multi-entry barcodes; name\_norm; category\_id; updated\_at | name\_norm holds normalised English, local-language and transliterated names |
| invoices | id; \[doc\_type+fy+number\]; issue\_at; party\_id; status | Immutable after finalisation except status and cancellation fields |
| invoice\_lines | id; invoice\_id; product\_id | Stored with the invoice and sent in the same sync bundle |
| payments | id; invoice\_id; party\_id; received\_at | Append-only |
| stock\_movements | id; product\_id; occurred\_at | Append-only |
| stock\_levels | product\_id | Derived read model; rebuilt from movements by an integrity job |
| ledger\_entries | id; party\_id; occurred\_at | Append-only |
| parties | id; name\_norm; phone; gstin | Customers and suppliers |
| counters | \[series+doc\_type+fy\] | Next sequence number, updated inside the finalise transaction |
| held\_bills | id; updated\_at | Autosaved drafts |
| outbox | op\_id; status; created\_at | Sync queue (Phase 2) |
| audit\_log | id; at; entity | Hash-chained from Phase 2 |
| meta | key | Settings, device id, sync cursors, reference-data versions |

### 5.3 Client requirements

| ID | Requirement | Phase |
| --- | --- | --- |
| TR-CLI-1 | Finalising a bill MUST be one IndexedDB transaction covering counters, invoice, lines, payments, stock movements, stock levels, ledger entries, audit entry and, once sync is enabled, the outbox operation; any failure rolls everything back. The transaction contains only IndexedDB work, because awaiting anything else lets it auto-commit early; hashing and rendering happen outside it | 1 |
| TR-CLI-2 | Held bills autosave on every change (debounced to 300 ms or less) and survive a crash, reload or power cut | 1 |
| TR-CLI-3 | Onboarding MUST request persistent storage with navigator.storage.persist(); if denied, show a warning and a backup prompt; warn at 80% of the quota reported by navigator.storage.estimate() | 1 |
| TR-CLI-4 | Web Locks serialise counter access across tabs; BroadcastChannel refreshes other tabs after a write | 1 |
| TR-CLI-5 | Search runs in a Web Worker over an in-memory index (MiniSearch or FlexSearch, chosen by benchmark) of normalised English and local-language names, Latin transliterations, SKU and barcodes; barcode lookup uses a Map; p95 under 100 ms at 50,000 products | 1 |
| TR-CLI-6 | Heavy libraries (Excel writer, ZXing, charts, PDF) are lazy-loaded; the billing route ships at most 300 KB of gzipped JavaScript and the whole precache stays under 5 MB including fonts | 1 |
| TR-CLI-7 | Workbox precaches the app shell, uses stale-while-revalidate for reference data and never caches API writes; a new version applies only when no bill is open or on the next launch | 1 |
| TR-CLI-8 | Dexie schema changes ship as numbered migrations, tested from every earlier version using fixture databases | 1 |
| TR-CLI-9 | Noto Sans Devanagari and Bengali (subsetted WOFF2) are bundled so local-language text renders offline | 1 |
| TR-CLI-10 | Camera scanning uses BarcodeDetector where available with a ZXing WebAssembly fallback; USB scanners act as a keyboard, and a rapid burst of keystrokes ending in Enter counts as a scan | 1 |
| TR-CLI-11 | The outbox flushes on the online event, on focus, after each finalised bill and every 60 seconds while visible, plus Background Sync where supported | 2 |

### 5.4 Browser support

| Platform | Support level |
| --- | --- |
| Android 8+ with Chrome or Edge (latest two versions) | Full: install, camera scanning, file sharing, Bluetooth printing in Phase 2 |
| Windows 10 or 11 with Chrome or Edge (latest two versions) | Full: install, USB scanners, WebUSB and Web Serial printing in Phase 2 |
| Firefox and desktop Safari | Billing works; no WebUSB, Web Bluetooth or Web Serial; limited install support |
| iOS Safari 16.4+ installed to the Home Screen | Best effort: offline billing works; no Web Bluetooth or WebUSB; stricter storage rules |

## 6. Backend architecture

### 6.1 API conventions

The API is stateless and asynchronous, layered as router → service → repository, with one database transaction per request. It is versioned under /v1 and described by OpenAPI 3.1. Money is always an integer in fields ending in `_paise`; times are ISO 8601 in UTC; identifiers are UUIDv7. Errors follow RFC 9457 problem details with a stable machine-readable code. Lists use cursor pagination (default 100, maximum 500).

### 6.2 Endpoints

| Area | Endpoints | Phase |
| --- | --- | --- |
| Auth and devices | POST /v1/auth/shops, POST /v1/auth/login, POST /v1/auth/refresh, POST /v1/auth/logout, GET /v1/auth/me, POST /v1/devices | 1 |
| Reference data | GET /v1/reference/manifest, GET /v1/reference/{bundle} (tax-rates, hsn, states; signed, ETag) | 1 |
| Backups | POST /v1/backups, GET /v1/backups, GET /v1/backups/{id}/download, DELETE /v1/backups/{id} | 1 |
| Health | GET /healthz, GET /readyz, GET /metrics | 1 |
| Sync | POST /v1/sync/push, GET /v1/sync/pull, GET /v1/sync/snapshot | 2 |
| Users | GET, POST, PATCH /v1/users; POST /v1/users/{id}/revoke-devices | 2 |
| Reports | POST /v1/report-jobs, GET /v1/report-jobs/{id}, CRUD /v1/report-schedules, GET /v1/report-files/{id} | 2 |
| Messaging | POST /v1/messages, GET and POST /v1/consents | 2 |
| Assistant and OCR | POST /v1/assistant/query, POST /v1/purchases/draft-from-image | 2 |
| Data rights | POST /v1/data-requests/export, POST /v1/data-requests/erase | 2 |
| Compliance and payments | POST /v1/compliance/einvoice, POST /v1/compliance/ewaybill, GET /v1/exports/gstr1, POST /v1/webhooks/payments | 3 |

### 6.3 Backend requirements

| ID | Requirement | Phase |
| --- | --- | --- |
| TR-API-1 | Every write endpoint accepts an Idempotency-Key header; the server stores the key and response for 24 hours and replays it on retry | 1 |
| TR-API-2 | Access tokens are JWTs signed with EdDSA, valid 15 minutes and bound to a device; refresh tokens are 256-bit random values stored only as hashes, rotated on every use, with reuse detection that revokes the whole token family | 1 |
| TR-API-3 | Rate limits: login 5 attempts per minute per IP and account with exponential lockout; 120 requests per minute per user by default; sync push 30 per minute per device | 1 |
| TR-API-4 | Request limits: 2 MB JSON, 500 operations per sync batch, 10 MB per image upload | 1 |
| TR-API-5 | CI runs Schemathesis against the OpenAPI schema and an OpenAPI diff check that blocks breaking changes without a version bump | 1 |
| TR-API-6 | The server assigns received\_at and never trusts client clocks for ordering beyond the hybrid logical clock | 2 |
| TR-API-7 | Jobs run in the worker: scheduled reports, delivery, nightly backups, retention purges and reference-bundle checks. Jobs are idempotent, retried three times with exponential backoff, recorded with run history and a dead-letter table, and scheduled in Asia/Kolkata; one scheduler instance runs at a time using a PostgreSQL advisory lock | 2 |
| TR-API-8 | Object storage keys are namespaced by shop; downloads use pre-signed URLs that expire in 10 minutes; generated reports expire after 90 days; server-side encryption is on | 1 |
