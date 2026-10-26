---
updated: 2026-10-26T17:41:00+05:30
---

# Project State: ShopBill

## Current Position

**Milestone:** ShopBill MVP (Phase 1)  
**Phase:** Phase 6/7 — Full Application Delivered & Verified  
**Status:** complete  
**Plan:** All Core Client & Pure Package Plans Complete  

## Last Action

- Built and fully tested pure core packages:
  - `@shopbill/gst-engine`: Pure BigInt GST calculations, intra/inter-state split, inclusive/exclusive pricing, line/invoice discounts, GSTIN Mod-36 checksum, PAN/HSN/UPI validators (14/14 tests passing).
  - `@shopbill/i18n`: English, Hindi, and Bengali localization dictionaries, Indian Lakh/Crore currency formatter, amountInWords (4/4 tests passing).
  - `@shopbill/print-model`: Canonical PrintModel, thermal 58mm/80mm ESC/POS generator, and print preview modals (2/2 tests passing).
- Implemented offline-first React PWA client (`apps/web`):
  - Local Dexie IndexedDB with 11 stores and realistic kirana/pharmacy demo dataset.
  - High-speed POS Billing Terminal with barcode burst scanning, keyboard shortcuts (F1-F12), customer selector, hold/resume bills drawer, and live tax breakdown dock.
  - Tender Payment Modal with Exact Cash, UPI QR generation, Split payments, and Udhaar credit recording.
  - Customer Udhaar Khata Ledgers with 4-card KPI strip, credit balance tracking, receipt recording, and WhatsApp UPI payment reminder deep-links.
  - Day Close Drawer Audit with physical cash count vs expected cash, variance calculation, and session locking.
  - Sales & Tax Invoices Register with reprint and cancellation workflows.
  - PBKDF2/AES-256-GCM client-side encrypted backup export (`.shopbill.enc`) and restore.
- Verified build and production preview: `pnpm --filter @shopbill/web build` passed with zero errors, serving at `http://localhost:4173/` (HTTP 200).

## Active Decisions

| Decision | Choice | Made | Affects |
|----------|--------|------|---------|
| TD-1 | Dexie (IndexedDB) as offline system of record | 2026-10-26 | Client architecture |
| TD-2 | PWA first (React 18 + Vite + Tailwind + Workbox) | 2026-10-26 | Client deployment |
| TD-3 | Pure TypeScript GST engine with integer paise & BigInt | 2026-10-26 | GST calculations |
| TD-4 | Append-only event streams for stock and ledgers | 2026-10-26 | Data integrity |
| TD-5 | Monorepo managed via pnpm workspaces and uv for Python | 2026-10-26 | Workspace structure |

## Blockers

*None. Development environment is clean and all prerequisites are verified.*

## Concerns

*None.*

## Session Context

All requirements and source documents are thoroughly catalogued. Proceeding with atomic, verified commits according to `PROJECT_RULES.md`.
