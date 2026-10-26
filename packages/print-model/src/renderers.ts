import { PrintModel } from './model';

/**
 * Formats a key-value or left-right aligned row for fixed-width thermal receipts.
 */
function alignRow(left: string, right: string, width: number): string {
  const space = width - left.length - right.length;
  if (space > 0) {
    return left + ' '.repeat(space) + right;
  }
  return left + ' ' + right;
}

/**
 * Centers text within a given width.
 */
function centerText(text: string, width: number): string {
  if (text.length >= width) return text.substring(0, width);
  const padLeft = Math.floor((width - text.length) / 2);
  const padRight = width - text.length - padLeft;
  return ' '.repeat(padLeft) + text + ' '.repeat(padRight);
}

/**
 * Generates plain-text ESC/POS receipt lines aligned for thermal roll printers.
 * Supports standard 58mm (32 characters) and 80mm (48 characters).
 */
export function renderThermalText(model: PrintModel, widthChars: 32 | 48 = 48): string {
  const divider = '='.repeat(widthChars);
  const dashDivider = '-'.repeat(widthChars);
  const lines: string[] = [];

  // Header
  lines.push(centerText(model.shop.name.toUpperCase(), widthChars));
  if (model.shop.tagline) {
    lines.push(centerText(model.shop.tagline, widthChars));
  }
  lines.push(centerText(model.shop.address, widthChars));
  lines.push(centerText(`Phone: ${model.shop.phone}`, widthChars));
  if (model.shop.gstin) {
    lines.push(centerText(`GSTIN: ${model.shop.gstin}`, widthChars));
  }
  lines.push(divider);

  // Document Title
  lines.push(centerText(`*** ${model.document.title} ***`, widthChars));
  lines.push(alignRow(`Bill No: ${model.document.invoice_number}`, `Date: ${model.document.issue_date}`, widthChars));
  if (model.customer && model.customer.name) {
    lines.push(alignRow(`Customer: ${model.customer.name}`, model.customer.phone ? `Ph: ${model.customer.phone}` : '', widthChars));
    if (model.customer.gstin) {
      lines.push(`GSTIN: ${model.customer.gstin}`);
    }
  }
  lines.push(dashDivider);

  // Items List
  if (widthChars === 48) {
    lines.push(alignRow('ITEM / QTY x RATE', 'TOTAL', widthChars));
  } else {
    lines.push(alignRow('ITEM', 'AMT', widthChars));
  }
  lines.push(dashDivider);

  for (const item of model.lines) {
    lines.push(item.name.substring(0, widthChars));
    const leftDetail = `  ${item.quantity_formatted} x ${item.unit_price_formatted} (GST ${item.gst_rate_pct})`;
    lines.push(alignRow(leftDetail, item.total_formatted, widthChars));
  }
  lines.push(dashDivider);

  // Totals
  lines.push(alignRow('Subtotal:', model.totals.taxable_value, widthChars));
  if (model.document.is_inter_state) {
    lines.push(alignRow('IGST:', model.totals.igst, widthChars));
  } else {
    lines.push(alignRow('CGST:', model.totals.cgst, widthChars));
    lines.push(alignRow('SGST:', model.totals.sgst, widthChars));
  }
  if (model.totals.cess !== '₹ 0.00' && model.totals.cess !== '₹0.00') {
    lines.push(alignRow('Cess:', model.totals.cess, widthChars));
  }
  if (model.totals.round_off !== '₹ 0.00' && model.totals.round_off !== '₹0.00') {
    lines.push(alignRow('Round-off:', model.totals.round_off, widthChars));
  }
  lines.push(divider);
  lines.push(alignRow('GRAND TOTAL:', model.totals.grand_total, widthChars));
  lines.push(divider);

  // Payments
  if (model.payments.length > 0) {
    for (const p of model.payments) {
      lines.push(alignRow(`Paid (${p.mode}):`, p.amount, widthChars));
    }
  }
  if (model.balance_due) {
    lines.push(alignRow('BALANCE DUE:', model.balance_due, widthChars));
  }

  // Statutory notices
  if (model.statutory_notices.length > 0) {
    lines.push(dashDivider);
    for (const notice of model.statutory_notices) {
      lines.push(centerText(notice, widthChars));
    }
  }

  // Footer terms
  lines.push(dashDivider);
  for (const term of model.terms) {
    lines.push(centerText(term, widthChars));
  }

  return lines.join('\n');
}

