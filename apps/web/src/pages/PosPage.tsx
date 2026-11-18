import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Search,
  Plus,
  Minus,
  Trash2,
  Clock,
  User,
  CreditCard,
  Banknote,
  Percent,
  X,
  ShoppingCart,
  AlertTriangle,
  CheckCircle2,
  Package,
} from 'lucide-react';
import { db, PartyRecord, ProductRecord } from '../db';
import { useCartStore } from '../state/cartStore';
import { formatCurrency } from '@shopbill/i18n';
import { PaymentModal } from '../components/PaymentModal';
import { PrintPreviewModal } from '../components/PrintPreviewModal';
import { PrintModel } from '@shopbill/print-model';
import { buildPrintModelFromInvoice } from '../utils/billingService';

interface PosPageProps {
  shopProfile: any;
}

export const PosPage: React.FC<PosPageProps> = ({ shopProfile }) => {
  const {
    lines,
    selectedParty,
    documentType,
    invoiceDiscountValue,
    calculation,
    heldBillsList,
    addItem,
    updateQuantity,
    updateUnitPrice,
    removeItem,
    clearCart,
    setParty,
    setDocumentType,
    setInvoiceDiscount,
    holdCurrentBill,
    resumeHeldBill,
    deleteHeldBill,
    loadHeldBills,
    finaliseInvoice,
  } = useCartStore();

  // All products from catalogue for Left Section
  const [allProducts, setAllProducts] = useState<ProductRecord[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals & Panels
  const [partiesList, setPartiesList] = useState<PartyRecord[]>([]);
  const [showCustomerPicker, setShowCustomerPicker] = useState(false);
  const [showHeldDrawer, setShowHeldDrawer] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [previewPrintModel, setPreviewPrintModel] = useState<PrintModel | null>(null);

  // Toast / feedback message
  const [toastMsg, setToastMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const searchInputRef = useRef<HTMLInputElement>(null);

  const loadCatalogProducts = async () => {
    try {
      const prods = await db.products.filter((p) => !p.is_archived).toArray();
      setAllProducts(prods);
    } catch (err) {
      console.error('Failed to load products for POS', err);
    }
  };

  useEffect(() => {
    loadCatalogProducts();
    loadHeldBills();
    db.parties.toArray().then(setPartiesList);
  }, []);

  // Toast auto-clear
  useEffect(() => {
    if (toastMsg) {
      const timer = setTimeout(() => setToastMsg(null), 3500);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [toastMsg]);

  // Compute categories
  const categories = useMemo(() => {
    const set = new Set<string>();
    allProducts.forEach((p) => {
      if (p.category) set.add(p.category);
    });
    return Array.from(set);
  }, [allProducts]);

  // Filter products for Left Selection section
  const filteredProducts = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return allProducts.filter((p) => {
      if (selectedCategory !== 'ALL' && p.category !== selectedCategory) return false;
      if (!q) return true;
      return (
        p.name.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        p.hsn_sac.includes(q) ||
        p.barcodes.some((b) => b.toLowerCase().includes(q))
      );
    });
  }, [allProducts, selectedCategory, searchQuery]);

  // Add product to cart with validation
  const handleAddToCart = (product: ProductRecord) => {
    const res = addItem(product, 1000);
    if (!res.success) {
      setToastMsg({ type: 'error', text: res.message || 'Cannot add product to cart.' });
    } else {
      setToastMsg({ type: 'success', text: `Added "${product.name}" to cart.` });
    }
  };

  // Barcode / Search Enter key handler (instant add on barcode hit)
  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const q = searchQuery.trim().toLowerCase();
      if (!q) return;

      // 1. Exact barcode match
      const barcodeMatch = allProducts.find((p) =>
        p.barcodes.some((b) => b.toLowerCase() === q)
      );
      if (barcodeMatch) {
        handleAddToCart(barcodeMatch);
        setSearchQuery('');
        return;
      }

      // 2. Exact SKU match
      const skuMatch = allProducts.find((p) => p.sku.toLowerCase() === q);
      if (skuMatch) {
        handleAddToCart(skuMatch);
        setSearchQuery('');
        return;
      }

      // 3. Single filtered match
      if (filteredProducts.length === 1 && filteredProducts[0]) {
        handleAddToCart(filteredProducts[0]);
        setSearchQuery('');
        return;
      }

      // 4. If multiple, add first if exact name match
      const exactNameMatch = filteredProducts.find(
        (p) => p.name.toLowerCase() === q
      );
      if (exactNameMatch) {
        handleAddToCart(exactNameMatch);
        setSearchQuery('');
      }
    }
  };

  // Keyboard navigation shortcuts (F8: Hold, F9: Payment, F10: Quick Cash, Ctrl+K: Focus Search)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F8') {
        e.preventDefault();
        if (lines.length > 0) holdCurrentBill();
      } else if (e.key === 'F9') {
        e.preventDefault();
        if (lines.length > 0) setShowPaymentModal(true);
      } else if (e.key === 'F10') {
        e.preventDefault();
        handleQuickCashCheckout();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [lines, calculation]);

  const handleQuickCashCheckout = async () => {
    if (lines.length === 0) {
      setToastMsg({ type: 'error', text: 'Billing cart is empty! Add products first.' });
      return;
    }
    try {
      const res = await finaliseInvoice({
        payments: [{ mode: 'CASH', amount_paise: calculation.grand_total_paise }],
        shopStateCode: shopProfile?.state_code || '19',
        taxScheme: shopProfile?.tax_scheme || 'REGULAR',
        invoicePrefix: shopProfile?.invoice_prefix || 'SB/26-27/',
        financialYear: '2026-2027',
      });
      await loadCatalogProducts();
      handleShowPrint(res.invoiceNumber);
    } catch (err: any) {
      setToastMsg({ type: 'error', text: err.message || 'Error completing quick cash bill.' });
    }
  };

  const handleShowPrint = async (invoiceNumber: string) => {
    const inv = await db.invoices.where('invoice_number').equals(invoiceNumber).first();
    if (!inv) return;

    try {
      const pm = await buildPrintModelFromInvoice(inv, shopProfile);
      setPreviewPrintModel(pm);
    } catch (err) {
      console.error('Error generating print model:', err);
    }
  };

  const totalCartUnits = lines.reduce((acc, l) => acc + l.quantity_milli / 1000, 0);

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-4rem)] overflow-hidden bg-canvas">
      {/* Toast Notification Banner */}
      {toastMsg && (
        <div
          className={`fixed top-18 right-6 z-50 px-4 py-2.5 rounded-xl shadow-xl border flex items-center gap-2.5 transition-all text-xs font-bold animate-in fade-in slide-in-from-top-2 ${
            toastMsg.type === 'success'
              ? 'bg-emerald-600 text-white border-emerald-700 shadow-emerald-500/20'
              : 'bg-rose-600 text-white border-rose-700 shadow-rose-500/20'
          }`}
        >
          {toastMsg.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 shrink-0" />
          ) : (
            <AlertTriangle className="w-4 h-4 shrink-0" />
          )}
          <span>{toastMsg.text}</span>
          <button
            onClick={() => setToastMsg(null)}
            className="ml-2 hover:bg-black/20 rounded p-0.5 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Main 2-Pane Supermarket POS Canvas */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* ========================================================================= */}
        {/* LEFT SECTION – PRODUCT SELECTION & VISUAL CATALOGUE (~55% width)           */}
        {/* ========================================================================= */}
        <div className="w-full lg:w-[54%] xl:w-[56%] flex flex-col border-b lg:border-b-0 lg:border-r border-slate-200 bg-slate-50/50 p-3 md:p-4 overflow-hidden shrink-0">
          {/* Top Bar: Barcode Scanner & Search */}
          <div className="mb-3 space-y-2">
            <div className="relative flex items-center">
              <Search className="w-5 h-5 text-slate-400 absolute left-3.5 pointer-events-none" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleSearchKeyDown}
                placeholder="Scan barcode or type name, SKU, HSN... (Press Enter to add, Ctrl+K)"
                className="w-full pl-11 pr-24 py-2.5 bg-surface border-2 border-slate-300 rounded-xl text-xs md:text-sm font-semibold text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 shadow-xs transition-all"
              />
              <div className="absolute right-2.5 flex items-center gap-1">
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
                <span className="text-[10px] font-mono bg-slate-100 border border-slate-200 text-slate-500 px-1.5 py-0.5 rounded">
                  Ctrl+K
                </span>
              </div>
            </div>

            {/* Category Filter Chips */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
              <button
                onClick={() => setSelectedCategory('ALL')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold shrink-0 transition-colors cursor-pointer ${
                  selectedCategory === 'ALL'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                All Items ({allProducts.length})
              </button>
              {categories.map((cat) => {
                const count = allProducts.filter((p) => p.category === cat).length;
                return (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold shrink-0 transition-colors cursor-pointer ${
                      selectedCategory === cat
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    {cat} ({count})
                  </button>
                );
              })}
            </div>
          </div>

          {/* Product Cards Grid */}
          <div className="flex-1 overflow-y-auto pr-1">
            {filteredProducts.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center p-8 text-center text-slate-400">
                <Package className="w-12 h-12 text-slate-300 mb-2" />
                <p className="text-sm font-bold text-slate-600">No products match your search</p>
                <p className="text-xs text-slate-400 mt-1">
                  Try another keyword or switch category filter
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-2 xl:grid-cols-3 gap-2.5">
                {filteredProducts.map((p) => {
                  const stockUnits = Math.round((p.current_stock_milli / 1000) * 100) / 100;
                  const isOut = stockUnits <= 0;
                  const isLow = !isOut && p.current_stock_milli <= p.min_stock_milli;

                  // Check if item is already in cart
                  const inCartLine = lines.find((l) => l.product_id === p.id);
                  const inCartUnits = inCartLine ? inCartLine.quantity_milli / 1000 : 0;

                  return (
                    <div
                      key={p.id}
                      onClick={() => !isOut && handleAddToCart(p)}
                      className={`relative bg-surface rounded-xl p-3 border transition-all flex flex-col justify-between ${
                        isOut
                          ? 'border-slate-200 opacity-60 cursor-not-allowed bg-slate-50'
                          : 'border-slate-200 hover:border-blue-400 hover:shadow-md cursor-pointer group'
                      }`}
                    >
                      {/* In-cart badge */}
                      {inCartUnits > 0 && (
                        <div className="absolute top-2 right-2 bg-blue-600 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full shadow-xs">
                          {inCartUnits} in cart
                        </div>
                      )}

                      <div className="space-y-1">
                        <div className="font-bold text-xs text-slate-900 line-clamp-2 group-hover:text-blue-600 transition-colors">
                          {p.name}
                        </div>
                        <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-medium">
                          <span>{p.category}</span>
                          <span>•</span>
                          <span className="font-mono">HSN: {p.hsn_sac}</span>
                        </div>
                      </div>

                      <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between">
                        <div>
                          <div className="font-black text-blue-900 text-sm tabular-nums">
                            {formatCurrency(p.selling_price_paise)}
                          </div>
                          <div className="text-[10px]">
                            {isOut ? (
                              <span className="font-bold text-rose-600">Out of Stock</span>
                            ) : isLow ? (
                              <span className="font-semibold text-amber-700">
                                Low: {stockUnits} {p.unit}
                              </span>
                            ) : (
                              <span className="font-semibold text-emerald-700">
                                Stock: {stockUnits} {p.unit}
                              </span>
                            )}
                          </div>
                        </div>

                        <button
                          type="button"
                          disabled={isOut}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAddToCart(p);
                          }}
                          className={`p-1.5 rounded-lg font-bold text-xs flex items-center justify-center transition-colors cursor-pointer ${
                            isOut
                              ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                              : 'bg-blue-50 text-blue-700 hover:bg-blue-600 hover:text-white'
                          }`}
                          title={isOut ? 'Out of stock' : 'Add to billing cart'}
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* ========================================================================= */}
        {/* RIGHT SECTION – CURRENT BILLING CART & FINANCIAL SUMMARY (~45% width)      */}
        {/* ========================================================================= */}
        <div className="flex-1 flex flex-col bg-surface overflow-hidden">
          {/* Cart Header Control Bar */}
          <div className="p-3 border-b border-slate-200 bg-surface flex flex-wrap items-center justify-between gap-2 shrink-0">
            <div className="flex items-center gap-2">
              {/* Customer Selector */}
              <button
                onClick={() => setShowCustomerPicker(true)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold border border-slate-300 transition-colors cursor-pointer"
                title="Select customer from ledger or walk-in"
              >
                <User className="w-3.5 h-3.5 text-blue-600" />
                <span>{selectedParty ? selectedParty.name : 'Walk-in Customer'}</span>
                {selectedParty?.phone && (
                  <span className="text-[10px] text-slate-500 font-normal">({selectedParty.phone})</span>
                )}
              </button>

              {/* Document Type Selector */}
              <select
                value={documentType}
                onChange={(e) => setDocumentType(e.target.value as any)}
                className="px-2 py-1.5 rounded-lg bg-slate-100 border border-slate-300 text-xs font-bold text-slate-700 focus:outline-none cursor-pointer"
              >
                <option value="TAX_INVOICE">Tax Invoice</option>
                <option value="BILL_OF_SUPPLY">Bill of Supply</option>
                <option value="QUOTATION">Quotation</option>
              </select>
            </div>

            <div className="flex items-center gap-1.5">
              {/* Held Bills Toggle */}
              <button
                onClick={() => setShowHeldDrawer(true)}
                className="flex items-center gap-1 px-2 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 text-xs font-bold border border-amber-200 transition-colors cursor-pointer"
              >
                <Clock className="w-3 h-3 text-amber-600" />
                <span>Held ({heldBillsList.length})</span>
              </button>

              {/* Hold Cart [F8] */}
              <button
                disabled={lines.length === 0}
                onClick={holdCurrentBill}
                className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 disabled:opacity-40 text-slate-700 text-xs font-bold border border-slate-300 cursor-pointer"
                title="Hold current cart to serve another customer [F8]"
              >
                Hold [F8]
              </button>

              {/* Clear Cart */}
              {lines.length > 0 && (
                <button
                  onClick={() => {
                    if (window.confirm('Clear all items from current cart?')) {
                      clearCart();
                    }
                  }}
                  className="p-1.5 rounded-lg hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                  title="Clear Cart"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Active Cart Line Items Table */}
          <div className="flex-1 overflow-auto bg-white">
            {lines.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center p-8 text-center text-slate-400">
                <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-300 mb-3">
                  <ShoppingCart className="w-8 h-8" />
                </div>
                <h4 className="text-sm font-bold text-slate-700">Billing Cart is Empty</h4>
                <p className="text-xs text-slate-400 max-w-xs mt-1">
                  Scan barcodes with a scanner or click products on the left to add items to this bill.
                </p>
                <div className="flex gap-2 mt-4 text-[11px] font-mono text-slate-500">
                  <span className="bg-slate-100 px-2 py-1 rounded">F8: Hold</span>
                  <span className="bg-slate-100 px-2 py-1 rounded">F9: Pay</span>
                  <span className="bg-slate-100 px-2 py-1 rounded">F10: Quick Cash</span>
                </div>
              </div>
            ) : (
              <table className="w-full border-collapse text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 z-10 text-slate-600 font-bold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="py-2.5 px-3 w-8">#</th>
                    <th className="py-2.5 px-2">Item Description</th>
                    <th className="py-2.5 px-2 text-center w-32">Qty</th>
                    <th className="py-2.5 px-2 text-right w-20">Price</th>
                    <th className="py-2.5 px-2 text-right w-16">GST</th>
                    <th className="py-2.5 px-3 text-right w-24">Total</th>
                    <th className="py-2.5 px-1 w-8 text-center"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {lines.map((l, index) => {
                    const calcLine = calculation.lines.find((c) => c.id === l.id);
                    const lineTotal = calcLine ? calcLine.line_total_paise : 0;
                    const qtyUnits = l.quantity_milli / 1000;
                    const stockUnits = l.current_stock_milli !== undefined ? l.current_stock_milli / 1000 : 0;
                    const isOver = l.current_stock_milli !== undefined && l.quantity_milli > l.current_stock_milli;

                    return (
                      <tr key={l.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-2.5 px-3 text-slate-400 font-mono text-xs">{index + 1}</td>
                        <td className="py-2.5 px-2">
                          <div className="font-bold text-slate-900 text-xs line-clamp-1">
                            {l.product_name}
                          </div>
                          <div className="text-[10px] text-slate-500 flex items-center gap-1.5 flex-wrap">
                            <span>HSN: {l.hsn_sac}</span>
                            <span>•</span>
                            <span className="font-semibold text-slate-600">
                              Stock: {stockUnits} {l.unit}
                            </span>
                            {isOver && (
                              <span className="text-[9px] text-rose-700 bg-rose-50 px-1 py-0.2 rounded font-bold border border-rose-200">
                                Exceeds Stock
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-2.5 px-2">
                          <div className="flex items-center justify-center gap-1 bg-slate-100 rounded-lg p-0.5 w-28 mx-auto">
                            <button
                              onClick={() => {
                                const newQty = l.quantity_milli - 1000;
                                updateQuantity(l.product_id, newQty);
                              }}
                              className="w-5 h-5 rounded bg-surface hover:bg-slate-200 flex items-center justify-center text-slate-700 font-bold shadow-2xs cursor-pointer"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <input
                              type="number"
                              step="any"
                              value={qtyUnits}
                              onChange={(e) => {
                                const val = Number(e.target.value);
                                const res = updateQuantity(l.product_id, Math.round(val * 1000));
                                if (res && !res.success) {
                                  setToastMsg({ type: 'error', text: res.message || 'Cannot set quantity.' });
                                }
                              }}
                              className="w-10 text-center bg-transparent font-bold text-xs focus:outline-none tabular-nums"
                            />
                            <button
                              onClick={() => {
                                const res = updateQuantity(l.product_id, l.quantity_milli + 1000);
                                if (res && !res.success) {
                                  setToastMsg({ type: 'error', text: res.message || 'Cannot exceed available stock.' });
                                }
                              }}
                              className="w-5 h-5 rounded bg-surface hover:bg-slate-200 flex items-center justify-center text-slate-700 font-bold shadow-2xs cursor-pointer"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>
                        </td>
                        <td className="py-2.5 px-2 text-right">
                          <input
                            type="number"
                            value={(l.unit_price_paise / 100).toFixed(2)}
                            onChange={(e) =>
                              updateUnitPrice(
                                l.product_id,
                                Math.round(Number(e.target.value) * 100)
                              )
                            }
                            className="w-16 text-right bg-slate-50 border border-slate-200 rounded px-1 py-0.5 font-bold text-xs tabular-nums focus:bg-white"
                          />
                        </td>
                        <td className="py-2.5 px-2 text-right">
                          <span className="px-1 py-0.5 rounded bg-blue-50 text-blue-700 font-semibold text-[10px]">
                            {(l.gst_rate_bps / 100).toFixed(0)}%
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right font-black text-slate-900 text-xs tabular-nums">
                          {formatCurrency(lineTotal)}
                        </td>
                        <td className="py-2.5 px-1 text-center">
                          <button
                            onClick={() => removeItem(l.product_id)}
                            className="p-1 text-slate-400 hover:text-rose-500 rounded cursor-pointer"
                            title="Remove product"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {/* Bottom Financial Summary & Primary Checkout Dock */}
          <div className="p-3 md:p-4 border-t border-slate-200 bg-slate-50/70 space-y-3 shrink-0">
            {/* Breakdown rows */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="space-y-1">
                <div className="flex justify-between text-slate-600 font-medium">
                  <span>Cart Items:</span>
                  <span className="font-bold text-slate-800">
                    {lines.length} items ({totalCartUnits.toFixed(1)} units)
                  </span>
                </div>
                <div className="flex justify-between text-slate-600 font-medium">
                  <span>Taxable Subtotal:</span>
                  <span className="font-bold text-slate-800 tabular-nums">
                    {formatCurrency(calculation.total_taxable_value_paise)}
                  </span>
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-slate-600 font-medium flex items-center gap-1">
                    <Percent className="w-3 h-3 text-blue-600" />
                    <span>Bill Discount (%):</span>
                  </span>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={invoiceDiscountValue || ''}
                    onChange={(e) => setInvoiceDiscount('PERCENT', Number(e.target.value))}
                    placeholder="0"
                    className="w-14 text-right px-1.5 py-0.5 bg-white border border-slate-300 rounded font-bold text-xs"
                  />
                </div>
                <div className="flex justify-between text-slate-600 font-medium">
                  <span>Total GST Tax:</span>
                  <span className="font-bold text-slate-800 tabular-nums">
                    {formatCurrency(calculation.total_tax_paise)}
                  </span>
                </div>
              </div>
            </div>

            {/* Grand Total Bar */}
            <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-black text-blue-700 uppercase tracking-wider block">
                  Grand Total Payable
                </span>
                <span className="text-xs text-blue-600 font-semibold">
                  (Inclusive of all taxes & rounding)
                </span>
              </div>
              <div className="text-2xl md:text-3xl font-black text-blue-900 tabular-nums">
                {formatCurrency(calculation.grand_total_paise)}
              </div>
            </div>

            {/* Primary Action Buttons */}
            <div className="grid grid-cols-2 gap-2.5 pt-1">
              <button
                disabled={lines.length === 0}
                onClick={() => setShowPaymentModal(true)}
                className="py-3 px-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white font-black text-xs md:text-sm rounded-xl shadow-md shadow-blue-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <CreditCard className="w-4 h-4" />
                <span>Collect Payment [F9]</span>
              </button>

              <button
                disabled={lines.length === 0}
                onClick={handleQuickCashCheckout}
                className="py-3 px-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white font-black text-xs md:text-sm rounded-xl shadow-md shadow-emerald-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Banknote className="w-4 h-4" />
                <span>Quick Cash & Print [F10]</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Checkout / Settlement Modal */}
      <PaymentModal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        calculation={calculation}
        customer={selectedParty}
        shopUpiId={shopProfile?.upi_id}
        shopName={shopProfile?.name || 'My Store'}
        onFinalise={async (payments, customerName, customerPhone) => {
          const res = await finaliseInvoice({
            payments,
            shopStateCode: shopProfile?.state_code || '19',
            taxScheme: shopProfile?.tax_scheme || 'REGULAR',
            invoicePrefix: shopProfile?.invoice_prefix || 'SB/26-27/',
            financialYear: '2026-2027',
            customerName,
            customerPhone,
          });
          await loadCatalogProducts();
          return res;
        }}
        onPrintPreview={handleShowPrint}
      />

      {/* Print Preview Modal */}
      <PrintPreviewModal
        isOpen={Boolean(previewPrintModel)}
        onClose={() => setPreviewPrintModel(null)}
        printModel={previewPrintModel}
      />

      {/* Customer Picker Modal */}
      {showCustomerPicker && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-surface rounded-2xl shadow-2xl max-w-md w-full p-5 border border-slate-200">
            <div className="flex justify-between items-center mb-3 pb-2 border-b border-slate-200">
              <h3 className="font-bold text-sm text-slate-900">Select Customer for Bill</h3>
              <button
                onClick={() => setShowCustomerPicker(false)}
                className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 max-h-64 overflow-y-auto">
              <button
                onClick={() => {
                  setParty(null);
                  setShowCustomerPicker(false);
                }}
                className={`w-full text-left p-2.5 rounded-lg border text-xs font-bold transition-colors cursor-pointer ${
                  !selectedParty
                    ? 'border-blue-600 bg-blue-50 text-blue-800'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                Walk-in Customer (Standard Retail Cash)
              </button>

              {partiesList
                .filter((p) => p.party_type === 'CUSTOMER' || p.party_type === 'BOTH')
                .map((p) => (
                  <button
                    key={p.id}
                    onClick={() => {
                      setParty(p);
                      setShowCustomerPicker(false);
                    }}
                    className={`w-full text-left p-2.5 rounded-lg border text-xs font-semibold flex justify-between items-center transition-colors cursor-pointer ${
                      selectedParty?.id === p.id
                        ? 'border-blue-600 bg-blue-50'
                        : 'border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <div>
                      <div className="font-bold text-slate-900">{p.name}</div>
                      <div className="text-[11px] text-slate-500">
                        {p.phone || 'No phone'} {p.gstin ? `• GSTIN: ${p.gstin}` : ''}
                      </div>
                    </div>
                    {p.balance_paise > 0 && (
                      <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded">
                        Khata: {formatCurrency(p.balance_paise)}
                      </span>
                    )}
                  </button>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* Held Bills Drawer */}
      {showHeldDrawer && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-end z-50">
          <div className="bg-surface h-full w-full max-w-sm p-5 shadow-2xl flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-center mb-4 pb-2 border-b border-slate-200">
                <h3 className="font-bold text-base text-slate-900">Held Bills</h3>
                <button
                  onClick={() => setShowHeldDrawer(false)}
                  className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {heldBillsList.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-8">No bills currently on hold.</p>
              ) : (
                <div className="space-y-2">
                  {heldBillsList.map((hb) => (
                    <div
                      key={hb.id}
                      className="p-3 rounded-xl border border-slate-200 bg-slate-50 hover:bg-white flex justify-between items-center transition-all"
                    >
                      <div>
                        <div className="font-bold text-xs text-slate-900">{hb.label}</div>
                        <div className="text-[11px] text-slate-500">
                          {hb.customer_name} • {hb.line_count} items
                        </div>
                        <div className="font-extrabold text-blue-700 text-xs mt-0.5 tabular-nums">
                          {formatCurrency(hb.grand_total_paise)}
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => {
                            resumeHeldBill(hb.id);
                            setShowHeldDrawer(false);
                          }}
                          className="px-2.5 py-1 rounded bg-blue-600 text-white font-bold text-xs cursor-pointer"
                        >
                          Resume
                        </button>
                        <button
                          onClick={() => deleteHeldBill(hb.id)}
                          className="p-1 text-slate-400 hover:text-rose-600 cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
