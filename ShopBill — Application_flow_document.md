# ShopBill — Application Flow & System Pipeline Document (APPFLOW)

*Offline-first GST billing, inventory, and Excel reporting for Indian shopkeepers · Version 1.0 · 26 October 2026 · Owner: Arnab Sarkar*

| Item | Detail |
| --- | --- |
| **Product** | ShopBill |
| **Status** | Draft v1.0 |
| **Companion Documents** | `PRD.md` (Product Requirements), `TRD.md` (Technical Requirements), `docs/SPEC.md`, `docs/GST_ASSUMPTIONS.md` |
| **Scope** | End-to-end user flows, screen navigation hierarchy, local transaction pipelines, Web Worker execution flows, and Phase 1–3 sync/cloud interactions |

---

## 1. Global Navigation & Screen Hierarchy (Sitemap)

ShopBill uses a responsive layout: a **Bottom Navigation Bar** (4 primary tabs + "More" drawer) on Android mobile screens, and a **Left Collapsible Rail + Function Key Ribbon** (`F1`–`F12`) on Windows Desktop.

### 1.1 Role-Based Screen Access Matrix

| Route / Screen | Screen Name | Owner / Admin | Cashier (Staff) | Accountant (CA View / Export) | Phase |
| --- | --- | --- | --- | --- | --- |
| `/welcome` | Language & Mode Selection | Full | — | — | 1 |
| `/setup/*` | 4-Step Onboarding Wizard | Full | — | — | 1 |
| `/pos` | **Point of Sale (Billing Terminal)** | Full | Full (Default Home) | Read-Only | 1 |
| `/pos/held` | Held Bills Drawer | Full | Full | — | 1 |
| `/pos/returns` | Credit Note / Sales Return Flow | Full | Restricted (PIN/Role) | View Only | 1 |
| `/products` | Product Catalogue & Stock List | Full | View & Price Check | View Only | 1 |
| `/products/import`| Bulk Excel/CSV Import & Undo | Full | — | — | 1 |
| `/stock/inward` | Purchase Entry & Stock Adjustment | Full | — | View Only | 1 |
| `/ledgers` | Customer (Udhaar) & Supplier Khata | Full | Add Sale / Receive Cash | Full | 1 |
| `/reports` | GST Pack & Excel Report Factory | Full | Day-Close Cash Only | Full | 1 |
| `/dashboard` | Business Insights & AI Assistant | Full | — | — | 1 (Dash) / 2 (AI) |
| `/settings/*` | Shop Profile, Series, Users, Backup | Full | — | — | 1 |

### 1.2 Navigation Architecture Diagram

```
[App Launch / Service Worker Init]
       │
       ├──► (No Shop Record in Dexie `meta`) ──► [/welcome] ──► [/setup/shop] ──► [/setup/catalog] ──► [/pos]
       │
       └──► (Shop Configured) ──► [PIN / Role Gate]
                                        │
        ┌───────────────────────────────┼───────────────────────────────┬──────────────────────────┐
        ▼                               ▼                               ▼                          ▼
  [Tab 1: POS]                  [Tab 2: Products]               [Tab 3: Udhaar/Khata]      [Tab 4: More / Admin]
  ├─ Active Cart                ├─ Virtualised Search           ├─ Customer Balances       ├─ Dashboard & Day Close
  ├─ Hold / Resume Drawer       ├─ Add / Edit Product Modal     ├─ Supplier Balances       ├─ Excel & GST Reports
  ├─ Customer / B2B Picker      ├─ Barcode Label Generator      ├─ Ageing Filter           ├─ Purchase Bills Inward
  ├─ Split Payment Modal        ├─ Excel Bulk Import/Export     ├─ Record Payment Modal    ├─ Credit Notes / Returns
  └─ Print / Share Sheet        └─ Stock Adjustment Modal       └─ WhatsApp UPI Reminder   └─ Settings, Backup & Sync
```

---

## 2. Flow 1: First-Run Onboarding & Storage Initialization

**Goal:** Complete setup and print the first test bill in under 10 minutes (`ONB-1` to `ONB-5`, `TR-CLI-3`).

### 2.1 Step-by-Step Flow