/**
 * Generates print-ready HTML/CSS for browser printing (A4, A5, or 80mm thermal).
 */
export function renderHtml(
  model: PrintModel,
  format: 'A4' | 'A5' | '80mm' | '58mm' = 'A4'
): string {
  const isThermal = format === '80mm' || format === '58mm';
  const widthStyle =
    format === '58mm'
      ? 'width: 58mm; padding: 2mm;'
      : format === '80mm'
      ? 'width: 80mm; padding: 4mm;'
      : format === 'A5'
      ? 'width: 148mm; padding: 8mm;'
      : 'max-width: 210mm; padding: 12mm; margin: auto;';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>${model.document.title} - ${model.document.invoice_number}</title>
  <style>
    @page { size: ${isThermal ? 'auto' : format}; margin: ${isThermal ? '0' : '10mm'}; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      color: #0F172A;
      background: #FFFFFF;
      font-size: ${isThermal ? '11px' : '13px'};
      line-height: 1.4;
    }
    .invoice-card {
      ${widthStyle}
    }
    .text-center { text-align: center; }
    .text-right { text-align: right; }
    .font-bold { font-weight: 700; }
    .tabular-nums { font-variant-numeric: tabular-nums; }
    .header { border-bottom: 2px solid #0F172A; padding-bottom: 8px; margin-bottom: 12px; }
    .shop-title { font-size: ${isThermal ? '16px' : '22px'}; font-weight: 800; letter-spacing: -0.02em; }
    .doc-badge {
      display: inline-block;
      padding: 4px 10px;
      background: #0F172A;
      color: #FFFFFF;
      font-weight: 700;
      border-radius: 4px;
      font-size: ${isThermal ? '11px' : '13px'};
      margin-top: 4px;
    }
    .meta-grid {
      display: grid;
      grid-template-columns: ${isThermal ? '1fr' : '1fr 1fr'};
      gap: 8px;
      margin-bottom: 12px;
      padding-bottom: 8px;
      border-bottom: 1px solid #E2E8F0;
    }
    table { width: 100%; border-collapse: collapse; margin-bottom: 12px; }
    th {
      background: #F8FAFC;
      border-bottom: 2px solid #CBD5E1;
      padding: 6px 8px;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    td { padding: 6px 8px; border-bottom: 1px solid #E2E8F0; }
    .totals-table td { border-bottom: none; padding: 3px 8px; }
    .grand-total-row {
      border-top: 2px solid #0F172A;
      border-bottom: 2px solid #0F172A;
      font-weight: 800;
      font-size: ${isThermal ? '13px' : '16px'};
      color: #1D4ED8;
    }
    .notice {
      background: #FFFBEB;
      border: 1px solid #FEF3C7;
      color: #92400E;
      padding: 6px;
      border-radius: 4px;
      margin-top: 10px;
      font-size: 11px;
    }
    .footer { margin-top: 16px; padding-top: 8px; border-top: 1px solid #E2E8F0; font-size: 11px; color: #64748B; }
  </style>
</head>
<body>
  <div class="invoice-card">
    <div class="header text-center">
      <div class="shop-title">${model.shop.name}</div>
      ${model.shop.tagline ? `<div>${model.shop.tagline}</div>` : ''}
      <div>${model.shop.address}</div>
      <div>Phone: ${model.shop.phone} ${model.shop.gstin ? `| GSTIN: <strong>${model.shop.gstin}</strong>` : ''}</div>
      <div>State: ${model.shop.state_name} (${model.shop.state_code})</div>
      <div class="doc-badge">${model.document.title}</div>
    </div>

    <div class="meta-grid">
      <div>
        <div><strong>Invoice #:</strong> ${model.document.invoice_number}</div>
        <div><strong>Date:</strong> ${model.document.issue_date}</div>
        <div><strong>Place of Supply:</strong> ${model.document.place_of_supply}</div>
      </div>
      ${
        model.customer && model.customer.name
          ? `<div class="text-right">
              <div><strong>Billed To:</strong> ${model.customer.name}</div>
              ${model.customer.phone ? `<div>Phone: ${model.customer.phone}</div>` : ''}
              ${model.customer.gstin ? `<div>GSTIN: <strong>${model.customer.gstin}</strong></div>` : ''}
              ${model.customer.address ? `<div>${model.customer.address}</div>` : ''}
            </div>`
          : ''
      }
    </div>

    <table>
      <thead>
        <tr>
          <th style="width: 24px;">#</th>
          <th style="text-align: left;">Item Description</th>
          <th style="text-align: right;">Qty</th>
          <th style="text-align: right;">Rate</th>
          ${model.totals.total_discount !== '₹ 0.00' && model.totals.total_discount !== '₹0.00' ? '<th style="text-align: right;">Disc</th>' : ''}
          <th style="text-align: right;">Taxable</th>
          <th style="text-align: right;">GST</th>
          <th style="text-align: right;">Total</th>
        </tr>
      </thead>
      <tbody>
        ${model.lines
          .map(
            (l) => `<tr>
          <td>${l.sl_no}</td>
          <td>
            <strong>${l.name}</strong>
            ${l.hsn_sac !== '-' ? `<span style="font-size: 10px; color: #64748B;"> (HSN: ${l.hsn_sac})</span>` : ''}
          </td>
          <td class="text-right tabular-nums">${l.quantity_formatted}</td>
          <td class="text-right tabular-nums">${l.unit_price_formatted}</td>
          ${model.totals.total_discount !== '₹ 0.00' && model.totals.total_discount !== '₹0.00' ? `<td class="text-right tabular-nums">${l.discount_formatted ?? '-'}</td>` : ''}
          <td class="text-right tabular-nums">${l.taxable_formatted}</td>
          <td class="text-right tabular-nums">${l.gst_rate_pct}</td>
          <td class="text-right tabular-nums font-bold">${l.total_formatted}</td>
        </tr>`
          )
          .join('')}
      </tbody>
    </table>

    <table class="totals-table">
      <tbody>
        <tr>
          <td style="width: 60%;"></td>
          <td class="text-right">Taxable Value:</td>
          <td class="text-right tabular-nums font-bold" style="width: 25%;">${model.totals.taxable_value}</td>
        </tr>
        ${
          model.document.is_inter_state
            ? `<tr>
                <td></td>
                <td class="text-right">IGST:</td>
                <td class="text-right tabular-nums font-bold">${model.totals.igst}</td>
              </tr>`
            : `<tr>
                <td></td>
                <td class="text-right">CGST:</td>
                <td class="text-right tabular-nums">${model.totals.cgst}</td>
              </tr>
              <tr>
                <td></td>
                <td class="text-right">SGST:</td>
                <td class="text-right tabular-nums">${model.totals.sgst}</td>
              </tr>`
        }
        ${
          model.totals.cess !== '₹ 0.00' && model.totals.cess !== '₹0.00'
            ? `<tr>
                <td></td>
                <td class="text-right">Cess:</td>
                <td class="text-right tabular-nums">${model.totals.cess}</td>
              </tr>`
            : ''
        }
        ${
          model.totals.round_off !== '₹ 0.00' && model.totals.round_off !== '₹0.00'
            ? `<tr>
                <td></td>
                <td class="text-right">Round-off:</td>
                <td class="text-right tabular-nums">${model.totals.round_off}</td>
              </tr>`
            : ''
        }
        <tr class="grand-total-row">
          <td></td>
          <td class="text-right">GRAND TOTAL:</td>
          <td class="text-right tabular-nums font-bold">${model.totals.grand_total}</td>
        </tr>
      </tbody>
    </table>

    <div style="font-size: 11px; margin-top: 6px;">
      <strong>Amount in words:</strong> ${model.totals.amount_in_words}
    </div>

    ${
      model.statutory_notices.length > 0
        ? `<div class="notice text-center font-bold">
            ${model.statutory_notices.join('<br>')}
          </div>`
        : ''
    }

    <div class="footer text-center">
      ${model.terms.map((t) => `<div>${t}</div>`).join('')}
    </div>
  </div>
</body>
</html>`;
}
