# ShopBill — UI/UX Design Brief & Design System Specification

*Offline-first GST billing, inventory, and Excel reporting for Indian shopkeepers · Version 1.0 · 26 October 2026 · Owner: Arnab Sarkar*

| Item | Detail |
| --- | --- |
| **Product** | ShopBill |
| **Status** | Draft v1.0, ready for design & frontend implementation |
| **Visual Reference** | "Smart Ledger" High-Clarity Fintech & Accounting Dashboard (`GF.jpeg`) |
| **Companion Documents** | `PRD.md`, `TRD.md`, `docs/APPFLOW.md`, `docs/SPEC.md` |
| **Target Frameworks** | React 18, Tailwind CSS, Lucide Icons, Noto Sans (Latin, Devanagari, Bengali) |

---

## 1. Design Philosophy & Visual Direction

Based on the provided reference (`GF.jpeg`) and the operational realities of Indian retail counters, ShopBill’s UI/UX follows a **"High-Trust, Zero-Clutter Fintech"** aesthetic. Unlike legacy Windows accounting software (grey, dense, intimidating) or oversimplified mobile apps (lacking desktop keyboard speed), ShopBill blends **enterprise-grade financial clarity** with **consumer-grade approachability**.

### 1.1 Core Design Principles

1. **Color-Coded Financial Semantics (From Reference):**
   * Numbers never float in isolation. Every financial figure is anchored by a semantic colour: **Royal Blue** for total billed/turnover, **Emerald Green** for cash received/paid/in-stock, **Amber/Orange** for pending udhaar/low stock/holds, and **Crimson Red** for overdue/expired/cancelled.
2. **High-Contrast Dark Navigation vs. Airy Workspace:**
   * A deep navy-slate left navigation rail (`#0F172A`) grounds the application on desktop and reduces eye strain during 12-hour counter shifts, while the main canvas uses a cool alabaster background (`#F8FAFC`) with pure white (`#FFFFFF`) elevated cards and subtle `1px` borders (`#E2E8F0`).
3. **Speed-First Dual Modality (Keyboard + Touch):**
   * **On Windows PCs:** Every primary action is reachable via `F1`–`F12` shortcuts, `Ctrl+K` global command search, and `Tab`/`Enter` focus rings without touching the mouse.
   * **On Android Phones:** Minimum `48x48px` touch targets, thumb-zone bottom navigation, and bottom-sheet drawers instead of complex multi-column tables.
4. **Always-Visible System Trust Indicators:**
   * Inspired by the *"Ledger Auto-Updated • Live"* and *"Demo Data Mode"* badges in the reference UI, ShopBill surfaces **Offline Storage Safety**, **Sync Outbox Status**, and **Demo Mode** as calm, reassuring status pills in the top header.
5. **Multilingual Script Harmony (`LOC-1`, `TR-CLI-9`):**
   * Hindi (Devanagari) and Bengali scripts have taller ascenders/descenders than Latin text. Line heights, badge paddings, and table row heights are engineered so switching languages never clips glyphs or breaks card grids.

---

## 2. Color System & Design Tokens (Tailwind CSS Mapped)

Extracted directly from the reference image and calibrated for WCAG AA contrast compliance on low-end LCD monitors and budget Android screens.

### 2.1 Surface & Structural Palette

| Token Name | Hex Code | Tailwind Equivalent | Usage in ShopBill |
| --- | --- | --- | --- |
| `--bg-canvas` | `#F4F7FE` / `#F8FAFC` | `bg-slate-50` | Main application background behind cards |
| `--bg-surface` | `#FFFFFF` | `bg-white` | Primary cards, data tables, modals, POS cart table |
| `--bg-sidebar` | `#0F172A` | `bg-slate-900` | Left navigation rail on Desktop / Drawer header on Mobile |
| `--bg-sidebar-hover` | `#1E293B` | `bg-slate-800` | Inactive sidebar item hover state & bottom promo card |
| `--border-subtle` | `#E2E8F0` | `border-slate-200` | Card borders (`1px solid`), table row dividers, input borders |
| `--border-focus` | `#2563EB` | `ring-blue-600` | Keyboard focus ring (`2px solid`) for barcode & POS inputs |

