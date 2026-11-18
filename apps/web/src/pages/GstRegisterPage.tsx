import React, { useState } from 'react';
import { Download, Filter, ArrowUpRight, ArrowDownLeft, Calculator, FileJson } from 'lucide-react';

interface GstTransaction {
  id: string;
  date: string;
  type: 'SALE' | 'PURCHASE';
  partyName: string;
  gstin: string;
  invoiceNo: string;
  taxableValue: number;
  cgst: number;
  sgst: number;
  igst: number;
  totalTax: number;
  invoiceValue: number;
}

export const GstRegisterPage: React.FC = () => {
  const [filterType, setFilterType] = useState<'ALL' | 'SALE' | 'PURCHASE'>('ALL');

  // Sample data for GST GSTR-1 and GSTR-3B compliance
  const transactions: GstTransaction[] = [
    {
      id: '1',
      date: '2026-10-28',
      type: 'PURCHASE',
      partyName: 'OM GALAXY LIMITED',
      gstin: '27AABCO12341ZV',
      invoiceNo: 'OM/W/2627/0495',
      taxableValue: 31774.44,
      cgst: 0,
      sgst: 0,
      igst: 5719.40,
      totalTax: 5719.40,
      invoiceValue: 37493.84,
    },
    {
      id: '2',
      date: '2026-10-29',
      type: 'SALE',
      partyName: 'Rajesh Trading Co',
      gstin: '27AABCR98762ZQ',
      invoiceNo: 'INV-2026-089',
      taxableValue: 12500.00,
      cgst: 1125.00,
      sgst: 1125.00,
      igst: 0,
      totalTax: 2250.00,
      invoiceValue: 14750.00,
    },
    {
      id: '3',
      date: '2026-10-30',
      type: 'SALE',
      partyName: 'Retail Walk-in Customer',
      gstin: 'URP (Unregistered)',
      invoiceNo: 'INV-2026-090',
      taxableValue: 4500.00,
      cgst: 405.00,
      sgst: 405.00,
      igst: 0,
      totalTax: 810.00,
      invoiceValue: 5310.00,
    },
  ];

  const filtered = transactions.filter((t) => filterType === 'ALL' || t.type === filterType);

  const totalTaxable = filtered.reduce((acc, curr) => acc + curr.taxableValue, 0);
  const totalTaxAmount = filtered.reduce((acc, curr) => acc + curr.totalTax, 0);

  // Export GSTR-1 JSON Schema for Tax Filing Portal
  const handleExportGstr1Json = () => {
    const salesOnly = transactions.filter((t) => t.type === 'SALE');
    const gstr1Payload = {
      gstin: '27AAAAA0000A1Z5',
      fp: '102026',
      gt: totalTaxable,
      cur_gt: totalTaxable,
      b2b: salesOnly
        .filter((s) => s.gstin !== 'URP (Unregistered)')
        .map((s) => ({
          ctin: s.gstin,
          cnum: s.invoiceNo,
          idt: s.date,
          val: s.invoiceValue,
          inv_typ: 'R',
          itms: [
            {
              num: 1,
              itm_det: {
                txval: s.taxableValue,
                rt: 18,
                camt: s.cgst,
                samt: s.sgst,
                iamt: s.igst,
              },
            },
          ],
        })),
    };

    const blob = new Blob([JSON.stringify(gstr1Payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `GSTR1_Return_${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
  };

  // Export CSV Format
  const handleExportCsv = () => {
    const headers = ['Date,Type,Party Name,GSTIN,Invoice No,Taxable Value,CGST,SGST,IGST,Invoice Value\n'];
    const rows = filtered.map(
      (r) => `${r.date},${r.type},"${r.partyName}",${r.gstin},${r.invoiceNo},${r.taxableValue},${r.cgst},${r.sgst},${r.igst},${r.invoiceValue}`
    );
    const blob = new Blob([...headers, rows.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `GST_Register_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
  };

  return (
    <div className="flex flex-col h-screen bg-slate-100 text-slate-800 font-sans" dir="ltr">
      {/* Top Header */}
      <header className="flex items-center justify-between px-6 py-4 bg-white border-b border-slate-200 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
            <Calculator className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">GST Register & Compliance</h1>
            <p className="text-xs text-slate-500">GSTR-1, GSTR-2B & Tax Audit Summary</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleExportCsv}
            className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition shadow-sm"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
          <button
            onClick={handleExportGstr1Json}
            className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition shadow-md"
          >
            <FileJson className="w-4 h-4" />
            Export GSTR-1 (JSON)
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-auto p-6 space-y-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <p className="text-xs font-semibold text-slate-400 uppercase">Total Taxable Turnover</p>
            <p className="text-2xl font-extrabold text-slate-900 mt-1">₹{totalTaxable.toLocaleString()}</p>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <p className="text-xs font-semibold text-slate-400 uppercase">Total GST Liability / Credit</p>
            <p className="text-2xl font-extrabold text-emerald-600 mt-1">₹{totalTaxAmount.toLocaleString()}</p>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <p className="text-xs font-semibold text-slate-400 uppercase">Compliance Status</p>
            <span className="inline-block mt-2 px-3 py-1 bg-emerald-100 text-emerald-800 text-xs font-bold rounded-full">
              Ready for GSTR-3B Filing
            </span>
          </div>
        </div>

        {/* Table Container */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          {/* Controls Bar */}
          <div className="p-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-slate-400" />
              <span className="text-xs font-semibold text-slate-600">Filter:</span>
              <button
                onClick={() => setFilterType('ALL')}
                className={`px-3 py-1 text-xs rounded-lg font-medium transition ${
                  filterType === 'ALL' ? 'bg-slate-900 text-white' : 'bg-slate-200 text-slate-600'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setFilterType('SALE')}
                className={`px-3 py-1 text-xs rounded-lg font-medium transition ${
                  filterType === 'SALE' ? 'bg-slate-900 text-white' : 'bg-slate-200 text-slate-600'
                }`}
              >
                Sales (Outward)
              </button>
              <button
                onClick={() => setFilterType('PURCHASE')}
                className={`px-3 py-1 text-xs rounded-lg font-medium transition ${
                  filterType === 'PURCHASE' ? 'bg-slate-900 text-white' : 'bg-slate-200 text-slate-600'
                }`}
              >
                Purchases (Inward)
              </button>
            </div>
            <span className="text-xs text-slate-500 font-medium">{filtered.length} Entries Found</span>
          </div>

          {/* Data Table */}
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 font-semibold text-slate-500 bg-slate-50/50">
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-4">Party Name & GSTIN</th>
                <th className="py-3 px-4">Invoice No</th>
                <th className="py-3 px-4 text-right">Taxable Value</th>
                <th className="py-3 px-4 text-right">CGST</th>
                <th className="py-3 px-4 text-right">SGST</th>
                <th className="py-3 px-4 text-right">IGST</th>
                <th className="py-3 px-4 text-right">Total Invoice</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((row) => (
                <tr key={row.id} className="hover:bg-slate-50 transition">
                  <td className="py-3.5 px-4 font-mono text-slate-500">{row.date}</td>
                  <td className="py-3.5 px-4">
                    {row.type === 'SALE' ? (
                      <span className="inline-flex items-center gap-1 text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded">
                        <ArrowUpRight className="w-3 h-3" /> Sale
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-blue-700 font-bold bg-blue-50 px-2 py-0.5 rounded">
                        <ArrowDownLeft className="w-3 h-3" /> Purchase
                      </span>
                    )}
                  </td>
                  <td className="py-3.5 px-4">
                    <p className="font-bold text-slate-800">{row.partyName}</p>
                    <p className="text-[10px] text-slate-400 font-mono">{row.gstin}</p>
                  </td>
                  <td className="py-3.5 px-4 font-mono text-slate-600">{row.invoiceNo}</td>
                  <td className="py-3.5 px-4 text-right font-mono font-medium">₹{row.taxableValue.toLocaleString()}</td>
                  <td className="py-3.5 px-4 text-right font-mono text-slate-500">₹{row.cgst}</td>
                  <td className="py-3.5 px-4 text-right font-mono text-slate-500">₹{row.sgst}</td>
                  <td className="py-3.5 px-4 text-right font-mono text-slate-500">₹{row.igst}</td>
                  <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-900">₹{row.invoiceValue.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
};