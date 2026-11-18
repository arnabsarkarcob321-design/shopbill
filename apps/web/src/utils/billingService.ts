import {
  calculateInvoice,
  DocumentType,
  GstLineInput,
  InvoiceCalculationResult,
  TaxScheme,
} from '@shopbill/gst-engine';
import { createPrintModel, PrintModel } from '@shopbill/print-model';
import {
  db,
  InvoiceRecord,
  InvoiceLineRecord,
  PaymentRecordItem,
  StockMovementRecord,
} from '../db';

export interface QuickSellParams {
  productId: string;
  quantityUnits: number;
  unitPriceRupees?: number | undefined;
  customerName?: string | undefined;
  customerPhone?: string | undefined;
  customerGstin?: string | undefined;
  customerAddress?: string | undefined;
  paymentMode: 'CASH' | 'UPI' | 'CARD' | 'CREDIT';
  shopProfile?: any;
}

export interface QuickSellResult {
  invoice: InvoiceRecord;
  lines: InvoiceLineRecord[];
  printModel: PrintModel;
  remainingStockUnits: number;
  soldQuantityUnits: number;
  grandTotalRupees: number;
}

/**
 * Executes a direct sale of a product:
 * 1. Deducts quantity from stock in db.products.
 * 2. Records stock movement (SALE).
 * 3. Allocates sequential invoice number and creates official GST bill records.
 * 4. Records payment in db.payments.
 * 5. Generates PrintModel ready for thermal/A4 printing and WhatsApp sharing.
 */
