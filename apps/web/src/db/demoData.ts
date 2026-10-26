import { db, ProductRecord, PartyRecord, InvoiceRecord } from './index';

export const SAMPLE_PRODUCTS: Omit<ProductRecord, 'updated_at'>[] = [
  {
    id: 'prod-001',
    sku: 'SALT-001',
    barcodes: ['890103000001', 'SALT1KG'],
    name: 'Tata Salt Vacuum Evaporated 1kg',
    name_hindi: 'टाटा नमक 1 किग्रा',
    name_bengali: 'টাটা লবণ ১ কেজি',
    category: 'Groceries / Kirana',
    hsn_sac: '2501',
    unit: 'packet',
    gst_rate_bps: 0, // Nil rated
    mrp_paise: 2800,
    selling_price_paise: 2800,
    purchase_price_paise: 2400,
    is_tax_inclusive: true,
    min_stock_milli: 10000,
    current_stock_milli: 85000,
    is_archived: false,
  },
  {
    id: 'prod-002',
    sku: 'ATTA-005',
    barcodes: ['890103000002', 'AASHIRVAAD5KG'],
    name: 'Aashirvaad Shudh Chakki Atta 5kg',
    name_hindi: 'आशीर्वाद शुद्ध चक्की आटा 5 किग्रा',
    name_bengali: 'আশীর্বাদ আটা ৫ কেজি',
    category: 'Flour & Grains',
    hsn_sac: '1101',
    unit: 'packet',
    gst_rate_bps: 500, // 5%
    mrp_paise: 24500,
    selling_price_paise: 23500,
    purchase_price_paise: 21000,
    is_tax_inclusive: true,
    min_stock_milli: 5000,
    current_stock_milli: 32000,
    is_archived: false,
  },
  {
    id: 'prod-003',
    sku: 'OIL-001',
    barcodes: ['890103000003', 'FORTUNE1L'],
    name: 'Fortune Sunlite Refined Sunflower Oil 1L',
    name_hindi: 'फॉर्च्यून रिफाइंड सूरजमुखी तेल 1 ली',
    name_bengali: 'ফরচুন সানফ্লাওয়ার তেল ১ লিটার',
    category: 'Edible Oils',
    hsn_sac: '1512',
    unit: 'litre',
    gst_rate_bps: 500, // 5%
    mrp_paise: 16500,
    selling_price_paise: 15500,
    purchase_price_paise: 14000,
    is_tax_inclusive: true,
    min_stock_milli: 12000,
    current_stock_milli: 45000,
    is_archived: false,
  },
  {
    id: 'prod-004',
    sku: 'BUTTER-500',
    barcodes: ['890103000004', 'AMUL500G'],
    name: 'Amul Butter Pasteurised 500g',
    name_hindi: 'अमूल मक्खन 500 ग्राम',
    name_bengali: 'আমুল মাখন ৫০০ গ্রাম',
    category: 'Dairy',
    hsn_sac: '0405',
    unit: 'box',
    gst_rate_bps: 1200, // 12%
    mrp_paise: 28500,
    selling_price_paise: 28000,
    purchase_price_paise: 25500,
    is_tax_inclusive: true,
    min_stock_milli: 4000,
    current_stock_milli: 18000,
    is_archived: false,
  },
  {
    id: 'prod-005',
    sku: 'SOAP-003',
    barcodes: ['890103000005', 'DETTOLSOAP'],
    name: 'Dettol Original Bathing Soap 125g Pack of 3',
    name_hindi: 'डेटॉल साबुन 125 ग्राम (3 का पैक)',
    name_bengali: 'ডেটোল সাবান ১২৫ গ্রাম (৩ প্যাক)',
    category: 'Personal Care',
    hsn_sac: '3401',
    unit: 'packet',
    gst_rate_bps: 1800, // 18%
    mrp_paise: 18000,
    selling_price_paise: 17000,
    purchase_price_paise: 14500,
    is_tax_inclusive: true,
    min_stock_milli: 8000,
    current_stock_milli: 54000,
    is_archived: false,
  },
  {
    id: 'prod-006',
    sku: 'BISCUIT-001',
    barcodes: ['890103000006', 'PARLEG800'],
    name: 'Parle-G Gold Glucose Biscuits 800g',
    name_hindi: 'पारले-जी बिस्कुट 800 ग्राम',
    name_bengali: 'পার্লে-জি বিস্কুট ৮০০ গ্রাম',
    category: 'Snacks & Biscuits',
    hsn_sac: '1905',
    unit: 'packet',
    gst_rate_bps: 1800, // 18%
    mrp_paise: 10000,
    selling_price_paise: 9500,
    purchase_price_paise: 8200,
    is_tax_inclusive: true,
    min_stock_milli: 15000,
    current_stock_milli: 62000,
    is_archived: false,
  },
  {
    id: 'prod-007',
    sku: 'RICE-025',
    barcodes: ['890103000007', 'DAAWAT5KG'],
    name: 'Daawat Rozana Super Basmati Rice 5kg',
    name_hindi: 'दावत रोज़ाना बासमती चावल 5 किग्रा',
    name_bengali: 'দাওয়াত বাসমতি চাল ৫ কেজি',
    category: 'Flour & Grains',
    hsn_sac: '1006',
    unit: 'packet',
    gst_rate_bps: 500, // 5%
    mrp_paise: 42500,
    selling_price_paise: 39900,
    purchase_price_paise: 34000,
    is_tax_inclusive: true,
    min_stock_milli: 4000,
    current_stock_milli: 12000,
    is_archived: false,
  },
  {
    id: 'prod-008',
    sku: 'TEA-001',
    barcodes: ['890103000008', 'TATATEA500'],
    name: 'Tata Tea Gold Leaf 500g',
    name_hindi: 'टाटा टी गोल्ड चायपत्ती 500 ग्राम',
    name_bengali: 'টাটা টি গোল্ড চা ৫০০ গ্রাম',
    category: 'Beverages',
    hsn_sac: '0902',
    unit: 'box',
    gst_rate_bps: 500, // 5%
    mrp_paise: 34000,
    selling_price_paise: 31500,
    purchase_price_paise: 27500,
    is_tax_inclusive: true,
    min_stock_milli: 6000,
    current_stock_milli: 26000,
    is_archived: false,
  },
  {
    id: 'prod-009',
    sku: 'DRINK-001',
    barcodes: ['890103000009', 'THUMSCOLD'],
    name: 'Thums Up Cold Drink Bottle 750ml',
    name_hindi: 'थम्स अप 750 मिली',
    name_bengali: 'থামস আপ ৭৫০ মিলি',
    category: 'Beverages',
    hsn_sac: '2202',
    unit: 'bottle',
    gst_rate_bps: 2800, // 28%
    cess_rate_bps: 1200, // 12% Cess
    mrp_paise: 4500,
    selling_price_paise: 4500,
    purchase_price_paise: 3600,
    is_tax_inclusive: true,
    min_stock_milli: 24000,
    current_stock_milli: 72000,
    is_archived: false,
  },
  {
    id: 'prod-010',
    sku: 'MED-001',
    barcodes: ['890103000010', 'DOLO650'],
    name: 'Dolo 650mg Paracetamol Strip of 15',
    name_hindi: 'डोलो 650 मिग्रा (15 गोलियां)',
    name_bengali: 'ডোলো ৬৫০ মিগ্রা (১৫ স্ট্রিপ)',
    category: 'Pharmacy / Health',
    hsn_sac: '3004',
    unit: 'strip',
    gst_rate_bps: 1200, // 12%
    mrp_paise: 3360,
    selling_price_paise: 3200,
    purchase_price_paise: 2500,
    is_tax_inclusive: true,
    min_stock_milli: 30000,
    current_stock_milli: 120000,
    is_archived: false,
  },
];

