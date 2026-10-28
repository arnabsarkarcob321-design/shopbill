import React, { useState, useEffect, useRef } from 'react';
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
  FileText,
} from 'lucide-react';
import { db, PartyRecord, ProductRecord } from '../db';
import { useCartStore } from '../state/cartStore';
import { formatCurrency, formatQuantity } from '@shopbill/i18n';
import { PaymentModal } from '../components/PaymentModal';
import { PrintPreviewModal } from '../components/PrintPreviewModal';
import { createPrintModel, PrintModel } from '@shopbill/print-model';

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

  const [searchQuery, setSearchQuery] = useState('');
  const [matchingProducts, setMatchingProducts] = useState<ProductRecord[]>([]);
  const [partiesList, setPartiesList] = useState<PartyRecord[]>([]);
  const [showCustomerPicker, setShowCustomerPicker] = useState(false);
  const [showHeldDrawer, setShowHeldDrawer] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [previewPrintModel, setPreviewPrintModel] = useState<PrintModel | null>(null);

  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadHeldBills();
    db.parties.toArray().then(setPartiesList);
  }, []);

  // Search filter
  useEffect(() => {
    if (!searchQuery.trim()) {
      setMatchingProducts([]);
      return;
    }

    const q = searchQuery.toLowerCase().trim();
    db.products
      .filter((p) => {
        if (p.is_archived) return false;
        return (
          p.name.toLowerCase().includes(q) ||
          p.sku.toLowerCase().includes(q) ||
          p.barcodes.some((b) => b.toLowerCase().includes(q)) ||
          Boolean(p.name_hindi && p.name_hindi.includes(q)) ||
          Boolean(p.name_bengali && p.name_bengali.includes(q))
        );
      })
      .limit(8)
      .toArray()
      .then((prods) => {
        setMatchingProducts(prods);

        // Immediate barcode match check (rapid scanner)
        const exactBarcodeMatch = prods.find((p) =>
          p.barcodes.some((b) => b.toLowerCase() === q)
        );
        if (exactBarcodeMatch && q.length >= 6) {
          addItem(exactBarcodeMatch, 1000);
          setSearchQuery('');
          setMatchingProducts([]);
        }
      });
  }, [searchQuery]);

  // Keyboard navigation shortcuts (F1-F12)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F8') {
        e.preventDefault();
        holdCurrentBill();
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
    if (lines.length === 0) return;
    try {
      const res = await finaliseInvoice({
        payments: [{ mode: 'CASH', amount_paise: calculation.grand_total_paise }],
        shopStateCode: shopProfile?.state_code || '19',
        taxScheme: shopProfile?.tax_scheme || 'REGULAR',
        invoicePrefix: shopProfile?.invoice_prefix || 'SB/26-27/',
        financialYear: '2026-2027',
      });
      handleShowPrint(res.invoiceNumber);
    } catch (err: any) {
      alert(err.message || 'Error completing bill');
    }
  };

  const handleShowPrint = async (invoiceNumber: string) => {
    const inv = await db.invoices.where('invoice_number').equals(invoiceNumber).first();
    if (!inv) return;

    const pm = createPrintModel({
      shop: {
        name: shopProfile?.name || 'My Store',
        address: shopProfile?.address || 'Kolkata',
        phone: shopProfile?.phone || '9830123456',
        gstin: shopProfile?.gstin,
        state_code: shopProfile?.state_code || '19',
        state_name: shopProfile?.state_name || 'West Bengal',
        upi_id: shopProfile?.upi_id,
        tax_scheme: shopProfile?.tax_scheme || 'REGULAR',
        tagline: shopProfile?.tagline,
      },
      customer: selectedParty
        ? {
            name: selectedParty.name,
            phone: selectedParty.phone,
            gstin: selectedParty.gstin,
            address: selectedParty.address,
            state_code: selectedParty.state_code,
            state_name: selectedParty.state_name,
          }
        : undefined,
      documentType: inv.doc_type,
      invoiceNumber: inv.invoice_number,
      issueDate: inv.issue_at,
      calculation,
      payments: [{ mode: 'CASH', amount_paise: inv.paid_amount_paise }],
    });

    setPreviewPrintModel(pm);
  };

  return (
    <div className="flex-1 flex flex-col lg:flex-row h-[calc(100vh-4rem)] overflow-hidden">
      {/* Main Billing Canvas (Left) */}
      <div className="flex-1 flex flex-col p-3 md:p-5 overflow-hidden bg-canvas">
        {/* Top Control Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3 bg-surface p-3 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center gap-2">
            {/* Customer Selector Button */}
            <button
              onClick={() => setShowCustomerPicker(true)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold border border-slate-300 transition-colors"
            >
              <User className="w-4 h-4 text-blue-600" />
              <span>{selectedParty ? selectedParty.name : 'Walk-in Customer'}</span>
              {selectedParty && (
                <span className="text-[10px] bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded">
                  Balance: {formatCurrency(selectedParty.balance_paise)}
                </span>
              )}
            </button>

            {/* Document Type Selector */}
            <select
              value={documentType}
              onChange={(e) => setDocumentType(e.target.value as any)}
              className="px-2.5 py-1.5 rounded-lg bg-slate-100 border border-slate-300 text-xs font-bold text-slate-700 focus:outline-none cursor-pointer"
            >
              <option value="TAX_INVOICE">Tax Invoice</option>
              <option value="BILL_OF_SUPPLY">Bill of Supply</option>
              <option value="QUOTATION">Quotation / Estimate</option>
              <option value="CREDIT_NOTE">Credit Note / Return</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            {/* Held Bills Drawer Toggle */}
            <button
              onClick={() => setShowHeldDrawer(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 text-xs font-bold border border-amber-200 transition-colors"
            >
              <Clock className="w-3.5 h-3.5 text-amber-600" />
              <span>Held Bills ({heldBillsList.length})</span>
            </button>

            {/* Hold Current Button */}
            <button
              disabled={lines.length === 0}
              onClick={holdCurrentBill}
              className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 disabled:opacity-40 text-slate-700 text-xs font-semibold border border-slate-300"
              title="Save current cart to resume later [F8]"
            >
              Hold [F8]
            </button>

            {/* Clear Cart */}
            {lines.length > 0 && (
              <button
                onClick={clearCart}
                className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-600"
                title="Clear Cart"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Barcode Burst & Item Search Bar */}
        <div className="relative mb-3">
          <div className="relative flex items-center">
            <Search className="w-5 h-5 text-slate-400 absolute left-3.5 pointer-events-none" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Scan barcode or type product name, SKU (Press Ctrl+K)..."
              className="w-full pl-11 pr-4 py-3 bg-surface border-2 border-slate-300 rounded-xl text-sm font-semibold text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 shadow-sm transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3.5 p-1 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Autocomplete Dropdown */}
          {matchingProducts.length > 0 && (
            <div className="absolute left-0 right-0 top-full mt-1 bg-surface rounded-xl border border-slate-200 shadow-xl overflow-hidden z-30 max-h-72 overflow-y-auto">
              {matchingProducts.map((p) => (
                <div
                  key={p.id}
                  onClick={() => {
                    addItem(p);
                    setSearchQuery('');
                    setMatchingProducts([]);
                  }}
                  className="px-4 py-2.5 hover:bg-blue-50 cursor-pointer flex items-center justify-between border-b border-slate-100 last:border-none transition-colors"
                >
                  <div>
                    <div className="font-bold text-sm text-slate-900">{p.name}</div>
                    <div className="text-xs text-slate-500 flex items-center gap-2">
                      <span>HSN: {p.hsn_sac}</span>
                      <span>•</span>
                      <span>Stock: {formatQuantity(p.current_stock_milli, p.unit)}</span>
                      <span>•</span>
                      <span>GST: {(p.gst_rate_bps / 100).toFixed(0)}%</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-extrabold text-blue-700 text-sm tabular-nums">
                      {formatCurrency(p.selling_price_paise)}
                    </div>
                    <span className="text-[10px] text-slate-400 font-semibold uppercase">
                      {p.is_tax_inclusive ? 'Inc. Tax' : '+ Tax'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Cart Line Items Table */}
        <div className="flex-1 bg-surface rounded-xl border border-slate-200 overflow-hidden flex flex-col shadow-xs">
          {lines.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-400">
              <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 mb-3">
                <FileText className="w-8 h-8" />
              </div>
              <p className="text-base font-bold text-slate-700">Billing Cart is Empty</p>
              <p className="text-xs text-slate-400 max-w-sm mt-1">
                Scan barcode with a USB scanner or search items above to begin adding to the bill.
              </p>
              <div className="flex gap-2 mt-4 text-xs font-mono text-slate-500">
                <span className="bg-slate-100 px-2 py-1 rounded">F8: Hold</span>
                <span className="bg-slate-100 px-2 py-1 rounded">F9: Pay</span>
                <span className="bg-slate-100 px-2 py-1 rounded">F10: Quick Cash</span>
              </div>
            </div>
          ) : (
            <div className="flex-1 overflow-auto">
              <table className="w-full border-collapse text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 z-10 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="py-2.5 px-3 w-8">#</th>
                    <th className="py-2.5 px-3">Item Description</th>
                    <th className="py-2.5 px-3 text-center w-36">Quantity</th>
                    <th className="py-2.5 px-3 text-right w-24">Price</th>
                    <th className="py-2.5 px-3 text-right w-20">GST</th>
                    <th className="py-2.5 px-3 text-right w-28">Total</th>
                    <th className="py-2.5 px-2 w-10 text-center"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {lines.map((l, index) => {
                    const calcLine = calculation.lines.find((c) => c.id === l.id);
                    const lineTotal = calcLine ? calcLine.line_total_paise : 0;
                    const qtyUnits = l.quantity_milli / 1000;

                    return (
                      <tr key={l.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3 px-3 text-slate-400 font-mono text-xs">{index + 1}</td>
                        <td className="py-3 px-3">
                          <div className="font-bold text-slate-900 text-sm">{l.product_name}</div>
                          <div className="text-[11px] text-slate-500 flex items-center gap-2">
                            <span>HSN: {l.hsn_sac}</span>
                            <span>•</span>
                            <span>{l.unit}</span>
                          </div>
                        </td>
                        <td className="py-3 px-3">
                          <div className="flex items-center justify-center gap-1 bg-slate-100 rounded-lg p-1 w-32 mx-auto">
                            <button
                              onClick={() => updateQuantity(l.product_id, l.quantity_milli - 1000)}
                              className="w-6 h-6 rounded bg-surface hover:bg-slate-200 flex items-center justify-center text-slate-700 font-bold shadow-2xs"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <input
                              type="number"
                              step="any"
                              value={qtyUnits}
                              onChange={(e) =>
                                updateQuantity(l.product_id, Math.round(Number(e.target.value) * 1000))
                              }
                              className="w-12 text-center bg-transparent font-bold text-sm focus:outline-none tabular-nums"
                            />
                            <button
                              onClick={() => updateQuantity(l.product_id, l.quantity_milli + 1000)}
                              className="w-6 h-6 rounded bg-surface hover:bg-slate-200 flex items-center justify-center text-slate-700 font-bold shadow-2xs"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>
                        </td>
                        <td className="py-3 px-3 text-right">
                          <input
                            type="number"
                            value={(l.unit_price_paise / 100).toFixed(2)}
                            onChange={(e) =>
                              updateUnitPrice(
                                l.product_id,
                                Math.round(Number(e.target.value) * 100)
                              )
                            }
                            className="w-20 text-right bg-slate-50 border border-slate-200 rounded px-1.5 py-0.5 font-bold text-xs tabular-nums focus:bg-white"
                          />
                        </td>
                        <td className="py-3 px-3 text-right">
                          <span className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 font-semibold text-[11px]">
                            {(l.gst_rate_bps / 100).toFixed(0)}%
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right font-extrabold text-slate-900 text-sm tabular-nums">
                          {formatCurrency(lineTotal)}
                        </td>
                        <td className="py-3 px-2 text-center">
                          <button
                            onClick={() => removeItem(l.product_id)}
                            className="p-1 text-slate-400 hover:text-red-500 rounded"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Financial Dock & Grand Total Panel (Right) */}
      <div className="w-full lg:w-96 bg-surface border-t lg:border-t-0 lg:border-l border-slate-200 p-4 md:p-5 flex flex-col justify-between shrink-0 shadow-sm">
        <div className="space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200">
            <h3 className="font-bold text-slate-900 text-sm">Bill Summary</h3>
            <span className="text-xs text-slate-500 font-semibold">
              {lines.length} {lines.length === 1 ? 'item' : 'items'}
            </span>
          </div>

          {/* Key Financial Lines */}
          <div className="space-y-2 text-xs">
            <div className="flex justify-between text-slate-600 font-medium">
              <span>Gross Taxable Subtotal:</span>
              <span className="font-bold text-slate-800 tabular-nums">
                {formatCurrency(calculation.total_taxable_value_paise)}
              </span>
            </div>

            {/* Invoice Discount Input */}
            <div className="flex items-center justify-between py-1">
              <span className="text-slate-600 font-medium flex items-center gap-1">
                <Percent className="w-3.5 h-3.5 text-blue-600" />
                <span>Invoice Discount (%):</span>
              </span>
              <input
                type="number"
                min="0"
                max="100"
                value={invoiceDiscountValue || ''}
                onChange={(e) => setInvoiceDiscount('PERCENT', Number(e.target.value))}
                placeholder="0"
                className="w-16 text-right px-2 py-0.5 border border-slate-300 rounded font-bold text-xs"
              />
            </div>

            {/* Taxes */}
            {calculation.is_inter_state ? (
              <div className="flex justify-between text-slate-600">
                <span>IGST (Inter-state):</span>
                <span className="font-bold text-slate-800 tabular-nums">
                  {formatCurrency(calculation.igst_amount_paise)}
                </span>
              </div>
            ) : (
              <>
                <div className="flex justify-between text-slate-600">
                  <span>CGST (Central Tax):</span>
                  <span className="font-bold text-slate-800 tabular-nums">
                    {formatCurrency(calculation.cgst_amount_paise)}
                  </span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>SGST (State Tax):</span>
                  <span className="font-bold text-slate-800 tabular-nums">
                    {formatCurrency(calculation.sgst_amount_paise)}
                  </span>
                </div>
              </>
            )}

            {calculation.cess_amount_paise > 0 && (
              <div className="flex justify-between text-slate-600">
                <span>Cess:</span>
                <span className="font-bold text-slate-800 tabular-nums">
                  {formatCurrency(calculation.cess_amount_paise)}
                </span>
              </div>
            )}

            {calculation.round_off_paise !== 0 && (
              <div className="flex justify-between text-slate-500 text-[11px]">
                <span>Round-off:</span>
                <span className="font-semibold tabular-nums">
                  {formatCurrency(calculation.round_off_paise)}
                </span>
              </div>
            )}
          </div>

          {/* Grand Total Display */}
          <div className="p-4 rounded-xl bg-blue-50 border border-blue-200">
            <div className="text-xs font-bold text-blue-700 uppercase tracking-wider">
              Total Amount Due
            </div>
            <div className="text-3xl font-extrabold text-blue-900 tabular-nums mt-1">
              {formatCurrency(calculation.grand_total_paise)}
            </div>
          </div>
        </div>

        {/* Primary Checkout Actions */}
        <div className="space-y-2.5 pt-4">
          <button
            disabled={lines.length === 0}
            onClick={() => setShowPaymentModal(true)}
            className="w-full py-3.5 px-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white font-extrabold text-sm rounded-xl shadow-lg shadow-blue-500/25 transition-all flex items-center justify-center gap-2"
          >
            <CreditCard className="w-4 h-4" />
            <span>Collect Payment [F9]</span>
          </button>

          <button
            disabled={lines.length === 0}
            onClick={handleQuickCashCheckout}
            className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2"
          >
            <Banknote className="w-4 h-4" />
            <span>Quick Cash & Print [F10]</span>
          </button>
        </div>
      </div>

      {/* Payment Split Modal */}
      <PaymentModal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        calculation={calculation}
        customer={selectedParty}
        shopUpiId={shopProfile?.upi_id}
        shopName={shopProfile?.name || 'My Store'}
        onFinalise={async (payments) => {
          return await finaliseInvoice({
            payments,
            shopStateCode: shopProfile?.state_code || '19',
            taxScheme: shopProfile?.tax_scheme || 'REGULAR',
            invoicePrefix: shopProfile?.invoice_prefix || 'SB/26-27/',
            financialYear: '2026-2027',
          });
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
          <div className="bg-surface rounded-2xl shadow-xl max-w-md w-full p-5 border border-slate-200">
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-bold text-base text-slate-900">Select Customer</h3>
              <button
                onClick={() => setShowCustomerPicker(false)}
                className="p-1 text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2 max-h-64 overflow-y-auto">
              <button
                onClick={() => {
                  setParty(null);
                  setShowCustomerPicker(false);
                }}
                className={`w-full text-left p-2.5 rounded-lg border text-xs font-bold transition-colors ${
                  !selectedParty
                    ? 'border-blue-600 bg-blue-50 text-blue-800'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                Walk-in Customer (Default Cash)
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
                    className={`w-full text-left p-2.5 rounded-lg border text-xs font-semibold flex justify-between items-center transition-colors ${
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
                      <span className="text-[11px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded">
                        Udhaar: {formatCurrency(p.balance_paise)}
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
                  className="p-1 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {heldBillsList.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-8">No bills on hold.</p>
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
                          className="px-2.5 py-1 rounded bg-blue-600 text-white font-bold text-xs"
                        >
                          Resume
                        </button>
                        <button
                          onClick={() => deleteHeldBill(hb.id)}
                          className="p-1 text-slate-400 hover:text-red-600"
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
