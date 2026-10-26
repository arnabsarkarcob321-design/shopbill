# SPEC.md — ShopBill Project Specification

> **Status**: `FINALIZED`
>
> **Project**: ShopBill (Offline-first GST billing, inventory, and Excel reporting for Indian shopkeepers)
> **Baseline Sources**: PRD, TRD, APPFLOW, UI/UX Design System Brief, Backend Schema DDL, and Enterprise Implementation Plan (v1.0, 26 October 2026)

---

## 1. Vision

ShopBill is a fast, offline-first billing and inventory PWA application with a cloud-sync backend designed for Indian shopkeepers (kirana, pharmacies, hardware, garments, stationery, and mobile stores). It produces legally and arithmetically correct GST invoices in under 30 seconds, maintains live stock and customer udhaar ledgers, and generates audit-ready Excel reports and GSTR packs automatically with or without an active internet connection.

---

## 2. Core Goals

1. **GST Accuracy & Mathematical Determinism**: 100% accurate GST calculations using integer paise (`*_paise`), basis points (`*_bps`), and integer thousandths (`*_milli`) with a pure, versioned TypeScript calculation engine and zero floating-point currency representation.
2. **Offline-First Resilience**: Full counter billing, held drafts, customer khata, stock deduction, and thermal/A4 printing work without internet connectivity using Dexie (IndexedDB) as the working system of record.
3. **Counter Speed & Ergonomics**: Sub-30-second median billing time, rapid barcode burst detection, function-key navigation (`F1`–`F12`), `Ctrl+K` search, and sub-100ms fuzzy multi-script search across 50,000 products.
4. **Automated Excel & CA Reporting**: Single-tap generation of the 7-tab CA/GST pack (reconciled against line items, headers, and tax summaries) directly in a Web Worker, plus scheduled delivery via cloud worker.
5. **Multi-Script Accessibility**: Multilingual UI in English, Hindi (हिन्दी), and Bengali (বাংলা) with bundled subsetted Noto Sans webfonts rendering reliably offline.
6. **Data Integrity & Security**: Single atomic IndexedDB transactions on bill finalisation, tamper-evident audit logging, tenant isolation with PostgreSQL Row-Level Security (RLS), and authenticated AES-GCM encrypted local/cloud backups.

---

## 3. Non-Goals (Out of Scope for v1 MVP)

- Full double-entry general ledger, balance sheets, and payroll.
- Customer-facing online marketplace / e-commerce storefront.
- Restaurant table/KOT management, manufacturing recipes, or complex Bill of Materials (BOM).
- In-house credit underwriting, lending, or card acquiring.
- Direct statutory filing on the GST portal (ShopBill generates audit-ready GSTR-1/3B data; filing remains with the taxpayer or CA).
- Proprietary locked hardware distribution.

---

## 4. Key Constraints

- **Platforms**: Chromium on Android 8+ (phone/tablet) and Windows 10/11 (Edge/Chrome desktop). Firefox/Safari best-effort.
- **Bundle & Performance Limits**: Max 300 KB gzipped JavaScript for the billing route, precache under 5 MB, and interactive load time under 2 seconds on budget Android hardware.
- **Hosting Budget**: Lightweight stateless FastAPI backend + PostgreSQL 16 + S3-compatible storage (MinIO for dev).
- **Architecture Boundaries**: Monorepo with strict package boundaries:
  - `apps/web`: React 18, Vite, Tailwind CSS, Zustand, Dexie, Web Workers, Workbox.
  - `apps/api`: FastAPI, SQLAlchemy 2, Pydantic v2, PostgreSQL 16+ with RLS.
  - `apps/worker`: Python/APScheduler background jobs for scheduled reports and reminders.
  - `packages/gst-engine`: Pure TypeScript calculations, validators, rounding, and invariants.
  - `packages/print-model`: Canonical print model and renderers (HTML, PDF, ESC/POS).
  - `packages/reports-core`: Deterministic workbook generators.
  - `packages/api-client`: Generated client from OpenAPI 3.1.
  - `packages/i18n`: Translations, Indian numeral formatting (`₹ 1,24,800.00`), and amount-in-words.

---

## 5. Success Criteria & Metrics

- [x] Reference test invoices match CA-verified calculations with zero mathematical discrepancies.
- [x] Onboarding to first printed bill under 10 minutes.
- [x] Product search p95 under 100 ms across 50,000 items.
- [x] Zero duplicate invoice numbers across tab concurrency or offline recovery.
- [x] 100% reconciliation between exported Excel workbooks and underlying database records.
- [x] AES-GCM local backup and restore round-trips without data corruption or loss.

---

## 6. Target User Roles & Permissions

| Role | Permissions |
|------|-------------|
| **Owner / Admin** | Complete access to billing, pricing, stock, ledgers, profit analytics, user management, day close, backup, and settings. |
| **Cashier (Staff)** | Access to POS billing terminal, held bills, customer lookup, cash/UPI collection, and day-close cash count. No access to purchase costs, net margins, or system reconfiguration. Cancel/return actions require Admin PIN. |
| **Accountant (CA View)** | Read-only access to sales, purchases, registers, ledgers, and on-demand generation of monthly GST packs and audit exports. |

