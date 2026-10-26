/**
 * Canonical Pure GST Engine for ShopBill.
 * Guaranteed integer arithmetic using BigInt for all intermediate tax math.
 * Version: 1.0.0
 */

import {
  BasisPoints,
  GstLineCalculation,
  GstLineInput,
  HsnSummaryItem,
  InvoiceCalculationContext,
  InvoiceCalculationResult,
  TaxSlabSummary,
} from './types';

export const ENGINE_VERSION = '1.0.0';

/**
 * Performs half-up division for BigInt integers: (A + B / 2) / B.
 */
function roundDiv(numerator: bigint, denominator: bigint): bigint {
  if (denominator === 0n) return 0n;
  const half = denominator / 2n;
  if (numerator >= 0n) {
    return (numerator + half) / denominator;
  } else {
    return (numerator - half) / denominator;
  }
}

/**
 * Calculates a single line item's initial gross and line-discount amounts.
 */
function computeLineBaseAmounts(line: GstLineInput): {
  grossPaise: bigint;
  lineDiscountPaise: bigint;
  netLinePaise: bigint;
} {
  const qtyMilli = BigInt(line.quantity_milli);
  const unitPrice = BigInt(line.unit_price_paise);

  // gross = (quantity_milli * unit_price_paise) / 1000
  const grossPaise = roundDiv(qtyMilli * unitPrice, 1000n);

  let lineDiscountPaise = 0n;
  if (line.discount_type === 'PERCENT' && line.discount_value && line.discount_value > 0) {
    // discount_value is percent (e.g. 10 for 10%)
    const pct = BigInt(Math.min(100, Math.max(0, line.discount_value)));
    lineDiscountPaise = roundDiv(grossPaise * pct, 100n);
  } else if (line.discount_type === 'AMOUNT' && line.discount_value && line.discount_value > 0) {
    lineDiscountPaise = BigInt(Math.min(Number(grossPaise), Math.max(0, line.discount_value)));
  }

  const netLinePaise = grossPaise > lineDiscountPaise ? grossPaise - lineDiscountPaise : 0n;

  return { grossPaise, lineDiscountPaise, netLinePaise };
}

/**
 * Calculates complete GST, CGST, SGST, IGST, Cess, and Rounding for an entire invoice.
 */
