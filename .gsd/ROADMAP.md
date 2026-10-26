---
milestone: ShopBill MVP (Phase 1)
version: 1.0.0
updated: 2026-10-26T17:40:00+05:30
---

# Roadmap: ShopBill (Offline-First GST Billing & Management)

> **Current Phase:** Phase 0 — Foundation and Developer Workflow
> **Status:** executing
> **Specification Reference:** `.gsd/SPEC.md` (Status: FINALIZED)
> **Master Plan:** `ShopBill_Implementation_Plan.md`

## Must-Haves (from SPEC)

- [ ] Zero-error pure TypeScript GST calculation engine with BigInt paise math
- [ ] Offline-first Dexie (IndexedDB) data layer with atomic transaction finalisation
- [ ] Single-screen high-speed POS terminal (`F1`–`F12`, barcode burst, mobile touch)
- [ ] Multi-bill hold/resume surviving crash or reload
- [ ] Append-only inventory movements and customer/supplier khata ledgers
- [ ] Sales returns with linked Credit Notes and quantity guardrails
- [ ] Multi-format printing (58mm/80mm thermal, A4/A5, PDF, WhatsApp share)
- [ ] 7-tab CA/GST Excel workbook factory running in a Web Worker
- [ ] End-to-end day close cash drawer reconciliation
- [ ] Local AES-256-GCM encrypted backup and restore (`.shopbill.enc`)
- [ ] FastAPI backend with PostgreSQL 16 schema, tenant RLS, and encrypted cloud backups

---

## Phases

### Phase 0: Project Foundation and Developer Workflow (M0)
**Status:** 🔄 In Progress
**Objective:** Establish monorepo workspace (pnpm + uv), folder structures, TypeScript and Python lint/test toolchains, Docker Compose for PostgreSQL & MinIO, and OpenAPI 3.1 contract.
**Requirements:** TRD Sec 4, Implementation Plan M0

**Plans:**
- [x] Plan 0.1: Establish GSD memory (`SPEC.md`, `ROADMAP.md`, `STACK.md`, `ARCHITECTURE.md`, `STATE.md`) and initial git baseline.
- [ ] Plan 0.2: Configure pnpm monorepo workspace (`apps/web`, `apps/api`, `packages/gst-engine`, `packages/print-model`, `packages/reports-core`, `packages/api-client`, `packages/i18n`, `fixtures`, `infra`).
- [ ] Plan 0.3: Set up Python uv project for `apps/api` with FastAPI, SQLAlchemy 2, Alembic, and health endpoints (`/healthz`, `/readyz`).
- [ ] Plan 0.4: Set up `infra/docker-compose.yml` for PostgreSQL 16 and MinIO, and verify local development environment.

---

### Phase 1: Identity, Tenant Isolation, Reference Data & Backend Baseline (M1)
**Status:** ⬜ Not Started
**Objective:** Deploy PostgreSQL schema via Alembic migrations, enforce tenant Row-Level Security (RLS), implement shop/user/device auth, EdDSA JWT tokens, idempotency records, and reference data bundles.
**Requirements:** `ONB-1`, `ONB-2`, `SEC-1`, `SEC-2`, TRD Sec 6, Schema DDL

**Plans:**
- [ ] Plan 1.1: Database models, Alembic migrations from `shopbill_backend_schema.sql`, and RLS tenant policies.
- [ ] Plan 1.2: FastAPI authentication (`/v1/auth/*`), device registration, EdDSA JWTs, and refresh token rotation.
- [ ] Plan 1.3: Reference data endpoints (`/v1/reference/*`) with state codes, HSN codes, and tax rates.

---

### Phase 2: Pure TypeScript GST Engine & Financial Invariants (M2)
**Status:** ⬜ Not Started
**Objective:** Build `packages/gst-engine` with integer paise arithmetic, basis point rates, BigInt intermediate calculations, line/invoice rounding, composition rules, and CA golden test fixtures.
**Requirements:** `GST-1` to `GST-8`, TR-CLI-1, TRD TD-3/TD-4

**Plans:**
- [ ] Plan 2.1: Pure GST engine core calculations (inclusive/exclusive pricing, intra/inter-state split, discounts, round-off).
- [ ] Plan 2.2: Field validators (GSTIN Mod-36 checksum, PAN, HSN/SAC, state code, UPI ID) and golden vector test suite.

---

### Phase 3: Client Local Data Layer, Product Master & Import Worker (M3)
**Status:** ⬜ Not Started
**Objective:** Configure Dexie database schema and migrations in `apps/web`, implement product catalogue, search index Web Worker, and Excel/CSV bulk import/export worker.
**Requirements:** `PRD-1` to `PRD-5`, `ONB-4`, TR-CLI-5, TR-CLI-8

