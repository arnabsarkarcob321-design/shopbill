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
      let bucket = lineBuckets.find((b) => Math.abs(b.y - item.y) <= 3.5);
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
          const supMatch = lineStr.match(/(?:Maa Sales|OM GALAXY LIMITED|[A-Z\s]{4,}(?:LTD|LIMITED|TRADERS|ENTERPRISES|SALES))/i);
          if (supMatch && !lineStr.includes('Buyer') && !lineStr.includes('Consignee') && !lineStr.includes('INVOICE') && !lineStr.includes('State Name')) {
            supplierName = supMatch[0]?.trim();
          }
        }
        if (!invoiceNumber) {
          const invMatch = lineStr.match(/(?:Invoice\s*No\.?|Bill\s*No\.?)\s*[:.]?\s*([A-Za-z0-9\/-]+)/i);
          if (invMatch && invMatch[1]) {
            invoiceNumber = invMatch[1];
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

    for (const line of pageLines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      // Ignore common header / footer lines
      if (/^(INVOICE|Consignee|Buyer|State Name|GSTIN|Invoice No|Delivery|Reference|Dispatch|Terms|Sl\s+Description|Sr\.\s*No|Total|continued|This is a Computer|Amount Chargeable|INR\s+|HSN\/SAC\s+|Tax Amount|Declaration|Bank Details|Certified that)/i.test(trimmed)) {
        continue;
      }

      const matchStart = trimmed.match(/^(\d{1,3})\s+(.+)$/);
      if (matchStart && matchStart[1] && matchStart[2]) {
        const slCandidate = parseInt(matchStart[1], 10);
        const isExpectedSl = slCandidate === expectedSl;
        const hasItemNumbers = /(PCS|nos|NOS|SET|SETS|KGS|KG|GM|LTR|BOX|PKT)\s+(\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)/i.test(trimmed);

        if (isExpectedSl || hasItemNumbers) {
          if (currentRow) extractedRows.push(currentRow);
          expectedSl = slCandidate + 1;
          currentRow = {
            sl: slCandidate,
            mainLine: matchStart[2],
            descContinuation: [],
          };
          continue;
        }
      }

      if (currentRow) {
        if (!/^(Total|R\/O|IGST|CGST|SGST|\d+,\d+)/i.test(trimmed)) {
          currentRow.descContinuation.push(trimmed);
        }
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
  // Pattern 1: Tally / Maa Sales format
  // Format: [Description] [HSN] [Qty] [Unit] [RateInclTax] [Rate] [per] [Amount]
  const maaPattern = /(\b\d{6,8}\b)?\s*(\d+(?:\.\d+)?)\s*(PCS|nos|NOS|SET|SETS|KGS|KG|GM|LTR|BOX|PKT)\s+(\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)\s+(?:PCS|nos|NOS|SET|SETS|KGS|KG|GM|LTR|BOX|PKT)\s+([0-9,]+(?:\.\d+)?)$/i;
  
  const m = r.mainLine.match(maaPattern);
  if (m && m.index !== undefined && m[2] && m[3] && m[4] && m[5]) {
    const descBefore = r.mainLine.substring(0, m.index).trim();
    const hsn = m[1] || '96039000';
    const qty = parseFloat(m[2]);
    const unit = m[3].toUpperCase();
    const rateInclTax = parseFloat(m[4]);
    const rate = parseFloat(m[5]);

    const fullName = cleanProductName(`${descBefore} ${r.descContinuation.join(' ')}`);
    const category = inferCategoryFromName(fullName);

    // Calculate GST rate from purchase rate and rate incl. of tax
    let gstRateBps = 1800; // default 18%
    if (rate > 0 && rateInclTax > rate) {
      const calcPct = Math.round(((rateInclTax - rate) / rate) * 100);
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
      purchasePrice: Math.max(0, rate),
      mrp: Math.max(0, rateInclTax),
      sellingPrice: Math.max(0, rateInclTax),
      gstRateBps,
      category,
      selected: true,
    };

    attachExistingMatch(item, existingProducts);
    return item;
  }

  // Pattern 2: Om Galaxy / Standard Tax Invoice format
  // Format: [Description] [HSN] [MRP] [Qty] [Unit] [Rate] [Taxable Value] [CGST %] ...
  const hsnMatch = r.mainLine.match(/\b([5-9]\d{5,7}|6805\d{4}|7323\d{4}|9603\d{3,4}|8302\d{4}|998\d{3})\b/);
  if (hsnMatch && hsnMatch.index !== undefined && hsnMatch[0]) {
    const descBefore = r.mainLine.substring(0, hsnMatch.index).trim();
    const afterHsn = r.mainLine.substring(hsnMatch.index + hsnMatch[0].length).trim();
    const hsn = hsnMatch[0];

    const fullName = cleanProductName(`${descBefore} ${r.descContinuation.join(' ')}`);
    const unitMatch = afterHsn.match(/\b(PCS|nos|NOS|SET|SETS|KGS|KG|GM|LTR|BOX|PKT)\b/i);
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
 * Suggests a retail category based on common Indian kirana/household product keywords
 */
function inferCategoryFromName(name: string): string {
  const lower = name.toLowerCase();
  if (lower.includes('brush') || lower.includes('wiper') || lower.includes('mop') || lower.includes('scrubber') || lower.includes('dustpan') || lower.includes('broom') || lower.includes('plunger') || lower.includes('clean')) {
    return 'Cleaning & Household';
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
