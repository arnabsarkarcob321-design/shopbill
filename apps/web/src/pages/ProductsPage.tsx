import React, { useState, useEffect } from 'react';
import {
  Plus,
  Search,
  Filter,
  AlertTriangle,
  Edit,
  X,
  FileSpreadsheet,
  CheckCircle2,
  Sparkles,
  ShoppingCart,
} from 'lucide-react';
import { db, ProductRecord } from '../db';
import { formatCurrency, formatQuantity } from '@shopbill/i18n';
import { exportProductsToExcel } from '../utils/excelExporter';
import { PaddleOcrModal } from '../components/PaddleOcrModal';
import { useCartStore } from '../state/cartStore';

interface ProductsPageProps {
  onNavigateToPos?: () => void;
}

export const ProductsPage: React.FC<ProductsPageProps> = ({ onNavigateToPos }) => {
  const { lines, calculation, addItem } = useCartStore();

  const [products, setProducts] = useState<ProductRecord[]>([]);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductRecord | null>(null);

  // PaddleOCR PDF to Excel State
  const [isPaddleModalOpen, setIsPaddleModalOpen] = useState(false);
  const [toastNotification, setToastNotification] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [barcode, setBarcode] = useState('');
  const [category, setCategory] = useState('Groceries / Kirana');
  const [hsn, setHsn] = useState('1001');
  const [unit, setUnit] = useState('packet');
  const [gstRateBps, setGstRateBps] = useState(500); // 5%
  const [mrpRupees, setMrpRupees] = useState('');
  const [sellingPriceRupees, setSellingPriceRupees] = useState('');
  const [purchasePriceRupees, setPurchasePriceRupees] = useState('');
  const [isTaxInclusive, setIsTaxInclusive] = useState(true);
  const [currentStock, setCurrentStock] = useState('50');
  const [minStock, setMinStock] = useState('10');

  const loadProducts = () => {
    db.products.filter((p) => !p.is_archived).toArray().then(setProducts);
  };

  useEffect(() => {
    loadProducts();
  }, []);

  // F2 Shortcut to Add Product
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F2') {
        e.preventDefault();
        handleOpenAdd();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Auto-dismiss toast notification
  useEffect(() => {
    if (toastNotification) {
      const timer = setTimeout(() => {
        setToastNotification(null);
      }, 6000);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [toastNotification]);

  const handleOpenAdd = () => {
    setEditingProduct(null);
    setName('');
    setSku(`SKU-${Date.now().toString().slice(-4)}`);
    setBarcode('');
    setCategory('Groceries / Kirana');
    setHsn('1001');
    setUnit('packet');
    setGstRateBps(500);
    setMrpRupees('');
    setSellingPriceRupees('');
    setPurchasePriceRupees('');
    setIsTaxInclusive(true);
    setCurrentStock('50');
    setMinStock('10');
    setIsAddModalOpen(true);
  };

  const handleOpenEdit = (p: ProductRecord) => {
    setEditingProduct(p);
    setName(p.name);
    setSku(p.sku);
    setBarcode(p.barcodes[0] || '');
    setCategory(p.category);
    setHsn(p.hsn_sac);
    setUnit(p.unit);
    setGstRateBps(p.gst_rate_bps);
    setMrpRupees((p.mrp_paise / 100).toString());
    setSellingPriceRupees((p.selling_price_paise / 100).toString());
    setPurchasePriceRupees((p.purchase_price_paise / 100).toString());
    setIsTaxInclusive(p.is_tax_inclusive);
    setCurrentStock((p.current_stock_milli / 1000).toString());
    setMinStock((p.min_stock_milli / 1000).toString());
    setIsAddModalOpen(true);
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const now = new Date().toISOString();
    const sellingPaise = Math.round(Number(sellingPriceRupees) * 100);
    const purchasePaise = Math.round(Number(purchasePriceRupees) * 100);
    const mrpPaise = Math.round(Number(mrpRupees || sellingPriceRupees) * 100);
    const stockMilli = Math.round(Number(currentStock) * 1000);
    const minMilli = Math.round(Number(minStock) * 1000);

    const prodId = editingProduct ? editingProduct.id : `prod-${Date.now()}`;
    const barcodesList = barcode.trim() ? [barcode.trim()] : [];

    const record: ProductRecord = {
      id: prodId,
      sku: sku.trim() || `SKU-${Date.now()}`,
      barcodes: barcodesList,
      name: name.trim(),
      category: category.trim(),
      hsn_sac: hsn.trim(),
      unit: unit.trim(),
      gst_rate_bps: Number(gstRateBps),
      mrp_paise: mrpPaise,
      selling_price_paise: sellingPaise,
      purchase_price_paise: purchasePaise,
      is_tax_inclusive: isTaxInclusive,
      min_stock_milli: minMilli,
      current_stock_milli: stockMilli,
      is_archived: false,
      updated_at: now,
    };

    await db.products.put(record);
    setIsAddModalOpen(false);
    loadProducts();
    setToastNotification({
      type: 'success',
      message: `Product "${name.trim()}" saved successfully!`,
    });
  };

  // Trigger Excel Export
  const handleExportToExcel = () => {
    if (products.length === 0) {
      alert('There are no products in the catalogue to export.');
      return;
    }
    // Export either filtered list or all products
    const itemsToExport = filtered.length > 0 ? filtered : products;
    exportProductsToExcel(itemsToExport);
    setToastNotification({
      type: 'success',
      message: `Exported ${itemsToExport.length} products to Excel spreadsheet!`,
    });
  };

  const categories = Array.from(new Set(products.map((p) => p.category)));

  const filtered = products.filter((p) => {
    if (selectedCategory !== 'ALL' && p.category !== selectedCategory) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        p.name.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        p.hsn_sac.includes(q) ||
        p.barcodes.some((b) => b.includes(q))
      );
    }
    return true;
  });

  return (
    <div className="flex-1 p-4 md:p-6 bg-canvas overflow-auto">
      {/* Toast Notification Banner */}
      {toastNotification && (
        <div
          className={`mb-4 p-3.5 rounded-xl border flex items-center justify-between gap-3 shadow-md transition-all animate-in fade-in slide-in-from-top-2 duration-200 ${
            toastNotification.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-rose-50 border-rose-200 text-rose-900'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {toastNotification.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
            )}
            <p className="text-xs sm:text-sm font-bold">{toastNotification.message}</p>
          </div>
          <button
            onClick={() => setToastNotification(null)}
            className="p-1 hover:bg-black/5 rounded-lg text-slate-500"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Top Action Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">
            Products & Live Stock
          </h2>
          <p className="text-xs text-slate-500 font-medium">
            Manage catalogue, barcode SKUs, HSN codes, and stock thresholds ({products.length} listed items)
          </p>
        </div>

        {/* Action Buttons: Quick Sell & Bill, Export Excel, PDF to Excel (PaddleOCR), Add New Product */}
        <div className="flex items-center gap-2.5 flex-wrap w-full md:w-auto">
          {/* Active Cart & Go to Billing POS Shortcut */}
          <button
            onClick={() => onNavigateToPos?.()}
            className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl border border-blue-600 bg-blue-50 hover:bg-blue-100 text-blue-900 font-bold text-xs shadow-xs transition-all cursor-pointer"
            title="Go to POS Billing Counter [F1]"
          >
            <ShoppingCart className="w-4 h-4 text-blue-600" />
            <span>Cart ({lines.length})</span>
            <span className="font-extrabold text-blue-800 tabular-nums">
              {formatCurrency(calculation.grand_total_paise)}
            </span>
            <span className="text-[10px] bg-blue-600 text-white px-1.5 py-0.5 rounded font-mono">
              Billing [F1]
            </span>
          </button>

          {/* Export to Excel */}
          <button
            onClick={handleExportToExcel}
            className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs shadow-2xs hover:border-slate-400 transition-all cursor-pointer"
            title="Download full product catalogue as .xlsx spreadsheet"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>Export to Excel</span>
          </button>

          {/* PaddleOCR: Product PDF to Excel Report */}
          <button
            onClick={() => setIsPaddleModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-blue-600 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-500/20 transition-all cursor-pointer"
            title="Upload product PDF to extract items and generate an Excel spreadsheet report using PaddleOCR"
          >
            <Sparkles className="w-4 h-4 text-amber-300" />
            <span>PDF to Excel (PaddleOCR)</span>
          </button>

          {/* Manual Add Product */}
          <button
            onClick={handleOpenAdd}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs shadow-md shadow-slate-900/20 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Product [F2]</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-surface p-3.5 rounded-xl border border-slate-200 shadow-xs mb-4 flex flex-col md:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by product name, barcode, SKU or HSN..."
            className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-600"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <Filter className="w-4 h-4 text-slate-400" />
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="bg-slate-50 border border-slate-200 text-xs font-bold text-slate-700 py-2 px-3 rounded-lg focus:outline-none cursor-pointer"
          >
            <option value="ALL">All Categories ({products.length})</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Products Table */}
      <div className="bg-surface rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px] tracking-wider">
              <tr>
                <th className="py-3 px-4">Item Name / Barcode</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">HSN Code</th>
                <th className="py-3 px-4">GST Rate</th>
                <th className="py-3 px-4 text-right">Selling Price</th>
                <th className="py-3 px-4 text-right">Stock On Hand</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <p className="font-semibold">No products found matching your search or filters.</p>
                      <p className="text-xs text-slate-400">
                        Use "Upload Stock PDF" to bulk-import items or click "Add New Product" to create one manually.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map((p) => {
                  const isLow = p.current_stock_milli <= p.min_stock_milli;
                  return (
                    <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900 text-sm">{p.name}</div>
                        <div className="text-[11px] text-slate-400 font-mono">
                          {p.barcodes[0] || p.sku}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-slate-600">{p.category}</td>
                      <td className="py-3 px-4 font-mono font-bold text-slate-700">{p.hsn_sac}</td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-bold text-[11px]">
                          {(p.gst_rate_bps / 100).toFixed(0)}%
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-extrabold text-slate-900 text-sm tabular-nums">
                        {formatCurrency(p.selling_price_paise)}
                      </td>
                      <td className="py-3 px-4 text-right font-bold tabular-nums">
                        {formatQuantity(p.current_stock_milli, p.unit)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {isLow ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 font-bold text-[10px] border border-amber-200">
                            <AlertTriangle className="w-3 h-3 text-amber-600" />
                            Low Stock
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-bold text-[10px] border border-emerald-200">
                            Available
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {(() => {
                          const inCartLine = lines.find((l) => l.product_id === p.id);
                          const inCartUnits = inCartLine ? inCartLine.quantity_milli / 1000 : 0;
                          const isOutOfStock = p.current_stock_milli <= 0;

                          return (
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                disabled={isOutOfStock}
                                onClick={() => {
                                  const res = addItem(p, 1000);
                                  if (!res.success) {
                                    setToastNotification({
                                      type: 'error',
                                      message: res.message || 'Cannot add product to cart.',
                                    });
                                  } else {
                                    setToastNotification({
                                      type: 'success',
                                      message: `Added "${p.name}" to cart! Click "Billing [F1]" to complete checkout.`,
                                    });
                                  }
                                }}
                                className={`flex items-center gap-1.5 px-3 py-1.5 font-bold text-[11px] rounded-lg shadow-xs transition-colors cursor-pointer ${
                                  isOutOfStock
                                    ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                                }`}
                                title={isOutOfStock ? 'Product is out of stock' : `Add ${p.name} to billing cart`}
                              >
                                <ShoppingCart className="w-3.5 h-3.5" />
                                <span>+ Add to Cart</span>
                                {inCartUnits > 0 && (
                                  <span className="bg-blue-800 text-white text-[10px] px-1.5 py-0.2 rounded-full font-black">
                                    {inCartUnits}
                                  </span>
                                )}
                              </button>
                              <button
                                onClick={() => handleOpenEdit(p)}
                                className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded cursor-pointer"
                                title="Edit Product"
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          );
                        })()}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Product Modal (Preserved Manual Entry) */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-surface rounded-2xl shadow-2xl max-w-lg w-full p-6 border border-slate-200 overflow-y-auto max-h-[90vh]">
            <div className="flex justify-between items-center mb-4 pb-2 border-b border-slate-200">
              <h3 className="font-bold text-base text-slate-900">
                {editingProduct ? 'Edit Product' : 'Add New Product'}
              </h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Product Name *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Tata Salt 1kg"
                  className="w-full p-2.5 border border-slate-300 rounded-lg text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">SKU</label>
                  <input
                    type="text"
                    value={sku}
                    onChange={(e) => setSku(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-lg text-xs font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Barcode</label>
                  <input
                    type="text"
                    value={barcode}
                    onChange={(e) => setBarcode(e.target.value)}
                    placeholder="Scan with scanner..."
                    className="w-full p-2 border border-slate-300 rounded-lg text-xs font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Category</label>
                  <input
                    type="text"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">HSN/SAC Code</label>
                  <input
                    type="text"
                    required
                    value={hsn}
                    onChange={(e) => setHsn(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-lg text-xs font-mono font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Unit</label>
                  <select
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-lg text-xs font-semibold"
                  >
                    <option value="packet">packet</option>
                    <option value="PCS">PCS</option>
                    <option value="nos">nos</option>
                    <option value="kg">kg</option>
                    <option value="g">g</option>
                    <option value="litre">litre</option>
                    <option value="piece">piece</option>
                    <option value="box">box</option>
                    <option value="strip">strip</option>
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-slate-600 mb-1">GST Slab</label>
                  <select
                    value={gstRateBps}
                    onChange={(e) => setGstRateBps(Number(e.target.value))}
                    className="w-full p-2 border border-slate-300 rounded-lg text-xs font-bold text-blue-700"
                  >
                    <option value={0}>0% (Nil / Exempt)</option>
                    <option value={500}>5% (Groceries & Essentials)</option>
                    <option value={1200}>12% (Standard / Dairy / Med)</option>
                    <option value={1800}>18% (Standard / FMCG)</option>
                    <option value={2800}>28% (Luxury / Aerated)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Selling Price (₹) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={sellingPriceRupees}
                    onChange={(e) => setSellingPriceRupees(e.target.value)}
                    placeholder="0.00"
                    className="w-full p-2 border border-slate-300 rounded-lg text-sm font-extrabold text-blue-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Purchase Cost (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={purchasePriceRupees}
                    onChange={(e) => setPurchasePriceRupees(e.target.value)}
                    placeholder="0.00"
                    className="w-full p-2 border border-slate-300 rounded-lg text-sm font-bold"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="taxInc"
                  checked={isTaxInclusive}
                  onChange={(e) => setIsTaxInclusive(e.target.checked)}
                  className="rounded text-blue-600"
                />
                <label htmlFor="taxInc" className="text-xs font-semibold text-slate-700 cursor-pointer">
                  Price is Tax-Inclusive (Standard retail MRP)
                </label>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Opening Stock</label>
                  <input
                    type="number"
                    value={currentStock}
                    onChange={(e) => setCurrentStock(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-lg text-xs font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Low Stock Alert at</label>
                  <input
                    type="number"
                    value={minStock}
                    onChange={(e) => setMinStock(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-lg text-xs font-bold"
                  />
                </div>
              </div>

              <div className="pt-3">
                <button
                  type="submit"
                  className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer"
                >
                  Save Product to Local Master
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PaddleOCR: Product PDF to Excel Report Modal */}
      <PaddleOcrModal
        isOpen={isPaddleModalOpen}
        onClose={() => setIsPaddleModalOpen(false)}
        onProductsImported={loadProducts}
      />
    </div>
  );
};