1. **App Boot & PWA Shell Load:**
   - Workbox precaches the application shell and bundled subsetted WOFF2 fonts (`Noto Sans Devanagari` and `Noto Sans Bengali` — `TR-CLI-9`).
   - App queries Dexie `meta` store for key `onboarding_complete`. If `false` or absent, routes to `/welcome`.
2. **Step 1 — Language & Mode (`/welcome`):**
   - User selects primary UI language: **English**, **हिन्दी (Hindi)**, or **বাংলা (Bengali)**.
   - User chooses between:
     - **"Start My Shop"** (Production setup)
     - **"Try Demo Shop"** (`ONB-3`: loads 50 sample kirana/medical items, 5 sample bills, and sets a persistent top banner with a 1-tap *"Clear Demo & Start Real Shop"* button).
   - ** Sign-in / Restore Option:** *"Lost your phone or switching devices? Restore from Cloud or Local Backup"* (Routes to Flow 9).
3. **Step 2 — Shop & Tax Identity (`/setup/shop`):**
   - **Storage Persistence Request (`TR-CLI-3`):** Immediately upon entering setup, the client invokes `navigator.storage.persist()`.
     - *If granted:* Silent badge *"Offline Safe Storage Active"*.
     - *If denied:* Non-blocking warning banner alerting user to avoid clearing browser site data and enabling daily reminders for local backup.
   - **Inputs:** Shop Name, Address, Phone, Tax Scheme (`Regular`, `Composition`, `Unregistered`).
   - **GSTIN Validation (`ONB-2`, `GST-7`):**
     - If `Regular` or `Composition` is selected, GSTIN input is shown.
     - As the user types the 15-character GSTIN, the pure validator (`packages/gst-engine`) verifies the regex format, computes the Modulo-36 checksum digit, extracts the first 2 digits, and auto-populates the **Shop State** (e.g., `19` → `West Bengal`).
   - **Series & UPI Setup:** Invoice Prefix (defaults to `SB/26-27/`), Financial Year start (`April`), and Shop UPI ID (`name@bank`) for dynamic QR generation.
4. **Step 3 — Product Seeding (`/setup/catalog`):**
   - User picks one of three fast-start paths:
     - **Option A: Upload Excel/CSV (`ONB-4`, `PRD-5`):** Download template or select existing sheet → parsed in **Import Web Worker** → row-by-row validation preview → bulk insert into `products` and `stock_levels`.
     - **Option B: Quick Category Pack:** Pre-populate common unpriced HSN-mapped item templates (Kirana, Medical, Hardware, Garments) where the user just keys in selling prices during billing.
     - **Option C: Skip & Add on the Fly:** Proceed directly to POS.
5. **Step 4 — Test Bill & Printer Check (`/setup/test-print`):**
   - Generates a dummy ₹1.00 sample receipt (excluded from real numbering series).
   - User tests **Thermal 58mm/80mm**, **A4 Print**, or **WhatsApp PDF Share**.
   - Marks `meta.onboarding_complete = true` and redirects to `/pos`.

---

## 3. Flow 2: Core Counter Sale (POS Billing Pipeline)

**Goal:** Issue an accurate GST invoice in under 30 seconds (`POS-1` to `POS-5`, `GST-1` to `GST-8`, `TR-CLI-1`).

### 3.1 Screen Layout (`/pos`)
- **Top Bar:** Active Bill Tabs (`Bill #1`, `Bill #2 [Held]`, `+ Hold New`), Sync/Offline Status Indicator, Customer Selector Pill (defaults to `Walk-in Customer`).
- **Search & Scan Bar:** Auto-focused input supporting barcode burst detection (`TR-CLI-10`), voice mic icon (`POS-11` Phase 2), and fuzzy multi-script search (`TR-CLI-5`).
- **Centre Canvas:** Virtualised Cart Line List showing Item Name, HSN, Unit, Qty stepper, Unit Price, Line Discount (`%` or `₹`), GST Rate badge, and Line Total.
- **Bottom / Right Dock:** Live Tax Summary (Taxable Value, CGST+SGST or IGST, Cess, Round-off), Invoice-level Discount input, Grand Total in large font, and two primary CTAs: **[F9: Collect Payment]** and **[F10: Quick Cash Print]**.

### 3.2 Interactive & Background Pipeline

