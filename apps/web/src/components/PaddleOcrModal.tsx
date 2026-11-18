import React, { useState, useRef } from 'react';
import {
  X,
  FileSpreadsheet,
  Upload,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Sparkles,
  PlusCircle,
  Trash2,
  PackagePlus,
} from 'lucide-react';
import { db, ProductRecord } from '../db';
import { exportProductsToExcel } from '../utils/excelExporter';
import { parseStockPdf } from '../utils/pdfStockParser';

export interface ExtractedProduct {
  id: string;
  sl_no: number;
  description: string;
  sku: string;
  hsn_code: string;
  category: string;
  quantity: number;
  unit: string;
  rate: number;
  mrp: number;
  selling_price: number;
  gst_rate: string;
  tax_amount: number;
  total_amount: number;
  selected: boolean;
}

interface ExtractedMetadata {
  supplierName?: string | undefined;
  invoiceNo?: string | undefined;
  invoiceDate?: string | undefined;
  engineUsed?: string | undefined;
}

interface PaddleOcrModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProductsImported?: () => void;
}

export const PaddleOcrModal: React.FC<PaddleOcrModalProps> = ({
  isOpen,
  onClose,
  onProductsImported,
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [extractedItems, setExtractedItems] = useState<ExtractedProduct[]>([]);
  const [metadata, setMetadata] = useState<ExtractedMetadata>({});
  const [error, setError] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);
  const [isSavedToInventory, setIsSavedToInventory] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  // Auto-process PDF immediately upon file selection
  const handleFileSelect = (selectedFile: File) => {
    if (!selectedFile.name.toLowerCase().endsWith('.pdf')) {
      setError('Please select a valid PDF file.');
      return;
    }
    setFile(selectedFile);
    setError(null);
    setSuccessToast(null);
    setIsSavedToInventory(false);
    startExtraction(selectedFile);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  // Run extraction via PaddleOCR backend first, fallback to client engine
  const startExtraction = async (targetFile: File) => {
    setIsProcessing(true);
    setStatusMessage('Analyzing PDF pages with PaddleOCR & table layout engine...');
    setError(null);

    const formData = new FormData();
    formData.append('file', targetFile);

    try {
      let previewRes: globalThis.Response | null = null;
      try {
        previewRes = await fetch('http://127.0.0.1:8000/api/products/ocr-preview', {
          method: 'POST',
          body: formData,
        });
      } catch {
        try {
          previewRes = await fetch('http://localhost:8000/api/products/ocr-preview', {
            method: 'POST',
            body: formData,
          });
        } catch {
          previewRes = null;
        }
      }

      if (previewRes && previewRes.ok) {
        const json = await previewRes.json();
        if (json.items && json.items.length > 0) {
          const mapped: ExtractedProduct[] = json.items.map((it: any, idx: number) => ({
            id: `row-${idx + 1}-${Date.now()}`,
            sl_no: it.sl_no || idx + 1,
            description: it.description || `Product Item ${idx + 1}`,
            sku: it.sku || `SKU-${(it.hsn_code || '1001').slice(-4)}-${String(idx + 1).padStart(3, '0')}`,
            hsn_code: it.hsn_code || '1001',
            category: it.category || 'Groceries / Kirana',
            quantity: Number(it.quantity) || 1,
            unit: it.unit || 'PCS',
            rate: Number(it.rate) || 0,
            mrp: Number(it.mrp) || Math.round(Number(it.rate || 0) * 1.18 * 100) / 100,
            selling_price: Number(it.selling_price) || Number(it.mrp) || Math.round(Number(it.rate || 0) * 1.18 * 100) / 100,
            gst_rate: it.gst_rate || '18%',
            tax_amount: Number(it.tax_amount) || Math.round(Number(it.total_amount || 0) * 0.18 * 100) / 100,
            total_amount: Number(it.total_amount) || Math.round(Number(it.quantity || 1) * Number(it.rate || 0) * 100) / 100,
            selected: true,
          }));

          setExtractedItems(mapped);
          setMetadata({
            supplierName: json.supplier_name,
            invoiceNo: json.invoice_no,
            invoiceDate: json.invoice_date,
            engineUsed: json.engine_used || 'PaddlePaddle/PaddleOCR 3.7',
          });
          setStatusMessage(`Extracted ${mapped.length} products sequentially by Sl No!`);
          setIsProcessing(false);
          return;
        }
      }

      // If backend was unreachable or returned empty, run in-browser layout fallback
      setStatusMessage('Extracting product rows via local PDF layout engine...');
      await runClientSideFallback(targetFile);
    } catch (err: any) {
      console.warn('Backend OCR unavailable, running client parser:', err);
      await runClientSideFallback(targetFile);
    } finally {
      setIsProcessing(false);
    }
  };

  const runClientSideFallback = async (targetFile: File) => {
    try {
      const parsed = await parseStockPdf(targetFile);
      if (parsed.items.length === 0) {
        throw new Error('No product line items could be detected. Please ensure the PDF contains text lines or table entries.');
      }

      const mapped: ExtractedProduct[] = parsed.items.map((it, idx) => ({
        id: `client-row-${idx + 1}-${Date.now()}`,
        sl_no: it.slNo || idx + 1,
        description: it.name,
        sku: it.sku || `SKU-${(it.hsn_sac || '1001').slice(-4)}-${String(idx + 1).padStart(3, '0')}`,
        hsn_code: it.hsn_sac || '1001',
        category: it.category || 'Groceries / Kirana',
        quantity: Math.max(1, it.quantity),
        unit: it.unit || 'PCS',
        rate: it.purchasePrice || 0,
        mrp: it.mrp || Math.round(it.purchasePrice * 1.18 * 100) / 100,
        selling_price: it.sellingPrice || it.mrp || Math.round(it.purchasePrice * 1.18 * 100) / 100,
        gst_rate: `${(it.gstRateBps / 100).toFixed(0)}%`,
        tax_amount: Math.round(((it.purchasePrice * (it.gstRateBps / 10000))) * it.quantity * 100) / 100,
        total_amount: Math.round(it.purchasePrice * it.quantity * 100) / 100,
        selected: true,
      }));

      setExtractedItems(mapped);
      setMetadata({
        supplierName: parsed.supplierName || 'Uploaded Supplier Document',
        invoiceNo: parsed.invoiceNumber || 'INV-EXTRACTED',
        invoiceDate: parsed.invoiceDate || new Date().toISOString().split('T')[0],
        engineUsed: 'ShopBill PDF Engine (Client Fallback)',
      });
      setStatusMessage(`Successfully detected ${mapped.length} products listed in sequence!`);
    } catch (fallbackErr: any) {
      setError(fallbackErr.message || 'Could not parse products from the uploaded PDF.');
    }
  };

  // Toggle selection
  const handleToggleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    const checked = e.target.checked;
    setExtractedItems((prev) => prev.map((item) => ({ ...item, selected: checked })));
  };

  const handleToggleItem = (id: string) => {
    setExtractedItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, selected: !item.selected } : item))
    );
  };

  // Update item inline
  const handleUpdateItemField = (id: string, field: keyof ExtractedProduct, val: any) => {
    setExtractedItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const updated = { ...item, [field]: val };
        // recalculate total
        if (field === 'quantity' || field === 'rate') {
          updated.total_amount = Math.round(Number(updated.quantity) * Number(updated.rate) * 100) / 100;
        }
        return updated;
      })
    );
  };

  const handleDeleteItem = (id: string) => {
    setExtractedItems((prev) => {
      const filtered = prev.filter((it) => it.id !== id);
      return filtered.map((it, idx) => ({ ...it, sl_no: idx + 1 }));
    });
  };

  const handleAddNewRow = () => {
    const newSl = extractedItems.length + 1;
    const newItem: ExtractedProduct = {
      id: `manual-row-${Date.now()}`,
      sl_no: newSl,
      description: 'New Product Item',
      sku: `SKU-GEN-${String(newSl).padStart(3, '0')}`,
      hsn_code: '1001',
      category: 'Groceries / Kirana',
      quantity: 10,
      unit: 'PCS',
      rate: 100,
      mrp: 120,
      selling_price: 120,
      gst_rate: '18%',
      tax_amount: 180,
      total_amount: 1000,
      selected: true,
    };
    setExtractedItems((prev) => [...prev, newItem]);
  };

  // Download Excel Report
  const handleDownloadExcel = async () => {
    const selected = extractedItems.filter((i) => i.selected);
    if (selected.length === 0) {
      alert('Please select at least one product row to include in the Excel report.');
      return;
    }

    try {
      // 1. Try backend Excel download with edited items
      let response: globalThis.Response | null = null;
      try {
        response = await fetch('http://127.0.0.1:8000/api/products/download-excel', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            supplier_name: metadata.supplierName || 'Supplier Document',
            invoice_no: metadata.invoiceNo || 'INV-REPORT',
            invoice_date: metadata.invoiceDate || new Date().toISOString().split('T')[0],
            items: selected,
          }),
        });
      } catch {
        response = null;
      }

      if (response && response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const cleanName = (metadata.supplierName || 'Product_Stock').replace(/\s+/g, '_');
        a.download = `Product_Stock_Report_${cleanName}_${new Date().toISOString().slice(0, 10)}.xlsx`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        setSuccessToast(`Excel report with ${selected.length} products downloaded successfully!`);
        return;
      }

      // 2. Client-side SheetJS fallback
      const prodRecords: ProductRecord[] = selected.map((m, idx) => ({
        id: `ocr-${Date.now()}-${idx}`,
        sku: m.sku || `SKU-${m.hsn_code}-${m.sl_no}`,
        barcodes: [],
        name: m.description,
        category: m.category || 'Groceries / Kirana',
        hsn_sac: m.hsn_code,
        unit: m.unit,
        gst_rate_bps: parseInt(m.gst_rate.replace('%', ''), 10) * 100 || 1800,
        mrp_paise: Math.round(m.mrp * 100),
        selling_price_paise: Math.round(m.selling_price * 100),
        purchase_price_paise: Math.round(m.rate * 100),
        is_tax_inclusive: true,
        min_stock_milli: 5000,
        current_stock_milli: Math.round(m.quantity * 1000),
        is_archived: false,
        updated_at: new Date().toISOString(),
      }));

      const filename = `Product_Stock_Report_${(metadata.supplierName || 'Store').replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.xlsx`;
      exportProductsToExcel(prodRecords, filename);
      setSuccessToast(`Excel report with ${selected.length} products downloaded successfully!`);
    } catch (e: any) {
      alert(`Error downloading Excel report: ${e?.message}`);
    }
  };

  // Import to Inventory (Eliminates all typing work)
  const handleImportToInventory = async () => {
    const selected = extractedItems.filter((i) => i.selected);
    if (selected.length === 0) {
      alert('Please select at least one product row to import into your store.');
      return;
    }

    try {
      const now = new Date().toISOString();
      let newCount = 0;
      let updatedCount = 0;

      const existingProducts = await db.products.toArray();

      for (const item of selected) {
        // Check if matching item exists by exact or normalized name
        const normItemName = item.description.toLowerCase().replace(/[^a-z0-9]/g, '');
        const match = existingProducts.find((p) => {
          const normP = p.name.toLowerCase().replace(/[^a-z0-9]/g, '');
          return normP === normItemName || (normP.length > 5 && normP.includes(normItemName));
        });

        if (match) {
          // Increment stock
          const newStockMilli = match.current_stock_milli + Math.round(item.quantity * 1000);
          await db.products.update(match.id, {
            current_stock_milli: newStockMilli,
            purchase_price_paise: Math.round(item.rate * 100),
            mrp_paise: Math.round(item.mrp * 100),
            selling_price_paise: Math.round(item.selling_price * 100),
            updated_at: now,
          });
          updatedCount++;
        } else {
          // Create new product
          const prodId = `prod-ocr-${Date.now()}-${item.sl_no}`;
          const record: ProductRecord = {
            id: prodId,
            sku: item.sku || `SKU-${item.hsn_code}-${item.sl_no}`,
            barcodes: [],
            name: item.description,
            category: item.category || 'Groceries / Kirana',
            hsn_sac: item.hsn_code || '1001',
            unit: item.unit || 'PCS',
            gst_rate_bps: parseInt(item.gst_rate.replace('%', ''), 10) * 100 || 1800,
            mrp_paise: Math.round(item.mrp * 100),
            selling_price_paise: Math.round(item.selling_price * 100),
            purchase_price_paise: Math.round(item.rate * 100),
            is_tax_inclusive: true,
            min_stock_milli: 5000,
            current_stock_milli: Math.round(item.quantity * 1000),
            is_archived: false,
            updated_at: now,
          };
          await db.products.put(record);
          newCount++;
        }
      }

      setIsSavedToInventory(true);
      setSuccessToast(
        `Success! Imported ${selected.length} products (${newCount} new added, ${updatedCount} stock quantities updated). Ready for billing in POS!`
      );

      if (onProductsImported) {
        onProductsImported();
      }
    } catch (saveErr: any) {
      setError(`Failed to import to store database: ${saveErr.message}`);
    }
  };

  const selectedCount = extractedItems.filter((i) => i.selected).length;
  const totalQty = extractedItems
    .filter((i) => i.selected)
    .reduce((acc, curr) => acc + curr.quantity, 0);
  const totalAmount = extractedItems
    .filter((i) => i.selected)
    .reduce((acc, curr) => acc + curr.total_amount, 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-6xl max-h-[94vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-600 rounded-xl text-white shadow-md shadow-blue-500/20">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white tracking-tight">
                  PaddleOCR: Product PDF to App & Excel Engine
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-blue-500/20 text-blue-300 font-bold border border-blue-400/30 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-amber-300" /> Sequential Sl No
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Automatically extracts and lists all products in serial order with rates, quantities, HSN, and MRP. Generates Excel reports and auto-fills store inventory to eliminate typing.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {/* Notifications */}
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {successToast && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center gap-2.5 shadow-xs">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              <span className="font-semibold">{successToast}</span>
            </div>
          )}

          {/* Upload Drop Zone (when no file or when changing file) */}
          {(!extractedItems.length || !file) && (
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className="p-8 border-2 border-dashed border-slate-300 hover:border-blue-500 rounded-2xl text-center transition-all bg-slate-50/60 hover:bg-slate-100/70 cursor-pointer"
            >
              <input
                type="file"
                ref={fileInputRef}
                accept=".pdf,application/pdf"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    handleFileSelect(e.target.files[0]);
                  }
                }}
              />

              <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center shadow-inner">
                {isProcessing ? (
                  <Loader2 className="w-7 h-7 animate-spin text-blue-600" />
                ) : (
                  <Upload className="w-7 h-7 text-blue-600" />
                )}
              </div>

              <div>
                <h4 className="text-sm font-bold text-slate-800">
                  {isProcessing ? 'Reading and Extracting Products...' : 'Select or Drag & Drop Product PDF'}
                </h4>
                <p className="text-xs text-slate-500 mt-1">
                  Upload any product catalogue, invoice (Tally / Busy / Om Galaxy / Maa Sales), or stock list PDF.
                </p>
              </div>
            </div>
          )}

          {/* Active Extraction Loading */}
          {isProcessing && (
            <div className="p-6 bg-blue-50/70 border border-blue-200 rounded-2xl text-center space-y-2 animate-pulse">
              <Loader2 className="w-6 h-6 animate-spin text-blue-600 mx-auto" />
              <p className="text-xs font-bold text-blue-900">{statusMessage}</p>
              <p className="text-[11px] text-blue-600">Reconstructing table rows and sorting sequentially by Serial Number...</p>
            </div>
          )}

          {/* Extracted Product Table & Details (Listed in the App) */}
          {extractedItems.length > 0 && !isProcessing && (
            <div className="space-y-4">
              {/* Metadata Banner & KPI Strip */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Vendor / Source</p>
                  <p className="text-xs font-bold text-slate-800 truncate mt-0.5">
                    {metadata.supplierName || 'Supplier Document'}
                  </p>
                  <p className="text-[10px] text-slate-500 font-mono">
                    Inv: {metadata.invoiceNo || 'N/A'} • {metadata.invoiceDate || 'Today'}
                  </p>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Total Items Listed</p>
                  <p className="text-lg font-black text-slate-900 mt-0.5">
                    {selectedCount} <span className="text-xs font-normal text-slate-500">/ {extractedItems.length} items</span>
                  </p>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Total Stock Quantity</p>
                  <p className="text-lg font-black text-blue-600 mt-0.5">
                    {totalQty.toFixed(1)} <span className="text-xs font-semibold text-slate-600">Units</span>
                  </p>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Total Purchase Value</p>
                  <p className="text-lg font-black text-emerald-600 mt-0.5">
                    ₹{totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                </div>
              </div>

              {/* Table Toolbar */}
              <div className="flex items-center justify-between gap-3 text-xs flex-wrap">
                <div className="flex items-center gap-2">
                  <label className="flex items-center gap-1.5 font-bold text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={extractedItems.length > 0 && extractedItems.every((i) => i.selected)}
                      onChange={handleToggleSelectAll}
                      className="rounded text-blue-600 w-4 h-4"
                    />
                    <span>Select All ({extractedItems.length} Products)</span>
                  </label>
                  <span className="text-slate-300">|</span>
                  <button
                    onClick={handleAddNewRow}
                    className="text-blue-600 hover:text-blue-700 font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <PlusCircle className="w-3.5 h-3.5" />
                    <span>Add Missing Item</span>
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      if (fileInputRef.current) {
                        fileInputRef.current.value = '';
                        fileInputRef.current.click();
                      }
                    }}
                    className="text-xs text-slate-600 hover:text-slate-900 font-semibold underline cursor-pointer"
                  >
                    Change PDF File ({file?.name})
                  </button>
                </div>
              </div>

              {/* Interactive Table with All Details According to Sl No */}
              <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                <div className="max-h-[44vh] overflow-y-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-slate-900 text-white font-bold sticky top-0 z-10 text-[11px]">
                        <th className="py-2.5 px-3 w-8 text-center">
                          <input
                            type="checkbox"
                            checked={extractedItems.every((i) => i.selected)}
                            onChange={handleToggleSelectAll}
                            className="rounded"
                          />
                        </th>
                        <th className="py-2.5 px-2.5 w-12 text-center">Sl No</th>
                        <th className="py-2.5 px-3">Product Description / Title</th>
                        <th className="py-2.5 px-2.5 w-24">HSN/SAC</th>
                        <th className="py-2.5 px-2.5 text-right w-20">Qty</th>
                        <th className="py-2.5 px-2 w-16 text-center">Unit</th>
                        <th className="py-2.5 px-2.5 text-right w-24">Purchase (₹)</th>
                        <th className="py-2.5 px-2.5 text-right w-24">MRP (₹)</th>
                        <th className="py-2.5 px-2.5 text-right w-24">Selling (₹)</th>
                        <th className="py-2.5 px-2 w-16 text-center">GST</th>
                        <th className="py-2.5 px-3 text-right w-28">Total (₹)</th>
                        <th className="py-2.5 px-2 w-10 text-center"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {extractedItems.map((item) => (
                        <tr
                          key={item.id}
                          className={`hover:bg-blue-50/40 transition ${
                            !item.selected ? 'opacity-40 bg-slate-50' : ''
                          }`}
                        >
                          <td className="py-2 px-3 text-center">
                            <input
                              type="checkbox"
                              checked={item.selected}
                              onChange={() => handleToggleItem(item.id)}
                              className="rounded text-blue-600"
                            />
                          </td>
                          <td className="py-2 px-2.5 text-center font-mono font-bold text-slate-500">
                            {item.sl_no}
                          </td>
                          <td className="py-2 px-3">
                            <input
                              type="text"
                              value={item.description}
                              onChange={(e) => handleUpdateItemField(item.id, 'description', e.target.value)}
                              className="w-full bg-transparent border-b border-transparent hover:border-slate-300 focus:border-blue-600 focus:bg-white focus:outline-none px-1 py-0.5 font-bold text-slate-800"
                              title="Click to edit product title"
                            />
                            <span className="text-[10px] text-slate-400 font-mono ml-1">
                              {item.sku} • {item.category}
                            </span>
                          </td>
                          <td className="py-2 px-2.5 font-mono text-slate-600">
                            <input
                              type="text"
                              value={item.hsn_code}
                              onChange={(e) => handleUpdateItemField(item.id, 'hsn_code', e.target.value)}
                              className="w-20 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-blue-600 focus:bg-white focus:outline-none px-1 font-mono text-xs"
                            />
                          </td>
                          <td className="py-2 px-2.5 text-right">
                            <input
                              type="number"
                              step="0.01"
                              value={item.quantity}
                              onChange={(e) =>
                                handleUpdateItemField(item.id, 'quantity', parseFloat(e.target.value) || 0)
                              }
                              className="w-16 text-right bg-transparent border-b border-transparent hover:border-slate-300 focus:border-blue-600 focus:bg-white focus:outline-none px-1 font-bold text-slate-900"
                            />
                          </td>
                          <td className="py-2 px-2 text-center">
                            <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 font-mono text-[10px] font-bold">
                              {item.unit}
                            </span>
                          </td>
                          <td className="py-2 px-2.5 text-right font-mono">
                            <input
                              type="number"
                              step="0.01"
                              value={item.rate}
                              onChange={(e) =>
                                handleUpdateItemField(item.id, 'rate', parseFloat(e.target.value) || 0)
                              }
                              className="w-20 text-right bg-transparent border-b border-transparent hover:border-slate-300 focus:border-blue-600 focus:bg-white focus:outline-none px-1 font-medium text-slate-700"
                            />
                          </td>
                          <td className="py-2 px-2.5 text-right font-mono">
                            <input
                              type="number"
                              step="0.01"
                              value={item.mrp}
                              onChange={(e) =>
                                handleUpdateItemField(item.id, 'mrp', parseFloat(e.target.value) || 0)
                              }
                              className="w-20 text-right bg-transparent border-b border-transparent hover:border-slate-300 focus:border-blue-600 focus:bg-white focus:outline-none px-1 text-slate-600"
                            />
                          </td>
                          <td className="py-2 px-2.5 text-right font-mono">
                            <input
                              type="number"
                              step="0.01"
                              value={item.selling_price}
                              onChange={(e) =>
                                handleUpdateItemField(item.id, 'selling_price', parseFloat(e.target.value) || 0)
                              }
                              className="w-20 text-right bg-transparent border-b border-transparent hover:border-slate-300 focus:border-blue-600 focus:bg-white focus:outline-none px-1 font-bold text-blue-900"
                            />
                          </td>
                          <td className="py-2 px-2 text-center font-mono text-slate-500 text-[11px]">
                            {item.gst_rate}
                          </td>
                          <td className="py-2 px-3 text-right font-mono font-black text-slate-900">
                            ₹{item.total_amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="py-2 px-2 text-center">
                            <button
                              onClick={() => handleDeleteItem(item.id)}
                              className="p-1 text-slate-400 hover:text-rose-600 rounded transition cursor-pointer"
                              title="Delete row"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions (Download Excel + Add to Store to reduce typing work) */}
        <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div>
            <p className="text-xs text-slate-500 font-medium">
              {extractedItems.length > 0 ? (
                <>
                  <span className="font-bold text-slate-800">{selectedCount}</span> of {extractedItems.length} products selected for Excel report & store import
                </>
              ) : (
                'Upload a PDF to view products and export Excel report'
              )}
            </p>
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            {extractedItems.length > 0 && (
              <>
                {/* 1. Download Excel Report */}
                <button
                  onClick={handleDownloadExcel}
                  className="px-4 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-slate-800 font-bold text-xs shadow-xs transition flex items-center justify-center gap-2 cursor-pointer"
                  title="Generate formatted .xlsx Excel report with all listed products"
                >
                  <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                  <span>Download Excel Report (.xlsx)</span>
                </button>

                {/* 2. Import to Inventory to Reduce Typing Work */}
                <button
                  onClick={handleImportToInventory}
                  disabled={isSavedToInventory || selectedCount === 0}
                  className={`px-5 py-2.5 rounded-xl font-bold text-xs shadow-md shadow-blue-500/20 transition flex items-center justify-center gap-2 cursor-pointer ${
                    isSavedToInventory
                      ? 'bg-emerald-600 text-white cursor-default'
                      : 'bg-blue-600 hover:bg-blue-700 text-white'
                  }`}
                  title="Auto-fill store inventory and POS catalogue with zero typing"
                >
                  {isSavedToInventory ? (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Products Saved to Store!</span>
                    </>
                  ) : (
                    <>
                      <PackagePlus className="w-4 h-4 text-blue-200" />
                      <span>Auto-Fill Store Inventory ({selectedCount})</span>
                    </>
                  )}
                </button>
              </>
            )}

            <button
              onClick={onClose}
              className="px-4 py-2.5 border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-xl font-bold text-xs transition cursor-pointer"
            >
              {extractedItems.length > 0 ? 'Done' : 'Close'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
