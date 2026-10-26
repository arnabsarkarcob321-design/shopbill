import {
  DocumentType,
  InvoiceCalculationResult,
  TaxScheme,
} from '@shopbill/gst-engine';
import { amountInWords, formatCurrency, formatQuantity } from '@shopbill/i18n';

export interface ShopPrintProfile {
  name: string;
  address: string;
  phone: string;
  gstin?: string;
  state_code: string;
  state_name: string;
  upi_id?: string;
  tax_scheme: TaxScheme;
  tagline?: string;
  logo_url?: string;
}

export interface PartyPrintProfile {
  name: string;
  phone?: string;
  gstin?: string;
  address?: string;
  state_code?: string;
  state_name?: string;
}

export interface PaymentRecord {
  mode: 'CASH' | 'UPI' | 'CARD' | 'CHEQUE' | 'CREDIT' | 'OTHER';
  amount_paise: number;
  reference?: string;
}

export interface PrintLineItem {
  sl_no: number;
  name: string;
  hsn_sac: string;
  quantity_formatted: string;
  unit_price_formatted: string;
  discount_formatted?: string | undefined;
  taxable_formatted: string;
  gst_rate_pct: string;
  cgst_formatted: string;
  sgst_formatted: string;
  igst_formatted: string;
  cess_formatted: string;
  total_formatted: string;
}

export interface PrintModel {
  shop: ShopPrintProfile;
  customer?: PartyPrintProfile | undefined;
  document: {
    type: DocumentType;
    title: string; // e.g. "TAX INVOICE" or "BILL OF SUPPLY"
    invoice_number: string;
    issue_date: string; // formatted e.g. "26/10/2026 17:30"
    place_of_supply: string;
    is_inter_state: boolean;
    reverse_charge: boolean;
    original_invoice_ref?: string | undefined; // for Credit Note / Return
  };
  lines: PrintLineItem[];
  totals: {
    gross_amount: string;
    total_discount: string;
    taxable_value: string;
    cgst: string;
    sgst: string;
    igst: string;
    cess: string;
    subtotal: string;
    round_off: string;
    grand_total: string;
    amount_in_words: string;
  };
  tax_slabs: Array<{
    rate_label: string;
    taxable: string;
    cgst: string;
    sgst: string;
    igst: string;
    cess: string;
    total_tax: string;
  }>;
  payments: Array<{
    mode: string;
    amount: string;
    reference?: string | undefined;
  }>;
  balance_due?: string | undefined;
  upi_qr_payload?: string | undefined;
  statutory_notices: string[];
  terms: string[];
}

/**
 * Builds an immutable, canonical PrintModel from shop profile, party, and GST calculation result.
 */