```
[Barcode Scan / Search Input]
       │
       ├──► (Hardware USB Scanner: Keystrokes < 30ms apart + Enter)
       │         └──► O(1) Map Lookup in Search Web Worker by Barcode
       │
       ├──► (Camera Scan: BarcodeDetector API / ZXing WASM fallback)
       │         └──► O(1) Map Lookup by Barcode
       │
       └──► (Typed Text: English / Hindi / Bengali / Phonetic)
                 └──► MiniSearch Index in Web Worker (<100ms at 50k items)
                           │
                           ▼
               [Add / Increment Line in Zustand Cart]
                           │
        ┌──────────────────┴──────────────────┐
        ▼                                     ▼
[Debounced Autosave <= 300ms]        [Pure GST Engine Calculation]
Writes cart snapshot to              (`packages/gst-engine`)
Dexie `held_bills` (TR-CLI-2)        Computes integer paise math (GST-5)
```

### 3.3 Detailed Step-by-Step Execution

1. **Adding Items to Cart:**
   - **Scan Match (Single Product):** Plays a crisp 80ms audio beep, adds 1 unit (or increments quantity if already in cart).
   - **Scan Match (Multiple Batches/MRPs — Phase 2 `POS-9`):** Opens a fast keyboard-navigable popover sorted by **Earliest Expiry First (FEFO)**.
   - **Unrecognised Barcode:** Prompts a 3-field inline drawer (*"Barcode not found: Enter Name, Price, GST % to add & bill immediately"*).
2. **Inline Line Modifications & Live GST Engine (`GST-1` to `GST-8`):**
   - Every change to quantity, unit price, tax-inclusive toggle, line discount, invoice discount, or customer state triggers a synchronous call to `calculateInvoice(cart, shopConfig, customer)` in `packages/gst-engine`.
   - **Integer Math Pipeline (`TD-4`, `GST-5`):**
     1. Convert unit price to integer paise, quantity to integer thousandths (`1.500 kg` = `1500`).
     2. If item is `tax_inclusive = true` (MRP billing — `GST-3`), reverse-calculate line gross before tax using `BigInt` intermediates:
        $$\text{Taxable}_{\text{line}} = \text{round\_half\_up}\left(\frac{\text{NetInclusivePaise} \times 10000}{10000 + \text{RateBps}}\right)$$
     3. Apportion any invoice-level discount proportionally across taxable lines before applying tax (`GST-4`).
     4. Determine **Place of Supply (`GST-2`):**
        - If `shop.tax_scheme === 'COMPOSITION'`, switch document type to **Bill of Supply (`GST-6`)** and set all tax rates to `0`.
        - Else if `place_of_supply_state === shop.state`, split tax equally into **CGST** and **SGST** (or **UTGST** for Union Territories).
        - Else apply **IGST**.
     5. Round each tax component half-up to the nearest paisa. Sum all lines, compute explicit `round_off_paise` to the nearest rupee (`±50 paise`), and verify invariant:
        $$\text{GrandTotal}_{\text{paise}} = \text{TotalTaxable}_{\text{paise}} + \text{CGST}_{\text{paise}} + \text{SGST}_{\text{paise}} + \text{IGST}_{\text{paise}} + \text{Cess}_{\text{paise}} + \text{RoundOff}_{\text{paise}}$$
   - Clicking the `[i]` icon next to the tax total opens the **"How was this calculated?" modal (`GST-8`)**, displaying the exact formula, HSN code snapshot, and slab applied per line.
3. **Customer & B2B Attachment (`POS-3`):**
   - Default is `Walk-in Customer` (B2C, intra-state).
   - User can search customer by Phone/Name or quick-add.
   - If **B2B Toggle** is enabled: requires a valid 15-digit Customer GSTIN (`GST-7`), auto-fills Place of Supply state from the GSTIN prefix, and allows manual Place of Supply override with a mandatory reason dropdown.
4. **Payment Collection (`POS-4`):**
   - User taps **[Collect Payment]** (or **[Quick Cash]** which skips the modal assuming 100% cash tendered).
   - **Payment Modal Modes:**
     - **Cash:** Quick denomination chips (`₹50`, `₹100`, `₹500`, `Exact`) → auto-calculates **Change to Return**.
     - **UPI QR:** Renders a dynamic offline EMVCo-compliant UPI QR (`upi://pay?pa={shopUpi}&pn={shopName}&am={totalRupees}&tn={billNumber}`) on screen for the customer to scan.
     - **Credit (Udhaar):** Requires a named customer (blocks `Walk-in`). Shows customer's *Current Due + This Bill = New Total Due*.
     - **Split Payment:** Allows combining e.g. `₹500 Cash` + `₹350 UPI` + `₹200 Credit (Balance Due)`.
