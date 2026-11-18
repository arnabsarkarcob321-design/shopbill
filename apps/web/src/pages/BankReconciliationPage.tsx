import React, { useState } from 'react';
import { Building2, CheckCircle2, AlertCircle, RefreshCw, ArrowUpRight, ArrowDownLeft, FileCheck } from 'lucide-react';

interface BankTransaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  type: 'CREDIT' | 'DEBIT';
  matchedInvoice?: string;
  status: 'MATCHED' | 'UNMATCHED' | 'PENDING';
}

export const BankReconciliationPage: React.FC = () => {
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  // Sample Data for HDFC / ICICI Bank Statement
  const [transactions, setTransactions] = useState<BankTransaction[]>([
    {
      id: 'TXN-901',
      date: '2026-10-28',
      description: 'NEFT CR-OM GALAXY LIMITED-PAYMENT',
      amount: 37493.84,
      type: 'CREDIT',
      matchedInvoice: 'OM/W/2627/0495',
      status: 'MATCHED',
    },
    {
      id: 'TXN-902',
      date: '2026-10-29',
      description: 'UPI-RAJESH TRADING-INV089',
      amount: 14750.00,
      type: 'CREDIT',
      matchedInvoice: 'INV-2026-089',
      status: 'MATCHED',
    },
    {
      id: 'TXN-903',
      date: '2026-10-30',
      description: 'IMPS-DIRECT BANK TRANSFER UNKNOWN',
      amount: 8500.00,
      type: 'CREDIT',
      status: 'UNMATCHED',
    },
    {
      id: 'TXN-904',
      date: '2026-10-31',
      description: 'ATM CASH WITHDRAWAL - MUMBAI BR',
      amount: 5000.00,
      type: 'DEBIT',
      status: 'PENDING',
    },
  ]);

  const handleAutoMatch = () => {
    setIsSyncing(true);
    setTimeout(() => {
      setTransactions((prev) =>
        prev.map((t) => (t.id === 'TXN-903' ? { ...t, matchedInvoice: 'INV-2026-092', status: 'MATCHED' } : t))
      );
      setIsSyncing(false);
    }, 1200);
  };

  const matchedCount = transactions.filter((t) => t.status === 'MATCHED').length;
  const unmatchedCount = transactions.filter((t) => t.status !== 'MATCHED').length;

  return (
    <div className="flex flex-col h-screen bg-slate-100 text-slate-800 font-sans" dir="ltr">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 bg-white border-b border-slate-200 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Bank Reconciliation</h1>
            <p className="text-xs text-slate-500">Automated Statement Matching & Settlement</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleAutoMatch}
            disabled={isSyncing}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md transition disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
            Auto-Match Ledger
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-auto p-6 space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex justify-between items-center">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase">Statement Status</p>
              <p className="text-lg font-bold text-slate-900 mt-1">HDFC_Oct_2026.csv</p>
            </div>
            <FileCheck className="w-8 h-8 text-indigo-500 opacity-80" />
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex justify-between items-center">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase">Matched Transactions</p>
              <p className="text-2xl font-extrabold text-emerald-600 mt-1">{matchedCount} / {transactions.length}</p>
            </div>
            <CheckCircle2 className="w-8 h-8 text-emerald-500 opacity-80" />
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex justify-between items-center">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase">Unreconciled Items</p>
              <p className="text-2xl font-extrabold text-amber-600 mt-1">{unmatchedCount}</p>
            </div>
            <AlertCircle className="w-8 h-8 text-amber-500 opacity-80" />
          </div>
        </div>

        {/* Transactions Table */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
            <h3 className="text-sm font-bold text-slate-800">Bank Feeds & Ledger Matches</h3>
            <span className="text-xs text-slate-500">{transactions.length} Statement Rows</span>
          </div>

          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 font-semibold text-slate-500 bg-slate-50/50">
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Transaction Details</th>
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-4 text-right">Amount</th>
                <th className="py-3 px-4">Matched Invoice / Ref</th>
                <th className="py-3 px-4 text-center">Reconciliation Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {transactions.map((row) => (
                <tr key={row.id} className="hover:bg-slate-50 transition">
                  <td className="py-3.5 px-4 font-mono text-slate-500">{row.date}</td>
                  <td className="py-3.5 px-4 font-medium text-slate-800">{row.description}</td>
                  <td className="py-3.5 px-4">
                    {row.type === 'CREDIT' ? (
                      <span className="inline-flex items-center gap-1 text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded">
                        <ArrowDownLeft className="w-3 h-3" /> Credit
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-rose-700 font-bold bg-rose-50 px-2 py-0.5 rounded">
                        <ArrowUpRight className="w-3 h-3" /> Debit
                      </span>
                    )}
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-900">₹{row.amount.toLocaleString()}</td>
                  <td className="py-3.5 px-4 font-mono text-indigo-600 font-medium">
                    {row.matchedInvoice ? row.matchedInvoice : <span className="text-slate-400 font-normal">No Match Found</span>}
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    {row.status === 'MATCHED' && (
                      <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded-full">
                        Reconciled
                      </span>
                    )}
                    {row.status === 'UNMATCHED' && (
                      <span className="px-2.5 py-1 bg-amber-100 text-amber-800 text-[10px] font-bold rounded-full">
                        Needs Review
                      </span>
                    )}
                    {row.status === 'PENDING' && (
                      <span className="px-2.5 py-1 bg-slate-100 text-slate-600 text-[10px] font-bold rounded-full">
                        Pending
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
};