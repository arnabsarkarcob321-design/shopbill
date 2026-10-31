import React, { useState } from 'react';
import {
  X,
  CheckCircle2,
  AlertCircle,
  FileText,
  Boxes,
  ArrowRight,
  RefreshCw,
  PlusCircle,
  Building2,
  Calendar,
  Hash,
} from 'lucide-react';
import { db, ProductRecord } from '../db';
import { ParsedProductItem, ParseResult } from '../utils/pdfStockParser';

interface PdfImportModalProps {
  parseResult: ParseResult;
  isOpen: boolean;
  onClose: () => void;
  onImportComplete: (summary: {
    total: number;
    newCount: number;
    updatedCount: number;
  }) => void;
}

export const PdfImportModal: React.FC<PdfImportModalProps> = ({
  parseResult,
  isOpen,
  onClose,
  onImportComplete,
}) => {
  const [items, setItems] = useState<ParsedProductItem[]>(parseResult.items || []);
  const [duplicateMode, setDuplicateMode] = useState<'update' | 'append'>('update');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const selectedItems = items.filter((i) => i.selected);
  const existingMatchesCount = items.filter((i) => i.isExistingMatch).length;
  const newProductsCount = items.length - existingMatchesCount;
  const totalStockUnits = selectedItems.reduce((acc, curr) => acc + curr.quantity, 0);

  const handleToggleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    const checked = e.target.checked;
    setItems((prev) => prev.map((item) => ({ ...item, selected: checked })));
  };

  const handleToggleItem = (id: string) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, selected: !item.selected } : item))
    );
  };

  const handleUpdateItemField = (
    id: string,
    field: keyof ParsedProductItem,
    value: any
  ) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    );
  };

  const handleExecuteImport = async () => {
    if (selectedItems.length === 0) {
      alert('Please select at least one item to import.');
      return;
    }

    setIsSubmitting(true);
    try {
      let newCount = 0;
      let updatedCount = 0;
      const now = new Date().toISOString();

      await db.transaction('rw', db.products, async () => {
        for (const item of selectedItems) {
          if (item.isExistingMatch && item.existingProductId && duplicateMode === 'update') {
            const existing = await db.products.get(item.existingProductId);
            if (existing) {
              const addedMilli = Math.round(item.quantity * 1000);
              const newStockMilli = (existing.current_stock_milli || 0) + addedMilli;
              const newPurchasePaise = Math.round(item.purchasePrice * 100);
              const newSellingPaise = Math.round(item.sellingPrice * 100);
              const newMrpPaise = Math.round((item.mrp || item.sellingPrice) * 100);

              await db.products.update(existing.id, {
                current_stock_milli: newStockMilli,
                purchase_price_paise: newPurchasePaise,
                selling_price_paise: newSellingPaise,
                mrp_paise: newMrpPaise,
                gst_rate_bps: item.gstRateBps,
                updated_at: now,
              });
              updatedCount++;
              continue;
            }
          }

          // Create new product record
          const prodId = `prod-imp-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
          const newRecord: ProductRecord = {
            id: prodId,
            sku: item.sku || `SKU-${Date.now().toString().slice(-4)}`,
            barcodes: [item.sku || `BC-${Date.now().toString().slice(-4)}`],
            name: item.name.trim(),
            category: item.category || 'General Merchandise',
            hsn_sac: item.hsn_sac || '96039000',
            unit: item.unit || 'PCS',
            gst_rate_bps: item.gstRateBps,
            mrp_paise: Math.round(item.mrp * 100),
            selling_price_paise: Math.round(item.sellingPrice * 100),
            purchase_price_paise: Math.round(item.purchasePrice * 100),
            is_tax_inclusive: true,
            min_stock_milli: 10000, // 10 units low stock threshold
            current_stock_milli: Math.round(item.quantity * 1000),
            is_archived: false,
            updated_at: now,
          };

          await db.products.put(newRecord);
          newCount++;
        }
      });

      onImportComplete({
        total: selectedItems.length,
        newCount,
        updatedCount,
      });
      onClose();
    } catch (err) {
      console.error('Failed to import stock products:', err);
      alert('An error occurred during import. Please check console for details.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 z-50">
      <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full flex flex-col max-h-[92vh] border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 bg-slate-50 flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-xl bg-blue-100 text-blue-700">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-extrabold text-lg text-slate-900">
                  Review & Import Stock from PDF
                </h3>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-200">
                  {items.length} items parsed
                </span>
              </div>
              <div className="flex items-center gap-4 mt-1 text-xs text-slate-500 font-medium flex-wrap">
                <span className="flex items-center gap-1">
                  <Building2 className="w-3.5 h-3.5 text-slate-400" />
                  <strong>Supplier:</strong> {parseResult.supplierName}
                </span>
                <span className="flex items-center gap-1">
                  <Hash className="w-3.5 h-3.5 text-slate-400" />
                  <strong>Invoice #:</strong> {parseResult.invoiceNumber}
                </span>
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  <strong>Date:</strong> {parseResult.invoiceDate}
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick Stats & Duplicate Strategy Bar */}
        <div className="px-5 py-3.5 bg-slate-50/70 border-b border-slate-200 grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
          {/* Stats Badges */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-200 shadow-2xs text-xs">
              <Boxes className="w-4 h-4 text-blue-600" />
              <span className="text-slate-500">Total Stock Qty:</span>
              <strong className="text-slate-900 font-extrabold">{totalStockUnits.toLocaleString()} units</strong>
            </div>

            {existingMatchesCount > 0 && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-xs">
                <AlertCircle className="w-4 h-4 text-amber-600" />
                <span>
                  <strong>{existingMatchesCount}</strong> existing item{existingMatchesCount > 1 ? 's' : ''} detected
                </span>
              </div>
            )}

            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>
                <strong>{newProductsCount}</strong> new product{newProductsCount > 1 ? 's' : ''}
              </span>
            </div>
          </div>

          {/* Duplicate Mode Toggle */}
          <div className="flex items-center justify-start md:justify-end gap-2 text-xs">
            <span className="font-semibold text-slate-600">Duplicate Action:</span>
            <div className="inline-flex rounded-lg border border-slate-300 p-0.5 bg-slate-100">
              <button
                type="button"
                onClick={() => setDuplicateMode('update')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-md font-bold transition-all ${
                  duplicateMode === 'update'
                    ? 'bg-blue-600 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Adds new quantity to current stock on hand"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Update Existing Stock</span>
              </button>
              <button
                type="button"
                onClick={() => setDuplicateMode('append')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-md font-bold transition-all ${
                  duplicateMode === 'append'
                    ? 'bg-blue-600 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Creates a fresh product entry even if name matches"
              >
                <PlusCircle className="w-3 h-3" />
                <span>Append as New</span>
              </button>
            </div>
          </div>
        </div>

        {/* Scrollable Table Content */}
        <div className="flex-1 overflow-auto p-4">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-100 text-slate-600 font-bold uppercase text-[10px] tracking-wider sticky top-0 z-10 border-b border-slate-200 shadow-2xs">
              <tr>
                <th className="py-2.5 px-3 w-8">
                  <input
                    type="checkbox"
                    checked={selectedItems.length === items.length && items.length > 0}
                    onChange={handleToggleSelectAll}
                    className="rounded text-blue-600 cursor-pointer"
                  />
                </th>
                <th className="py-2.5 px-2 w-8 text-center">#</th>
                <th className="py-2.5 px-3">Product Name & Category</th>
                <th className="py-2.5 px-2">HSN</th>
                <th className="py-2.5 px-2 text-right">Qty</th>
                <th className="py-2.5 px-2">Unit</th>
                <th className="py-2.5 px-2 text-right">Cost (₹)</th>
                <th className="py-2.5 px-2 text-right">Selling/MRP (₹)</th>
                <th className="py-2.5 px-2 text-center">GST %</th>
                <th className="py-2.5 px-3">Stock Impact</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {items.map((item) => {
                const isExisting = item.isExistingMatch && duplicateMode === 'update';
                return (
                  <tr
                    key={item.id}
                    className={`hover:bg-slate-50/90 transition-colors ${
                      !item.selected ? 'opacity-50 bg-slate-50/40' : ''
                    }`}
                  >
                    {/* Checkbox */}
                    <td className="py-2.5 px-3">
                      <input
                        type="checkbox"
                        checked={item.selected}
                        onChange={() => handleToggleItem(item.id)}
                        className="rounded text-blue-600 cursor-pointer"
                      />
                    </td>

                    {/* Serial Number */}
                    <td className="py-2.5 px-2 text-center text-slate-400 font-mono text-[11px]">
                      {item.slNo}
                    </td>

                    {/* Name & Category */}
                    <td className="py-2.5 px-3 min-w-[220px]">
                      <input
                        type="text"
                        value={item.name}
                        onChange={(e) => handleUpdateItemField(item.id, 'name', e.target.value)}
                        className="w-full font-bold text-slate-900 border border-transparent hover:border-slate-300 focus:border-blue-500 rounded px-1.5 py-0.5 text-xs focus:bg-white"
                      />
                      <div className="flex items-center gap-1.5 mt-0.5 px-1.5">
                        <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
                          {item.category}
                        </span>
                      </div>
                    </td>

                    {/* HSN */}
                    <td className="py-2.5 px-2">
                      <input
                        type="text"
                        value={item.hsn_sac}
                        onChange={(e) => handleUpdateItemField(item.id, 'hsn_sac', e.target.value)}
                        className="w-20 font-mono font-bold text-slate-600 text-xs border border-transparent hover:border-slate-300 focus:border-blue-500 rounded px-1 py-0.5 focus:bg-white"
                      />
                    </td>

                    {/* Quantity */}
                    <td className="py-2.5 px-2 text-right">
                      <input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) =>
                          handleUpdateItemField(item.id, 'quantity', parseFloat(e.target.value) || 1)
                        }
                        className="w-16 text-right font-extrabold text-blue-900 text-xs border border-slate-200 rounded px-1.5 py-0.5 focus:border-blue-500 focus:bg-white"
                      />
                    </td>

                    {/* Unit */}
                    <td className="py-2.5 px-2">
                      <span className="font-mono text-[11px] text-slate-500 font-bold uppercase">
                        {item.unit}
                      </span>
                    </td>

                    {/* Purchase Price */}
                    <td className="py-2.5 px-2 text-right">
                      <input
                        type="number"
                        step="0.01"
                        value={item.purchasePrice}
                        onChange={(e) =>
                          handleUpdateItemField(item.id, 'purchasePrice', parseFloat(e.target.value) || 0)
                        }
                        className="w-20 text-right font-medium text-slate-700 text-xs border border-slate-200 rounded px-1.5 py-0.5 focus:border-blue-500 focus:bg-white"
                      />
                    </td>

                    {/* Selling / MRP Price */}
                    <td className="py-2.5 px-2 text-right">
                      <input
                        type="number"
                        step="0.01"
                        value={item.sellingPrice}
                        onChange={(e) =>
                          handleUpdateItemField(item.id, 'sellingPrice', parseFloat(e.target.value) || 0)
                        }
                        className="w-20 text-right font-bold text-slate-900 text-xs border border-slate-200 rounded px-1.5 py-0.5 focus:border-blue-500 focus:bg-white"
                      />
                    </td>

                    {/* GST Slab */}
                    <td className="py-2.5 px-2 text-center">
                      <select
                        value={item.gstRateBps}
                        onChange={(e) =>
                          handleUpdateItemField(item.id, 'gstRateBps', parseInt(e.target.value, 10))
                        }
                        className="bg-blue-50 border border-blue-200 text-blue-800 text-[11px] font-bold py-0.5 px-1.5 rounded cursor-pointer"
                      >
                        <option value={0}>0%</option>
                        <option value={500}>5%</option>
                        <option value={1200}>12%</option>
                        <option value={1800}>18%</option>
                        <option value={2800}>28%</option>
                      </select>
                    </td>

                    {/* Stock Impact Badge */}
                    <td className="py-2.5 px-3">
                      {isExisting ? (
                        <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 text-[11px] font-semibold">
                          <span>Stock: {item.existingCurrentStock ?? 0}</span>
                          <ArrowRight className="w-3 h-3 text-amber-600" />
                          <strong className="text-amber-900 font-extrabold">
                            {(item.existingCurrentStock ?? 0) + item.quantity} {item.unit}
                          </strong>
                        </div>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-semibold">
                          <PlusCircle className="w-3 h-3 text-emerald-600" />
                          New Product (+{item.quantity} {item.unit})
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs text-slate-500 font-medium">
            <span>
              Selected <strong>{selectedItems.length}</strong> of {items.length} items to import.
            </span>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="w-full sm:w-auto px-4 py-2 border border-slate-300 text-slate-700 font-bold text-xs rounded-xl hover:bg-slate-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleExecuteImport}
              disabled={isSubmitting || selectedItems.length === 0}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-xl shadow-md shadow-blue-500/20 transition-all disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Importing into Catalogue...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Confirm & Import ({selectedItems.length}) Products</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