5. **Atomic Finalisation Transaction (`POS-5`, `TR-CLI-1`, `TR-CLI-4`):**
   - When the user clicks **[Finalise & Print]**, the `BillingService` acquires a cross-tab **Web Lock** (`navigator.locks.request('invoice_counter_lock')` — `TR-CLI-4`) and opens a single atomic **Dexie IndexedDB Transaction** across `counters`, `invoices`, `invoice_lines`, `payments`, `stock_movements`, `stock_levels`, `ledger_entries`, `held_bills`, `audit_log`, and `outbox`.
   - **Inside the Transaction (Zero non-IDB awaits allowed — `TR-CLI-1`):**
     1. Read & increment `counters` for `[deviceSeries + docType + currentFY]` (e.g., `A-2627-00042` — `DOC-2`, `TD-8`).
     2. Write immutable `invoices` record and `invoice_lines` records (storing a snapshot of HSN, tax rate, and product name at the moment of sale — `GST-1`).
     3. Write `payments` records for each tender mode used.
     4. Write append-only `stock_movements` (`type: 'SALE'`, negative quantity) and decrement derived `stock_levels` (`TD-5`).
     5. If customer is attached, write `ledger_entries` (`DEBIT` for invoice total, `CREDIT` for amount paid now).
     6. Delete the active draft from `held_bills`.
     7. Write `audit_log` entry (`INVOICE_CREATED`) and queue transaction bundle into `outbox` (`TD-6`).
   - **Post-Transaction (Outside IDB Commit):**
     1. Release Web Lock and post message on `BroadcastChannel('shopbill_db_change')` so any open Inventory or Dashboard tabs update instantly (`TR-CLI-4`).
     2. Build the canonical `PrintModel` (`packages/print-model` — `TD-9`) and trigger the selected output renderer:
        - **Thermal 58mm/80mm:** Browser print dialog (Phase 1) or direct WebUSB/Web Bluetooth ESC/POS byte stream (Phase 2 — `DOC-5`).
        - **A4/A5 PDF:** Renders tax invoice with HSN summary table, UPI QR, and Indian system amount-in-words (`"Rupees One Thousand Two Hundred Fifty Only"` — `DOC-4`).
        - **WhatsApp Share:** Uses Web Share API (`navigator.share`) with generated PDF file or opens `wa.me/91{phone}` with formatted text summary.
     3. Reset POS screen to a fresh empty cart in under 150ms for the next customer in queue.

---

## 4. Flow 3: Hold/Resume, Quotations, Returns & Cancellations

**Goal:** Prevent counter bottlenecks and ensure tamper-proof post-bill adjustments (`POS-2`, `POS-6` to `POS-8`, `DOC-1`, `DOC-2`).

### 4.1 Hold & Crash Recovery Flow (`POS-2`, `TR-CLI-2`)
1. Every cart modification debounces (300ms) a write to `held_bills` with `status: 'ACTIVE_DRAFT'`.
2. If a customer forgets their wallet or needs to fetch another item, the cashier taps **[Hold Bill (F6)]**:
   - Current cart is marked `status: 'HELD'` with a timestamp and optional note/customer name.
   - A new blank cart opens immediately.
3. **Power Cut / Browser Crash Recovery:**
   - On next app launch, `BillingService` inspects `held_bills` for any `ACTIVE_DRAFT`.
   - Automatically restores the exact cart lines, discounts, and selected customer with a toast: *"Restored unsaved bill from 14:22"*.

### 4.2 Quotations / Estimates Flow (`POS-8`, `DOC-1`)
1. Cashier toggles the POS mode switch from **Tax Invoice** to **Estimate / Quotation**.
2. Finalising generates a number from the `EST` series (e.g., `EST-2627-0012`) and prints/shares the quotation.
3. **Zero Side Effects:** Neither `stock_movements` nor `ledger_entries` are touched.
4. Later, from `/pos/estimates`, the user clicks **[Convert to Tax Invoice]** → loads all items into the live POS cart for instant finalisation.