export const SAMPLE_PARTIES: Omit<PartyRecord, 'updated_at'>[] = [
  {
    id: 'party-001',
    name: 'Ramesh Sen (Kirana Regular)',
    phone: '9830112233',
    party_type: 'CUSTOMER',
    state_code: '19',
    state_name: 'West Bengal',
    address: 'Flat 3B, Bowbazar, Kolkata',
    balance_paise: 345000, // Rs 3,450.00 udhaar
    credit_limit_paise: 1000000, // Rs 10,000 credit limit
  },
  {
    id: 'party-002',
    name: 'Shyamal Ghosh (Teacher)',
    phone: '9831445566',
    party_type: 'CUSTOMER',
    state_code: '19',
    state_name: 'West Bengal',
    address: 'College Square, Kolkata',
    balance_paise: 182000, // Rs 1,820.00 udhaar
    credit_limit_paise: 500000,
  },
  {
    id: 'party-003',
    name: 'Priya Stationery & Xerox (B2B)',
    phone: '9832778899',
    gstin: '19AAPFS1234F1ZX',
    party_type: 'CUSTOMER',
    state_code: '19',
    state_name: 'West Bengal',
    address: 'Amherst Street, Kolkata',
    balance_paise: 853000, // Rs 8,530.00 udhaar
    credit_limit_paise: 2500000,
  },
  {
    id: 'party-004',
    name: 'Eastern Wholesale Traders',
    phone: '9830999888',
    gstin: '19AAACE4567A1Z3',
    party_type: 'SUPPLIER',
    state_code: '19',
    state_name: 'West Bengal',
    address: 'Posta Bazar, Burrabazar, Kolkata',
    balance_paise: -2500000, // We owe supplier Rs 25,000
  },
];

