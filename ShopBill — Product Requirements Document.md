# ShopBill — Product Requirements Document

*Offline-first GST billing, inventory and Excel reporting for Indian shopkeepers · Version 1.0 (Draft) · 26 October 2026 · Product owner: Arnab Sarkar*

| Item | Detail |
| --- | --- |
| Product | ShopBill (working name) |
| Status | Draft v1.0, ready for review |
| Companion documents | docs/SPEC.md (technical specification and acceptance criteria), docs/GST\_ASSUMPTIONS.md (tax rules implemented) |
| Reviews needed before launch | A Chartered Accountant (tax logic), 3–5 pilot shopkeepers (usability), a security review (before any public release) |

## 1. Executive summary

ShopBill is a fast, offline-first billing and inventory application for Indian shopkeepers: kirana and general stores, medical shops, hardware, garment, stationery and mobile shops. It produces correct GST invoices in under 30 seconds, keeps a live list of every product and its stock, tracks customer credit (udhaar) and generates accurate Excel reports automatically, with or without an internet connection.

Shopkeepers today tend to choose between simple tools that depend on connectivity and subscriptions, and powerful accounting suites that are complex, Windows-bound and English-first. Handling GST by hand (slabs, CGST/SGST versus IGST, rounding, HSN codes) is error-prone, and preparing month-end Excel sheets for the accountant is repetitive work. ShopBill removes these frictions with a rules-based GST engine, a barcode-first point of sale, append-only stock and ledger records, scheduled Excel packs and a simple multilingual interface.

- **Users:** shop owners, counter staff and the shop’s accountant (CA).
- **Core value:** correct GST bills fast, no lost data, reports without manual work.
- **Platform:** installable web app (PWA) for Android phones and Windows PCs, plus a cloud backend for sync, backup and scheduled reports.
- **Delivery:** three phases: MVP (offline billing, GST, products, reports), Advanced (sync, batch and expiry, scheduled reports, AI assistant) and Stretch (GSTR JSON, e-invoice adapters, Tally export).

## 2. Problem statement and opportunity

A busy shop may issue dozens or hundreds of bills a day. Each bill must be arithmetically and legally correct, stock must tally, credit must be recovered, and tax data must reach the accountant on time. Much of this still depends on memory, notebooks, calculators and scattered spreadsheets. The table lists the problems ShopBill is designed to solve; the last column points to the requirements in section 8.

| # | Pain point today | Impact | ShopBill response | Requirements |
| --- | --- | --- | --- | --- |
| 1 | Software needs internet, monthly subscriptions or per-device licences | Lost sales during outages; recurring cost | Offline-first, free core | SYN-1, POS-1 |
| 2 | Slow, cluttered billing screens | Queues at the counter | Barcode and keyboard-first POS, under 30 s per bill | POS-1 to POS-5 |
| 3 | Manual GST mistakes (wrong slab, CGST/SGST vs IGST, rounding) | Notices, penalties, rework | Rules-based GST engine with HSN master and exact math | GST-1 to GST-8 |
| 4 | English-only, complex interfaces | Low adoption by owners and staff | Multilingual UI, simple wording, voice input | LOC-1, LOC-4 |
| 5 | Stock mismatches | Stock-outs, dead stock, losses | Immutable stock movements, alerts | STK-1 to STK-5 |
| 6 | Credit (udhaar) kept in notebooks | Unrecovered dues | Ledgers, ageing, reminders | LED-1 to LED-5 |
| 7 | Data loss from crashes, lost phones, power cuts | Business history lost | Write-ahead saves, encrypted backup, sync | SYN-1 to SYN-5 |
| 8 | Bill tampering and staff theft | Revenue leakage | Roles, audit log, gap-free numbering, credit notes only | SEC-1 to SEC-4, DOC-2 |
| 9 | Manual Excel preparation for the CA | Hours of work every month; late filing | Scheduled Excel and GSTR-ready packs | RPT-1 to RPT-7 |
| 10 | No business insight | Poor buying and pricing decisions | Dashboard and AI assistant | DSH-1 to DSH-4 |
| 11 | Printer and scanner incompatibility | Hardware spend, delayed bills | Thermal and A4 printing, USB and camera scanning | PRD-4, DOC-4, DOC-5 |
| 12 | Vendor lock-in | High switching cost | Full export to Excel, CSV and JSON | RPT-1, SEC-6 |