### 4.3 Sales Return & Credit Note Flow (`POS-6`, `POS-7`)
1. User navigates to **Invoices**, selects the original finalised invoice, and taps **[Issue Return / Credit Note]**.
2. **Role Check:** If logged in as Cashier and returns are restricted, prompts for Owner 4-digit PIN (`SEC-1`).
3. **Return Selection Screen:**
   - Displays original invoice lines with original snapshot prices, discounts, and GST rates.
   - User enters **Return Qty** (cannot exceed original billed qty minus prior returned qty).
   - For each returned line, user selects **Stock Disposition:**
     - `Restock to Inventory` (adds positive `SALES_RETURN_RESTOCK` movement).
     - `Damaged / Expired` (adds `SALES_RETURN_DAMAGED` movement; does not increase sellable stock).
   - User selects **Settlement Mode:** `Adjust Against Customer Udhaar`, `Cash Refund`, or `UPI Refund`.
4. **Atomic Commit:**
   - Generates a sequential **Credit Note** (`CN-2627-0005`) linked to `original_invoice_id`.
   - Reverses exact proportional CGST/SGST or IGST and invoice-level discount from the original snapshot.
   - Appends stock movements, ledger credit entry, and `audit_log` entry.

### 4.4 Invoice Cancellation (`POS-7`, `DOC-2`)
1. Finalised invoices **cannot be edited or deleted**.
2. An Owner can tap **[Cancel Invoice]**, select a mandatory reason (`Data Entry Mistake`, `Customer Refused`, `Duplicate`), and confirm.
3. The invoice number stays permanently in the sequence marked `CANCELLED` (preserving gap-free numbering for GST audits — `DOC-2`), and reverse entries are appended to `stock_movements` and `ledger_entries`.

---

## 5. Flow 4: Product Catalogue, Bulk Excel Import & Stock Management

**Goal:** Manage up to 50,000 SKUs with sub-100ms search and immutable stock tracking (`PRD-1` to `PRD-5`, `STK-1` to `STK-5`, `TR-CLI-5`).

### 5.1 Product Creation & HSN Validation (`/products`)
1. User clicks **[+ Add Product]** (or presses `Alt+N`).
2. **Fast Entry Form (`PRD-1`):**
   - **Name (English)** & **Local Language Name** (auto-transliterated suggestion or voice input).
   - **Barcodes:** Scan one or more barcodes into the multi-value chip input, or click **[Generate Barcode (`PRD-4`)]** to auto-assign a unique internal `Code128` / `EAN-13` code and print sticker labels on A4 or thermal roll.
   - **HSN/SAC Auto-Suggest (`PRD-3`):** Typing "biscuit" or "1905" searches the bundled offline HSN master (`TR-API-2` reference bundle). Automatically populates the standard **GST Rate** (`18%`) and displays a warning badge if the HSN length is shorter than required by the shop's annual turnover tier (e.g., 4 or 6 digits).
   - **Pricing:** `MRP`, `Selling Price`, `Tax Inclusive / Exclusive Toggle`, `Purchase Price`, `Opening Stock`, and `Low Stock Alert Level`.
3. Saving writes the `products` record, posts an `OPENING_STOCK` movement in `stock_movements` if opening stock > 0, and sends an incremental update message to the **Search Web Worker**.

### 5.2 Bulk Excel/CSV Import & Bulk Price Edit (`PRD-5`)
```
[User Selects .xlsx / .csv File]
       │
       ▼
[Import Web Worker (Off-Main-Thread)]
  ├─ Validates columns, HSN format, GST slabs (0, 0.25, 3, 5, 18, 40%), integer paise conversion
  ├─ Detects SKU / Barcode duplicates against existing Dexie products
  └─ Returns { validRows[], errorRows[{ rowNum, field, reason }], summary }
       │
       ▼
[Import Preview Modal (UI)]
  ├─ Option to Download Error Report (.xlsx) for failed rows
  └─ [Confirm Import of N Valid Products]
       │
       ▼
[Dexie Bulk Transaction + Rebuild Search Index in Worker]
```
- **Bulk Price / GST Update with Undo:** When updating prices or GST slabs across a category, `StockService` stores a pre-update snapshot in `audit_log` so the owner can tap **[Undo Bulk Change]** within 24 hours.

