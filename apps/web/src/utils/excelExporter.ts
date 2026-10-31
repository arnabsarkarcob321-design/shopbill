import * as XLSX from 'xlsx';
import { ProductRecord } from '../db';

/**
 * Generates and triggers a browser download of an .xlsx spreadsheet
 * containing all currently listed products.
 */
export function exportProductsToExcel(products: ProductRecord[], customFilename?: string): void {
  if (!products || products.length === 0) {
    alert('No products available to export.');
    return;
  }

  const rows = products.map((p, index) => {
    const purchaseRupees = (p.purchase_price_paise / 100).toFixed(2);
    const mrpRupees = (p.mrp_paise / 100).toFixed(2);
    const sellingRupees = (p.selling_price_paise / 100).toFixed(2);
    const stockQty = p.current_stock_milli / 1000;
    const minStockQty = p.min_stock_milli / 1000;
    const gstPct = `${(p.gst_rate_bps / 100).toFixed(0)}%`;

    return {
      'Sl No.': index + 1,
      'Product Name': p.name,
      'SKU / Code': p.sku || '-',
      'Barcode': p.barcodes && p.barcodes.length > 0 ? p.barcodes.join(', ') : '-',
      'Category': p.category || 'General',
      'HSN / SAC': p.hsn_sac || '-',
      'Stock Quantity': stockQty,
      'Unit': p.unit || 'PCS',
      'Purchase Price (Rs)': parseFloat(purchaseRupees),
      'MRP (Rs)': parseFloat(mrpRupees),
      'Selling Price (Rs)': parseFloat(sellingRupees),
      'GST Rate': gstPct,
      'Tax Inclusive': p.is_tax_inclusive ? 'Yes' : 'No',
      'Min Stock Alert': minStockQty,
      'Stock Status': stockQty <= 0 ? 'Out of Stock' : stockQty <= minStockQty ? 'Low Stock' : 'In Stock',
      'Updated At': p.updated_at ? new Date(p.updated_at).toLocaleDateString() : '-',
    };
  });

  const worksheet = XLSX.utils.json_to_sheet(rows);

  // Column width formatting
  const colKeys = Object.keys(rows[0] || {});
  const colWidths = colKeys.map((key) => {
    let maxLen = key.length;
    for (const r of rows) {
      const valStr = String((r as any)[key] ?? '');
      if (valStr.length > maxLen) {
        maxLen = valStr.length;
      }
    }
    return { wch: Math.min(Math.max(maxLen + 3, 10), 45) };
  });
  worksheet['!cols'] = colWidths;

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Product_Stock_List');

  const todayStr = new Date().toISOString().split('T')[0];
  const filename = customFilename || `Product_Stock_List_${todayStr}.xlsx`;

  XLSX.writeFile(workbook, filename);
}