**Plans:**
- [ ] Plan 3.1: Dexie database schema, versioned migrations, and product/party repositories.
- [ ] Plan 3.2: Product catalogue UI, category/unit management, and Web Worker search index.
- [ ] Plan 3.3: Excel/CSV template generator, parser worker, validation preview, and 24h undoable updates.

---

### Phase 4: POS Billing Terminal, Numbering, Documents & Printing (M4)
**Status:** ⬜ Not Started
**Objective:** Deliver single-screen billing terminal, Web Locks document numbering, multi-bill hold/resume, split tenders, atomic Dexie commit, and `packages/print-model` renderers.
**Requirements:** `POS-1` to `POS-8`, `DOC-1` to `DOC-5`, TR-CLI-1, TR-CLI-4, TR-CLI-10

**Plans:**
- [ ] Plan 4.1: POS cart UI with keyboard shortcuts (`F1`–`F12`), barcode burst detection, and live tax breakdown.
- [ ] Plan 4.2: Held bills drawer with 300ms debounced autosave and crash recovery.
- [ ] Plan 4.3: Per-device sequence numbering and single atomic Dexie transaction finaliser.
- [ ] Plan 4.4: Split tender payment modal (Cash, UPI QR, Card, Credit) and change calculation.
- [ ] Plan 4.5: PrintModel engine and renderers (58mm/80mm thermal, A4/A5, PDF, WhatsApp share).

---

### Phase 5: Inventory, Inward Purchases, Returns & Customer/Supplier Khata (M5)
**Status:** ⬜ Not Started
**Objective:** Implement append-only stock movements, purchase bill inward entry, sales returns generating linked Credit Notes, and customer/supplier ledger accounts.
**Requirements:** `STK-1` to `STK-5`, `LED-1` to `LED-5`, `POS-6`

**Plans:**
- [ ] Plan 5.1: Purchase bill inward flow with supplier invoice linking and stock increment.
- [ ] Plan 5.2: Sales returns against original invoices with quantity validation and linked Credit Notes.
- [ ] Plan 5.3: Customer udhaar ledger, ageing analysis (30/60/90+ days), and payment receipt collection.
- [ ] Plan 5.4: WhatsApp UPI payment reminder deep-link generator.

---

### Phase 6: Dashboard, Day Close Drawer Audit, Reports & Backups (M6)
**Status:** ⬜ Not Started
**Objective:** Implement executive dashboard, day close cash reconciliation, 7-tab CA/GST Excel workbook factory in a Web Worker, and AES-256-GCM local/cloud backup and restore.
**Requirements:** `DSH-1` to `DSH-4`, `RPT-1` to `RPT-7`, `SEC-1` to `SEC-6`

**Plans:**
- [ ] Plan 6.1: Day close session with physical cash count, expected drawer cash, variance logging, and report.
- [ ] Plan 6.2: `packages/reports-core` and Web Worker Excel export for 7-tab CA/GST pack and registers.
- [ ] Plan 6.3: Local encrypted backup (`.shopbill.enc`) with PBKDF2/AES-GCM and cloud backup upload/download.
- [ ] Plan 6.4: Business dashboard with KPI strip, sales velocity, and stock alert cards.

---

### Phase 7: MVP Hardening, Cross-Device Verification & Release Gate (M7)
**Status:** ⬜ Not Started
**Objective:** Enforce complete role-based permission matrix, test offline/online resilience, verify storage quota warnings, run Schemathesis API tests, and execute complete pilot smoke flows.
**Requirements:** PRD Sec 4, TRD Sec 8, Implementation Plan M7

**Plans:**
- [ ] Plan 7.1: Multi-role authentication & authorization verification (Owner, Cashier, Accountant).
- [ ] Plan 7.2: End-to-end browser testing, offline storage persistence, and performance audit.

---

## Progress Summary

| Phase | Milestone | Status | Plans | Complete |
|-------|-----------|--------|-------|----------|
| 0 | Foundation & Dev Environment | 🔄 In Progress | 0/4 | 25% |
| 1 | Identity, RLS & Backend | ⬜ Not Started | 0/3 | 0% |
| 2 | Pure GST Calculation Engine | ⬜ Not Started | 0/2 | 0% |
| 3 | Local Data Layer & Catalogue | ⬜ Not Started | 0/3 | 0% |
| 4 | POS, Payments & Printing | ⬜ Not Started | 0/5 | 0% |
| 5 | Stock, Purchases & Ledgers | ⬜ Not Started | 0/4 | 0% |
| 6 | Reports, Day Close & Backups | ⬜ Not Started | 0/4 | 0% |
| 7 | MVP Hardening & Verification | ⬜ Not Started | 0/2 | 0% |
