import * as pdfjsLib from 'pdfjs-dist';
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { db, ProductRecord } from '../db';

// Initialize PDF.js worker using Vite asset URL
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

export interface ParsedProductItem {
  id: string;
  slNo: number;
  name: string;
  sku: string;
  hsn_sac: string;
  quantity: number;
  unit: string;
  purchasePrice: number; // in Rupees
  mrp: number;          // in Rupees (incl of tax / retail)
  sellingPrice: number; // in Rupees
  gstRateBps: number;   // e.g. 1800 for 18%
  category: string;
  selected: boolean;
  isExistingMatch?: boolean | undefined;
  existingProductId?: string | undefined;
  existingProductName?: string | undefined;
  existingCurrentStock?: number | undefined;
}

export interface ParseResult {
  supplierName?: string | undefined;
  invoiceNumber?: string | undefined;
  invoiceDate?: string | undefined;
  items: ParsedProductItem[];
  rawTextPreview?: string | undefined;
  errors: string[];
}

interface RawLineItem {
  y: number;
  x: number;
  text: string;
}

/**
 * Extracts and parses product stock rows from an uploaded invoice / stock PDF.
 */
export async function parseStockPdf(file: File): Promise<ParseResult> {
  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({
    data: new Uint8Array(arrayBuffer),
    useSystemFonts: true,
  });

  const pdf = await loadingTask.promise;
  const numPages = pdf.numPages;
  const errors: string[] = [];

  let supplierName: string | undefined;
  let invoiceNumber: string | undefined;
  let invoiceDate: string | undefined;

  interface ExtractedRow {
    sl: number;
    mainLine: string;
    descContinuation: string[];
  }

  const extractedRows: ExtractedRow[] = [];
  const allStructuredLines: string[] = [];
  let expectedSl = 1;

  // Patterns indicating the table rows have ended and footer begins
  const footerPatterns = [
    /^(Total|Total:)\b/i,
    /^(CGST|SGST|IGST|UTGST)\b/i,
    /^(Round\s*Off|R\/O)\b/i,
    /^(Taxable|Taxable\s+Value)/i,
    /^Tax\s+Amount/i,
    /^Amount\s+Chargeable/i,
    /^Company'?s\s+Bank\s+Details/i,
    /^Bank\s+Name/i,
    /^A\/c\s+No/i,
    /^Branch\s+&\s+IFS/i,
    /^Declaration/i,
    /^We\s+declare/i,
    /^Authorised\s+Signatory/i,
    /^This\s+is\s+a\s+Computer/i,
    /^\d{1,3}(,\d{2,3})+(?:\.\d{2})?\s*$/, // formatted grand total amount like 82,372.83 or 1,12,017.80
  ];

  // Patterns to ignore top-level headers
  const headerIgnorePatterns = [
    /^INVOICE/i,
    /^Tax\s+Invoice/i,
    /^Consignee/i,
    /^Buyer/i,
    /^State\s+Name/i,
    /^GSTIN/i,
    /^Invoice\s+No/i,
    /^Delivery\s+Note/i,
    /^Reference\s+No/i,
    /^Dispatch/i,
    /^Terms\s+of/i,
    /^Sl\s+Description/i,
    /^Sr\.\s*No/i,
    /^No\.\s*$/i,
    /^continued/i,
    /^INR\s+/i,
  ];

  for (let pageNum = 1; pageNum <= numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const textContent = await page.getTextContent();

    const rawItems: RawLineItem[] = [];
    for (const item of textContent.items as any[]) {
      if (!item.str || item.str.trim() === '') continue;
      const x = item.transform[4];
      const y = item.transform[5];
      rawItems.push({ y, x, text: item.str.trim() });
    }

    rawItems.sort((a, b) => b.y - a.y);

    // Group items with similar Y into horizontal lines
    const lineBuckets: { y: number; items: RawLineItem[] }[] = [];
    for (const item of rawItems) {
      let bucket = lineBuckets.find((b) => Math.abs(b.y - item.y) <= 4.0);
      if (!bucket) {
        bucket = { y: item.y, items: [] };
        lineBuckets.push(bucket);
      }
      bucket.items.push(item);
    }

    lineBuckets.sort((a, b) => b.y - a.y);
    const pageLines: string[] = [];

    for (const b of lineBuckets) {
      b.items.sort((a, b) => a.x - b.x);
      const lineStr = b.items.map((i) => i.text).join(' ');
      pageLines.push(lineStr);
      allStructuredLines.push(lineStr);

      // Extract metadata on first page
      if (pageNum === 1) {
        if (!supplierName) {
          const supMatch = lineStr.match(/(?:JAL KENDRA|Maa Sales|OM GALAXY LIMITED|[A-Z\s]{4,}(?:LTD|LIMITED|TRADERS|ENTERPRISES|SALES|KENDRA))/i);
          if (supMatch && !lineStr.includes('Buyer') && !lineStr.includes('Consignee') && !lineStr.includes('INVOICE') && !lineStr.includes('State Name')) {
            supplierName = supMatch[0]?.trim();
          }
        }
        if (!invoiceNumber) {
          const invMatch = lineStr.match(/(?:Invoice\s*No\.?|Bill\s*No\.?)\s*[:.]?\s*([A-Za-z0-9\/-]+)/i);
          if (invMatch && invMatch[1]) {
            invoiceNumber = invMatch[1];
          } else {
            const codeMatch = lineStr.match(/\b([A-Z0-9]{2,}\/[0-9-]+\/\d+)\b/);
            if (codeMatch && codeMatch[1]) {
              invoiceNumber = codeMatch[1];
            }
          }
        }
        if (!invoiceDate) {
          const dateMatch = lineStr.match(/(\d{1,2}[-\/][A-Za-z]{3,}[-\/]\d{2,4}|\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4})/);
          if (dateMatch && dateMatch[1]) {
            invoiceDate = dateMatch[1];
          }
        }
      }
    }

    // Process page lines into candidate table rows
    let currentRow: ExtractedRow | null = null;
    let inFooter = false;

    for (const line of pageLines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      // Stop collecting rows once footer is reached on this page
      if (inFooter) {
        continue;
      }

      // Check if line is a table footer / summary boundary
      if (footerPatterns.some((p) => p.test(trimmed))) {
        if (currentRow) {
          extractedRows.push(currentRow);
          currentRow = null;
        }
        inFooter = true;
        continue;
      }

      // Skip table and document headers
      if (headerIgnorePatterns.some((p) => p.test(trimmed))) {
        continue;
      }

      const matchStart = trimmed.match(/^(\d{1,3})\s+(.+)$/);
      if (matchStart && matchStart[1] && matchStart[2]) {
        const slCandidate = parseInt(matchStart[1], 10);
        const rest = matchStart[2];
        const hasItemPattern = /(PCS|nos|NOS|SET|SETS|KGS|KG|GM|LTR|BOX|PKT)\b/i.test(rest);

        if (slCandidate === expectedSl || (slCandidate > 0 && slCandidate <= 200 && hasItemPattern)) {
          if (currentRow) extractedRows.push(currentRow);
          expectedSl = slCandidate + 1;
          currentRow = {
            sl: slCandidate,
            mainLine: rest,
            descContinuation: [],
          };
          continue;
        }
      }

      if (currentRow) {
        currentRow.descContinuation.push(trimmed);
      }
    }

    if (currentRow) {
      extractedRows.push(currentRow);
      currentRow = null;
    }
  }

  // Fetch existing products from DB to check for duplicates
  let existingProducts: ProductRecord[] = [];
  try {
    existingProducts = await db.products.toArray();
  } catch (err) {
    console.warn('Could not read existing products for duplicate check:', err);
  }

  // Parse candidate rows into structured ParsedProductItem records
  const parsedItems: ParsedProductItem[] = [];

  for (const r of extractedRows) {
    const item = parseSingleRow(r, existingProducts);
    if (item) {
      parsedItems.push(item);
    }
  }

  if (parsedItems.length === 0) {
    errors.push('Could not detect product rows in the uploaded PDF. Please make sure the PDF has readable text and standard invoice columns.');
  }

  return {
    supplierName: supplierName || 'Uploaded Supplier Invoice',
    invoiceNumber: invoiceNumber || `INV-${Date.now().toString().slice(-4)}`,
    invoiceDate: invoiceDate || new Date().toISOString().split('T')[0],
    items: parsedItems,
    rawTextPreview: allStructuredLines.slice(0, 30).join('\n'),
    errors,
  };
}

