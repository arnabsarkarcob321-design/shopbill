import React, { useState } from 'react';
import { X, CheckCircle, Printer, Share2, QrCode, Banknote, CreditCard, BookOpen } from 'lucide-react';
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
  onFinalise: (payments: PaymentEntry[]) => Promise<{ invoiceNumber: string; grandTotalPaise: number }>;
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
  const [activeTab, setActiveTab] = useState<'CASH' | 'UPI' | 'SPLIT' | 'CREDIT'>('CASH');

  // Tender amounts in Rupees (user inputs in Rupees)
  const [cashTenderedRupees, setCashTenderedRupees] = useState<number>(grandTotalPaise / 100);
  const [splitCashRupees, setSplitCashRupees] = useState<number>(0);
  const [splitUpiRupees, setSplitUpiRupees] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [completedInvoice, setCompletedInvoice] = useState<string | null>(null);

  if (!isOpen) return null;

  const changeDuePaise = Math.max(0, Math.round(cashTenderedRupees * 100) - grandTotalPaise);

  const handleCheckout = async () => {
    setIsSubmitting(true);
    try {
      let payments: PaymentEntry[] = [];

      if (activeTab === 'CASH') {
        payments = [{ mode: 'CASH', amount_paise: grandTotalPaise }];
      } else if (activeTab === 'UPI') {
        payments = [{ mode: 'UPI', amount_paise: grandTotalPaise }];
      } else if (activeTab === 'CREDIT') {
        if (!customer) {
          alert('Please select a customer for Udhaar / Credit sale!');
          setIsSubmitting(false);
          return;
        }
        payments = [{ mode: 'CREDIT', amount_paise: 0 }]; // 0 paid = full balance due
      } else if (activeTab === 'SPLIT') {
        const cashPaise = Math.round(splitCashRupees * 100);
        const upiPaise = Math.round(splitUpiRupees * 100);
        if (cashPaise > 0) payments.push({ mode: 'CASH', amount_paise: cashPaise });
        if (upiPaise > 0) payments.push({ mode: 'UPI', amount_paise: upiPaise });
      }

      const res = await onFinalise(payments);
      setCompletedInvoice(res.invoiceNumber);
    } catch (err: any) {
      alert(err.message || 'Error finalising invoice');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNewBill = () => {
    setCompletedInvoice(null);
    onClose();
  };

  const amountRupeesStr = (grandTotalPaise / 100).toFixed(2);
  const upiPayload = shopUpiId
    ? `upi://pay?pa=${shopUpiId}&pn=${encodeURIComponent(shopName)}&am=${amountRupeesStr}&cu=INR`
    : `upi://pay?pa=shopbill@bank&pn=ShopBill&am=${amountRupeesStr}&cu=INR`;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
      <div className="bg-surface rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold">
              {completedInvoice ? 'Bill Finalised Successfully' : 'Collect Payment'}
            </h2>
            <p className="text-xs text-slate-400">
              {completedInvoice
                ? `Invoice #${completedInvoice}`
                : `Total Payable: ${formatCurrency(grandTotalPaise)}`}
            </p>
          </div>
          <button
            onClick={completedInvoice ? handleNewBill : onClose}
            className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        {completedInvoice ? (
          <div className="p-6 text-center space-y-6">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
              <CheckCircle className="w-10 h-10" />
            </div>
            <div>
              <h3 className="text-xl font-extrabold text-slate-900">
                {formatCurrency(grandTotalPaise)} Received
              </h3>
              <p className="text-sm text-slate-500 mt-1">
                Invoice <strong>#{completedInvoice}</strong> is saved to offline storage. Stock & ledger updated.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                onClick={() => onPrintPreview(completedInvoice)}
                className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-md transition-all"
              >
                <Printer className="w-4 h-4" />
                <span>Print Bill</span>
              </button>
              <a
                href={`https://wa.me/${customer?.phone || ''}?text=${encodeURIComponent(
                  `Thank you for shopping at ${shopName}! Bill #${completedInvoice} of ${formatCurrency(
                    grandTotalPaise
                  )} is confirmed.`
                )}`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-md transition-all"
              >
                <Share2 className="w-4 h-4" />
                <span>WhatsApp</span>
              </a>
            </div>

            <button
              onClick={handleNewBill}
              className="w-full py-2.5 rounded-xl border border-slate-300 text-slate-700 font-semibold text-sm hover:bg-slate-50"
            >
              Start New Bill [Enter]
            </button>
          </div>
        ) : (
          <div className="p-6 space-y-5">
            {/* Grand Total Big Display */}
            <div className="p-4 rounded-xl bg-blue-50 border border-blue-200 text-center">
              <span className="text-xs font-bold text-blue-700 tracking-wider uppercase">
                Grand Total Amount
              </span>
              <div className="text-3xl font-extrabold text-blue-900 tabular-nums mt-0.5">
                {formatCurrency(grandTotalPaise)}
              </div>
            </div>

            {/* Mode Selector Tabs */}
            <div className="grid grid-cols-4 gap-1.5 p-1 bg-slate-100 rounded-xl">
              <button
                onClick={() => setActiveTab('CASH')}
                className={`flex flex-col items-center py-2 rounded-lg text-xs font-bold transition-all ${
                  activeTab === 'CASH'
                    ? 'bg-surface text-blue-700 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Banknote className="w-4 h-4 mb-1" />
                Cash
              </button>
              <button
                onClick={() => setActiveTab('UPI')}
                className={`flex flex-col items-center py-2 rounded-lg text-xs font-bold transition-all ${
                  activeTab === 'UPI'
                    ? 'bg-surface text-blue-700 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <QrCode className="w-4 h-4 mb-1" />
                UPI QR
              </button>
              <button
                onClick={() => setActiveTab('SPLIT')}
                className={`flex flex-col items-center py-2 rounded-lg text-xs font-bold transition-all ${
                  activeTab === 'SPLIT'
                    ? 'bg-surface text-blue-700 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <CreditCard className="w-4 h-4 mb-1" />
                Split
              </button>
              <button
                onClick={() => setActiveTab('CREDIT')}
                className={`flex flex-col items-center py-2 rounded-lg text-xs font-bold transition-all ${
                  activeTab === 'CREDIT'
                    ? 'bg-surface text-amber-700 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <BookOpen className="w-4 h-4 mb-1" />
                Udhaar
              </button>
            </div>

            {/* Tab Specific Panes */}
            {activeTab === 'CASH' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Cash Tendered by Customer (₹)
                  </label>
                  <input
                    type="number"
                    autoFocus
                    value={cashTenderedRupees || ''}
                    onChange={(e) => setCashTenderedRupees(Number(e.target.value))}
                    className="w-full text-xl font-bold p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-600 focus:outline-none tabular-nums"
                  />
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex justify-between items-center text-sm font-semibold">
                  <span className="text-slate-600">Change Due to Customer:</span>
                  <span
                    className={`text-lg font-bold tabular-nums ${
                      changeDuePaise > 0 ? 'text-emerald-600' : 'text-slate-800'
                    }`}
                  >
                    {formatCurrency(changeDuePaise)}
                  </span>
                </div>
              </div>
            )}

            {activeTab === 'UPI' && (
              <div className="text-center space-y-3">
                <p className="text-xs text-slate-500">
                  Customer can scan and pay with any UPI app (GPay, PhonePe, Paytm)
                </p>
                <div className="w-44 h-44 mx-auto bg-slate-50 border-2 border-slate-300 rounded-xl flex flex-col items-center justify-center p-2 shadow-xs">
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(
                      upiPayload
                    )}`}
                    alt="UPI QR Code"
                    className="w-36 h-36"
                  />
                </div>
                <div className="text-xs font-mono font-bold text-slate-600">
                  {shopUpiId || 'merchant@bank'} • ₹{amountRupeesStr}
                </div>
              </div>
            )}

            {activeTab === 'SPLIT' && (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Cash Amount (₹)
                  </label>
                  <input
                    type="number"
                    value={splitCashRupees || ''}
                    onChange={(e) => setSplitCashRupees(Number(e.target.value))}
                    placeholder="0"
                    className="w-full p-2.5 border border-slate-300 rounded-lg text-sm font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    UPI / Card Amount (₹)
                  </label>
                  <input
                    type="number"
                    value={splitUpiRupees || ''}
                    onChange={(e) => setSplitUpiRupees(Number(e.target.value))}
                    placeholder="0"
                    className="w-full p-2.5 border border-slate-300 rounded-lg text-sm font-bold"
                  />
                </div>
                <div className="text-xs text-slate-500 text-right">
                  Total Allocated: ₹{(splitCashRupees + splitUpiRupees).toFixed(2)}
                </div>
              </div>
            )}

            {activeTab === 'CREDIT' && (
              <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 space-y-2">
                <div className="flex items-center gap-2 text-amber-800 font-bold text-sm">
                  <BookOpen className="w-4 h-4" />
                  <span>Udhaar / Khata Credit Sale</span>
                </div>
                <p className="text-xs text-amber-700">
                  This entire bill amount will be added to the customer's outstanding ledger balance.
                </p>
                {customer ? (
                  <div className="text-xs font-semibold text-slate-800 bg-surface p-2.5 rounded-lg border border-amber-300">
                    <div>Customer: <strong>{customer.name}</strong></div>
                    <div>Phone: {customer.phone || 'N/A'}</div>
                    <div>Current Balance: <strong className="text-amber-700">{formatCurrency(customer.balance_paise)}</strong></div>
                  </div>
                ) : (
                  <div className="text-xs font-bold text-red-600 p-2 bg-red-50 rounded-lg border border-red-200">
                    ⚠️ Walk-in customers cannot buy on credit. Please close and select or add a named customer.
                  </div>
                )}
              </div>
            )}

            {/* Actions */}
            <div className="pt-2">
              <button
                disabled={isSubmitting || (activeTab === 'CREDIT' && !customer)}
                onClick={handleCheckout}
                className="w-full py-3.5 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white font-extrabold text-base rounded-xl shadow-lg shadow-blue-500/25 transition-all flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <span>Recording Bill...</span>
                ) : (
                  <>
                    <CheckCircle className="w-5 h-5" />
                    <span>Finalise Bill & Save [F10]</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