### 2.2 Brand & Action Accents

| Token Name | Hex Code | Tailwind Equivalent | Usage in ShopBill |
| --- | --- | --- | --- |
| `--primary-600` | `#1D63F0` / `#2563EB` | `bg-blue-600` | Active sidebar pill, primary CTAs (*Search*, *Print / PDF*, *Finalise Bill*) |
| `--primary-700` | `#1D4ED8` | `bg-blue-700` | Primary button hover / active press state |
| `--primary-50` | `#EFF6FF` | `bg-blue-50` | Tinted KPI card background (*Total Bill Amount*), active row selection |
| `--primary-100` | `#DBEAFE` | `bg-blue-100` | Icon container circle inside blue KPI cards, customer ID pill (`cust-001`) |

### 2.3 Semantic Financial & Status Tokens (Tinted Card System)

Directly mirroring the 4-card KPI strip and status pills in the reference image:

| Semantic Role | Text / Icon Hex | Soft Card Fill Hex | Badge Fill Hex | ShopBill Domain Mapping |
| --- | --- | --- | --- | --- |
| **Billed / Info (Blue)** | `#1D4ED8` (`blue-700`) | `#F0F6FF` (`blue-50/70`) | `#DBEAFE` (`blue-100`) | Total Billed, Sales Invoice, Partially Paid badge, B2B GSTIN tag |
| **Paid / Safe (Emerald)** | `#15803D` (`green-700`) | `#F0FDF4` (`green-50/70`) | `#DCFCE7` (`green-100`) | Total Paid, Cash/UPI Received (`+ ₹25,000`), Active status, Stock Available, Offline Safe / Synced |
| **Pending / Warning (Amber)** | `#D97706` (`amber-600`) | `#FFFBEB` (`amber-50/70`) | `#FEF3C7` (`amber-100`) | Outstanding Udhaar Balance, Pending status, Demo Data Mode pill, Held Bill, Low Stock Alert |
| **Meta / Accent (Purple)** | `#6D28D9` (`violet-700`) | `#F5F3FF` (`violet-50/70`) | `#EDE9FE` (`violet-100`) | Last Payment Date, HSN Summary, Tax Breakdown Drawer, AI Assistant Insights |
| **Danger / Credit Out (Red)** | `#DC2626` (`red-600`) | `#FEF2F2` (`red-50/70`) | `#FEE2E2` (`red-100`) | Invoice Issued debit (`- ₹21,300`), Overdue > 30 days, Expired Batch, Cancelled Invoice |

### 2.4 Typography Hierarchy

| Text Element | Hex Code | Tailwind Class |
| --- | --- | --- |
| **Primary Heading & Amounts** | `#0F172A` | `text-slate-900` |
| **Body & Table Cell Text** | `#334155` | `text-slate-700` |
| **Muted Labels & Captions** | `#64748B` | `text-slate-500` |
| **Sidebar Inactive Text** | `#94A3B8` | `text-slate-400` |

---

## 3. Typography, Numerals & Multilingual Script Rules

### 3.1 Font Stack (`TR-CLI-9`, `TR-CLI-6`)