/**
 * Parses an extracted row and checks against existing DB products.
 */
function parseSingleRow(
  r: { sl: number; mainLine: string; descContinuation: string[] },
  existingProducts: ProductRecord[]
): ParsedProductItem | null {
  const line = r.mainLine;
  const unitPattern = /\b(PCS|nos|NOS|SET|SETS|KGS|KG|GM|LTR|BOX|PKT|MTR|DOZ)\b/i;

  // Pattern 1: Tally Dual-Rate format (Maa Sales)
  // [Desc] [HSN] [Qty] [Unit] [RateInclTax] [RateExclTax] [Unit] [Amount]
  const format1Regex = /(\b\d{4,8}\b)?\s*(\d+(?:\.\d+)?)\s*(PCS|nos|NOS|SET|SETS|KGS|KG|GM|LTR|BOX|PKT)\s+(\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)\s+(?:PCS|nos|NOS|SET|SETS|KGS|KG|GM|LTR|BOX|PKT)\s+([0-9,]+(?:\.\d+)?)$/i;
  const m1 = line.match(format1Regex);
  if (m1 && m1.index !== undefined && m1[2] && m1[3] && m1[4] && m1[5]) {
    const desc = line.substring(0, m1.index).trim();
    const hsn = m1[1] || '96039000';
    const qty = parseFloat(m1[2]);
    const unit = m1[3].toUpperCase();
    const rateInclTax = parseFloat(m1[4]);
    const rateExclTax = parseFloat(m1[5]);
    const fullName = cleanProductName(`${desc} ${r.descContinuation.join(' ')}`);

    let gstRateBps = 1800;
    if (rateExclTax > 0 && rateInclTax > rateExclTax) {
      const calcPct = Math.round(((rateInclTax - rateExclTax) / rateExclTax) * 100);
      if ([0, 5, 12, 18, 28].includes(calcPct)) {
        gstRateBps = calcPct * 100;
      }
    }

    const item: ParsedProductItem = {
      id: `pdf-item-${r.sl}-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      slNo: r.sl,
      name: fullName,
      sku: `SKU-${hsn.slice(-4)}-${String(r.sl).padStart(3, '0')}`,
      hsn_sac: hsn,
      quantity: Math.max(1, qty),
      unit,
      purchasePrice: Math.max(0, rateExclTax),
      mrp: Math.max(0, rateInclTax),
      sellingPrice: Math.max(0, rateInclTax),
      gstRateBps,
      category: inferCategoryFromName(fullName),
      selected: true,
    };

    attachExistingMatch(item, existingProducts);
    return item;
  }

  // Pattern 2: Standard Tally / Jal Kendra format
  // [Desc] [HSN] [Qty] [Unit] [Rate] [per Unit] [optional Disc%] [Amount]
  const format2Regex = /(\b\d{4,8}\b)?\s*(\d+(?:\.\d+)?)\s*(PCS|nos|NOS|SET|SETS|KGS|KG|GM|LTR|BOX|PKT)\s+([0-9,]+(?:\.\d+)?)\s+(?:PCS|nos|NOS|SET|SETS|KGS|KG|GM|LTR|BOX|PKT)(?:\s+\d+(?:\.\d+)?%?)?\s+([0-9,]+(?:\.\d+)?)$/i;
  const m2 = line.match(format2Regex);
  if (m2 && m2.index !== undefined && m2[2] && m2[3] && m2[4]) {
    const desc = line.substring(0, m2.index).trim();
    const hsn = m2[1] || '84818020';
    const qty = parseFloat(m2[2]);
    const unit = m2[3].toUpperCase();
    const rate = parseFloat(m2[4].replace(/,/g, ''));
    const fullName = cleanProductName(`${desc} ${r.descContinuation.join(' ')}`);

    // Standard retail margin 18% GST on purchase rate for selling price
    const sellingPrice = Math.round(rate * 1.18 * 100) / 100;

    const item: ParsedProductItem = {
      id: `pdf-item-${r.sl}-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      slNo: r.sl,
      name: fullName,
      sku: `SKU-${hsn.slice(-4)}-${String(r.sl).padStart(3, '0')}`,
      hsn_sac: hsn,
      quantity: Math.max(1, qty),
      unit,
      purchasePrice: Math.max(0, rate),
      mrp: Math.max(0, sellingPrice),
      sellingPrice: Math.max(0, sellingPrice),
      gstRateBps: 1800,
      category: inferCategoryFromName(fullName),
      selected: true,
    };

    attachExistingMatch(item, existingProducts);
    return item;
  }

  // Pattern 3: Standard Tax Invoice format (Om Galaxy)
  // [Desc] [HSN] [MRP] [Qty] [Unit] [Rate] [Taxable Value] ...
  const hsnMatch = line.match(/\b([1-9]\d{3,7})\b/);
  if (hsnMatch && hsnMatch.index !== undefined && hsnMatch[0]) {
    const descBefore = line.substring(0, hsnMatch.index).trim();
    const afterHsn = line.substring(hsnMatch.index + hsnMatch[0].length).trim();
    const hsn = hsnMatch[0];

    const fullName = cleanProductName(`${descBefore} ${r.descContinuation.join(' ')}`);
    const unitMatch = afterHsn.match(unitPattern);
    const unit = unitMatch && unitMatch[0] ? unitMatch[0].toUpperCase() : 'PCS';

    const numbers = (afterHsn.replace(/,/g, '').match(/-?\d+(?:\.\d+)?/g) || []).map(Number);
    if (numbers.length >= 2) {
      let mrp = 0;
      let qty = 0;
      let purchaseRate = 0;
      let sellingPrice = 0;
      let gstRateBps = 1800;

      if (numbers.length >= 3) {
        mrp = numbers[0] ?? 0;
        qty = numbers[1] ?? 1;
        purchaseRate = numbers[2] ?? 0;
        sellingPrice = mrp > 0 ? mrp : Math.round(purchaseRate * 1.25);

        const remaining = numbers.slice(3);
        const foundTax = remaining.find((n) => [5, 12, 18, 28].includes(n));
        if (foundTax !== undefined) {
          gstRateBps = foundTax * 100;
        }
      } else {
        qty = numbers[0] || 1;
        purchaseRate = numbers[1] || 0;
        mrp = purchaseRate * 1.25;
        sellingPrice = mrp;
      }

      const item: ParsedProductItem = {
        id: `pdf-item-${r.sl}-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        slNo: r.sl,
        name: fullName || `Product Item ${r.sl}`,
        sku: `SKU-${hsn.slice(-4)}-${String(r.sl).padStart(3, '0')}`,
        hsn_sac: hsn,
        quantity: Math.max(1, qty),
        unit,
        purchasePrice: Math.max(0, purchaseRate),
        mrp: Math.max(0, mrp),
        sellingPrice: Math.max(0, sellingPrice),
        gstRateBps,
        category: inferCategoryFromName(fullName),
        selected: true,
      };

      attachExistingMatch(item, existingProducts);
      return item;
    }
  }

  return null;
}

/**
 * Checks if an item already exists in the database by normalized name or SKU/Barcode/HSN.
 */
function attachExistingMatch(item: ParsedProductItem, existingProducts: ProductRecord[]) {
  if (!existingProducts || existingProducts.length === 0) return;

  const normParsed = item.name.toLowerCase().replace(/[^a-z0-9]/g, '');

  const match = existingProducts.find((p) => {
    const normDb = p.name.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (normDb === normParsed) return true;
    if (normDb.length > 5 && normParsed.length > 5 && (normDb.includes(normParsed) || normParsed.includes(normDb))) {
      return true;
    }
    return false;
  });

  if (match) {
    item.isExistingMatch = true;
    item.existingProductId = match.id;
    item.existingProductName = match.name;
    item.existingCurrentStock = match.current_stock_milli / 1000;
  }
}

/**
 * Clean up OCR artifacts and duplicate spaces from product names
 */
function cleanProductName(raw: string): string {
  return raw
    .replace(/\s+/g, ' ')
    .replace(/^[-–—\s]+/, '')
    .replace(/[-–—\s]+$/, '')
    .trim();
}

/**
 * Suggests a retail category based on common Indian retail / kirana / hardware product keywords
 */
function inferCategoryFromName(name: string): string {
  const lower = name.toLowerCase();
  if (lower.includes('brush') || lower.includes('wiper') || lower.includes('mop') || lower.includes('scrubber') || lower.includes('dustpan') || lower.includes('broom') || lower.includes('plunger') || lower.includes('clean')) {
    return 'Cleaning & Household';
  }
  if (
    lower.includes('cock') ||
    lower.includes('swan') ||
    lower.includes('pillar') ||
    lower.includes('suit') ||
    lower.includes('urinal') ||
    lower.includes('tap') ||
    lower.includes('pipe') ||
    lower.includes('valve') ||
    lower.includes('faucet') ||
    lower.includes('plumb') ||
    lower.includes('sanitary')
  ) {
    return 'Sanitary & Hardware';
  }
  if (lower.includes('oil') || lower.includes('ghee') || lower.includes('atta') || lower.includes('flour') || lower.includes('salt') || lower.includes('sugar') || lower.includes('rice') || lower.includes('dal')) {
    return 'Groceries / Kirana';
  }
  if (lower.includes('soap') || lower.includes('shampoo') || lower.includes('cream') || lower.includes('paste') || lower.includes('wash')) {
    return 'Personal Care';
  }
  if (lower.includes('stand') || lower.includes('steel') || lower.includes('plastic') || lower.includes('rod')) {
    return 'Hardware & Plastics';
  }
  return 'General Merchandise';
}