### 5.3 Purchase Entry & Stock Adjustment (`/stock/inward`)
1. **Purchase Bill Entry:** Select Supplier → Enter Supplier Invoice No. & Date → Add items with Purchase Price, Qty, and (Phase 2) Batch No. & Expiry Date → Saves a `PURCHASE_INWARD` movement and credits the Supplier Ledger.
   - *Phase 2 Enhancement:* Tap **[Scan Purchase Bill Photo]** → uploads compressed image to `POST /v1/purchases/draft-from-image` → Gemini OCR extracts line items into a draft purchase bill for human confirmation.
2. **Stock Audit / Adjustment:** For breakage, theft, or manual count mismatches, owner records a `STOCK_ADJUSTMENT` movement with a mandatory reason tag (`Damaged`, `Expired`, `Count Correction`).

---

## 6. Flow 5: Customer Udhaar (Credit Ledger) & Recovery Pipeline

**Goal:** Replace paper notebooks with automated ageing and 1-tap UPI recovery (`LED-1` to `LED-5`).

### 6.1 Ledger & Ageing View (`/ledgers`)
1. Displays two tabs: **Customers (Receivables / Udhaar)** and **Suppliers (Payables)**.
2. **Summary Header:** Total Market Udhaar to Collect, split by ageing buckets: `0–15 Days`, `16–30 Days`, `30+ Days Overdue`.
3. Clicking a customer opens their **Khata Timeline**:
   - Chronological append-only list of Credit Bills (`DEBIT`) and Payments Received (`CREDIT`) with running balance derived from `ledger_entries`.

### 6.2 Payment Reminder & Settlement Flow
1. Owner taps **[Send Payment Reminder]** on an overdue customer.
2. App generates a polite message in the customer's preferred language (English, Hindi, or Bengali):
   > *"Namaste {CustomerName}, your pending balance at {ShopName} is ₹{Amount}. Click here to pay via UPI: {upiPayLink}. Thank you!"*
3. Owner shares via **WhatsApp** (Phase 1 local intent; Phase 2 automated via `POST /v1/messages` once customer consent is logged in `/v1/consents`).
4. When the customer pays (partial or full), owner taps **[Record Payment Received]** → enters amount & mode (`Cash` / `UPI`) → appends a `CREDIT` ledger entry and prints/shares a Payment Receipt.

---

## 7. Flow 6: Day Close, Excel Report Factory & CA Handoff

**Goal:** Reconcile daily cash and deliver 100% accurate GST workbooks without manual spreadsheet work (`RPT-1` to `RPT-7`, `TD-10`).

### 7.1 End-of-Day Cash Drawer Reconciliation (`/dashboard/day-close`)
1. At shop closing time, owner opens **Day Close**.
2. Screen shows system totals for today:
   - `Opening Cash` + `Cash Sales` + `Udhaar Cash Recoveries` − `Cash Refunds / Expenses` = **Expected Drawer Cash**.
   - **UPI / Bank Total** and **New Credit (Udhaar) Issued Today**.
3. Owner enters **Actual Physical Cash Counted** → logs any shortage/excess to `audit_log` and triggers the Daily Excel Summary export.

### 7.2 On-Demand Browser Report Pipeline (Phase 1 — `TD-10`)
```
[User Selects Date Range & Report Type in /reports]
       │
       ▼
[ReportService Queries Dexie Read Snapshot]
       │
       ▼
[Excel Web Worker (`packages/reports-core`)]
  ├─ Runs pure ReportBuilder (verifies Σ Line Totals == Invoice Headers == Tax Summary)
  ├─ Generates multi-sheet .xlsx workbook with house styling, frozen headers, Indian number formats
  └─ Returns Blob URL to Main Thread (bounded memory < 50MB)
       │
       ▼
[User Downloads .xlsx or Shares Directly to CA on WhatsApp / Email]
```