## 3. Vision, goals and non-goals

**Vision.** Every Indian shopkeeper can issue a correct GST bill in seconds, know exactly what is in stock and who owes money, and hand the accountant a clean report without opening a spreadsheet.

**Goals**

1. **Accuracy:** GST is calculated and printed correctly on every bill in every supported scenario.
2. **Speed:** a bill takes under 30 seconds, and the app is interactive in under 2 seconds on a low-end Android phone.
3. **Reliability:** everything works offline; no bill, payment or stock movement is lost or duplicated.
4. **Automation:** reports and GST packs are generated and delivered without manual work.
5. **Accessibility:** usable by low-digital-literacy owners in English, Hindi and Bengali, with room for more languages.
6. **Trust:** transparent calculations, a full audit trail and privacy-respecting data handling.

**Non-goals for v1**

- Full double-entry accounting, balance sheets and payroll.
- Online store or marketplace features.
- Restaurant table and KOT management, manufacturing and bills of materials.
- In-house payment processing or lending.
- Filing returns on the GST portal (ShopBill prepares the data; filing stays with the shop or its CA).
- Selling or certifying proprietary hardware.

## 4. Success metrics

Targets are for the pilot and should be recalibrated after the first round of feedback.

| Metric | Target | How measured |
| --- | --- | --- |
| GST accuracy | 100% of reference invoices match CA-verified results; zero known tax-calculation defects at release | Automated tests plus CA review |
| Time to first bill | Under 10 minutes from install, including setup | Observed pilot sessions |
| Billing speed | Median under 30 s per scan-based bill | Opt-in timing events |
| Offline reliability | 100% of offline bills preserved after sync; zero duplicate invoice numbers | Sync tests and pilot logs |
| Report fidelity | 100% of exported workbooks reconcile with database totals | Automated reconciliation test |
| Automation adoption | At least 60% of pilot shops enable a scheduled report | Opt-in settings telemetry |
| Retention | At least 70% of pilot shops still billing weekly after 4 weeks | Pilot usage |
| Satisfaction | Net Promoter Score of 40 or higher among pilot owners | Survey |
| Performance | Bill screen interactive under 2 s on a low-end Android phone; product search under 100 ms across 50,000 products | Automated performance tests |

## 5. Target users and personas

These personas are illustrative; replace them with findings from real shop interviews.

| Persona | Context | Needs | Frustrations | Key requirements |
| --- | --- | --- | --- | --- |
| Ramesh, kirana store owner | Mid-40s, Hindi or Bengali speaker, Android phone, many credit customers | Bill fast, track udhaar, know stock | English software, internet drops, paper notebooks | POS-1, LED-1 to LED-4, LOC-1 |
| Sunita, pharmacy owner | PC at the counter, batch and expiry critical, mixed GST slabs | Avoid expired stock, correct GST by HSN | Manual expiry tracking | STK-5, GST-1 |
| Imran, hardware and garment dealer | Retail plus B2B and inter-state customers, price tiers | Correct IGST invoices, price lists, credit control | Wrong tax split, manual returns | GST-2, POS-10, LED-5 |
| Priya, cashier | Uses the billing screen all day | Fast billing, fewer mistakes, no access to profit data | Cluttered menus | POS-1, SEC-1 |
| Meera, CA or accountant | Receives monthly data from many clients | Clean, consistent GST-ready Excel | Re-keying data, late and incomplete inputs | RPT-4, RPT-5 |

## 6. Key user journeys