export async function sellProductAndCreateBill(
  params: QuickSellParams
): Promise<QuickSellResult> {
  const {
    productId,
    quantityUnits,
    customerName = 'Walk-in Customer',
    customerPhone,
    customerGstin,
    customerAddress,
    paymentMode,
    shopProfile,
  } = params;

  if (quantityUnits <= 0) {
    throw new Error('Quantity must be greater than 0.');
  }

  const product = await db.products.get(productId);
  if (!product) {
    throw new Error('Product not found in catalogue.');
  }

  const quantityMilli = Math.round(quantityUnits * 1000);
  const unitPricePaise =
    params.unitPriceRupees !== undefined
      ? Math.round(params.unitPriceRupees * 100)
      : product.selling_price_paise;

  const now = new Date().toISOString();
  const invoiceId = `inv-${Date.now()}`;
  const financialYear = '2026-2027';
  const docType: DocumentType = 'TAX_INVOICE';
  const invoicePrefix = shopProfile?.invoice_prefix || 'SB/26-27/';
  const shopStateCode = shopProfile?.state_code || '19';
  const taxScheme: TaxScheme = shopProfile?.tax_scheme || 'REGULAR';

  // Build GST Line Input
  const gstLine: GstLineInput = {
    id: `line-${Date.now()}`,
    product_id: product.id,
    product_name: product.name,
    hsn_sac: product.hsn_sac,
    quantity_milli: quantityMilli,
    unit_price_paise: unitPricePaise,
    is_tax_inclusive: product.is_tax_inclusive,
    gst_rate_bps: product.gst_rate_bps,
    cess_rate_bps: product.cess_rate_bps || 0,
  };

  // Run official Indian GST Calculation
  const calculation: InvoiceCalculationResult = calculateInvoice([gstLine], {
    supplier_state_code: shopStateCode,
    place_of_supply_state_code: shopStateCode,
    tax_scheme: taxScheme,
    document_type: docType,
    invoice_discount_type: 'PERCENT',
    invoice_discount_value: 0,
  });

  const calcLine = calculation.lines[0]!;
  const grandTotalPaise = calculation.grand_total_paise;
  const paidAmountPaise = paymentMode === 'CREDIT' ? 0 : grandTotalPaise;
  const balanceDuePaise = paymentMode === 'CREDIT' ? grandTotalPaise : 0;

  let allocatedInvoiceNumber = '';
  const newStockMilli = product.current_stock_milli - quantityMilli;

  let createdInvoice: InvoiceRecord | null = null;
  let createdLine: InvoiceLineRecord | null = null;

  // ATOMIC DATABASE TRANSACTION
  await db.transaction(
    'rw',
    [
      db.counters,
      db.invoices,
      db.invoice_lines,
      db.payments,
      db.stock_movements,
      db.products,
    ],
    async () => {
      // 1. Counter allocation
      const counterKey = `DEFAULT:${docType}:${financialYear}`;
      const counter = await db.counters.get(counterKey);
      const seqNumber = counter ? counter.next_number : 101;
      await db.counters.put({
        series_doc_fy: counterKey,
        series: 'DEFAULT',
        doc_type: docType,
        financial_year: financialYear,
        next_number: seqNumber + 1,
      });

      const paddedSeq = seqNumber.toString().padStart(4, '0');
      allocatedInvoiceNumber = `${invoicePrefix}${paddedSeq}`;

      // 2. Invoice Record
      createdInvoice = {
        id: invoiceId,
        doc_type: docType,
        financial_year: financialYear,
        series: 'DEFAULT',
        invoice_number: allocatedInvoiceNumber,
        issue_at: now,
        party_name: customerName.trim() || 'Walk-in Customer',
        party_phone: customerPhone?.trim() || undefined,
        party_gstin: customerGstin?.trim() || undefined,
        place_of_supply_state_code: shopStateCode,
        is_inter_state: calculation.is_inter_state,
        gross_amount_paise: calculation.gross_amount_paise,
        discount_amount_paise: 0,
        taxable_value_paise: calculation.total_taxable_value_paise,
        cgst_paise: calculation.cgst_amount_paise,
        sgst_paise: calculation.sgst_amount_paise,
        igst_paise: calculation.igst_amount_paise,
        cess_paise: calculation.cess_amount_paise,
        round_off_paise: calculation.round_off_paise,
        grand_total_paise: calculation.grand_total_paise,
        paid_amount_paise: paidAmountPaise,
        balance_due_paise: balanceDuePaise,
        status: 'FINALIZED',
        payment_mode_summary: paymentMode,
        sync_status: 'LOCAL',
        updated_at: now,
      };
      await db.invoices.put(createdInvoice);

      // 3. Invoice Line Record
      createdLine = {
        id: `invl-${invoiceId}-1`,
        invoice_id: invoiceId,
        product_id: product.id,
        product_name: product.name,
        hsn_sac: product.hsn_sac,
        quantity_milli: quantityMilli,
        unit_price_paise: unitPricePaise,
        is_tax_inclusive: product.is_tax_inclusive,
        line_discount_paise: 0,
        taxable_value_paise: calcLine.net_taxable_value_paise,
        gst_rate_bps: calcLine.gst_rate_bps,
        cgst_paise: calcLine.cgst_amount_paise,
        sgst_paise: calcLine.sgst_amount_paise,
        igst_paise: calcLine.igst_amount_paise,
        cess_paise: calcLine.cess_amount_paise,
        line_total_paise: calcLine.line_total_paise,
      };
      await db.invoice_lines.put(createdLine);

      // 4. CRITICAL: Deduct Stock Quantity from Product
      await db.products.update(product.id, {
        current_stock_milli: newStockMilli,
        updated_at: now,
      });

      // 5. Stock Movement Audit Trail
      const movement: StockMovementRecord = {
        id: `sm-sale-${invoiceId}-1`,
        product_id: product.id,
        movement_type: 'SALE',
        quantity_delta_milli: -quantityMilli, // negative = stock deduction
        reference_type: 'INVOICE',
        reference_id: invoiceId,
        reason: `Quick Sale Bill #${allocatedInvoiceNumber}`,
        occurred_at: now,
      };
      await db.stock_movements.put(movement);

      // 6. Payment Record
      if (paidAmountPaise > 0) {
        const paymentRecord: PaymentRecordItem = {
          id: `pmt-${invoiceId}-1`,
          invoice_id: invoiceId,
          mode: paymentMode,
          purpose: 'SALE_TENDER',
          amount_paise: paidAmountPaise,
          received_at: now,
        };
        await db.payments.put(paymentRecord);
      }
    }
  );

  // Build canonical PrintModel for thermal & A4 billing
  const printModel = createPrintModel({
    shop: {
      name: shopProfile?.name || 'My Store',
      address: shopProfile?.address || 'Retail Counter',
      phone: shopProfile?.phone || '9876543210',
      gstin: shopProfile?.gstin,
      state_code: shopStateCode,
      state_name: shopProfile?.state_name || 'State',
      upi_id: shopProfile?.upi_id,
      tax_scheme: taxScheme,
      tagline: shopProfile?.tagline,
    },
    customer: customerName !== 'Walk-in Customer' ? {
      name: customerName,
      phone: customerPhone,
      gstin: customerGstin,
      address: customerAddress,
      state_code: shopStateCode,
    } : undefined,
    documentType: docType,
    invoiceNumber: allocatedInvoiceNumber,
    issueDate: now,
    calculation,
    payments: paidAmountPaise > 0 ? [{ mode: paymentMode, amount_paise: paidAmountPaise }] : [],
    balanceDuePaise,
  });

  return {
    invoice: createdInvoice!,
    lines: [createdLine!],
    printModel,
    remainingStockUnits: Math.round((newStockMilli / 1000) * 100) / 100,
    soldQuantityUnits: quantityUnits,
    grandTotalRupees: grandTotalPaise / 100,
  };
}

