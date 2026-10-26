import React, { useState, useEffect } from 'react';
import { Plus, Search, Filter, AlertTriangle, Edit, X } from 'lucide-react';
import { db, ProductRecord } from '../db';
import { formatCurrency, formatQuantity } from '@shopbill/i18n';

export const ProductsPage: React.FC = () => {
  const [products, setProducts] = useState<ProductRecord[]>([]);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductRecord | null>(null);

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
      {/* Top Action Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">
            Products & Live Stock
          </h2>
          <p className="text-xs text-slate-500 font-medium">
            Manage catalogue, barcode SKUs, HSN codes, and stock thresholds
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-500/20 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Product [F2]</span>
        </button>
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
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    No products found matching your search.
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
                        <button
                          onClick={() => handleOpenEdit(p)}
                          className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                          title="Edit Product"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Product Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-surface rounded-2xl shadow-2xl max-w-lg w-full p-6 border border-slate-200 overflow-y-auto max-h-[90vh]">
            <div className="flex justify-between items-center mb-4 pb-2 border-b border-slate-200">
              <h3 className="font-bold text-base text-slate-900">
                {editingProduct ? 'Edit Product' : 'Add New Product'}
              </h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600"
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
                  className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md transition-all"
                >
                  Save Product to Local Master
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
