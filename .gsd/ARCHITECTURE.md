# Architecture Specification — ShopBill

> Complete architectural blueprint derived from TRD, APPFLOW, Backend Schema DDL, and Implementation Plan.

## 1. System Overview

ShopBill is built on an **offline-first PWA edge with a cloud sync backend**. The client device database (Dexie/IndexedDB) is the primary system of record while operating offline. The PostgreSQL cloud backend serves as replica hub, multi-device coordinator, reference data distributor, and encrypted backup vault.

```
┌──────────────────────────────────────────────────────────────────────────┐
│                        ShopBill PWA Client                               │
│                                                                          │
│  ┌───────────────────────┐   ┌────────────────────────────────────────┐  │
│  │    React 18 + UI      │   │          Zustand Cart State            │  │
│  │ (Tailwind + Lucide)   │◄──┤      (Live calculation & Drafts)       │  │
│  └───────────┬───────────┘   └───────────────────┬────────────────────┘  │
│              │                                   │                       │
│              ▼                                   ▼                       │
│  ┌───────────────────────┐           ┌───────────────────────┐           │
│  │  Domain Services      │           │  Pure GST Engine      │           │
│  │ (Billing, Stock,      │◄──────────┤ (Integer paise, BigInt│           │
│  │  Ledger, Numbering)   │           │  rates in basis pts)  │           │
│  └───────────┬───────────┘           └───────────────────────┘           │
│              │                                                           │
│              ▼                                                           │
│  ┌───────────────────────────────────────────────────────────────────┐   │
│  │           Atomic IndexedDB Transaction (Dexie.js)                 │   │
│  │ [Invoice + Lines + Payments + Stock Event + Ledger + Audit Log]   │   │
│  └───────────────────────────────────┬───────────────────────────────┘   │
│                                      │                                   │
│                                      ▼                                   │
│                        ┌───────────────────────────┐                     │
│                        │       Sync Outbox         │                     │
│                        └─────────────┬─────────────┘                     │
└──────────────────────────────────────┼───────────────────────────────────┘
                                       │ (HTTPS / Sync / Backup)
                                       ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                      FastAPI Backend Hub                                 │
│                                                                          │
│  ┌───────────────────────────────────────────────────────────────────┐   │
│  │  Routers (/v1/auth, /v1/reference, /v1/backups, /v1/sync)         │   │
│  └───────────────────────────────────┬───────────────────────────────┘   │
│                                      │                                   │
│                                      ▼                                   │
│  ┌───────────────────────────────────────────────────────────────────┐   │
│  │  Domain Services & Repositories (UUIDv7, Idempotency, RLS Context)│   │
│  └───────────────────────────────────┬───────────────────────────────┘   │
│                                      │                                   │
│                                      ▼                                   │
│  ┌───────────────────────────────────────────────────────────────────┐   │
│  │  PostgreSQL 16+ Database                                          │   │
│  │  - Tenant Isolation via Row-Level Security (`app.shop_id`)        │   │
│  │  - Append-Only Financial & Inventory Event Tables                 │   │
│  └───────────────────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────────────┘
```

## 2. Core Architectural Pillars

1. **One Canonical GST Engine (`packages/gst-engine`)**:
   - Pure, deterministic, zero React/DOM dependencies.
   - Money is integer paise (`*_paise`), tax rates are basis points (`*_bps`, 1800 = 18%), quantity is thousandths (`*_milli`).
   - Intermediate calculations use native `BigInt` to guarantee identical precision across all hardware.
2. **Atomic Bill Finalisation (`TR-CLI-1`)**:
   - Single IndexedDB transaction commits invoice header, line items, payment allocations, stock deduction events, customer khata ledger entries, device counter update, and audit record.
   - Any failure rolls back all effects simultaneously.
3. **Append-Only Event Sourcing for Stock & Khata**:
   - `stock_movements` and `ledger_entries` are immutable append-only event streams.
   - Current stock on hand and customer balances are derived projections and can be rebuilt on demand.
4. **Per-Device Document Series (`TRD TD-8`)**:
   - Offline numbering requires no network roundtrip. Each registered device maintains its series counter with cross-tab Web Locks.
5. **Single Source Print Model (`packages/print-model`)**:
   - Stored invoice snapshot maps directly to an immutable `PrintModel`.
   - Thin presentation renderers generate 58mm/80mm thermal ESC/POS, clean A4/A5 invoices, and vector PDFs.
6. **Multi-Tenant Security Baseline**:
   - Every tenant table in PostgreSQL contains `shop_id` guarded by PostgreSQL Row-Level Security (RLS) policies.
   - Request dependencies set the transaction-local `SET LOCAL app.shop_id = :shop_id`.
   - Access tokens use asymmetric EdDSA (Ed25519) signatures with rotation-tracked refresh token families.

---