/**
 * Reconstructs a full PrintModel from an existing invoice in IndexedDB.
 */
export async function buildPrintModelFromInvoice(
  invoice: InvoiceRecord,
  shopProfile: any
): Promise<PrintModel> {
  const lines = await db.invoice_lines.where('invoice_id').equals(invoice.id).toArray();

  const calculation: InvoiceCalculationResult = {
    lines: lines.map((l) => ({
      id: l.id,
      product_id: l.product_id,
      product_name: l.product_name,
      hsn_sac: l.hsn_sac,
      quantity_milli: l.quantity_milli,
      unit_price_paise: l.unit_price_paise,
      is_tax_inclusive: l.is_tax_inclusive,
      gross_amount_paise: l.taxable_value_paise,
      line_discount_paise: l.line_discount_paise,
      prorated_invoice_discount_paise: 0,
      net_taxable_value_paise: l.taxable_value_paise,
      gst_rate_bps: l.gst_rate_bps,
      cess_rate_bps: l.cess_paise > 0 ? 1200 : 0,
      is_inter_state: invoice.is_inter_state,
      cgst_rate_bps: Math.floor(l.gst_rate_bps / 2),
      cgst_amount_paise: l.cgst_paise,
      sgst_rate_bps: Math.floor(l.gst_rate_bps / 2),
      sgst_amount_paise: l.sgst_paise,
      igst_rate_bps: invoice.is_inter_state ? l.gst_rate_bps : 0,
      igst_amount_paise: l.igst_paise,
      cess_amount_paise: l.cess_paise,
      total_tax_paise: l.cgst_paise + l.sgst_paise + l.igst_paise + l.cess_paise,
      line_total_paise: l.line_total_paise,
    })),
    gross_amount_paise: invoice.gross_amount_paise,
    total_line_discount_paise: invoice.discount_amount_paise,
    invoice_discount_paise: 0,
    total_taxable_value_paise: invoice.taxable_value_paise,
    cgst_amount_paise: invoice.cgst_paise,
    sgst_amount_paise: invoice.sgst_paise,
    igst_amount_paise: invoice.igst_paise,
    cess_amount_paise: invoice.cess_paise,
    total_tax_paise: invoice.cgst_paise + invoice.sgst_paise + invoice.igst_paise + invoice.cess_paise,
    subtotal_paise: invoice.grand_total_paise - invoice.round_off_paise,
    round_off_paise: invoice.round_off_paise,
    grand_total_paise: invoice.grand_total_paise,
    is_inter_state: invoice.is_inter_state,
    tax_slabs: [],
    hsn_summary: [],
    engine_version: '1.0.0',
  };

  return createPrintModel({
    shop: {
      name: shopProfile?.name || 'My Store',
      address: shopProfile?.address || 'Retail Counter',
      phone: shopProfile?.phone || '9876543210',
      gstin: shopProfile?.gstin,
      state_code: shopProfile?.state_code || invoice.place_of_supply_state_code,
      state_name: shopProfile?.state_name || 'State',
      upi_id: shopProfile?.upi_id,
      tax_scheme: shopProfile?.tax_scheme || 'REGULAR',
      tagline: shopProfile?.tagline,
    },
    customer: invoice.party_name !== 'Walk-in Customer' ? {
      name: invoice.party_name,
      phone: invoice.party_phone,
      gstin: invoice.party_gstin,
      state_code: invoice.place_of_supply_state_code,
    } : undefined,
    documentType: invoice.doc_type,
    invoiceNumber: invoice.invoice_number,
    issueDate: invoice.issue_at,
    calculation,
    payments: [{ mode: invoice.payment_mode_summary as any, amount_paise: invoice.paid_amount_paise }],
    balanceDuePaise: invoice.balance_due_paise,
  });
}