* **Primary UI & Latin Numerals:** `'Inter'`, `-apple-system`, `'Segoe UI'`, `sans-serif`
* **Hindi (Devanagari) Bundled Fallback:** `'Noto Sans Devanagari'` (subsetted WOFF2 precached by Workbox)
* **Bengali Bundled Fallback:** `'Noto Sans Bengali'` (subsetted WOFF2 precached by Workbox)
* **Monospace (GSTIN, HSN, Barcode, Invoice #):** `'JetBrains Mono'`, `'Consolas'`, `monospace`

### 3.2 Strict Financial Numeral Rules

1. **Tabular Numerals Mandatory:** Every price, quantity, tax rate, and running balance MUST enforce `font-variant-numeric: tabular-nums` (`tabular-nums` in Tailwind) so digits align vertically in tables and live POS animations never jitter horizontally.
2. **Indian Numbering Grouping (`packages/i18n`):** All currency values MUST format using the Indian Lakh/Crore comma system (`₹ 1,24,800.00` or `₹ 85,300` when `.00` is omitted in summary cards), never the Western million grouping (`124,800`).
3. **Explicit Sign & Color Pairing:** In activity feeds and ledgers (as seen in the reference's *Recent Customer Activity* panel):
   * Inflows / Credits to account: `+ ₹ 25,000` in bold `text-green-600`.
   * Outflows / New Bill Debits: `- ₹ 21,300` in bold `text-red-500`.

### 3.3 Type Scale & Multilingual Line-Height Adjustments

| Role | Size (px / rem) | Weight | Line Height (EN / HI-BN) | Usage |
| --- | --- | --- | --- | --- |
| **Display KPI / POS Total** | `28px` (`1.75rem`) | `800` (ExtraBold) | `1.2` / `1.35` | KPI card big numbers (`₹ 1,24,800`), POS Grand Total |
| **Page Title (H1)** | `22px` (`1.375rem`) | `700` (Bold) | `1.3` / `1.45` | Screen headers (*Customer Transaction Tracking*) |
| **Card Title (H2)** | `16px` (`1.0rem`) | `700` (Bold) | `1.4` / `1.5` | Section headers (*Detailed Customer Ledger*, *Payment Summary*) |
| **Body / Table Cell** | `13.5px` (`0.84rem`) | `500` (Medium) | `1.45` / `1.6` | Data rows, product names, invoice numbers |
| **Micro Label / Uppercase** | `11px` (`0.6875rem`) | `600` (SemiBold) | `1.3` / `1.45` | Table headers (`DATE`, `INVOICE / REF #`), KPI card headers (`TOTAL PAID`) |

---

## 4. Layout Architecture & Responsive Grid System

### 4.1 Desktop Layout (`>= 1024px` — Windows PC Counter)

Mirrors the exact 3-zone structure of `GF.jpeg`:

```
+--------------------------------------------------------------------------------------------------+
| [Logo] ShopBill  [<<] | [ Q Search invoices, products, customers... (Ctrl+K) ] [Sync] [Bell] [AU]|
|-----------------------+--------------------------------------------------------------------------|
|                       |  PAGE HEADER + [Demo Data Mode Pill]        [Auto-Save / GST Ready Card] |
|  [POS Billing]   (F2) |--------------------------------------------------------------------------|
|  [Customers/Khata](F3)|  +--------------------------------------------------+ +----------------+ |
|  [Products/Stock] (F4)|  | MAIN WORKSPACE (70% Width - 8 Cols)              | | RIGHT RAIL     | |
|  [Invoices/Bills] (F5)|  |                                                  | | (30% - 4 Cols) | |
|  [Payments]       (F6)|  | - Entity Profile / Search Bar                    | |                | |
|  [GST Register]   (F7)|  | - 4-Column Tinted KPI Strip                      | | - Donut / Bar  | |
|  [Purchase Bills] (F8)|  | - Filter Bar (FY Selector, Date Range, Status)   | |   Summary      | |
|  [Reports & CA]   (F9)|  | - Primary Data Table / Active POS Cart           | | - Sync / Live  | |
|  -------------------  |  |                                                  | |   Status Card  | |
|  [Notifications]  (3) |  |                                                  | | - Recent       | |
|  [Users & Roles]      |  |                                                  | |   Activity /   | |
|  [Shop Settings]      |  |                                                  | |   Payment Dock | |
|                       |  +--------------------------------------------------+ +----------------+ |
|  +-----------------+  |                                                                          |
|  | Offline Safe    |  |                                                                          |
|  | 100% Local Sync |  |                                                                          |
|  +-----------------+  |                                                                          |
+--------------------------------------------------------------------------------------------------+
```

* **Left Navigation Sidebar:** Fixed `240px` width (collapsible to `68px` icon-only rail via the `<<` toggle button, automatically collapsed on `/pos` when screen width is `1024px–1280px` to maximise cart horizontal space).
* **Top Global Utility Bar:** Fixed `60px` height, white background, bottom border. Houses the `Ctrl + K` global command bar, Offline/Sync indicator badge, notification bell with red counter badge, and active Role/User avatar pill.
* **Workspace Grid:** `12-column` CSS Grid (`gap-5` / `20px`, outer padding `24px`).
  * **8 Columns (Main Panel):** Primary operational task (POS Cart, Customer Ledger, Product Table).
  * **4 Columns (Right Context Rail):** Real-time summary, payment settlement dock, or recent activity stream.

### 4.2 Mobile & Tablet Layout (`< 768px` — Low-End Android)

* **Sidebar Transforms to Bottom Tab Bar:** Fixed `64px` height at bottom of viewport with 4 high-priority destinations: **1. POS Bill**, **2. Products**, **3. Udhaar (Khata)**, **4. More (Reports/Settings)**.
* **3-Column Desktop Layout Collapses to Single-Column Stack:**
  * The 4-card KPI strip becomes a `2x2` compact grid.
  * The Right Context Rail moves into swipeable summary cards or a sticky bottom sheet (e.g., on POS, the bottom bar shows `12 Items • ₹ 1,450 [Collect Payment ->]`, which expands upward into the full tax & payment sheet).
* **Tables Transform into Actionable Card Lists:** Multi-column tables collapse into stacked 2-line cards showing primary identifiers on the left (`Product Name`, `HSN`, `Stock`) and bold financial numbers + status pills on the right.

---

## 5. Signature UI Components (Derived from Reference UI)

### 5.1 Tinted KPI Metric Cards (The 4-Up Strip)

Used across Customer Khata, Dashboard, Stock Overview, and Day-Close screens:
* **Container:** Rounded `12px` (`rounded-xl`), `16px` padding, soft semantic background fill (`bg-blue-50/70`, `bg-green-50/70`, `bg-amber-50/70`, `bg-violet-50/70`) with a matching `1px` low-opacity border.
* **Top Row:** `36x36px` rounded icon badge on the left + uppercase micro-label (`TOTAL BILL AMOUNT`, `OUTSTANDING BALANCE`) in matching semantic text tone.
* **Middle Row:** `24px–28px` ExtraBold tabular figure (`₹ 1,24,800`).
* **Bottom Subtext:** Contextual ratio or count (`68.35% of total billed`, `8 Posted Invoices`, `31.65% pending`).

### 5.2 Status & Mode Badges

1. **Header Mode Pill (`Demo Data Mode`):**
   * Amber-tinted pill (`bg-amber-50 text-amber-700 border border-amber-200`) with a database icon placed directly beside the H1 title whenever `ONB-3` Demo Mode is active. Clicking it triggers the *"Clear Demo Data & Start Real Shop"* confirmation modal.
2. **System Assurance Card (`Offline-First & Auto-Saved`):**
   * Positioned in the top-right header area or right rail (mirroring *"Automatic Transaction Tracking"* and *"Ledger Auto-Updated • Live"* in the reference).
   * Displays a pulsing green dot (`• Saved Locally`) when offline/synced, or a spinning blue icon (`Syncing 3 bills...`) when flushing the outbox (`TR-CLI-11`).
3. **Table Status Pills:**
   * `● Paid` / `● Payment`: `bg-green-100 text-green-800` with a `6px` solid green circle.
   * `◆ Partially Paid`: `bg-blue-100 text-blue-800` with a blue diamond icon.
   * `● Pending` / `● Udhaar`: `bg-amber-100 text-amber-800` with an amber circle.
   * `✕ Cancelled`: `bg-slate-100 text-slate-600 line-through`.

### 5.3 Global Command & Barcode Omni-Bar (`Ctrl + K` / `F1`)

* Styled after the top search bar in the reference (`Search invoices, customers, transactions or anything... [Ctrl + K]`).
* **Dual Behaviour:**
  * On `/pos`, barcode scanner bursts (`< 30ms` per keystroke ending in `Enter`) are intercepted globally and routed straight to the cart even if focus is elsewhere.
  * Pressing `Ctrl + K` anywhere opens an instant modal overlay powered by the **Search Web Worker** (`TR-CLI-5`) to jump to any customer ledger, past invoice number, or product in `< 100ms`.

### 5.4 Indian Financial Year (FY) & Date Range Filter Strip

* Directly adopts the reference's filter bar:
  * **Select Financial Year Dropdown:** `FY 2026-27 (Apr 26 – Mar 27)` with explicit helper caption `(Indian FY runs April 1st to March 31st)`.
  * **Quick Period Summary Pill:** Right-aligned summary strip showing `Period Invoiced: ₹ 43,200 | Paid: ₹ 29,800 (7 entries)` so the shopkeeper or CA can verify filtered totals before exporting to Excel.

---

## 6. Screen-by-Screen UI/UX Specifications

### 6.1 Screen 1: Point of Sale (POS Billing Terminal — `/pos`)

**Target Metric:** Complete a 5-item scan or search bill in **under 30 seconds** (`POS-1`).

* **Top Sub-Header (Held Bills & Customer Bar):**
  * **Left:** Segmented tab pills for active bills: `[ #1 Active (4 items) ]` `[ #2 Held - Ramesh (₹420) ]` `[ + Hold Current (F4) ]`.
  * **Right:** Customer selector pill. Defaults to `[ Walk-in Customer (Cash) ]`. Clicking or pressing `Alt+C` opens an inline search/create popover for **Name, Mobile, and B2B GSTIN** (`POS-3`). If a B2B GSTIN is entered, a blue badge displays `[B2B • Intra-State CGST+SGST]` or `[B2B • Inter-State IGST]`.
* **Main Left Panel (8 Columns — Active Cart Table):**
  * **Sticky Barcode & Fuzzy Search Bar:** Prominent blue-bordered input: *"Scan barcode or type item name in English, हिंदी, বাংলা (F2)..."*.
  * **Virtualised Line Table:**
    * Columns: `#`, `ITEM & HSN`, `QTY & UNIT`, `PRICE (₹)`, `DISC (% / ₹)`, `GST %`, `TOTAL (₹)`, `ACTION`.
    * **Inline Steppers:** Quantity (`-` `1` `+`) and Price cells are directly editable via arrow keys or single tap.
    * **Tax-Inclusive Indicator:** Small subtle pill under unit price (`Incl. GST` or `+ GST`) based on the product master (`GST-3`).
* **Right Panel (4 Columns — Live Tax Breakdown & Settlement Dock):**
  * **Card 1: Calculation Summary:**
    * Shows `Taxable Value`, `Total Discount`, `CGST Amount`, `SGST Amount` (or `IGST Amount`), and `Round Off (± ₹0.xx)`.
    * Includes an interactive link: **`[?] How was GST calculated?`** (`GST-8`), which expands an inline mathematical breakdown per slab (`5% Slab`, `18% Slab`).
  * **Card 2: Payment Mode Selector (`POS-4`):**
    * Quick-select pill buttons: `[ Cash (F9) ]`, `[ UPI QR (F10) ]`, `[ Udhaar / Credit (F11) ]`, `[ Split / Partial ]`.
    * **If Cash:** Shows quick-tendered chips (`Exact`, `₹500`, `₹2000`) and calculates **Change to Return** in bold green.
    * **If UPI QR:** Renders an instant dynamic SVG QR code (`upi://pay?pa=...&am=...`) right inside the dock—customer scans directly from the monitor or phone screen.
    * **If Udhaar / Partial:** Automatically calculates `Balance Due (₹)` in amber and requires a linked Customer Name/Phone.
  * **Primary Action Footer:** Full-width `52px` tall Royal Blue CTA: **`[ Print & Finalise Bill (F12 / Ctrl+Enter) ]`** alongside a secondary **`[ Share on WhatsApp ]`** button.

### 6.2 Screen 2: Customer Transaction Tracking & Udhaar Khata (`/ledgers/:partyId`)

**Direct Implementation of the Reference Image (`GF.jpeg`):**

* **Search & Party Switcher Header:**
  * Prominent search input with `Search` button to switch customers in `< 100ms`, plus a **`[+ Quick Add Customer]`** button.
* **Customer Identity Card:**
  * **Left:** `56x56px` circular initials avatar (`RK` on `#1D63F0` blue fill), Customer Name in `20px` Bold, `Active` green pill, internal code pill (`cust-rakesh-001`), Business Name, Phone, Email, and Address.
  * **Right:** Validated `GSTIN` in monospace, `Customer since` date, and **State / Place of Supply** (`Delhi, India` or `West Bengal, India`).
* **4-Card Tinted KPI Strip:**
  * `TOTAL BILL AMOUNT` (Blue), `TOTAL PAID` (Green), `OUTSTANDING BALANCE` (Amber), `LAST PAYMENT DATE` (Purple).
* **Detailed Customer Ledger & Transactions Table:**
  * Search by ref/UTR, filter by Transaction Type (`Sales Invoice`, `Cash Payment`, `UPI Payment`, `Credit Note`) and Status (`Paid`, `Partially Paid`, `Pending`).
  * **Columns:** `DATE`, `INVOICE / REF #`, `TYPE` (with semantic icons), `METHOD`, `DEBIT (₹)`, `CREDIT (₹)`, `RUNNING BALANCE (₹)` (derived from append-only `ledger_entries` — `TD-5`), and `STATUS`.
  * **Action Bar:** `[ Export v ]` (Excel/CSV) and primary blue `[ Print / PDF ]` plus a green **`[ + Receive Payment ]`** and **`[ WhatsApp UPI Reminder ]`** button (`LED-4`).
* **Right Rail:**
  * **Payment Summary Card:** SVG Donut Chart showing `% Paid` vs `Pending Amount` + horizontal `Payment Progress` bar.
  * **Recent Customer Activity Card:** Chronological feed with green `+ ₹` payment badges and red `- ₹` invoice badges.

### 6.3 Screen 3: Product Catalogue & Stock Management (`/products`)

* **Top KPI Strip (4 Cards):**
  * `Total Active Products` (Blue), `In-Stock Value at Cost` (Green), `Low Stock Items` (Amber — clickable filter), `Out of Stock / Expiring Soon` (Red — clickable filter).
* **Filter & Bulk Action Bar:**
  * Fuzzy search input (searches English, Hindi, Bengali, and phonetic transliterations like *"cheeni"* → *"चीनी / Sugar"*).
  * Category filter, GST Slab filter (`0%`, `5%`, `18%`, `40%`), and two primary action buttons: **`[ Import / Export Excel ]`** (`PRD-5`) and **`[ + Add Product ]`** (`PRD-1`).
* **Virtualised Product Table (`PRD-2`):**
  * Renders 50,000+ rows at 60 FPS using `@tanstack/react-virtual`.
  * **Columns:** `PRODUCT NAME (EN + LOCAL)`, `SKU / BARCODE`, `HSN`, `GST %`, `MRP (₹)`, `SELLING PRICE (₹)`, `CURRENT STOCK`, `STATUS`, `QUICK ACTIONS` (*Edit*, *Adjust Stock*, *Print Barcode Label*).
* **Add/Edit Product Slide-Over Drawer:**
  * Keeps context without leaving the list. Includes **HSN Auto-Suggest** (`PRD-3`) that automatically fills the default GST rate when an HSN is chosen.

### 6.4 Screen 4: CA Report Factory & Month-End GST Pack (`/reports`)

* **Hero Card: "1-Tap CA Month-End GST Pack" (`RPT-4`, `RPT-5`):**
  * Tinted blue-and-violet banner where the shopkeeper selects the month (e.g., `October 2026`) and clicks **`[ Generate & Share CA Excel Pack ]`**.
  * Displays a non-blocking progress bar driven by the **Report Web Worker** (`TD-10`) and outputs a single verified `.xlsx` workbook containing:
    1. *Sales Register (Invoice-wise)*
    2. *Rate-wise GST Summary*
    3. *HSN-wise Summary (with UQC codes)*
    4. *Credit/Debit Notes Register*
    5. *Cancelled Invoice Series Log (Gap-free audit check)*
* **Reconciliation Assurance Badge:**
  * Mirrors the green trust card from the reference: **`[ ✓ 100% Reconciled with Local Database • Tax Math Verified ]`**.

---

## 7. Print & Receipt Layout Visual Standards (`DOC-3`, `DOC-4`, `TD-9`)

All three output renderers (`HTML/CSS`, `PDF`, `ESC/POS`) consume the same pure `PrintModel` (`packages/print-model`):

| Format | Visual & Typography Specification |
| --- | --- |
| **58mm / 80mm Thermal Receipt** | High-contrast monochrome (`#000000` on `#FFFFFF`), no grey shading (prevents thermal dithering blur). Shop Name in bold `16pt` centered, Invoice # and Date on split single line, compact 4-column item table (`Item/HSN`, `Qty`, `Rate`, `Amt`), dashed `---` separators, concise CGST/SGST tax summary table, dynamic **UPI Payment QR Code** centered at bottom, and *"Amount in Words (Indian System)"*. |
| **A4 / A5 Tax Invoice (B2B & Retail)** | Clean enterprise grid matching the reference UI's aesthetic: Shop Logo top-left, **"TAX INVOICE"** or **"BILL OF SUPPLY"** badge top-right, bordered Seller & Buyer GSTIN blocks, full 10-column HSN/Tax table, HSN-wise tax breakup sub-table, bank/UPI QR block, and Authorised Signatory box. |
| **WhatsApp Share Card + PDF** | Pre-formatted WhatsApp message summary (*"Namaste Rakesh Ji, thank you for shopping at [Shop Name]. Invoice #SB/26-27/0042 for ₹1,450.00 is attached..."*) with 1-tap native Web Share API (`navigator.share`) file attachment. |

---

## 8. Micro-Interactions, Offline Resilience & Accessibility

1. **Zero-Latency Optimistic Feedback:**
   * Because Dexie (IndexedDB) writes complete in `< 15ms` locally (`TR-CLI-1`), clicking *Finalise Bill* or *Record Payment* transitions immediately to the Print/Receipt preview with a crisp checkmark animation—never blocking on a network spinner.
2. **Crash-Proof Draft Recovery Toast (`POS-2`, `TR-CLI-2`):**
   * If power cuts out mid-bill, relaunching the app displays a warm amber recovery banner at the top of `/pos`: *"Restored unsaved bill (6 items, ₹ 840) from before power cut"* with `[Resume]` and `[Discard]` buttons.
3. **Storage Quota Warning Banner (`TR-CLI-3`):**
   * If persistent storage is denied by the browser or device storage crosses 80%, a persistent top bar prompts: **`[ ! Phone Storage Low / Unprotected — Tap to Download Encrypted Backup (.sbak) ]`**.
4. **Performance Budget Guardrails (`TR-CLI-6`):**
   * No heavy third-party chart libraries for simple visuals: the *Payment Summary Donut Chart* and *Progress Bars* seen in the reference UI MUST be built with lightweight inline SVG (`<circle stroke-dasharray="...">`) to keep the initial JS bundle under `300 KB` gzipped.