### 7.3 The Monthly CA GST Pack Contents (`RPT-4`, `RPT-5`)
Generating the **Monthly CA Pack** produces a single reconciled `.xlsx` workbook containing 7 tabs:
1. `Summary & Reconciliation`: Total turnover, taxable value, CGST, SGST, IGST, Cess, Credit Notes net-off, and reconciliation check status (`PASS`).
2. `B2B Invoices`: GSTIN-wise invoice register ready for GSTR-1 Table 4A.
3. `B2C Large & Small`: State-wise and rate-wise consolidated B2C sales (GSTR-1 Table 5 & 7).
4. `Credit & Debit Notes`: Linked to original invoice numbers (GSTR-1 Table 9B).
5. `HSN Summary`: HSN/SAC-wise quantity, UQC, taxable value, and tax split (GSTR-1 Table 12).
6. `Document Issued Summary`: Series-wise start number, end number, total issued, cancelled count, and net issued (GSTR-1 Table 13).
7. `Cancelled & Nil/Exempt Register`: Complete audit list of cancelled numbers and exempt supplies.

*(In Phase 2, the server `apps/worker` runs this exact pipeline automatically on a cron schedule in `Asia/Kolkata` (`TR-API-7`) and emails/WhatsApps the signed pre-signed download link (`TR-API-8`) to the shop's CA).*

---

## 8. Flow 7: Offline Sync, Conflict Resolution & Reference Updates

**Goal:** Zero lost bills, idempotent multi-device sync, and zero-downtime tax slab updates (`SYN-1` to `SYN-5`, `TD-6`, `TD-7`, `TD-12`, `TR-CLI-11`).

### 8.1 Transaction Bundle Outbox Sync (Phase 2 — `TD-6`, `TR-CLI-11`)

```
[Local Device (Dexie Outbox)]                                    [FastAPI Backend (/v1/sync)]
              │                                                                │
              │  1. Trigger: Online Event / Bill Finalised / 60s Timer         │
              │  POST /v1/sync/push (Batch <= 500 ops, Idempotency-Key)        │
              ├───────────────────────────────────────────────────────────────►│
              │                                                                ├─► Verify EdDSA Device JWT
              │                                                                ├─► Re-verify Invoice Math via Python GST Engine (TD-3)
              │                                                                ├─► Apply in PostgreSQL with Row-Level Security (TD-11)
              │                                                                ├─► Resolve Master Data Conflicts via HLC (TD-7)
              │  2. 200 OK { acked_op_ids[], server_cursor, conflicts[] }      │
              │◄───────────────────────────────────────────────────────────────┤
              ├─► Mark `outbox` ops as SYNCED                                  │
              │                                                                │
              │  3. GET /v1/sync/pull?cursor={last_cursor}                     │
              ├───────────────────────────────────────────────────────────────►│
              │◄───────────────────────────────────────────────────────────────┤
              └─► Apply remote bundles in Dexie & rebuild derived `stock_levels`
```

- **Conflict Resolution Rules (`TD-5`, `TD-7`, `TD-8`):**
  - **Invoices, Payments, Stock Movements, Ledger Entries:** Append-only with UUIDv7 IDs and per-device invoice series (`A-`, `B-`). Never conflict across devices.
  - **Master Data (Products, Parties):** Last-Write-Wins ordered by **Hybrid Logical Clock (HLC)** timestamp so an inaccurate mobile clock cannot overwrite newer changes.

### 8.2 Signed Reference Data Updates (`GST-1`, `TD-12`)
1. On app launch or background sync, client calls `GET /v1/reference/manifest` with `If-None-Match: {etag}`.
2. If the Government announces a GST slab or HSN update, the server returns a new signed bundle (`/v1/reference/tax-rates` or `/v1/reference/hsn`).
3. Client verifies the cryptographic signature, stores the new effective-dated rates in Dexie `meta`, and applies them automatically on the effective date without requiring an app update.

---

## 9. Flow 8: AI Business Assistant Flow (Phase 2)

**Goal:** Provide grounded natural-language insights in English, Hindi, or Bengali without hallucinating numbers (`DSH-1` to `DSH-4`, `TD-13`).

1. Owner opens `/dashboard` and taps the **Ask ShopBill AI** bar (text or voice in Hindi/Bengali/English), e.g., *"पिछले महीने किस आइटम में सबसे ज़्यादा मुनाफ़ा हुआ और किसका स्टॉक कम है?"* (*"Which item gave the highest profit last month and what is low in stock?"*).
2. Client sends `POST /v1/assistant/query` with the user prompt and language code.
3. **Backend Guardrail Pipeline (`TD-13`):**
   - FastAPI invokes the **Gemini API** exclusively on the server using **Function Calling** restricted to read-only, tenant-scoped SQL tools (`get_top_products`, `get_low_stock`, `get_overdue_ledgers`, `get_sales_summary`).
   - Gemini selects the tool parameters → backend executes the query against PostgreSQL (isolated by RLS for `shop_id`) → returns structured JSON rows to Gemini.
   - **Numeric Grounding Verifier:** Before returning the natural-language answer to the client, the backend verifies that every currency/quantity figure in the response matches a number present in the tool output payload, and attaches the raw data table card alongside the chat response.

---

## 10. Flow 9: Backup, Device Loss Recovery & Security Lifecycle

**Goal:** Protect business history against phone loss, hardware failure, or staff tampering (`SEC-1` to `SEC-6`, `TR-API-2`, `TR-API-8`).

### 10.1 Local & Cloud Encrypted Backup Flow (`SYN-4`, `TR-API-8`)
1. **Local Backup (Phase 1):**
   - User taps **[Export Encrypted Backup]** in `/settings/backup` (also prompted automatically every evening at Day Close).
   - Worker serialises all Dexie stores into a compressed JSON snapshot, encrypts it using **AES-256-GCM** with a key derived from the owner's Backup Passphrase (`PBKDF2` / `Argon2id` in Web Worker), and downloads a `.shopbill.enc` file to the phone/PC or shares it to Google Drive / WhatsApp Self-Chat.
2. **Cloud Backup (Phase 1 API / Phase 2 Automated):**
   - Client uploads the encrypted snapshot via `POST /v1/backups`, which stores it in S3-compatible object storage namespaced by `shop_id` (`TR-API-8`).

### 10.2 Lost Device Restore Flow (Journey 7)
1. Shopkeeper buys a new phone, opens ShopBill PWA, and clicks **[Restore Existing Shop]** on `/welcome`.
2. **Two Restore Paths:**
   - **Cloud Restore:** Log in with Shop Phone/Email + Password (`POST /v1/auth/login`) → fetch latest backup via `GET /v1/backups/{id}/download` (10-minute pre-signed URL) → enter Backup Passphrase → decrypts and populates all Dexie stores.
   - **Offline File Restore:** Select the `.shopbill.enc` file from device storage → enter Backup Passphrase → decrypts and populates Dexie completely offline.
3. Device registers a new `device_id` (`POST /v1/devices`) and gets assigned a fresh invoice series prefix (or safely advances the counter sequence beyond the highest restored invoice number) so no duplicate invoice numbers can ever be emitted.
4. Owner can revoke the lost phone's refresh token family via `POST /v1/users/{id}/revoke-devices` (`TR-API-2`).

---

## 11. Edge Cases & Error Recovery Matrix

| Scenario | System Behaviour & Recovery Flow | Requirement Ref |
| --- | --- | --- |
| **Power cut or battery dies mid-bill** | Every line edit is debounced (≤ 300ms) to `held_bills`. On reboot, the exact cart is restored automatically. | `POS-2`, `TR-CLI-2` |
| **Power cut during [Finalise & Print]** | IndexedDB transaction (`TR-CLI-1`) is strictly atomic: either all 9 stores commit together or 100% rolls back. If committed before power died, the bill appears at top of Recent Bills with a 1-tap **[Reprint]** button on reboot. | `TR-CLI-1` |
| **Two browser tabs open on same PC** | `Web Locks API` serialises counter increments (`TR-CLI-4`), preventing duplicate invoice numbers. `BroadcastChannel` updates stock and bill lists across tabs immediately. | `TR-CLI-4` |
| **Browser storage quota reaches 80%** | App displays a persistent banner warning (`TR-CLI-3`) and prompts a 1-tap Backup & Archive of old cached report blobs. | `TR-CLI-3` |
| **Service Worker update available mid-rush** | Workbox downloads the new version in the background (`TR-CLI-7`) but suppresses activation while any cart has items (`held_bills.count > 0`). Applies cleanly on next idle launch. | `TR-CLI-7` |
| **Thermal printer disconnects mid-print** | Invoice is already safely committed in Dexie. Print modal catches WebUSB/Bluetooth error and immediately offers fallback to **Browser Print / WhatsApp PDF Share** without re-billing. | `DOC-5`, `TD-9` |