export function createPrintModel(params: {
  shop: ShopPrintProfile;
  customer?: PartyPrintProfile;
  documentType: DocumentType;
  invoiceNumber: string;
  issueDate: Date | string;
  calculation: InvoiceCalculationResult;
  payments?: PaymentRecord[];
  balanceDuePaise?: number;
  customTerms?: string[];
  originalInvoiceRef?: string;
}): PrintModel {
  const { shop, customer, documentType, invoiceNumber, issueDate, calculation } = params;

  let title = 'TAX INVOICE';
  if (shop.tax_scheme === 'COMPOSITION' || documentType === 'BILL_OF_SUPPLY') {
    title = 'BILL OF SUPPLY';
  } else if (documentType === 'CREDIT_NOTE') {
    title = 'CREDIT NOTE';
  } else if (documentType === 'DEBIT_NOTE') {
    title = 'DEBIT NOTE';
  } else if (documentType === 'QUOTATION') {
    title = 'QUOTATION / ESTIMATE';
  } else if (documentType === 'DELIVERY_CHALLAN') {
    title = 'DELIVERY CHALLAN';
  }

  const statutoryNotices: string[] = [];
  if (shop.tax_scheme === 'COMPOSITION') {
    statutoryNotices.push(
      'Composition taxable person, not eligible to collect tax on supplies.'
    );
  }

  const lines: PrintLineItem[] = calculation.lines.map((l, index) => {
    const totalLineDiscount = l.line_discount_paise + l.prorated_invoice_discount_paise;
    return {
      sl_no: index + 1,
      name: l.product_name,
      hsn_sac: l.hsn_sac || '-',
      quantity_formatted: formatQuantity(l.quantity_milli),
      unit_price_formatted: formatCurrency(l.unit_price_paise),
      discount_formatted: totalLineDiscount > 0 ? formatCurrency(totalLineDiscount) : undefined,
      taxable_formatted: formatCurrency(l.net_taxable_value_paise),
      gst_rate_pct: `${(l.gst_rate_bps / 100).toFixed(0)}%`,
      cgst_formatted: formatCurrency(l.cgst_amount_paise),
      sgst_formatted: formatCurrency(l.sgst_amount_paise),
      igst_formatted: formatCurrency(l.igst_amount_paise),
      cess_formatted: formatCurrency(l.cess_amount_paise),
      total_formatted: formatCurrency(l.line_total_paise),
    };
  });

  const totals = {
    gross_amount: formatCurrency(calculation.gross_amount_paise),
    total_discount: formatCurrency(
      calculation.total_line_discount_paise + calculation.invoice_discount_paise
    ),
    taxable_value: formatCurrency(calculation.total_taxable_value_paise),
    cgst: formatCurrency(calculation.cgst_amount_paise),
    sgst: formatCurrency(calculation.sgst_amount_paise),
    igst: formatCurrency(calculation.igst_amount_paise),
    cess: formatCurrency(calculation.cess_amount_paise),
    subtotal: formatCurrency(calculation.subtotal_paise),
    round_off: formatCurrency(calculation.round_off_paise),
    grand_total: formatCurrency(calculation.grand_total_paise),
    amount_in_words: amountInWords(calculation.grand_total_paise),
  };

  const taxSlabs = calculation.tax_slabs.map((s) => ({
    rate_label: `${(s.gst_rate_bps / 100).toFixed(0)}%`,
    taxable: formatCurrency(s.taxable_paise),
    cgst: formatCurrency(s.cgst_paise),
    sgst: formatCurrency(s.sgst_paise),
    igst: formatCurrency(s.igst_paise),
    cess: formatCurrency(s.cess_paise),
    total_tax: formatCurrency(s.total_tax_paise),
  }));

  const payments = (params.payments ?? []).map((p) => ({
    mode: p.mode,
    amount: formatCurrency(p.amount_paise),
    reference: p.reference,
  }));

  const balanceDue =
    params.balanceDuePaise !== undefined && params.balanceDuePaise > 0
      ? formatCurrency(params.balanceDuePaise)
      : undefined;

  let upiQrPayload: string | undefined = undefined;
  if (shop.upi_id) {
    const amountRupees = (calculation.grand_total_paise / 100).toFixed(2);
    const shopNameEnc = encodeURIComponent(shop.name);
    upiQrPayload = `upi://pay?pa=${shop.upi_id}&pn=${shopNameEnc}&am=${amountRupees}&cu=INR&tn=${invoiceNumber}`;
  }

  const dateStr =
    typeof issueDate === 'string'
      ? issueDate
      : issueDate.toLocaleDateString('en-IN', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        });

  return {
    shop,
    customer,
    document: {
      type: documentType,
      title,
      invoice_number: invoiceNumber,
      issue_date: dateStr,
      place_of_supply: customer?.state_name ?? shop.state_name,
      is_inter_state: calculation.is_inter_state,
      reverse_charge: false,
      original_invoice_ref: params.originalInvoiceRef,
    },
    lines,
    totals,
    tax_slabs: taxSlabs,
    payments,
    balance_due: balanceDue,
    upi_qr_payload: upiQrPayload,
    statutory_notices: statutoryNotices,
    terms: params.customTerms ?? [
      'Goods once sold are non-refundable unless defective.',
      'Thank you for your business!',
    ],
  };
}