---

## 7. Functional Requirements Traceability Matrix

### 7.1 Onboarding & Setup (`ONB-1` to `ONB-5`)
- `ONB-1`: 4-step wizard capturing shop identity, state, GSTIN, scheme, prefix, financial year, UPI ID, logo.
- `ONB-2`: Real-time GSTIN validation (Mod-36 checksum, format, and state code auto-detection).
- `ONB-3`: Built-in demo store mode with 1-tap clear.
- `ONB-4`: Product seeding via Excel/CSV template import.
- `ONB-5`: Storage persistence check via `navigator.storage.persist()`.

### 7.2 Product Catalogue & Master (`PRD-1` to `PRD-7`)
- `PRD-1`: Multi-lingual name, SKU, multiple barcodes, HSN/SAC, GST rate, unit, MRP, selling price, purchase price, tax-inclusive toggle, minimum stock.
- `PRD-2`: Virtualised product list with category, tax, and stock filters; search index in Web Worker.
- `PRD-3`: Bundled HSN/SAC master with turnover-based digit validation warnings.
- `PRD-4`: USB barcode burst detection and phone camera scanner with Code128/EAN-13 label generation.
- `PRD-5`: Bulk import/export with preview, row-level error reporting, and 24-hour undoable bulk updates.

### 7.3 Point of Sale & Billing (`POS-1` to `POS-11`)
- `POS-1`: Single-screen POS with search-as-you-type, keyboard shortcuts (`F1`–`F12`), cart line edits, and live tax computation.
- `POS-2`: Multi-bill hold and resume surviving browser crash or power cut.
- `POS-3`: Walk-in customer default, quick customer creation, and B2B GSTIN validation with Place of Supply logic.
- `POS-4`: Split tender payments (Cash, UPI QR, Card, Cheque, Credit/Udhaar) with tender/change calculation.
- `POS-5`: Atomic invoice commit and multi-format output (58mm/80mm thermal, A4/A5, PDF, WhatsApp share).
- `POS-6`: Sales returns against original invoice lines generating linked Credit Notes with restock/damaged disposition.
- `POS-7`: Immutable bills; cancellations require role authorisation and reason with full audit trail.
- `POS-8`: Quotation / Estimate mode convertible to Tax Invoice without duplicate inventory impact.

### 7.4 GST & Tax Engine (`GST-1` to `GST-8`)
- `GST-1`: Deterministic GST engine handling 0%, 0.25%, 3%, 5%, 12%, 18%, 28%, and Cess.
- `GST-2`: Intra-state (CGST + SGST/UTGST) vs Inter-state (IGST) automatic selection based on Supplier State vs POS.
- `GST-3`: Tax-inclusive back-calculation and tax-exclusive forward calculation.
- `GST-4`: Apportioned discounts at line and invoice levels.
- `GST-5`: Composition scheme Bill of Supply generation with mandatory statutory disclosures.
- `GST-6`: Rounding policy: half-up rounding at line items with explicit round-off adjustment line.
- `GST-7`: Comprehensive validation for GSTIN, PAN, and HSN.
- `GST-8`: Immutable snapshots of tax rate, HSN, and calculation engine version on each finalized invoice line.

### 7.5 Inventory & Stock (`STK-1` to `STK-5`)
- `STK-1`: Append-only `stock_movements` stream (sales, inward, returns, adjustments) and derived `stock_levels`.
- `STK-2`: Purchase bill entry with supplier invoice references, purchase tax, and cost tracking.
- `STK-3`: Stock adjustments with mandatory reason codes and manager PIN verification.
- `STK-4`: Low-stock indicators and reorder alerts.
- `STK-5`: Integrity reconciliation job rebuilds stock levels from movements on demand.

### 7.6 Customer & Supplier Khata (`LED-1` to `LED-5`)
- `LED-1`: Append-only `ledger_entries` for debits, payments, and credit adjustments.
- `LED-2`: Udhaar balance tracking with 30/60/90+ day ageing buckets.
- `LED-3`: Quick customer payment receipt with invoice allocation.
- `LED-4`: WhatsApp UPI payment reminder deep-link generation.
- `LED-5`: Supplier payables tracking and settlement.

### 7.7 Reports, Day Close & Backups (`RPT-1` to `RPT-7`, `SEC-1` to `SEC-6`)
- `RPT-1`: Daily sales, payment breakdown, stock register, and customer balance reports.
- `RPT-2`: 7-tab CA/GST Excel workbook (Summary, B2B, B2C Large/Small, CDNR, HSN, Docs Issued, Nil/Exempt).
- `RPT-3`: Day-close drawer audit: expected vs actual cash count, variance logging, and session lock.
- `SEC-1`: Local AES-256-GCM encrypted backup (`.shopbill.enc`) with PBKDF2/Argon2id key derivation.
- `SEC-2`: Cloud encrypted backup upload, listing, download, and retention.
- `SEC-3`: Tamper-evident audit logging with role-based access.

---

*Last updated: 2026-10-26 — Status: FINALIZED*