export function calculateInvoice(
  lines: GstLineInput[],
  context: InvoiceCalculationContext
): InvoiceCalculationResult {
  const isInterState =
    context.supplier_state_code.trim() !== context.place_of_supply_state_code.trim();

  const isComposition = context.tax_scheme === 'COMPOSITION';
  const isUnregistered = context.tax_scheme === 'UNREGISTERED';
  const noTaxApplicable = isComposition || isUnregistered;

  // Step 1: Compute gross and line-level discount for each line
  const baseLines = lines.map((line) => {
    const { grossPaise, lineDiscountPaise, netLinePaise } = computeLineBaseAmounts(line);
    return {
      line,
      grossPaise,
      lineDiscountPaise,
      netLinePaise,
    };
  });

  const totalGrossPaise = baseLines.reduce((acc, item) => acc + item.grossPaise, 0n);
  const totalLineDiscountPaise = baseLines.reduce((acc, item) => acc + item.lineDiscountPaise, 0n);
  const totalNetBeforeInvoiceDiscount = baseLines.reduce((acc, item) => acc + item.netLinePaise, 0n);

  // Step 2: Compute invoice-level discount
  let totalInvoiceDiscountPaise = 0n;
  if (
    context.invoice_discount_type === 'PERCENT' &&
    context.invoice_discount_value &&
    context.invoice_discount_value > 0
  ) {
    const pct = BigInt(Math.min(100, Math.max(0, context.invoice_discount_value)));
    totalInvoiceDiscountPaise = roundDiv(totalNetBeforeInvoiceDiscount * pct, 100n);
  } else if (
    context.invoice_discount_type === 'AMOUNT' &&
    context.invoice_discount_value &&
    context.invoice_discount_value > 0
  ) {
    totalInvoiceDiscountPaise = BigInt(
      Math.min(Number(totalNetBeforeInvoiceDiscount), Math.max(0, context.invoice_discount_value))
    );
  }

  // Step 3: Prorate invoice-level discount across lines with remainder assigned to the last eligible line
  let allocatedInvoiceDiscount = 0n;
  const lineCalculations: GstLineCalculation[] = [];

  for (let i = 0; i < baseLines.length; i++) {
    const item = baseLines[i]!;
    let proratedDisc = 0n;

    if (totalNetBeforeInvoiceDiscount > 0n && totalInvoiceDiscountPaise > 0n) {
      if (i === baseLines.length - 1) {
        // Last line absorbs remainder to guarantee exact penny reconciliation
        proratedDisc = totalInvoiceDiscountPaise - allocatedInvoiceDiscount;
      } else {
        proratedDisc = roundDiv(
          item.netLinePaise * totalInvoiceDiscountPaise,
          totalNetBeforeInvoiceDiscount
        );
        allocatedInvoiceDiscount += proratedDisc;
      }
    }

    const effectiveNetLinePaise =
      item.netLinePaise > proratedDisc ? item.netLinePaise - proratedDisc : 0n;

    // Step 4: Tax rates and treatment
    const isExempt =
      noTaxApplicable ||
      item.line.tax_treatment === 'EXEMPT' ||
      item.line.tax_treatment === 'NIL_RATED' ||
      item.line.tax_treatment === 'NON_GST';

    const gstRateBps = isExempt ? 0 : Math.max(0, item.line.gst_rate_bps);
    const cessRateBps = isExempt ? 0 : Math.max(0, item.line.cess_rate_bps ?? 0);

    const gstBpsBig = BigInt(gstRateBps);
    const cessBpsBig = BigInt(cessRateBps);
    const totalTaxRateBpsBig = gstBpsBig + cessBpsBig;

    // Step 5: Taxable value back-calculation if price is tax-inclusive
    let taxablePaise = effectiveNetLinePaise;
    if (item.line.is_tax_inclusive && totalTaxRateBpsBig > 0n) {
      // Taxable = effectiveNet * 10000 / (10000 + totalTaxRateBps)
      const denominator = 10000n + totalTaxRateBpsBig;
      taxablePaise = roundDiv(effectiveNetLinePaise * 10000n, denominator);
    }

    // Step 6: Taxes (CGST, SGST, IGST, Cess)
    let cgstRateBps: BasisPoints = 0;
    let sgstRateBps: BasisPoints = 0;
    let igstRateBps: BasisPoints = 0;

    let cgstPaise = 0n;
    let sgstPaise = 0n;
    let igstPaise = 0n;
    let cessPaise = 0n;

    if (gstRateBps > 0) {
      if (isInterState) {
        igstRateBps = gstRateBps;
        igstPaise = roundDiv(taxablePaise * gstBpsBig, 10000n);
      } else {
        // Half to CGST, half to SGST
        cgstRateBps = Math.floor(gstRateBps / 2);
        sgstRateBps = gstRateBps - cgstRateBps;
        cgstPaise = roundDiv(taxablePaise * BigInt(cgstRateBps), 10000n);
        sgstPaise = roundDiv(taxablePaise * BigInt(sgstRateBps), 10000n);
      }
    }

    if (cessRateBps > 0) {
      cessPaise = roundDiv(taxablePaise * cessBpsBig, 10000n);
    }

    const totalTaxPaise = cgstPaise + sgstPaise + igstPaise + cessPaise;
    const lineTotalPaise = taxablePaise + totalTaxPaise;

    lineCalculations.push({
      id: item.line.id,
      product_id: item.line.product_id,
      product_name: item.line.product_name,
      hsn_sac: item.line.hsn_sac,
      quantity_milli: item.line.quantity_milli,
      unit_price_paise: item.line.unit_price_paise,
      is_tax_inclusive: item.line.is_tax_inclusive,
      gross_amount_paise: Number(item.grossPaise),
      line_discount_paise: Number(item.lineDiscountPaise),
      prorated_invoice_discount_paise: Number(proratedDisc),
      net_taxable_value_paise: Number(taxablePaise),
      gst_rate_bps: gstRateBps,
      cess_rate_bps: cessRateBps,
      is_inter_state: isInterState,
      cgst_rate_bps: cgstRateBps,
      cgst_amount_paise: Number(cgstPaise),
      sgst_rate_bps: sgstRateBps,
      sgst_amount_paise: Number(sgstPaise),
      igst_rate_bps: igstRateBps,
      igst_amount_paise: Number(igstPaise),
      cess_amount_paise: Number(cessPaise),
      total_tax_paise: Number(totalTaxPaise),
      line_total_paise: Number(lineTotalPaise),
    });
  }

  // Step 7: Invoice aggregate summaries
  const totalTaxablePaise = lineCalculations.reduce(
    (acc, l) => acc + BigInt(l.net_taxable_value_paise),
    0n
  );
  const totalCgstPaise = lineCalculations.reduce((acc, l) => acc + BigInt(l.cgst_amount_paise), 0n);
  const totalSgstPaise = lineCalculations.reduce((acc, l) => acc + BigInt(l.sgst_amount_paise), 0n);
  const totalIgstPaise = lineCalculations.reduce((acc, l) => acc + BigInt(l.igst_amount_paise), 0n);
  const totalCessPaise = lineCalculations.reduce((acc, l) => acc + BigInt(l.cess_amount_paise), 0n);
  const totalTaxPaise = totalCgstPaise + totalSgstPaise + totalIgstPaise + totalCessPaise;

  const subtotalPaise = totalTaxablePaise + totalTaxPaise;

  // Step 8: Calculate Round-off to nearest whole Rupee (100 paise)
  // Remainder in paise
  const remainder = Number(subtotalPaise % 100n);
  let roundOffPaise = 0;
  if (remainder !== 0) {
    if (remainder >= 50) {
      roundOffPaise = 100 - remainder;
    } else {
      roundOffPaise = -remainder;
    }
  }

  const grandTotalPaise = Number(subtotalPaise) + roundOffPaise;

  // Step 9: Tax Slab Summary
  const slabMap = new Map<number, TaxSlabSummary>();
  for (const l of lineCalculations) {
    const existing = slabMap.get(l.gst_rate_bps) ?? {
      gst_rate_bps: l.gst_rate_bps,
      taxable_paise: 0,
      cgst_paise: 0,
      sgst_paise: 0,
      igst_paise: 0,
      cess_paise: 0,
      total_tax_paise: 0,
    };

    existing.taxable_paise += l.net_taxable_value_paise;
    existing.cgst_paise += l.cgst_amount_paise;
    existing.sgst_paise += l.sgst_amount_paise;
    existing.igst_paise += l.igst_amount_paise;
    existing.cess_paise += l.cess_amount_paise;
    existing.total_tax_paise += l.total_tax_paise;

    slabMap.set(l.gst_rate_bps, existing);
  }
  const taxSlabs = Array.from(slabMap.values()).sort((a, b) => a.gst_rate_bps - b.gst_rate_bps);

  // Step 10: HSN Summary
  const hsnMap = new Map<string, HsnSummaryItem>();
  for (const l of lineCalculations) {
    const hsnKey = l.hsn_sac || 'OTHER';
    const existing = hsnMap.get(hsnKey) ?? {
      hsn_sac: hsnKey,
      total_quantity_milli: 0,
      taxable_paise: 0,
      cgst_paise: 0,
      sgst_paise: 0,
      igst_paise: 0,
      cess_paise: 0,
      total_tax_paise: 0,
    };

    existing.total_quantity_milli += l.quantity_milli;
    existing.taxable_paise += l.net_taxable_value_paise;
    existing.cgst_paise += l.cgst_amount_paise;
    existing.sgst_paise += l.sgst_amount_paise;
    existing.igst_paise += l.igst_amount_paise;
    existing.cess_paise += l.cess_amount_paise;
    existing.total_tax_paise += l.total_tax_paise;

    hsnMap.set(hsnKey, existing);
  }
  const hsnSummary = Array.from(hsnMap.values()).sort((a, b) => a.hsn_sac.localeCompare(b.hsn_sac));

  return {
    lines: lineCalculations,
    gross_amount_paise: Number(totalGrossPaise),
    total_line_discount_paise: Number(totalLineDiscountPaise),
    invoice_discount_paise: Number(totalInvoiceDiscountPaise),
    total_taxable_value_paise: Number(totalTaxablePaise),
    cgst_amount_paise: Number(totalCgstPaise),
    sgst_amount_paise: Number(totalSgstPaise),
    igst_amount_paise: Number(totalIgstPaise),
    cess_amount_paise: Number(totalCessPaise),
    total_tax_paise: Number(totalTaxPaise),
    subtotal_paise: Number(subtotalPaise),
    round_off_paise: roundOffPaise,
    grand_total_paise: grandTotalPaise,
    is_inter_state: isInterState,
    tax_slabs: taxSlabs,
    hsn_summary: hsnSummary,
    engine_version: ENGINE_VERSION,
  };
}
