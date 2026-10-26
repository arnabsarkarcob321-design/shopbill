import Dexie, { type EntityTable } from 'dexie';
import { DocumentType } from '@shopbill/gst-engine';

export interface ProductRecord {
  id: string;
  sku: string;
  barcodes: string[];
  name: string;
  name_hindi?: string | undefined;
  name_bengali?: string | undefined;
  category: string;
  hsn_sac: string;
  unit: string;
  gst_rate_bps: number;
  cess_rate_bps?: number | undefined;
  mrp_paise: number;
  selling_price_paise: number;
  purchase_price_paise: number;
  is_tax_inclusive: boolean;
  min_stock_milli: number;
  current_stock_milli: number;
  is_archived: boolean;
  updated_at: string;
}

export interface PartyRecord {
  id: string;
  name: string;
  phone?: string | undefined;
  gstin?: string | undefined;
  party_type: 'CUSTOMER' | 'SUPPLIER' | 'BOTH';
  state_code?: string | undefined;
  state_name?: string | undefined;
  address?: string | undefined;
  balance_paise: number;
  credit_limit_paise?: number | undefined;
  updated_at: string;
}

export interface InvoiceRecord {
  id: string;
  doc_type: DocumentType;
  financial_year: string;
  series: string;
  invoice_number: string;
  issue_at: string;
  party_id?: string | undefined;
  party_name: string;
  party_phone?: string | undefined;
  party_gstin?: string | undefined;
  place_of_supply_state_code: string;
  is_inter_state: boolean;
  gross_amount_paise: number;
  discount_amount_paise: number;
  taxable_value_paise: number;
  cgst_paise: number;
  sgst_paise: number;
  igst_paise: number;
  cess_paise: number;
  round_off_paise: number;
  grand_total_paise: number;
  paid_amount_paise: number;
  balance_due_paise: number;
  status: 'FINALIZED' | 'CANCELLED';
  cancellation_reason?: string | undefined;
  original_invoice_id?: string | undefined;
  payment_mode_summary: string;
  sync_status: 'LOCAL' | 'PENDING' | 'SYNCED';
  updated_at: string;
}

export interface InvoiceLineRecord {
  id: string;
  invoice_id: string;
  product_id: string;
  product_name: string;
  hsn_sac: string;
  quantity_milli: number;
  unit_price_paise: number;
  is_tax_inclusive: boolean;
  line_discount_paise: number;
  taxable_value_paise: number;
  gst_rate_bps: number;
  cgst_paise: number;
  sgst_paise: number;
  igst_paise: number;
  cess_paise: number;
  line_total_paise: number;
}

export interface PaymentRecordItem {
  id: string;
  invoice_id?: string | undefined;
  party_id?: string | undefined;
  mode: 'CASH' | 'UPI' | 'CARD' | 'CHEQUE' | 'CREDIT' | 'OTHER';
  purpose: 'SALE_TENDER' | 'CUSTOMER_RECEIPT' | 'SUPPLIER_PAYMENT' | 'REFUND';
  amount_paise: number;
  reference?: string | undefined;
  received_at: string;
}

export interface StockMovementRecord {
  id: string;
  product_id: string;
  movement_type:
    | 'OPENING_STOCK'
    | 'PURCHASE_INWARD'
    | 'SALE'
    | 'SALES_RETURN_RESTOCK'
    | 'SALES_RETURN_DAMAGED'
    | 'STOCK_ADJUSTMENT'
    | 'CANCELLATION_REVERSAL';
  quantity_delta_milli: number;
  reference_type: 'INVOICE' | 'PURCHASE' | 'RETURN' | 'ADJUSTMENT' | 'OPENING';
  reference_id?: string | undefined;
  reason?: string | undefined;
  occurred_at: string;
}

export interface LedgerEntryRecord {
  id: string;
  party_id: string;
  direction: 'DEBIT' | 'CREDIT';
  amount_paise: number;
  balance_after_paise: number;
  reference_type: 'INVOICE' | 'PAYMENT' | 'RETURN' | 'OPENING';
  reference_id?: string | undefined;
  notes?: string | undefined;
  occurred_at: string;
}

export interface HeldBillRecord {
  id: string;
  label: string;
  customer_name: string;
  customer_id?: string | undefined;
  line_count: number;
  grand_total_paise: number;
  cart_json: string;
  updated_at: string;
}

export interface CounterRecord {
  series_doc_fy: string; // Composite key e.g. "DEFAULT:TAX_INVOICE:2026-2027"
  series: string;
  doc_type: string;
  financial_year: string;
  next_number: number;
}

export interface DayCloseSessionRecord {
  id: string;
  session_date: string; // YYYY-MM-DD
  opening_cash_paise: number;
  cash_sales_paise: number;
  cash_recoveries_paise: number;
  cash_refunds_paise: number;
  expected_cash_paise: number;
  actual_cash_paise: number;
  variance_paise: number; // actual - expected
  upi_sales_paise: number;
  upi_recoveries_paise: number;
  total_turnover_paise: number;
  total_bills_count: number;
  status: 'OPEN' | 'CLOSED';
  notes?: string;
  closed_at?: string;
}

export interface ShopMetaRecord {
  key: string;
  value: any;
}

export class ShopBillDatabase extends Dexie {
  products!: EntityTable<ProductRecord, 'id'>;
  parties!: EntityTable<PartyRecord, 'id'>;
  invoices!: EntityTable<InvoiceRecord, 'id'>;
  invoice_lines!: EntityTable<InvoiceLineRecord, 'id'>;
  payments!: EntityTable<PaymentRecordItem, 'id'>;
  stock_movements!: EntityTable<StockMovementRecord, 'id'>;
  ledger_entries!: EntityTable<LedgerEntryRecord, 'id'>;
  held_bills!: EntityTable<HeldBillRecord, 'id'>;
  counters!: EntityTable<CounterRecord, 'series_doc_fy'>;
  day_close_sessions!: EntityTable<DayCloseSessionRecord, 'id'>;
  meta!: EntityTable<ShopMetaRecord, 'key'>;

  constructor() {
    super('ShopBillDB');

    // Numbered migrations version 1
    this.version(1).stores({
      products: 'id, sku, *barcodes, name, category, hsn_sac, is_archived, updated_at',
      parties: 'id, name, phone, gstin, party_type, updated_at',
      invoices:
        'id, invoice_number, doc_type, issue_at, party_id, status, sync_status, updated_at',
      invoice_lines: 'id, invoice_id, product_id',
      payments: 'id, invoice_id, party_id, mode, received_at',
      stock_movements: 'id, product_id, movement_type, occurred_at',
      ledger_entries: 'id, party_id, direction, occurred_at',
      held_bills: 'id, updated_at',
      counters: 'series_doc_fy',
      day_close_sessions: 'id, session_date, status',
      meta: 'key',
    });
  }
}

export const db = new ShopBillDatabase();
