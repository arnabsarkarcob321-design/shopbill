import { describe, expect, it } from 'vitest';
import { calculateInvoice } from '../src/engine';
import { GstLineInput, InvoiceCalculationContext } from '../src/types';

describe('GST Calculation Engine', () => {
  it('calculates intra-state tax-exclusive 18% GST with CGST/SGST split', () => {
    const lines: GstLineInput[] = [
      {
        id: 'line-1',
        product_id: 'prod-1',
        product_name: 'Notebook 200 Pages',
        hsn_sac: '4820',
        quantity_milli: 2000, // 2 items
        unit_price_paise: 5000, // Rs 50.00 each
        is_tax_inclusive: false,
        gst_rate_bps: 1800, // 18%
      },
    ];

    const context: InvoiceCalculationContext = {
      supplier_state_code: '19',
      place_of_supply_state_code: '19',
      tax_scheme: 'REGULAR',
      document_type: 'TAX_INVOICE',
    };

    const res = calculateInvoice(lines, context);

    expect(res.is_inter_state).toBe(false);
    expect(res.gross_amount_paise).toBe(10000); // 2 * 50 = Rs 100.00
    expect(res.total_taxable_value_paise).toBe(10000);
    expect(res.cgst_amount_paise).toBe(900); // 9% = Rs 9.00
    expect(res.sgst_amount_paise).toBe(900); // 9% = Rs 9.00
    expect(res.igst_amount_paise).toBe(0);
    expect(res.total_tax_paise).toBe(1800); // Rs 18.00
    expect(res.subtotal_paise).toBe(11800); // Rs 118.00
    expect(res.round_off_paise).toBe(0);
    expect(res.grand_total_paise).toBe(11800);
  });

  it('calculates inter-state 18% GST using IGST without CGST/SGST', () => {
    const lines: GstLineInput[] = [
      {
        id: 'line-1',
        product_id: 'prod-1',
        product_name: 'Hardware Tool',
        hsn_sac: '8205',
        quantity_milli: 1000, // 1 item
        unit_price_paise: 20000, // Rs 200.00
        is_tax_inclusive: false,
        gst_rate_bps: 1800, // 18%
      },
    ];

    const context: InvoiceCalculationContext = {
      supplier_state_code: '19', // West Bengal
      place_of_supply_state_code: '27', // Maharashtra
      tax_scheme: 'REGULAR',
      document_type: 'TAX_INVOICE',
    };

    const res = calculateInvoice(lines, context);

    expect(res.is_inter_state).toBe(true);
    expect(res.cgst_amount_paise).toBe(0);
    expect(res.sgst_amount_paise).toBe(0);
    expect(res.igst_amount_paise).toBe(3600); // 18% of 200 = Rs 36.00
    expect(res.grand_total_paise).toBe(23600);
  });

  it('correctly back-calculates taxable amount for tax-inclusive pricing', () => {
    const lines: GstLineInput[] = [
      {
        id: 'line-1',
        product_id: 'prod-1',
        product_name: 'Packaged Biscuit MRP',
        hsn_sac: '1905',
        quantity_milli: 1000,
        unit_price_paise: 11800, // Rs 118.00 inclusive of 18% GST
        is_tax_inclusive: true,
        gst_rate_bps: 1800,
      },
    ];

    const context: InvoiceCalculationContext = {
      supplier_state_code: '19',
      place_of_supply_state_code: '19',
      tax_scheme: 'REGULAR',
      document_type: 'TAX_INVOICE',
    };

    const res = calculateInvoice(lines, context);

    expect(res.total_taxable_value_paise).toBe(10000); // Exactly Rs 100.00
    expect(res.cgst_amount_paise).toBe(900);
    expect(res.sgst_amount_paise).toBe(900);
    expect(res.subtotal_paise).toBe(11800);
    expect(res.grand_total_paise).toBe(11800);
  });

  it('applies line discounts and prorates invoice-level discounts correctly', () => {
    const lines: GstLineInput[] = [
      {
        id: 'line-1',
        product_id: 'p1',
        product_name: 'Item 1',
        hsn_sac: '1001',
        quantity_milli: 1000,
        unit_price_paise: 10000, // Rs 100
        is_tax_inclusive: false,
        gst_rate_bps: 1800,
        discount_type: 'PERCENT',
        discount_value: 10, // 10% line discount -> net Rs 90
      },
      {
        id: 'line-2',
        product_id: 'p2',
        product_name: 'Item 2',
        hsn_sac: '1002',
        quantity_milli: 1000,
        unit_price_paise: 10000, // Rs 100
        is_tax_inclusive: false,
        gst_rate_bps: 1800,
        // no line discount -> net Rs 100
      },
    ];

    // Total net before invoice discount = 9000 + 10000 = 19000 paise (Rs 190)
    // Add 10% invoice discount = 1900 paise (Rs 19)
    const context: InvoiceCalculationContext = {
      supplier_state_code: '19',
      place_of_supply_state_code: '19',
      tax_scheme: 'REGULAR',
      document_type: 'TAX_INVOICE',
      invoice_discount_type: 'PERCENT',
      invoice_discount_value: 10,
    };

    const res = calculateInvoice(lines, context);

    expect(res.total_line_discount_paise).toBe(1000); // Rs 10.00
    expect(res.invoice_discount_paise).toBe(1900); // Rs 19.00
    // Total taxable = 19000 - 1900 = 17100 paise (Rs 171.00)
    expect(res.total_taxable_value_paise).toBe(17100);
    // 18% of 171 = 30.78 -> 3078 paise tax (1539 CGST + 1539 SGST)
    expect(res.total_tax_paise).toBe(3078);
    expect(res.subtotal_paise).toBe(20178); // Rs 201.78
    // Round-off: 78 paise rounds up by +22 paise to Rs 202.00
    expect(res.round_off_paise).toBe(22);
    expect(res.grand_total_paise).toBe(20200);
  });

  it('handles composition scheme with zero tax charged', () => {
    const lines: GstLineInput[] = [
      {
        id: 'line-1',
        product_id: 'p1',
        product_name: 'Kirana Grocery',
        hsn_sac: '1001',
        quantity_milli: 1000,
        unit_price_paise: 5000,
        is_tax_inclusive: false,
        gst_rate_bps: 500, // 5% registered rate
      },
    ];

    const context: InvoiceCalculationContext = {
      supplier_state_code: '19',
      place_of_supply_state_code: '19',
      tax_scheme: 'COMPOSITION',
      document_type: 'BILL_OF_SUPPLY',
    };

    const res = calculateInvoice(lines, context);

    expect(res.total_tax_paise).toBe(0);
    expect(res.cgst_amount_paise).toBe(0);
    expect(res.sgst_amount_paise).toBe(0);
    expect(res.grand_total_paise).toBe(5000);
  });

  it('computes Cess alongside GST rate', () => {
    const lines: GstLineInput[] = [
      {
        id: 'line-1',
        product_id: 'p1',
        product_name: 'Aerated Drink',
        hsn_sac: '2202',
        quantity_milli: 1000,
        unit_price_paise: 10000, // Rs 100.00
        is_tax_inclusive: false,
        gst_rate_bps: 2800, // 28%
        cess_rate_bps: 1200, // 12% cess
      },
    ];

    const context: InvoiceCalculationContext = {
      supplier_state_code: '19',
      place_of_supply_state_code: '19',
      tax_scheme: 'REGULAR',
      document_type: 'TAX_INVOICE',
    };

    const res = calculateInvoice(lines, context);

    expect(res.cgst_amount_paise).toBe(1400); // 14%
    expect(res.sgst_amount_paise).toBe(1400); // 14%
    expect(res.cess_amount_paise).toBe(1200); // 12%
    expect(res.total_tax_paise).toBe(4000); // 40%
    expect(res.grand_total_paise).toBe(14000);
  });
});