1. **First setup (under 10 minutes):** install, choose a language, enter shop and GSTIN details, import products from Excel or start with demo data, print a test bill.
2. **Counter sale:** scan items, adjust quantity or discount, take cash or a UPI QR payment, print or WhatsApp the bill; stock updates instantly.
3. **Credit sale and recovery:** sell on udhaar, see the balance and ageing, send a reminder with a UPI pay link, record the payment.
4. **Return:** pick the original invoice, choose items, issue a credit note, restock or mark as damaged.
5. **Day close:** reconcile cash, UPI and credit, review the daily summary and receive the Excel pack automatically.
6. **Month-end handoff:** send the GST pack (rate-wise, HSN-wise and GSTR-1-ready sheets) to the CA in one tap.
7. **Device lost:** sign in on a new device and restore everything from the encrypted backup.

## 7. Scope and phasing

Phase 1 items are MVP must-haves. Phases 2 and 3 are scheduled enhancements.

| Phase | Capabilities |
| --- | --- |
| 1. MVP (fully offline) | Onboarding and demo mode; product master with Excel/CSV import and export; POS billing with split payments, UPI QR, returns and hold/resume; GST engine and all document types; thermal, A4, PDF and WhatsApp-share output; stock and purchase entry; customer and supplier ledgers; dashboard; core Excel reports on demand; roles, audit log, local backup and restore; backend skeleton |
| 2. Advanced | Multi-device sync, cloud backup and multi-branch; batch and expiry, serial/IMEI, weighted items, price lists, loyalty and offers; scheduled Excel delivery; WhatsApp and SMS reminders; purchase-bill photo capture; AI assistant and weekly insights; voice billing; catalogue sharing; direct ESC/POS printing |
| 3. Stretch | GSTR-1 and 3B JSON export, e-invoice and e-way bill adapters, Tally XML export, payment-gateway and soundbox webhooks, digital receipt links |

## 8. Functional requirements

Each requirement has a stable ID used by tests and the implementation plan. The Phase column shows when it ships.

### 8.1 Onboarding and shop setup (ONB)

| ID | Requirement | Phase |
| --- | --- | --- |
| ONB-1 | A first-run wizard captures shop name, address, state, GSTIN (optional), tax scheme (regular, composition, unregistered), financial-year start, invoice prefix, language, UPI ID and logo, and completes in under 10 minutes | 1 |
| ONB-2 | GSTIN is validated for format, checksum and state code, with the state filled in automatically | 1 |
| ONB-3 | Demo mode loads sample data and can be cleared in one tap | 1 |
| ONB-4 | Products can be imported during setup from a downloadable Excel/CSV template | 1 |
| ONB-5 | A short guided tour and helpful empty states appear in the chosen language | 2 |

### 8.2 Product master and catalogue (PRD)

| ID | Requirement | Phase |
| --- | --- | --- |
| PRD-1 | Create, edit and archive products with name (plus local-language name), SKU, multiple barcodes, HSN/SAC, GST rate, unit, MRP, selling price, purchase price, tax-inclusive flag, category, brand and minimum stock | 1 |
| PRD-2 | A product list shows every product with fuzzy search (English and local-language), filters (category, stock status, GST rate, archived), sorting and virtualised scrolling; search responds in under 100 ms across 50,000 products | 1 |
| PRD-3 | HSN/SAC auto-suggest from a bundled master, with a warning when a code has fewer digits than the shop’s turnover requires | 1 |
| PRD-4 | Barcode scanning with USB scanners and the phone camera; generate and print Code128/EAN-13 labels for unlabelled items | 1 |
| PRD-5 | Bulk import and export through Excel/CSV with a row-by-row error report; bulk price or GST updates with preview and undo | 1 |
| PRD-6 | Categories, brands, units (kg, g, pcs, box, litre, packet, dozen), retail and wholesale price tiers, product images | 2 |
| PRD-7 | Shareable product catalogue (PDF or web link) with prices | 2 |

### 8.3 Billing and point of sale (POS)

