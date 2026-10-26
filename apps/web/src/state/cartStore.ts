import { create } from 'zustand';
import {
  calculateInvoice,
  DocumentType,
  GstLineInput,
  InvoiceCalculationResult,
  TaxScheme,
} from '@shopbill/gst-engine';
import { db, HeldBillRecord, InvoiceRecord, PartyRecord, ProductRecord } from '../db';

export interface CartLineItem extends GstLineInput {
  current_stock_milli?: number;
  unit: string;
}

export interface PaymentEntry {
  mode: 'CASH' | 'UPI' | 'CARD' | 'CHEQUE' | 'CREDIT' | 'OTHER';
  amount_paise: number;
  reference?: string;
}

interface CartState {
  // Cart Content
  lines: CartLineItem[];
  selectedParty: PartyRecord | null;
  documentType: DocumentType;
  invoiceDiscountType: 'PERCENT' | 'AMOUNT';
  invoiceDiscountValue: number;
  calculation: InvoiceCalculationResult;

  // Active Drafts / Held Bills
  activeHeldBillId: string | null;
  heldBillsList: HeldBillRecord[];

  // Actions
  addItem: (product: ProductRecord, qtyMilli?: number) => void;
  updateQuantity: (productId: string, qtyMilli: number) => void;
  updateLineDiscount: (
    productId: string,
    discountType: 'PERCENT' | 'AMOUNT',
    discountValue: number
  ) => void;
  updateUnitPrice: (productId: string, newPricePaise: number) => void;
  removeItem: (productId: string) => void;
  clearCart: () => void;
  setParty: (party: PartyRecord | null) => void;
  setDocumentType: (type: DocumentType) => void;
  setInvoiceDiscount: (type: 'PERCENT' | 'AMOUNT', value: number) => void;

  // Hold & Resume
  holdCurrentBill: () => Promise<void>;
  resumeHeldBill: (id: string) => Promise<void>;
  deleteHeldBill: (id: string) => Promise<void>;
  loadHeldBills: () => Promise<void>;

  // Atomic Checkout
  finaliseInvoice: (params: {
    payments: PaymentEntry[];
    shopStateCode: string;
    taxScheme: TaxScheme;
    invoicePrefix: string;
    financialYear: string;
  }) => Promise<{ invoiceNumber: string; grandTotalPaise: number }>;
}

function recompute(
  lines: CartLineItem[],
  selectedParty: PartyRecord | null,
  documentType: DocumentType,
  discountType: 'PERCENT' | 'AMOUNT',
  discountValue: number
): InvoiceCalculationResult {
  return calculateInvoice(lines, {
    supplier_state_code: '19', // default, overridden by shop settings
    place_of_supply_state_code: selectedParty?.state_code || '19',
    tax_scheme: 'REGULAR',
    document_type: documentType,
    invoice_discount_type: discountType,
    invoice_discount_value: discountValue,
  });
}

