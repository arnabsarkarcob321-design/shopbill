import React, { useState, useEffect } from 'react';
import {
  X,
  CheckCircle,
  Printer,
  Share2,
  QrCode,
  Banknote,
  CreditCard,
  BookOpen,
  ArrowRight,
  User,
  Phone,
  AlertCircle,
} from 'lucide-react';
import { InvoiceCalculationResult } from '@shopbill/gst-engine';
import { formatCurrency } from '@shopbill/i18n';
import { PartyRecord } from '../db';
import { PaymentEntry } from '../state/cartStore';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  calculation: InvoiceCalculationResult;
  customer: PartyRecord | null;
  shopUpiId?: string;
  shopName: string;
  onFinalise: (
    payments: PaymentEntry[],
    customerName?: string,
    customerPhone?: string
  ) => Promise<{ invoiceNumber: string; grandTotalPaise: number }>;
  onPrintPreview: (invoiceNumber: string) => void;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({
  isOpen,
  onClose,
  calculation,
  customer,
  shopUpiId,
  shopName,
  onFinalise,
  onPrintPreview,
}) => {
  const grandTotalPaise = calculation.grand_total_paise;
  const grandTotalRupees = grandTotalPaise / 100;

  const [activeTab, setActiveTab] = useState<'CASH' | 'UPI' | 'CARD' | 'SPLIT' | 'CREDIT'>('CASH');

  // Customer details
  const [custName, setCustName] = useState<string>(customer?.name || 'Walk-in Customer');
  const [custPhone, setCustPhone] = useState<string>(customer?.phone || '');

  // Cash Tendered
  const [cashTenderedRupees, setCashTenderedRupees] = useState<number>(grandTotalRupees);

  // Card details
  const [cardRef, setCardRef] = useState<string>('');

  // Split Tender
  const [splitCashRupees, setSplitCashRupees] = useState<number>(0);
  const [splitDigitalRupees, setSplitDigitalRupees] = useState<number>(0);

  // Submission state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [completedInvoice, setCompletedInvoice] = useState<string | null>(null);
  const [completedChangeDue, setCompletedChangeDue] = useState<number>(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setCustName(customer?.name || 'Walk-in Customer');
      setCustPhone(customer?.phone || '');
      setCashTenderedRupees(grandTotalRupees);
      setSplitCashRupees(Math.floor(grandTotalRupees / 2));
      setSplitDigitalRupees(Math.ceil(grandTotalRupees / 2));
      setCompletedInvoice(null);
      setErrorMsg(null);
      setIsSubmitting(false);
    }
  }, [isOpen, customer, grandTotalRupees]);

  if (!isOpen) return null;

  const changeDuePaise = Math.max(0, Math.round(cashTenderedRupees * 100) - grandTotalPaise);
  const isShortCash = cashTenderedRupees < grandTotalRupees;
  const shortAmountRupees = grandTotalRupees - cashTenderedRupees;

  const handleCashPreset = (amount: number) => {
    setCashTenderedRupees(amount);
  };

  const handleAddCash = (increment: number) => {
    setCashTenderedRupees((prev) => Math.round((prev + increment) * 100) / 100);
  };

  const handleCheckout = async () => {
    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      let payments: PaymentEntry[] = [];

      if (activeTab === 'CASH') {
        if (isShortCash) {
          setErrorMsg(
            `Cash tendered (₹${cashTenderedRupees.toFixed(2)}) is less than total payable (₹${grandTotalRupees.toFixed(2)}).`
          );
          setIsSubmitting(false);
          return;
        }
        payments = [{ mode: 'CASH', amount_paise: grandTotalPaise }];
      } else if (activeTab === 'UPI') {
        payments = [{ mode: 'UPI', amount_paise: grandTotalPaise }];
      } else if (activeTab === 'CARD') {
        payments = [
          {
            mode: 'CARD',
            amount_paise: grandTotalPaise,
            reference: cardRef.trim() || undefined,
          },
        ];
      } else if (activeTab === 'CREDIT') {
        if (!customer && custName.trim() === 'Walk-in Customer') {
          setErrorMsg('Please specify customer name or select customer from ledger for credit / udhaar.');
          setIsSubmitting(false);
          return;
        }
        payments = [{ mode: 'CREDIT', amount_paise: 0 }]; // 0 paid = full balance due
      } else if (activeTab === 'SPLIT') {
        const cashPaise = Math.round(splitCashRupees * 100);
        const digiPaise = Math.round(splitDigitalRupees * 100);
        if (cashPaise + digiPaise < grandTotalPaise) {
          setErrorMsg('Allocated split amount is less than total bill amount.');
          setIsSubmitting(false);
          return;
        }
        if (cashPaise > 0) payments.push({ mode: 'CASH', amount_paise: cashPaise });
        if (digiPaise > 0) payments.push({ mode: 'UPI', amount_paise: digiPaise });
      }

      const res = await onFinalise(payments, custName, custPhone);
      setCompletedInvoice(res.invoiceNumber);
      setCompletedChangeDue(activeTab === 'CASH' ? changeDuePaise : 0);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error completing bill');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNewBill = () => {
    setCompletedInvoice(null);
    onClose();
  };

  const amountRupeesStr = grandTotalRupees.toFixed(2);
  const upiPayload = shopUpiId
    ? `upi://pay?pa=${shopUpiId}&pn=${encodeURIComponent(shopName)}&am=${amountRupeesStr}&cu=INR`
    : `upi://pay?pa=shopbill@bank&pn=ShopBill&am=${amountRupeesStr}&cu=INR`;

  return (
    <div className="fixed inset-0 bg-slate-900/65 backdrop-blur-xs flex items-center justify-center p-3 md:p-4 z-50 animate-in fade-in duration-150">
      <div className="bg-surface rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
          <div>
            <h2 className="text-base md:text-lg font-black tracking-tight">
              {completedInvoice ? 'Sale Completed Successfully' : 'Supermarket Checkout & Settlement'}
            </h2>
            <p className="text-xs text-slate-400">
              {completedInvoice
                ? `Invoice #${completedInvoice}`
                : `Total Payable: ${formatCurrency(grandTotalPaise)}`}
            </p>
          </div>
          <button
            onClick={completedInvoice ? handleNewBill : onClose}
            className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="overflow-y-auto flex-1 p-5 md:p-6 space-y-4">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 text-xs font-bold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {completedInvoice ? (
            /* ================= COMPLETED RECEIPT SCREEN ================= */
            <div className="text-center space-y-5 py-2">
              <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
                <CheckCircle className="w-10 h-10" />
              </div>

              <div>
                <h3 className="text-2xl font-black text-slate-900">
                  {formatCurrency(grandTotalPaise)} Received
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Bill <strong>#{completedInvoice}</strong> generated and saved to offline database.
                </p>
              </div>

              {/* Receipt Summary Card */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs font-semibold text-slate-700 space-y-2 text-left">
                <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                  <span className="text-slate-500">Customer:</span>
                  <span className="font-bold text-slate-900">{custName}</span>
                </div>
                {custPhone && (
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">Phone:</span>
                    <span className="font-bold text-slate-800">{custPhone}</span>
                  </div>
                )}
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Payment Mode:</span>
                  <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-800 font-bold uppercase text-[10px]">
                    {activeTab}
                  </span>
                </div>
                {completedChangeDue > 0 && (
                  <div className="flex justify-between items-center bg-emerald-100/70 p-2 rounded-lg text-emerald-900 font-bold border border-emerald-300">
                    <span>Change Returned:</span>
                    <span className="text-sm font-black">{formatCurrency(completedChangeDue)}</span>
                  </div>
                )}
              </div>

              {/* Print & Share Actions */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  onClick={() => onPrintPreview(completedInvoice)}
                  className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md transition-all cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span>Print Receipt</span>
                </button>
                <a
                  href={`https://wa.me/${custPhone.replace(/\D/g, '')}?text=${encodeURIComponent(
                    `Thank you for shopping at ${shopName}! Bill #${completedInvoice} of ${formatCurrency(
                      grandTotalPaise
                    )} is confirmed.`
                  )}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition-all cursor-pointer"
                >
                  <Share2 className="w-4 h-4" />
                  <span>WhatsApp Bill</span>
                </a>
              </div>

              <button
                onClick={handleNewBill}
                className="w-full py-2.5 rounded-xl border border-slate-300 text-slate-700 font-bold text-xs hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Start Next Customer Bill [Enter]
              </button>
            </div>
          ) : (
            /* ================= SETTLEMENT / TENDER SCREEN ================= */
            <div className="space-y-4">
              {/* Grand Total Display */}
              <div className="p-3.5 rounded-xl bg-blue-50 border border-blue-200 text-center">
                <span className="text-[11px] font-bold text-blue-700 tracking-wider uppercase">
                  Total Amount Due
                </span>
                <div className="text-3xl font-black text-blue-900 tabular-nums mt-0.5">
                  {formatCurrency(grandTotalPaise)}
                </div>
              </div>

              {/* Customer Contact Details (Optional) */}
              <div className="grid grid-cols-2 gap-2.5 bg-slate-50 p-3 rounded-xl border border-slate-200">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1 flex items-center gap-1">
                    <User className="w-3 h-3 text-slate-400" />
                    <span>Customer Name</span>
                  </label>
                  <input
                    type="text"
                    value={custName}
                    onChange={(e) => setCustName(e.target.value)}
                    placeholder="Walk-in Customer"
                    className="w-full p-2 border border-slate-300 rounded-lg text-xs font-semibold bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1 flex items-center gap-1">
                    <Phone className="w-3 h-3 text-slate-400" />
                    <span>Phone (for WhatsApp)</span>
                  </label>
                  <input
                    type="tel"
                    value={custPhone}
                    onChange={(e) => setCustPhone(e.target.value)}
                    placeholder="10-digit mobile"
                    className="w-full p-2 border border-slate-300 rounded-lg text-xs font-semibold bg-white"
                  />
                </div>
              </div>

              {/* Payment Mode Selector Tabs */}
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  Select Payment Method
                </label>
                <div className="grid grid-cols-5 gap-1 p-1 bg-slate-100 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setActiveTab('CASH')}
                    className={`flex flex-col items-center py-2 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                      activeTab === 'CASH'
                        ? 'bg-surface text-blue-700 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Banknote className="w-4 h-4 mb-0.5" />
                    <span>Cash</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('UPI')}
                    className={`flex flex-col items-center py-2 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                      activeTab === 'UPI'
                        ? 'bg-surface text-blue-700 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <QrCode className="w-4 h-4 mb-0.5" />
                    <span>UPI QR</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('CARD')}
                    className={`flex flex-col items-center py-2 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                      activeTab === 'CARD'
                        ? 'bg-surface text-blue-700 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <CreditCard className="w-4 h-4 mb-0.5" />
                    <span>Card</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('SPLIT')}
                    className={`flex flex-col items-center py-2 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                      activeTab === 'SPLIT'
                        ? 'bg-surface text-blue-700 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <ArrowRight className="w-4 h-4 mb-0.5" />
                    <span>Split</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('CREDIT')}
                    className={`flex flex-col items-center py-2 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                      activeTab === 'CREDIT'
                        ? 'bg-surface text-amber-700 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <BookOpen className="w-4 h-4 mb-0.5" />
                    <span>Udhaar</span>
                  </button>
                </div>
              </div>

              {/* CASH PAYMENT PANE */}
              {activeTab === 'CASH' && (
                <div className="space-y-3.5 bg-slate-50/70 p-3.5 rounded-xl border border-slate-200">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Cash Tendered by Customer (₹)
                    </label>
                    <input
                      type="number"
                      step="any"
                      autoFocus
                      value={cashTenderedRupees || ''}
                      onChange={(e) => setCashTenderedRupees(Number(e.target.value))}
                      className="w-full text-xl font-black p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-600 focus:outline-none tabular-nums bg-white"
                    />
                  </div>

                  {/* Cash Note Presets for Supermarket Cashiers */}
                  <div>
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                      Quick Note Presets:
                    </span>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <button
                        type="button"
                        onClick={() => handleCashPreset(grandTotalRupees)}
                        className="px-2.5 py-1 rounded-lg bg-blue-100 hover:bg-blue-200 text-blue-800 font-bold text-xs transition-colors cursor-pointer"
                      >
                        Exact ₹{grandTotalRupees.toFixed(0)}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleCashPreset(100)}
                        className="px-2.5 py-1 rounded-lg bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
                      >
                        ₹100
                      </button>
                      <button
                        type="button"
                        onClick={() => handleCashPreset(200)}
                        className="px-2.5 py-1 rounded-lg bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
                      >
                        ₹200
                      </button>
                      <button
                        type="button"
                        onClick={() => handleCashPreset(500)}
                        className="px-2.5 py-1 rounded-lg bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
                      >
                        ₹500
                      </button>
                      <button
                        type="button"
                        onClick={() => handleCashPreset(1000)}
                        className="px-2.5 py-1 rounded-lg bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
                      >
                        ₹1000
                      </button>
                      <button
                        type="button"
                        onClick={() => handleCashPreset(2000)}
                        className="px-2.5 py-1 rounded-lg bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
                      >
                        ₹2000
                      </button>
                      <button
                        type="button"
                        onClick={() => handleAddCash(50)}
                        className="px-2 py-1 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-[11px] transition-colors cursor-pointer"
                      >
                        +₹50
                      </button>
                    </div>
                  </div>

                  {/* Real-time Change Due Indicator */}
                  <div
                    className={`p-3 rounded-xl border flex justify-between items-center ${
                      isShortCash
                        ? 'bg-amber-50 border-amber-200 text-amber-900'
                        : 'bg-emerald-50 border-emerald-200 text-emerald-900'
                    }`}
                  >
                    <span className="text-xs font-bold">
                      {isShortCash ? 'Short Amount (Collect More):' : 'Return Change to Customer:'}
                    </span>
                    <span className="text-lg font-black tabular-nums">
                      {isShortCash
                        ? `₹${shortAmountRupees.toFixed(2)}`
                        : formatCurrency(changeDuePaise)}
                    </span>
                  </div>
                </div>
              )}

              {/* UPI QR PAYMENT PANE */}
              {activeTab === 'UPI' && (
                <div className="text-center space-y-3 bg-slate-50/70 p-4 rounded-xl border border-slate-200">
                  <p className="text-xs text-slate-500 font-medium">
                    Customer scans and pays via GPay, PhonePe, Paytm, or BHIM:
                  </p>
                  <div className="w-40 h-40 mx-auto bg-white border-2 border-slate-300 rounded-xl flex flex-col items-center justify-center p-2 shadow-xs">
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(
                        upiPayload
                      )}`}
                      alt="UPI QR Code"
                      className="w-34 h-34"
                    />
                  </div>
                  <div className="text-xs font-mono font-bold text-slate-700">
                    {shopUpiId || 'merchant@upi'} • ₹{amountRupeesStr}
                  </div>
                </div>
              )}

              {/* CARD PAYMENT PANE */}
              {activeTab === 'CARD' && (
                <div className="space-y-3 bg-slate-50/70 p-4 rounded-xl border border-slate-200">
                  <div className="flex items-center gap-2 text-slate-800 font-bold text-xs">
                    <CreditCard className="w-4 h-4 text-blue-600" />
                    <span>Swipe / Tap on POS EDC Machine</span>
                  </div>
                  <p className="text-xs text-slate-500">
                    Process card swipe on your bank card machine for ₹{amountRupeesStr}.
                  </p>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Card Last 4 Digits or Approval Code (Optional)
                    </label>
                    <input
                      type="text"
                      value={cardRef}
                      onChange={(e) => setCardRef(e.target.value)}
                      placeholder="e.g. Visa 4242 or Appr: 8931"
                      className="w-full p-2 border border-slate-300 rounded-lg text-xs font-semibold bg-white"
                    />
                  </div>
                </div>
              )}

              {/* SPLIT PAYMENT PANE */}
              {activeTab === 'SPLIT' && (
                <div className="space-y-3 bg-slate-50/70 p-4 rounded-xl border border-slate-200">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">
                        Cash Amount (₹)
                      </label>
                      <input
                        type="number"
                        value={splitCashRupees || ''}
                        onChange={(e) => setSplitCashRupees(Number(e.target.value))}
                        placeholder="0"
                        className="w-full p-2.5 border border-slate-300 rounded-lg text-sm font-bold bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">
                        UPI / Card Amount (₹)
                      </label>
                      <input
                        type="number"
                        value={splitDigitalRupees || ''}
                        onChange={(e) => setSplitDigitalRupees(Number(e.target.value))}
                        placeholder="0"
                        className="w-full p-2.5 border border-slate-300 rounded-lg text-sm font-bold bg-white"
                      />
                    </div>
                  </div>
                  <div className="text-xs text-slate-500 text-right font-medium">
                    Total Tendered: ₹{(splitCashRupees + splitDigitalRupees).toFixed(2)} / ₹
                    {amountRupeesStr}
                  </div>
                </div>
              )}

              {/* CREDIT / UDHAAR KHATA PANE */}
              {activeTab === 'CREDIT' && (
                <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 space-y-2">
                  <div className="flex items-center gap-2 text-amber-800 font-bold text-sm">
                    <BookOpen className="w-4 h-4" />
                    <span>Udhaar / Khata Credit Sale</span>
                  </div>
                  <p className="text-xs text-amber-700">
                    This bill amount will be added to the customer's outstanding ledger balance.
                  </p>
                  {customer ? (
                    <div className="text-xs font-semibold text-slate-800 bg-white p-2.5 rounded-lg border border-amber-300 space-y-1">
                      <div>
                        Customer: <strong>{customer.name}</strong>
                      </div>
                      <div>Phone: {customer.phone || 'N/A'}</div>
                      <div>
                        Current Balance:{' '}
                        <strong className="text-amber-700">{formatCurrency(customer.balance_paise)}</strong>
                      </div>
                    </div>
                  ) : (
                    <div className="text-xs font-semibold text-amber-800 bg-amber-100/60 p-2.5 rounded-lg border border-amber-300">
                      Sale will be credited to: <strong>{custName}</strong> ({custPhone || 'No phone'})
                    </div>
                  )}
                </div>
              )}

              {/* Confirm Sale Button */}
              <div className="pt-2">
                <button
                  type="button"
                  disabled={isSubmitting || (activeTab === 'CASH' && isShortCash)}
                  onClick={handleCheckout}
                  className="w-full py-3.5 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white font-black text-sm md:text-base rounded-xl shadow-lg shadow-blue-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  {isSubmitting ? (
                    <span>Recording Sale & Deducting Stock...</span>
                  ) : (
                    <>
                      <CheckCircle className="w-5 h-5" />
                      <span>Confirm Sale & Print Bill [F10]</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