| ID | Requirement | Phase |
| --- | --- | --- |
| POS-1 | Single-screen billing with search-as-you-type and scanning, inline quantity and price edits, per-line and invoice-level discounts (% or amount), live tax and totals, keyboard shortcuts on desktop and large touch targets on mobile | 1 |
| POS-2 | Hold and resume several bills; an unsaved bill survives a crash or power cut | 1 |
| POS-3 | Walk-in customer by default; quick-add customer with name and phone; B2B bills require a validated GSTIN and a place-of-supply choice | 1 |
| POS-4 | Payments by cash (tendered and change), UPI QR, card, cheque or credit; split payments; a partial payment leaves a due balance | 1 |
| POS-5 | Finalising a bill creates an immutable invoice, then prints or shares it (58 mm and 80 mm thermal, A4/A5, PDF, WhatsApp) | 1 |
| POS-6 | Returns and exchanges against the original invoice produce a credit note, adjust stock (restock or damage) and settle by cash or credit | 1 |
| POS-7 | After finalisation a bill can only be cancelled (with a reason, role-restricted) or corrected with a credit or debit note; every action is audit-logged | 1 |
| POS-8 | Quotations and estimates convert to invoices without touching stock or ledgers until converted | 1 |
| POS-9 | Loose items by weight with decimal quantities, serial/IMEI capture and batch selection (earliest expiry first) | 2 |
| POS-10 | Price lists, offers and combos, loyalty points | 2 |
| POS-11 | Voice billing in Hindi, Bengali and English | 2 |

### 8.4 GST engine (GST)

| ID | Requirement | Phase |
| --- | --- | --- |
| GST-1 | Rates are effective-dated data (seeded 0%, 0.25%, 3%, 5%, 18%, 40% plus cess support) that an administrator can update without a code release; every invoice line stores a snapshot of the rate and HSN used | 1 |
| GST-2 | Intra-state supplies split into CGST and SGST (UTGST where applicable); inter-state supplies use IGST; place of supply defaults by customer type and can be overridden with a reason | 1 |
| GST-3 | Tax-exclusive and tax-inclusive (MRP) pricing, with reverse calculation of taxable value | 1 |
| GST-4 | Invoice-level discounts are apportioned across lines before tax; offers such as buy-two-get-one follow a documented tax treatment | 1 |
| GST-5 | All money uses integer paise; each line rounds half-up to the paisa, the invoice shows an explicit round-off to the nearest rupee, and total = taxable value + taxes ± round-off always holds | 1 |
| GST-6 | Composition dealers issue Bills of Supply with no tax; exempt, nil-rated and non-GST items and reverse-charge supplies are flagged correctly | 1 |
| GST-7 | Validators for GSTIN, PAN, HSN, state code, UPI ID and mobile number | 1 |
| GST-8 | Every invoice offers a “how was this calculated” breakdown; the engine is pure, deterministic and versioned | 1 |
| GST-9 | E-invoice (IRN and QR) and e-way bill payload builders behind an adapter interface, with a mock provider | 3 |

### 8.5 Documents, numbering and printing (DOC)

| ID | Requirement | Phase |
| --- | --- | --- |
| DOC-1 | Document types: Tax Invoice, Bill of Supply, Credit Note, Debit Note, Sales Return, Purchase Bill, Quotation/Estimate and Delivery Challan | 1 |
| DOC-2 | Invoice numbers are consecutive per series per financial year, at most 16 characters (letters, digits, “/” and “-”) and never reused; cancelled numbers stay in the series marked cancelled; each counter or device can have its own series | 1 |
| DOC-3 | Every printed invoice carries all fields required by GST rules (see section 9) | 1 |
| DOC-4 | One template renders to screen, 58 mm and 80 mm thermal, A4/A5 and PDF, with shop logo, UPI QR, amount in words in the Indian system and a selectable language | 1 |
| DOC-5 | Browser printing by default; direct ESC/POS printing over WebUSB, Web Bluetooth or Web Serial where supported, with automatic fallback | 2 |
| DOC-6 | Original, Duplicate and Triplicate copy marking and reprint watermarks | 2 |