export const useCartStore = create<CartState>((set, get) => ({
  lines: [],
  selectedParty: null,
  documentType: 'TAX_INVOICE',
  invoiceDiscountType: 'PERCENT',
  invoiceDiscountValue: 0,
  calculation: recompute([], null, 'TAX_INVOICE', 'PERCENT', 0),
  activeHeldBillId: null,
  heldBillsList: [],

  addItem: (product: ProductRecord, qtyMilli = 1000) => {
    const { lines, selectedParty, documentType, invoiceDiscountType, invoiceDiscountValue } = get();
    const existingIndex = lines.findIndex((l) => l.product_id === product.id);

    let updatedLines: CartLineItem[];
    if (existingIndex >= 0) {
      updatedLines = lines.map((l, i) =>
        i === existingIndex
          ? { ...l, quantity_milli: l.quantity_milli + qtyMilli }
          : l
      );
    } else {
      const newLine: CartLineItem = {
        id: `line-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        product_id: product.id,
        product_name: product.name,
        hsn_sac: product.hsn_sac,
        quantity_milli: qtyMilli,
        unit_price_paise: product.selling_price_paise,
        is_tax_inclusive: product.is_tax_inclusive,
        gst_rate_bps: product.gst_rate_bps,
        cess_rate_bps: product.cess_rate_bps ?? 0,
        unit: product.unit,
        current_stock_milli: product.current_stock_milli,
      };
      updatedLines = [...lines, newLine];
    }

    const calculation = recompute(
      updatedLines,
      selectedParty,
      documentType,
      invoiceDiscountType,
      invoiceDiscountValue
    );
    set({ lines: updatedLines, calculation });
  },

  updateQuantity: (productId: string, qtyMilli: number) => {
    if (qtyMilli <= 0) {
      get().removeItem(productId);
      return;
    }
    const { lines, selectedParty, documentType, invoiceDiscountType, invoiceDiscountValue } = get();
    const updatedLines = lines.map((l) =>
      l.product_id === productId ? { ...l, quantity_milli: qtyMilli } : l
    );
    const calculation = recompute(
      updatedLines,
      selectedParty,
      documentType,
      invoiceDiscountType,
      invoiceDiscountValue
    );
    set({ lines: updatedLines, calculation });
  },

  updateLineDiscount: (
    productId: string,
    discountType: 'PERCENT' | 'AMOUNT',
    discountValue: number
  ) => {
    const { lines, selectedParty, documentType, invoiceDiscountType, invoiceDiscountValue } = get();
    const updatedLines = lines.map((l) =>
      l.product_id === productId
        ? { ...l, discount_type: discountType, discount_value: discountValue }
        : l
    );
    const calculation = recompute(
      updatedLines,
      selectedParty,
      documentType,
      invoiceDiscountType,
      invoiceDiscountValue
    );
    set({ lines: updatedLines, calculation });
  },

  updateUnitPrice: (productId: string, newPricePaise: number) => {
    const { lines, selectedParty, documentType, invoiceDiscountType, invoiceDiscountValue } = get();
    const updatedLines = lines.map((l) =>
      l.product_id === productId ? { ...l, unit_price_paise: Math.max(0, newPricePaise) } : l
    );
    const calculation = recompute(
      updatedLines,
      selectedParty,
      documentType,
      invoiceDiscountType,
      invoiceDiscountValue
    );
    set({ lines: updatedLines, calculation });
  },

  removeItem: (productId: string) => {
    const { lines, selectedParty, documentType, invoiceDiscountType, invoiceDiscountValue } = get();
    const updatedLines = lines.filter((l) => l.product_id !== productId);
    const calculation = recompute(
      updatedLines,
      selectedParty,
      documentType,
      invoiceDiscountType,
      invoiceDiscountValue
    );
    set({ lines: updatedLines, calculation });
  },

  clearCart: () => {
    const { documentType } = get();
    set({
      lines: [],
      selectedParty: null,
      invoiceDiscountType: 'PERCENT',
      invoiceDiscountValue: 0,
      activeHeldBillId: null,
      calculation: recompute([], null, documentType, 'PERCENT', 0),
    });
  },

  setParty: (party: PartyRecord | null) => {
    const { lines, documentType, invoiceDiscountType, invoiceDiscountValue } = get();
    const calculation = recompute(
      lines,
      party,
      documentType,
      invoiceDiscountType,
      invoiceDiscountValue
    );
    set({ selectedParty: party, calculation });
  },

  setDocumentType: (type: DocumentType) => {
    const { lines, selectedParty, invoiceDiscountType, invoiceDiscountValue } = get();
    const calculation = recompute(
      lines,
      selectedParty,
      type,
      invoiceDiscountType,
      invoiceDiscountValue
    );
    set({ documentType: type, calculation });
  },

  setInvoiceDiscount: (type: 'PERCENT' | 'AMOUNT', value: number) => {
    const { lines, selectedParty, documentType } = get();
    const calculation = recompute(lines, selectedParty, documentType, type, value);
    set({ invoiceDiscountType: type, invoiceDiscountValue: value, calculation });
  },

  holdCurrentBill: async () => {
    const { lines, selectedParty, calculation, activeHeldBillId } = get();
    if (lines.length === 0) return;

    const id = activeHeldBillId || `held-${Date.now()}`;
    const heldBill: HeldBillRecord = {
      id,
      label: `Bill #${id.slice(-4)}`,
      customer_name: selectedParty?.name || 'Walk-in Customer',
      customer_id: selectedParty?.id,
      line_count: lines.length,
      grand_total_paise: calculation.grand_total_paise,
      cart_json: JSON.stringify({
        lines,
        selectedParty,
      }),
      updated_at: new Date().toISOString(),
    };

    await db.held_bills.put(heldBill);
    get().clearCart();
    await get().loadHeldBills();
  },

  resumeHeldBill: async (id: string) => {
    const held = await db.held_bills.get(id);
    if (!held) return;

    try {
      const data = JSON.parse(held.cart_json);
      const lines: CartLineItem[] = data.lines || [];
      const selectedParty: PartyRecord | null = data.selectedParty || null;
      const calculation = recompute(lines, selectedParty, 'TAX_INVOICE', 'PERCENT', 0);

      set({
        lines,
        selectedParty,
        activeHeldBillId: id,
        calculation,
      });

      // Remove from held table once resumed
      await db.held_bills.delete(id);
      await get().loadHeldBills();
    } catch (err) {
      console.error('Failed to parse held bill', err);
    }
  },

  deleteHeldBill: async (id: string) => {
    await db.held_bills.delete(id);
    await get().loadHeldBills();
  },

  loadHeldBills: async () => {
    const list = await db.held_bills.toArray();
    set({ heldBillsList: list });
  },

  finaliseInvoice: async (params) => {
    const { lines, selectedParty, documentType, calculation, activeHeldBillId } = get();
    if (lines.length === 0) {
      throw new Error('Cannot finalise empty cart');
    }

    const now = new Date().toISOString();
    const { payments, shopStateCode, invoicePrefix, financialYear } = params;

    // Calculate payment totals
    const totalPaidPaise = payments.reduce((acc, p) => acc + p.amount_paise, 0);
    const balanceDuePaise = Math.max(0, calculation.grand_total_paise - totalPaidPaise);

    // Require customer name for credit/udhaar
    if (balanceDuePaise > 0 && !selectedParty) {
      throw new Error('Customer details are required for Udhaar / Credit sales');
    }

    let allocatedInvoiceNumber = '';
    const invoiceId = `inv-${Date.now()}`;

    // ATOMIC TRANSACTION: Counters, Invoice, Lines, Payments, Stock Movements, Ledger
    await db.transaction(
      'rw',
      [
        db.counters,
        db.invoices,
        db.invoice_lines,
        db.payments,
        db.stock_movements,
        db.products,
        db.parties,
        db.ledger_entries,
        db.held_bills,
      ],
      async () => {
        // Step 1: Sequence number allocation
        const counterKey = `DEFAULT:${documentType}:${financialYear}`;
        const counter = await db.counters.get(counterKey);
        const seqNumber = counter ? counter.next_number : 101;
        await db.counters.put({
          series_doc_fy: counterKey,
          series: 'DEFAULT',
          doc_type: documentType,
          financial_year: financialYear,
          next_number: seqNumber + 1,
        });

        const paddedSeq = seqNumber.toString().padStart(4, '0');
        allocatedInvoiceNumber = `${invoicePrefix}${paddedSeq}`;

        // Step 2: Payment summary string
        const modeList = Array.from(new Set(payments.map((p) => p.mode)));
        const paymentSummary =
          modeList.length > 1
            ? `SPLIT (${modeList.join(', ')})`
            : modeList[0] || (balanceDuePaise > 0 ? 'CREDIT' : 'CASH');

        // Step 3: Insert Invoice Header
        const invoiceRecord: InvoiceRecord = {
          id: invoiceId,
          doc_type: documentType,
          financial_year: financialYear,
          series: 'DEFAULT',
          invoice_number: allocatedInvoiceNumber,
          issue_at: now,
          party_id: selectedParty?.id,
          party_name: selectedParty?.name || 'Walk-in Customer',
          party_phone: selectedParty?.phone,
          party_gstin: selectedParty?.gstin,
          place_of_supply_state_code: selectedParty?.state_code || shopStateCode,
          is_inter_state: calculation.is_inter_state,
          gross_amount_paise: calculation.gross_amount_paise,
          discount_amount_paise:
            calculation.total_line_discount_paise + calculation.invoice_discount_paise,
          taxable_value_paise: calculation.total_taxable_value_paise,
          cgst_paise: calculation.cgst_amount_paise,
          sgst_paise: calculation.sgst_amount_paise,
          igst_paise: calculation.igst_amount_paise,
          cess_paise: calculation.cess_amount_paise,
          round_off_paise: calculation.round_off_paise,
          grand_total_paise: calculation.grand_total_paise,
          paid_amount_paise: totalPaidPaise,
          balance_due_paise: balanceDuePaise,
          status: 'FINALIZED',
          payment_mode_summary: paymentSummary,
          sync_status: 'LOCAL',
          updated_at: now,
        };
        await db.invoices.put(invoiceRecord);

        // Step 4: Insert Invoice Lines
        for (const l of calculation.lines) {
          await db.invoice_lines.put({
            id: `invl-${invoiceId}-${l.id}`,
            invoice_id: invoiceId,
            product_id: l.product_id,
            product_name: l.product_name,
            hsn_sac: l.hsn_sac,
            quantity_milli: l.quantity_milli,
            unit_price_paise: l.unit_price_paise,
            is_tax_inclusive: l.is_tax_inclusive,
            line_discount_paise: l.line_discount_paise + l.prorated_invoice_discount_paise,
            taxable_value_paise: l.net_taxable_value_paise,
            gst_rate_bps: l.gst_rate_bps,
            cgst_paise: l.cgst_amount_paise,
            sgst_paise: l.sgst_amount_paise,
            igst_paise: l.igst_amount_paise,
            cess_paise: l.cess_amount_paise,
            line_total_paise: l.line_total_paise,
          });

          // Step 5: Append stock deduction movement and update product stock
          await db.stock_movements.put({
            id: `sm-sale-${invoiceId}-${l.id}`,
            product_id: l.product_id,
            movement_type: 'SALE',
            quantity_delta_milli: -l.quantity_milli, // deduction
            reference_type: 'INVOICE',
            reference_id: invoiceId,
            occurred_at: now,
          });

          const currentProd = await db.products.get(l.product_id);
          if (currentProd) {
            await db.products.update(l.product_id, {
              current_stock_milli: currentProd.current_stock_milli - l.quantity_milli,
              updated_at: now,
            });
          }
        }

        // Step 6: Insert Payments
        for (let i = 0; i < payments.length; i++) {
          const p = payments[i]!;
          if (p.amount_paise > 0) {
            await db.payments.put({
              id: `pmt-${invoiceId}-${i}`,
              invoice_id: invoiceId,
              party_id: selectedParty?.id,
              mode: p.mode,
              purpose: 'SALE_TENDER',
              amount_paise: p.amount_paise,
              reference: p.reference,
              received_at: now,
            });
          }
        }

        // Step 7: Update Customer Ledger if credit/udhaar involved
        if (selectedParty && balanceDuePaise > 0) {
          const newBalance = selectedParty.balance_paise + balanceDuePaise;
          await db.parties.update(selectedParty.id, {
            balance_paise: newBalance,
            updated_at: now,
          });

          await db.ledger_entries.put({
            id: `le-${invoiceId}`,
            party_id: selectedParty.id,
            direction: 'DEBIT',
            amount_paise: balanceDuePaise,
            balance_after_paise: newBalance,
            reference_type: 'INVOICE',
            reference_id: invoiceId,
            notes: `Bill #${allocatedInvoiceNumber} partial/credit sale`,
            occurred_at: now,
          });
        }

        // Step 8: Clean up held bill if finalising a held draft
        if (activeHeldBillId) {
          await db.held_bills.delete(activeHeldBillId);
        }
      }
    );

    // Reset cart state after successful commit
    get().clearCart();
    await get().loadHeldBills();

    return {
      invoiceNumber: allocatedInvoiceNumber,
      grandTotalPaise: calculation.grand_total_paise,
    };
  },
}));
