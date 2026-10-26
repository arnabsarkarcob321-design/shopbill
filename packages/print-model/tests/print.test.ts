import { describe, expect, it } from 'vitest';
import { calculateInvoice, GstLineInput, InvoiceCalculationContext } from '@shopbill/gst-engine';
import { createPrintModel } from '../src/model';
import { renderHtml, renderThermalText } from '../src/renderers';

describe('PrintModel and Renderers', () => {
  it('builds canonical PrintModel and renders HTML & Thermal receipts', () => {
    const lines: GstLineInput[] = [
      {
        id: 'line-1',
        product_id: 'p1',
        product_name: 'Tata Salt 1kg',
        hsn_sac: '2501',
        quantity_milli: 2000,
        unit_price_paise: 2800, // Rs 28.00 each
        is_tax_inclusive: true,
        gst_rate_bps: 500, // 5%
      },
      {
        id: 'line-2',
        product_id: 'p2',
        product_name: 'Amul Butter 500g',
        hsn_sac: '0405',
        quantity_milli: 1000,
        unit_price_paise: 27500, // Rs 275.00
        is_tax_inclusive: true,
        gst_rate_bps: 1200, // 12%
      },
    ];

    const context: InvoiceCalculationContext = {
      supplier_state_code: '19',
      place_of_supply_state_code: '19',
      tax_scheme: 'REGULAR',
      document_type: 'TAX_INVOICE',
    };

    const calculation = calculateInvoice(lines, context);

    const model = createPrintModel({
      shop: {
        name: 'Gupta Kirana & General Store',
        tagline: 'Your Trusted Daily Store',
        address: '14 B.B. Ganguly Street, Kolkata - 700012',
        phone: '9830123456',
        gstin: '19AAAPG1234A1Z5',
        state_code: '19',
        state_name: 'West Bengal',
        upi_id: 'guptakirana@okicici',
        tax_scheme: 'REGULAR',
      },
      customer: {
        name: 'Ramesh Sen',
        phone: '9831987654',
      },
      documentType: 'TAX_INVOICE',
      invoiceNumber: 'SB/26-27/0001',
      issueDate: '26/10/2026 17:30',
      calculation,
      payments: [
        { mode: 'UPI', amount_paise: calculation.grand_total_paise, reference: 'UPI/123456789' },
      ],
    });

    expect(model.document.title).toBe('TAX INVOICE');
    expect(model.lines.length).toBe(2);
    expect(model.totals.grand_total).toBe('₹ 331.00'); // 2*28 + 275 = 56 + 275 = 331
    expect(model.totals.amount_in_words).toContain('Rupees Only');

    // Test Thermal rendering
    const thermalText = renderThermalText(model, 48);
    expect(thermalText).toContain('GUPTA KIRANA & GENERAL STORE');
    expect(thermalText).toContain('Bill No: SB/26-27/0001');
    expect(thermalText).toContain('Tata Salt 1kg');
    expect(thermalText).toContain('GRAND TOTAL:');
    expect(thermalText).toContain('₹ 331.00');

    // Test HTML rendering
    const html = renderHtml(model, 'A4');
    expect(html).toContain('Gupta Kirana & General Store');
    expect(html).toContain('SB/26-27/0001');
    expect(html).toContain('Tata Salt 1kg');
    expect(html).toContain('₹ 331.00');
  });

  it('renders Composition Scheme Bill of Supply with mandatory statutory notice', () => {
    const lines: GstLineInput[] = [
      {
        id: 'line-1',
        product_id: 'p1',
        product_name: 'Kirana Item',
        hsn_sac: '1001',
        quantity_milli: 1000,
        unit_price_paise: 5000,
        is_tax_inclusive: false,
        gst_rate_bps: 500,
      },
    ];

    const context: InvoiceCalculationContext = {
      supplier_state_code: '19',
      place_of_supply_state_code: '19',
      tax_scheme: 'COMPOSITION',
      document_type: 'BILL_OF_SUPPLY',
    };

    const calculation = calculateInvoice(lines, context);

    const model = createPrintModel({
      shop: {
        name: 'Sharma Traders',
        address: 'Delhi',
        phone: '9811122233',
        state_code: '07',
        state_name: 'Delhi',
        tax_scheme: 'COMPOSITION',
      },
      documentType: 'BILL_OF_SUPPLY',
      invoiceNumber: 'BOS-001',
      issueDate: '26/10/2026',
      calculation,
    });

    expect(model.document.title).toBe('BILL OF SUPPLY');
    expect(model.statutory_notices.length).toBeGreaterThan(0);
    expect(model.statutory_notices[0]).toContain('Composition taxable person');
  });
});
