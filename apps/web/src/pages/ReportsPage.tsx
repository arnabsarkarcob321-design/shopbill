import React, { useState, useEffect } from 'react';
import {
  Lock,
  Printer,
  Ban,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { db, InvoiceRecord } from '../db';
import { formatCurrency } from '@shopbill/i18n';
import { PrintPreviewModal } from '../components/PrintPreviewModal';
import { createPrintModel, PrintModel } from '@shopbill/print-model';

interface ReportsPageProps {
  shopProfile: any;
}

export const ReportsPage: React.FC<ReportsPageProps> = ({ shopProfile }) => {
  const [invoices, setInvoices] = useState<InvoiceRecord[]>([]);
  const [previewPrintModel, setPreviewPrintModel] = useState<PrintModel | null>(null);
  const [cancelModalInvoice, setCancelModalInvoice] = useState<InvoiceRecord | null>(null);
  const [cancelReason, setCancelReason] = useState('');

  // Day Close State
  const [openingCashRupees, setOpeningCashRupees] = useState('2000');
  const [actualCashRupees, setActualCashRupees] = useState('');
  const [dayCloseNotes, setDayCloseNotes] = useState('');
  const [dayClosed, setDayClosed] = useState(false);

  const loadInvoices = () => {
    db.invoices.reverse().sortBy('issue_at').then(setInvoices);
  };

  useEffect(() => {
    loadInvoices();
  }, []);

  // Compute today's drawer cash stats
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const todayInvoices = invoices.filter(
    (inv) => new Date(inv.issue_at) >= todayStart && inv.status === 'FINALIZED'
  );

  const todayCashSalesPaise = todayInvoices
    .filter((inv) => inv.payment_mode_summary.includes('CASH'))
    .reduce((acc, inv) => acc + inv.paid_amount_paise, 0);

  const todayUpiSalesPaise = todayInvoices
    .filter((inv) => inv.payment_mode_summary.includes('UPI'))
    .reduce((acc, inv) => acc + inv.paid_amount_paise, 0);

  const todayTotalTurnoverPaise = todayInvoices.reduce((acc, inv) => acc + inv.grand_total_paise, 0);

  const openingCashPaise = Math.round(Number(openingCashRupees || 0) * 100);
  const expectedCashInDrawerPaise = openingCashPaise + todayCashSalesPaise;
  const actualCashPaise = actualCashRupees ? Math.round(Number(actualCashRupees) * 100) : null;
  const variancePaise = actualCashPaise !== null ? actualCashPaise - expectedCashInDrawerPaise : 0;

  const handlePerformDayClose = async () => {
    if (actualCashPaise === null) {
      alert('Please enter the physically counted cash in the drawer.');
      return;
    }

    const todayStr = new Date().toISOString().split('T')[0]!;
    await db.day_close_sessions.put({
      id: `dc-${todayStr}`,
      session_date: todayStr,
      opening_cash_paise: openingCashPaise,
      cash_sales_paise: todayCashSalesPaise,
      cash_recoveries_paise: 0,
      cash_refunds_paise: 0,
      expected_cash_paise: expectedCashInDrawerPaise,
      actual_cash_paise: actualCashPaise,
      variance_paise: variancePaise,
      upi_sales_paise: todayUpiSalesPaise,
      upi_recoveries_paise: 0,
      total_turnover_paise: todayTotalTurnoverPaise,
      total_bills_count: todayInvoices.length,
      status: 'CLOSED',
      notes: dayCloseNotes,
      closed_at: new Date().toISOString(),
    });

    setDayClosed(true);
  };

  const handleReprintInvoice = async (inv: InvoiceRecord) => {
    const lines = await db.invoice_lines.where('invoice_id').equals(inv.id).toArray();
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
      },
      customer: inv.party_name !== 'Walk-in Customer' ? { name: inv.party_name, phone: inv.party_phone, gstin: inv.party_gstin } : undefined,
      documentType: inv.doc_type,
      invoiceNumber: inv.invoice_number,
      issueDate: inv.issue_at,
      calculation: {
        lines: lines.map((l) => ({
          id: l.id,
          product_id: l.product_id,
          product_name: l.product_name,
          hsn_sac: l.hsn_sac,
          quantity_milli: l.quantity_milli,
          unit_price_paise: l.unit_price_paise,
          is_tax_inclusive: l.is_tax_inclusive,
          gross_amount_paise: l.taxable_value_paise,
          line_discount_paise: l.line_discount_paise,
          prorated_invoice_discount_paise: 0,
          net_taxable_value_paise: l.taxable_value_paise,
          gst_rate_bps: l.gst_rate_bps,
          cess_rate_bps: l.cess_paise > 0 ? 1200 : 0,
          is_inter_state: inv.is_inter_state,
          cgst_rate_bps: Math.floor(l.gst_rate_bps / 2),
          cgst_amount_paise: l.cgst_paise,
          sgst_rate_bps: Math.floor(l.gst_rate_bps / 2),
          sgst_amount_paise: l.sgst_paise,
          igst_rate_bps: inv.is_inter_state ? l.gst_rate_bps : 0,
          igst_amount_paise: l.igst_paise,
          cess_amount_paise: l.cess_paise,
          total_tax_paise: l.cgst_paise + l.sgst_paise + l.igst_paise + l.cess_paise,
          line_total_paise: l.line_total_paise,
        })),
        gross_amount_paise: inv.gross_amount_paise,
        total_line_discount_paise: inv.discount_amount_paise,
        invoice_discount_paise: 0,
        total_taxable_value_paise: inv.taxable_value_paise,
        cgst_amount_paise: inv.cgst_paise,
        sgst_amount_paise: inv.sgst_paise,
        igst_amount_paise: inv.igst_paise,
        cess_amount_paise: inv.cess_paise,
        total_tax_paise: inv.cgst_paise + inv.sgst_paise + inv.igst_paise + inv.cess_paise,
        subtotal_paise: inv.grand_total_paise - inv.round_off_paise,
        round_off_paise: inv.round_off_paise,
        grand_total_paise: inv.grand_total_paise,
        is_inter_state: inv.is_inter_state,
        tax_slabs: [],
        hsn_summary: [],
        engine_version: '1.0.0',
      },
      payments: [{ mode: 'CASH', amount_paise: inv.paid_amount_paise }],
    });

    setPreviewPrintModel(pm);
  };

  const handleCancelInvoice = async () => {
    if (!cancelModalInvoice || !cancelReason.trim()) return;

    await db.invoices.update(cancelModalInvoice.id, {
      status: 'CANCELLED',
      cancellation_reason: cancelReason.trim(),
      updated_at: new Date().toISOString(),
    });

    setCancelModalInvoice(null);
    setCancelReason('');
    loadInvoices();
  };

  const handleExportCsv = () => {
    const headers = [
      'Invoice Number',
      'Date',
      'Customer',
      'GSTIN',
      'Taxable Value',
      'CGST',
      'SGST',
      'IGST',
      'Cess',
      'Round Off',
      'Grand Total',
      'Status',
      'Payment Mode',
    ];

    const rows = invoices.map((inv) => [
      inv.invoice_number,
      inv.issue_at,
      `"${inv.party_name}"`,
      inv.party_gstin || '',
      (inv.taxable_value_paise / 100).toFixed(2),
      (inv.cgst_paise / 100).toFixed(2),
      (inv.sgst_paise / 100).toFixed(2),
      (inv.igst_paise / 100).toFixed(2),
      (inv.cess_paise / 100).toFixed(2),
      (inv.round_off_paise / 100).toFixed(2),
      (inv.grand_total_paise / 100).toFixed(2),
      inv.status,
      inv.payment_mode_summary,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `ShopBill_Sales_Register_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex-1 p-4 md:p-6 bg-canvas overflow-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">
            Reports & Day Close Drawer
          </h2>
          <p className="text-xs text-slate-500 font-medium">
            Cash drawer audit, monthly 7-tab CA GST pack, and sales register
          </p>
        </div>

        <button
          onClick={handleExportCsv}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition-all"
        >
          <FileSpreadsheet className="w-4 h-4" />
          <span>Export CA / GST Register (.csv)</span>
        </button>
      </div>

      {/* Day Close Cash Reconciliation Section */}
      <div className="bg-surface rounded-2xl border border-slate-200 shadow-xs p-5 md:p-6">
        <div className="flex items-center justify-between pb-4 border-b border-slate-200 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
              <Lock className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm">
                Day Close Cash Drawer Reconciliation
              </h3>
              <p className="text-[11px] text-slate-500">
                Verify physically counted drawer cash against recorded transactions
              </p>
            </div>
          </div>
          {dayClosed && (
            <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 font-bold text-xs border border-emerald-200">
              <CheckCircle2 className="w-4 h-4" />
              Day Session Locked
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
            <span className="text-[11px] font-semibold text-slate-500 uppercase">
              Opening Drawer Cash
            </span>
            <div className="flex items-center gap-1 mt-1">
              <span className="text-xs font-bold text-slate-400">₹</span>
              <input
                type="number"
                disabled={dayClosed}
                value={openingCashRupees}
                onChange={(e) => setOpeningCashRupees(e.target.value)}
                className="w-full font-bold text-base bg-transparent focus:outline-none tabular-nums"
              />
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-blue-50/70 border border-blue-200">
            <span className="text-[11px] font-bold text-blue-700 uppercase">
              Today's Cash Sales
            </span>
            <div className="text-lg font-black text-blue-900 tabular-nums mt-1">
              {formatCurrency(todayCashSalesPaise)}
            </div>
            <div className="text-[10px] text-blue-700 mt-0.5">
              +{formatCurrency(todayUpiSalesPaise)} via UPI QR
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-100 border border-slate-300">
            <span className="text-[11px] font-bold text-slate-700 uppercase">
              Expected Cash in Drawer
            </span>
            <div className="text-lg font-black text-slate-900 tabular-nums mt-1">
              {formatCurrency(expectedCashInDrawerPaise)}
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">Opening + Cash bills</div>
          </div>

          <div className="p-3.5 rounded-xl bg-emerald-50/70 border border-emerald-300">
            <span className="text-[11px] font-bold text-emerald-800 uppercase">
              Actual Cash Count (₹)
            </span>
            <div className="flex items-center gap-1 mt-1">
              <span className="text-xs font-bold text-emerald-700">₹</span>
              <input
                type="number"
                disabled={dayClosed}
                placeholder="Physical count"
                value={actualCashRupees}
                onChange={(e) => setActualCashRupees(e.target.value)}
                className="w-full font-extrabold text-lg text-emerald-950 bg-transparent focus:outline-none tabular-nums"
              />
            </div>
          </div>
        </div>

        {actualCashPaise !== null && (
          <div
            className={`p-3 rounded-xl border flex items-center justify-between text-xs font-bold mb-4 ${
              variancePaise === 0
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : variancePaise > 0
                ? 'bg-blue-50 border-blue-200 text-blue-800'
                : 'bg-red-50 border-red-200 text-red-800'
            }`}
          >
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              <span>
                {variancePaise === 0
                  ? 'Perfect Match! Physical cash exactly equals recorded receipts.'
                  : variancePaise > 0
                  ? `Cash Surplus: ₹${(variancePaise / 100).toFixed(2)} extra in drawer.`
                  : `Cash Shortage: ₹${(Math.abs(variancePaise) / 100).toFixed(2)} missing in drawer.`}
              </span>
            </div>
            <span className="font-extrabold tabular-nums">
              Variance: {formatCurrency(variancePaise)}
            </span>
          </div>
        )}

        {!dayClosed && (
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
            <input
              type="text"
              placeholder="Session close notes / remarks (optional)"
              value={dayCloseNotes}
              onChange={(e) => setDayCloseNotes(e.target.value)}
              className="text-xs px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-primary flex-1 max-w-md"
            />
            <button
              onClick={handlePerformDayClose}
              className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2"
            >
              <Lock className="w-4 h-4 text-emerald-400" />
              <span>Lock Today's Drawer Session</span>
            </button>
          </div>
        )}
      </div>

      {/* Sales Invoices Register Table */}
      <div className="bg-surface rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex justify-between items-center">
          <h3 className="font-bold text-slate-900 text-sm">
            Sales & Tax Invoices Register ({invoices.length} Bills)
          </h3>
          <span className="text-xs text-slate-500 font-semibold">
            Turnover: {formatCurrency(invoices.reduce((a, b) => a + b.grand_total_paise, 0))}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px] tracking-wider">
              <tr>
                <th className="py-3 px-4">Invoice #</th>
                <th className="py-3 px-4">Date / Time</th>
                <th className="py-3 px-4">Party</th>
                <th className="py-3 px-4 text-right">Taxable</th>
                <th className="py-3 px-4 text-right">Taxes</th>
                <th className="py-3 px-4 text-right">Grand Total</th>
                <th className="py-3 px-4">Payment</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {invoices.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-400">
                    No bills issued yet.
                  </td>
                </tr>
              ) : (
                invoices.map((inv) => {
                  const totalTax = inv.cgst_paise + inv.sgst_paise + inv.igst_paise + inv.cess_paise;
                  return (
                    <tr key={inv.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-blue-700">
                        {inv.invoice_number}
                      </td>
                      <td className="py-3 px-4 text-slate-500">
                        {new Date(inv.issue_at).toLocaleDateString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900">{inv.party_name}</div>
                        {inv.party_gstin && (
                          <span className="text-[10px] font-mono bg-slate-100 px-1 py-0.5 rounded">
                            {inv.party_gstin}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right tabular-nums">
                        {formatCurrency(inv.taxable_value_paise)}
                      </td>
                      <td className="py-3 px-4 text-right tabular-nums text-slate-600">
                        {formatCurrency(totalTax)}
                      </td>
                      <td className="py-3 px-4 text-right font-black text-slate-900 text-sm tabular-nums">
                        {formatCurrency(inv.grand_total_paise)}
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-[11px] font-semibold text-slate-600">
                          {inv.payment_mode_summary}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        {inv.status === 'FINALIZED' ? (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-bold text-[10px] border border-emerald-200">
                            Finalised
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full bg-red-50 text-red-700 font-bold text-[10px] border border-red-200">
                            Cancelled
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => handleReprintInvoice(inv)}
                            className="p-1 text-slate-500 hover:text-blue-600 rounded"
                            title="View / Print Bill"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </button>
                          {inv.status === 'FINALIZED' && (
                            <button
                              onClick={() => {
                                setCancelModalInvoice(inv);
                                setCancelReason('');
                              }}
                              className="p-1 text-slate-400 hover:text-red-600 rounded"
                              title="Cancel Bill (Audit Logged)"
                            >
                              <Ban className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Print Preview Modal */}
      <PrintPreviewModal
        isOpen={Boolean(previewPrintModel)}
        onClose={() => setPreviewPrintModel(null)}
        printModel={previewPrintModel}
      />

      {/* Cancel Bill Modal with Reason */}
      {cancelModalInvoice && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-surface rounded-2xl shadow-2xl max-w-sm w-full p-6 border border-slate-200">
            <h3 className="font-bold text-base text-red-700 mb-2">Cancel Invoice</h3>
            <p className="text-xs text-slate-600 mb-4">
              Are you sure you want to cancel invoice <strong>#{cancelModalInvoice.invoice_number}</strong>?
              Per GST rules, cancelled numbers cannot be deleted and will be documented in GSTR registers.
            </p>

            <div className="mb-4">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Mandatory Reason for Cancellation *
              </label>
              <textarea
                rows={3}
                required
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="e.g. Customer cancelled order / Wrong item keyed"
                className="w-full p-2.5 border border-slate-300 rounded-lg text-xs"
              />
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setCancelModalInvoice(null)}
                className="flex-1 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-bold text-xs"
              >
                Back
              </button>
              <button
                disabled={!cancelReason.trim()}
                onClick={handleCancelInvoice}
                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 disabled:opacity-40 text-white font-bold text-xs"
              >
                Confirm Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