export async function seedDemoData(): Promise<void> {
  const now = new Date().toISOString();

  // Clear existing data cleanly
  await db.transaction(
    'rw',
    [
      db.products,
      db.parties,
      db.invoices,
      db.invoice_lines,
      db.payments,
      db.stock_movements,
      db.ledger_entries,
      db.held_bills,
      db.counters,
      db.meta,
    ],
    async () => {
      await db.products.clear();
      await db.parties.clear();
      await db.invoices.clear();
      await db.invoice_lines.clear();
      await db.payments.clear();
      await db.stock_movements.clear();
      await db.ledger_entries.clear();
      await db.held_bills.clear();
      await db.counters.clear();

      // Seed Products with opening stock
      for (const p of SAMPLE_PRODUCTS) {
        await db.products.put({ ...p, updated_at: now });
        await db.stock_movements.put({
          id: `sm-open-${p.id}`,
          product_id: p.id,
          movement_type: 'OPENING_STOCK',
          quantity_delta_milli: p.current_stock_milli,
          reference_type: 'OPENING',
          reason: 'Initial demo stock seeding',
          occurred_at: now,
        });
      }

      // Seed Parties with ledger opening
      for (const pt of SAMPLE_PARTIES) {
        await db.parties.put({ ...pt, updated_at: now });
        if (pt.balance_paise !== 0) {
          await db.ledger_entries.put({
            id: `le-open-${pt.id}`,
            party_id: pt.id,
            direction: pt.balance_paise > 0 ? 'DEBIT' : 'CREDIT',
            amount_paise: Math.abs(pt.balance_paise),
            balance_after_paise: pt.balance_paise,
            reference_type: 'OPENING',
            notes: 'Opening udhaar balance from notebook',
            occurred_at: now,
          });
        }
      }

      // Seed default shop profile
      await db.meta.put({
        key: 'shop_profile',
        value: {
          name: 'Gupta Kirana & General Store',
          tagline: 'Your Trusted Daily Store',
          address: '14 B.B. Ganguly Street, Kolkata - 700012',
          phone: '9830123456',
          gstin: '19AAAPG1234A1Z5',
          state_code: '19',
          state_name: 'West Bengal',
          tax_scheme: 'REGULAR',
          invoice_prefix: 'SB/26-27/',
          upi_id: 'guptakirana@okicici',
          language: 'en',
          onboarding_complete: true,
          demo_mode: true,
        },
      });

      // Initialize counter
      await db.counters.put({
        series_doc_fy: 'DEFAULT:TAX_INVOICE:2026-2027',
        series: 'DEFAULT',
        doc_type: 'TAX_INVOICE',
        financial_year: '2026-2027',
        next_number: 101,
      });

      // Sample Invoice 1 (Cash Sale)
      const inv1: InvoiceRecord = {
        id: 'inv-demo-100',
        doc_type: 'TAX_INVOICE',
        financial_year: '2026-2027',
        series: 'DEFAULT',
        invoice_number: 'SB/26-27/0100',
        issue_at: new Date(Date.now() - 3600000 * 2).toISOString(),
        party_name: 'Walk-in Customer',
        place_of_supply_state_code: '19',
        is_inter_state: false,
        gross_amount_paise: 51500,
        discount_amount_paise: 0,
        taxable_value_paise: 48500,
        cgst_paise: 1500,
        sgst_paise: 1500,
        igst_paise: 0,
        cess_paise: 0,
        round_off_paise: 0,
        grand_total_paise: 51500,
        paid_amount_paise: 51500,
        balance_due_paise: 0,
        status: 'FINALIZED',
        payment_mode_summary: 'CASH',
        sync_status: 'LOCAL',
        updated_at: now,
      };
      await db.invoices.put(inv1);
    }
  );
}

export async function clearDemoData(): Promise<void> {
  await db.transaction(
    'rw',
    [
      db.products,
      db.parties,
      db.invoices,
      db.invoice_lines,
      db.payments,
      db.stock_movements,
      db.ledger_entries,
      db.held_bills,
      db.counters,
      db.meta,
    ],
    async () => {
      await db.products.clear();
      await db.parties.clear();
      await db.invoices.clear();
      await db.invoice_lines.clear();
      await db.payments.clear();
      await db.stock_movements.clear();
      await db.ledger_entries.clear();
      await db.held_bills.clear();
      await db.counters.clear();
      await db.meta.clear();
    }
  );
}
