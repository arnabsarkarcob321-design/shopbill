/**
 * Pure Domain and Calculation Types for ShopBill GST Engine.
 * All monetary amounts are integer paise (1 INR = 100 paise).
 * All tax rates are integer basis points (18% = 1800 bps, 5% = 500 bps).
 * All quantities are integer thousandths (1 unit = 1000 milli).
 */

export type Paise = number; // Integer representing paise
export type BasisPoints = number; // Integer representing 0.01% (100 bps = 1.00%)
export type QuantityMilli = number; // Integer representing thousandths (1000 = 1.000)

export type TaxScheme = 'REGULAR' | 'COMPOSITION' | 'UNREGISTERED';

export type TaxTreatment = 'TAXABLE' | 'EXEMPT' | 'NIL_RATED' | 'NON_GST';

export type DocumentType =
  | 'TAX_INVOICE'
  | 'BILL_OF_SUPPLY'
  | 'CREDIT_NOTE'
  | 'DEBIT_NOTE'
  | 'SALES_RETURN'
  | 'QUOTATION'
  | 'DELIVERY_CHALLAN';

export type DiscountType = 'PERCENT' | 'AMOUNT';

export interface GstLineInput {
  id: string;
  product_id: string;
  product_name: string;
  hsn_sac: string;
  quantity_milli: QuantityMilli;
  unit_price_paise: Paise;
  is_tax_inclusive: boolean;
  gst_rate_bps: BasisPoints; // e.g. 1800
  cess_rate_bps?: BasisPoints; // default 0
  discount_type?: DiscountType;
  discount_value?: number; // e.g., 10 for 10% or 5000 for 5000 paise (Rs 50)
  tax_treatment?: TaxTreatment;
}

export interface GstLineCalculation {
  id: string;
  product_id: string;
  product_name: string;
  hsn_sac: string;
  quantity_milli: QuantityMilli;
  unit_price_paise: Paise;
  is_tax_inclusive: boolean;
  gross_amount_paise: Paise;
  line_discount_paise: Paise;
  prorated_invoice_discount_paise: Paise;
  net_taxable_value_paise: Paise;
  gst_rate_bps: BasisPoints;
  cess_rate_bps: BasisPoints;
  is_inter_state: boolean;
  cgst_rate_bps: BasisPoints;
  cgst_amount_paise: Paise;
  sgst_rate_bps: BasisPoints;
  sgst_amount_paise: Paise;
  igst_rate_bps: BasisPoints;
  igst_amount_paise: Paise;
  cess_amount_paise: Paise;
  total_tax_paise: Paise;
  line_total_paise: Paise;
}

export interface TaxSlabSummary {
  gst_rate_bps: BasisPoints;
  taxable_paise: Paise;
  cgst_paise: Paise;
  sgst_paise: Paise;
  igst_paise: Paise;
  cess_paise: Paise;
  total_tax_paise: Paise;
}

export interface HsnSummaryItem {
  hsn_sac: string;
  total_quantity_milli: QuantityMilli;
  taxable_paise: Paise;
  cgst_paise: Paise;
  sgst_paise: Paise;
  igst_paise: Paise;
  cess_paise: Paise;
  total_tax_paise: Paise;
}

export interface InvoiceCalculationContext {
  supplier_state_code: string; // 2-digit GST state code e.g. '19' (West Bengal)
  place_of_supply_state_code: string; // 2-digit GST state code e.g. '19' or '27'
  tax_scheme: TaxScheme; // 'REGULAR' | 'COMPOSITION' | 'UNREGISTERED'
  document_type: DocumentType;
  invoice_discount_type?: DiscountType;
  invoice_discount_value?: number;
}

export interface InvoiceCalculationResult {
  lines: GstLineCalculation[];
  gross_amount_paise: Paise;
  total_line_discount_paise: Paise;
  invoice_discount_paise: Paise;
  total_taxable_value_paise: Paise;
  cgst_amount_paise: Paise;
  sgst_amount_paise: Paise;
  igst_amount_paise: Paise;
  cess_amount_paise: Paise;
  total_tax_paise: Paise;
  subtotal_paise: Paise;
  round_off_paise: Paise; // e.g. -45 or +20 paise to round to nearest rupee
  grand_total_paise: Paise;
  is_inter_state: boolean;
  tax_slabs: TaxSlabSummary[];
  hsn_summary: HsnSummaryItem[];
  engine_version: string;
}
