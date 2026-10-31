# ShopBill 🧾🇮🇳

> **High-speed, offline-first GST billing, inventory management, and customer Khata (udhaar) ledger designed for Indian retail stores, kiranas, and pharmacies.**

[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue?logo=typescript)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18.3-61dafb?logo=react)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-6.4-646CFF?logo=vite)](https://vitejs.dev/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688?logo=fastapi)](https://fastapi.tiangolo.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-336791?logo=postgresql)](https://www.postgresql.org/)
[![Tests](https://img.shields.io/badge/Tests-20%2F20%20Passing-brightgreen)](https://vitest.dev/)
[![Offline PWA](https://img.shields.io/badge/PWA-100%25%20Offline%20First-success)](https://web.dev/progressive-web-apps/)

---

## ⚡ Highlights

* **100% Offline-First Architecture:** Runs entirely inside the browser using IndexedDB (Dexie). Bills can be created, saved, and printed even with zero internet connectivity.
* **Deterministic GST Engine (`@shopbill/gst-engine`):** Pure `BigInt` integer paise arithmetic. 0% floating-point math errors (`0.1 + 0.2 != 0.3`). Full support for intra/inter-state tax splitting (CGST/SGST vs IGST), cess, and statutory half-up rounding.
* **Sub-3-Second POS Terminal:** Rapid barcode scanning with burst detection, quick search (`Ctrl+K`), line quantity/pricing adjustments, and live right-dock tax breakdown.
* **Multi-Bill Hold & Resume:** Park pending bills when a customer picks up an extra item. Bills survive browser refreshes and accidental crashes.
* **Split & Digital Tenders:** Cash with exact change calculator, dynamic Indian UPI QR codes, split tender (Cash + UPI), and Udhaar credit recording.
* **Customer Khata Ledgers:** Customer balance tracking, payment receipt collection, and 1-click WhatsApp payment reminders with UPI ID links.
* **Day-Close Cash Drawer Audit:** Daily reconciliation comparing physical counted cash against recorded transactions with surplus/shortage variance tracking and session locking.
* **Multi-Format Receipt Printing:** Thermal 80mm/58mm ESC/POS formatting, A4/A5 full invoices, and raw receipt preview.
* **Bank-Grade Local Backups:** Client-side PBKDF2 (600,000 rounds) + AES-256-GCM encrypted backup export (`.shopbill.enc`) and 1-click restore.
* **Automated Stock PDF Upload & Parsing:** Fast client-side invoice parsing (`pdfjs-dist`) for Tally, Busy, and GST tax invoices. Auto-extracts product names, multi-line titles, 4-8 digit HSN codes, units, and rates with duplicate detection and stock incrementing.
* **1-Click Excel Inventory Export:** Instant `.xlsx` spreadsheet download (`Product_Stock_List_[Date].xlsx`) with auto-sized column widths, stock status flags, and tax rates.
* **Multilingual UI:** Instant 1-click switching between **English**, **हिन्दी (Hindi)**, and **বাংলা (Bengali)**.

---

## 🏗️ Repository Architecture

ShopBill is structured as a monorepo managed via `pnpm` and Python `uv`:

```text
billingtALLY/
├── apps/
│   ├── web/                          # Offline-first React 18 + Vite + Tailwind CSS PWA
│   │   ├── src/db/                   # Dexie IndexedDB (11 tables & Kirana/Pharmacy demo seed)
│   │   ├── src/state/cartStore.ts    # Zustand cart state with ACID checkout transactions (TR-CLI-1)
│   │   ├── src/pages/PosPage.tsx     # Single-screen billing terminal (F1-F12, scan burst, live tax dock)
│   │   ├── src/pages/ProductsPage.tsx# Catalogue, category filters, low stock alerts, Add/Edit modal
│   │   ├── src/pages/LedgersPage.tsx # Customer Khata, 4-card KPI strip, receipt collection, WhatsApp deep-link
│   │   ├── src/pages/ReportsPage.tsx # Day-close drawer reconciliation, sales register & reprints
│   │   └── src/pages/SettingsPage.tsx# Shop profile & PBKDF2/AES-256-GCM encrypted backup (.shopbill.enc)
│   └── api/                          # FastAPI cloud sync & backup backend (Python 3.12+, uv)
├── packages/
│   ├── gst-engine/                   # Pure BigInt GST calculation engine & Mod-36 GSTIN validators
│   ├── i18n/                         # English, Hindi, Bengali dictionaries & Indian Lakh/Crore formatter
│   └── print-model/                  # Canonical PrintModel with thermal 80mm/58mm ESC/POS renderer
├── infra/
│   └── docker-compose.yml            # PostgreSQL 16 (tenant RLS schema) + MinIO S3 backup store
├── shopbill_backend_schema.sql       # 16-table PostgreSQL DDL with Row-Level Security (RLS)
└── pnpm-workspace.yaml               # Workspace package linkage
```

---

## 🚀 Quick Start (Running in 60 Seconds)

### Prerequisites
* **Node.js:** v18.0.0 or higher (v20+ recommended)
* **pnpm:** v9.0.0 or higher (`npm install -g pnpm`)

### 1. Clone & Install Dependencies
```bash
git clone https://github.com/arnabsarkarcob321-design/shopbill.git
cd shopbill
pnpm install
```

### 2. Start the Application
```bash
pnpm --filter @shopbill/web dev
```
Open your browser and navigate to:  
👉 **`http://localhost:5173/`**

> **Note on Demo Mode:** The app starts preloaded with realistic Kirana and pharmacy demo inventory and debtor accounts under **Gupta Kirana Store**. You can click **"Demo Data Active"** in the header at any time to clear it and start with a fresh shop!

---

## ⌨️ POS Keyboard Shortcuts

| Shortcut | Action | Description |
| :--- | :--- | :--- |
| `F1` | **Billing POS** | Switch to the active billing terminal |
| `F2` | **Products** | Open the inventory catalogue |
| `F3` | **Khata Ledger** | Open customer credit ledgers |
| `F4` | **Hold Bill** | Park the current bill into the held queue |
| `F5` | **Settings** | Open shop profile and encrypted backup settings |
| `F10` | **Tender & Pay** | Open the payment modal (Cash, UPI QR, Split, Udhaar) |
| `Ctrl + K` | **Search** | Focus the global product search / barcode input |
| `Escape` | **Cancel / Close** | Close open modals or clear search |

---

## 🧪 Running Automated Tests

ShopBill includes a comprehensive unit test suite covering GST math, Indian Lakh/Crore formatting, and print models:

```bash
pnpm -r test
```

Test coverage includes:
* **`@shopbill/gst-engine` (14 tests):** GSTIN Mod-36 checksum, PAN/HSN/UPI validation, intra/inter-state tax splits, inclusive/exclusive pricing, line discounts, and half-up rounding.
* **`@shopbill/i18n` (4 tests):** Indian Lakh/Crore grouping (`₹ 1,24,800.00`), `amountInWords` in English, and Hindi/Bengali dictionaries.
* **`@shopbill/print-model` (2 tests):** Canonical `PrintModel` and thermal 80mm/58mm ESC/POS formatting.

---

## ☁️ Optional: Running Cloud Sync Backend & Database

If you wish to test the multi-device cloud synchronization backend and PostgreSQL database:

### Prerequisites
* **Docker Desktop** (running)
* **Python 3.11+** with **uv** (`pip install uv`)

### 1. Start PostgreSQL 16 & MinIO S3 Object Storage
```bash
docker compose -f infra/docker-compose.yml up -d
```
* **PostgreSQL:** Port `5432` (`shopbill` database with 16 tables and Row-Level Security loaded)
* **MinIO Storage Console:** Open `http://localhost:9001` (User: `minioadmin` | Pass: `minioadminpassword`)

### 2. Start the FastAPI Cloud Server
```bash
cd apps/api
uv run uvicorn src.main:app --reload --port 8000
```
Interactive OpenAPI documentation will be accessible at:  
👉 **`http://localhost:8000/docs`**

---

## 📦 Building for Production

To produce an optimized production bundle:
```bash
pnpm --filter @shopbill/web build
```
The compiled static assets will be located in `apps/web/dist/`. You can deploy this folder directly to any static host (Cloudflare Pages, Vercel, Firebase Hosting, Netlify, or Nginx).

---

## 📄 License
This project is open-source and available under the [MIT License](LICENSE).
