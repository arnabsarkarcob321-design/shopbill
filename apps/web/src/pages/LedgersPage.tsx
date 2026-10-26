import React, { useState, useEffect } from 'react';
import {
  Plus,
  Search,
  BookOpen,
  Share2,
  DollarSign,
  X,
  CheckCircle,
} from 'lucide-react';
import { db, PartyRecord, LedgerEntryRecord } from '../db';
import { formatCurrency } from '@shopbill/i18n';

interface LedgersPageProps {
  shopProfile: any;
}

export const LedgersPage: React.FC<LedgersPageProps> = ({ shopProfile }) => {
  const [parties, setParties] = useState<PartyRecord[]>([]);
  const [search, setSearch] = useState('');
  const [selectedParty, setSelectedParty] = useState<PartyRecord | null>(null);
  const [ledgerEntries, setLedgerEntries] = useState<LedgerEntryRecord[]>([]);
  const [isAddPartyModalOpen, setIsAddPartyModalOpen] = useState(false);
  const [isCollectModalOpen, setIsCollectModalOpen] = useState(false);

  // Add party form state
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newGstin, setNewGstin] = useState('');
  const [newAddress, setNewAddress] = useState('');
  const [newOpeningBalanceRupees, setNewOpeningBalanceRupees] = useState('');

  // Collect payment form state
  const [collectAmountRupees, setCollectAmountRupees] = useState('');
  const [collectMode, setCollectMode] = useState<'CASH' | 'UPI'>('CASH');
  const [collectNotes, setCollectNotes] = useState('Payment received at counter');

  const loadParties = () => {
    db.parties.toArray().then(setParties);
  };

  useEffect(() => {
    loadParties();
  }, []);

  useEffect(() => {
    if (selectedParty) {
      db.ledger_entries
        .where('party_id')
        .equals(selectedParty.id)
        .reverse()
        .sortBy('occurred_at')
        .then(setLedgerEntries);
    }
  }, [selectedParty]);

  const handleAddParty = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    const partyId = `party-${Date.now()}`;
    const openingPaise = Math.round(Number(newOpeningBalanceRupees || 0) * 100);
    const now = new Date().toISOString();

    const party: PartyRecord = {
      id: partyId,
      name: newName.trim(),
      phone: newPhone.trim() || undefined,
      gstin: newGstin.trim() || undefined,
      party_type: 'CUSTOMER',
      state_code: shopProfile?.state_code || '19',
      state_name: shopProfile?.state_name || 'West Bengal',
      address: newAddress.trim() || undefined,
      balance_paise: openingPaise,
      updated_at: now,
    };

    await db.parties.put(party);

    if (openingPaise > 0) {
      await db.ledger_entries.put({
        id: `le-open-${partyId}`,
        party_id: partyId,
        direction: 'DEBIT',
        amount_paise: openingPaise,
        balance_after_paise: openingPaise,
        reference_type: 'OPENING',
        notes: 'Initial opening balance',
        occurred_at: now,
      });
    }

    setIsAddPartyModalOpen(false);
    setNewName('');
    setNewPhone('');
    setNewGstin('');
    setNewAddress('');
    setNewOpeningBalanceRupees('');
    loadParties();
  };

  const handleCollectPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedParty) return;

    const pmtPaise = Math.round(Number(collectAmountRupees) * 100);
    if (pmtPaise <= 0) return;

    const now = new Date().toISOString();
    const newBalance = selectedParty.balance_paise - pmtPaise;

    await db.transaction('rw', [db.parties, db.ledger_entries, db.payments], async () => {
      await db.parties.update(selectedParty.id, {
        balance_paise: newBalance,
        updated_at: now,
      });

      await db.ledger_entries.put({
        id: `le-pay-${Date.now()}`,
        party_id: selectedParty.id,
        direction: 'CREDIT',
        amount_paise: pmtPaise,
        balance_after_paise: newBalance,
        reference_type: 'PAYMENT',
        notes: `${collectMode} payment: ${collectNotes}`,
        occurred_at: now,
      });

      await db.payments.put({
        id: `pmt-recv-${Date.now()}`,
        party_id: selectedParty.id,
        mode: collectMode,
        purpose: 'CUSTOMER_RECEIPT',
        amount_paise: pmtPaise,
        reference: collectNotes,
        received_at: now,
      });
    });

    setIsCollectModalOpen(false);
    setCollectAmountRupees('');
    loadParties();

    // Refresh selected party
    const updated = await db.parties.get(selectedParty.id);
    if (updated) setSelectedParty(updated);
  };

  const totalUdhaarPaise = parties
    .filter((p) => p.balance_paise > 0)
    .reduce((acc, p) => acc + p.balance_paise, 0);

  const customerCountWithUdhaar = parties.filter((p) => p.balance_paise > 0).length;

  const filteredParties = parties.filter((p) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      p.name.toLowerCase().includes(q) ||
      (p.phone && p.phone.includes(q)) ||
      (p.gstin && p.gstin.toLowerCase().includes(q))
    );
  });

  return (
    <div className="flex-1 p-4 md:p-6 bg-canvas overflow-auto">
      {/* 4-Card KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 mb-6">
        <div className="p-4 rounded-xl bg-amber-50/70 border border-amber-200 shadow-2xs">
          <div className="text-[11px] font-bold text-amber-700 uppercase tracking-wider">
            Total Outstanding Udhaar
          </div>
          <div className="text-2xl font-black text-amber-900 tabular-nums mt-1">
            {formatCurrency(totalUdhaarPaise)}
          </div>
          <div className="text-[11px] text-amber-700/80 mt-0.5">
            Pending across {customerCountWithUdhaar} customers
          </div>
        </div>

        <div className="p-4 rounded-xl bg-emerald-50/70 border border-emerald-200 shadow-2xs">
          <div className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider">
            Customers with Dues
          </div>
          <div className="text-2xl font-black text-emerald-900 tabular-nums mt-1">
            {customerCountWithUdhaar}
          </div>
          <div className="text-[11px] text-emerald-700/80 mt-0.5">Active credit accounts</div>
        </div>

        <div className="p-4 rounded-xl bg-blue-50/70 border border-blue-200 shadow-2xs">
          <div className="text-[11px] font-bold text-blue-700 uppercase tracking-wider">
            Total Customer Directory
          </div>
          <div className="text-2xl font-black text-blue-900 tabular-nums mt-1">
            {parties.length}
          </div>
          <div className="text-[11px] text-blue-700/80 mt-0.5">Retail & B2B parties</div>
        </div>

        <div className="p-4 rounded-xl bg-purple-50/70 border border-purple-200 shadow-2xs">
          <div className="text-[11px] font-bold text-purple-700 uppercase tracking-wider">
            Automated WhatsApp Reminders
          </div>
          <div className="text-2xl font-black text-purple-900 tabular-nums mt-1">
            UPI Active
          </div>
          <div className="text-[11px] text-purple-700/80 mt-0.5">Instant pay links configured</div>
        </div>
      </div>

      {/* Main Layout: Customer Directory + Ledger Drawer */}
      <div className="flex flex-col lg:flex-row gap-5">
        {/* Customer Directory Table (Left) */}
        <div className="flex-1 bg-surface rounded-xl border border-slate-200 shadow-xs overflow-hidden flex flex-col">
          <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="relative flex-1 w-full max-w-sm">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search customer by name or phone..."
                className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>

            <button
              onClick={() => setIsAddPartyModalOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>Add Customer</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="py-3 px-4">Customer Name</th>
                  <th className="py-3 px-4">Phone / GSTIN</th>
                  <th className="py-3 px-4 text-right">Outstanding Udhaar</th>
                  <th className="py-3 px-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {filteredParties.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-slate-400">
                      No customers found.
                    </td>
                  </tr>
                ) : (
                  filteredParties.map((p) => (
                    <tr
                      key={p.id}
                      onClick={() => setSelectedParty(p)}
                      className={`cursor-pointer transition-colors ${
                        selectedParty?.id === p.id ? 'bg-blue-50/80' : 'hover:bg-slate-50'
                      }`}
                    >
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900 text-sm">{p.name}</div>
                        <div className="text-[11px] text-slate-400">{p.address || 'Local'}</div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-mono text-slate-700">{p.phone || '-'}</div>
                        {p.gstin && (
                          <span className="text-[10px] bg-slate-100 px-1 py-0.5 rounded font-mono">
                            {p.gstin}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div
                          className={`text-sm font-extrabold tabular-nums ${
                            p.balance_paise > 0 ? 'text-amber-700' : 'text-slate-400'
                          }`}
                        >
                          {formatCurrency(p.balance_paise)}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                          {p.balance_paise > 0 && (
                            <>
                              <button
                                onClick={() => {
                                  setSelectedParty(p);
                                  setCollectAmountRupees((p.balance_paise / 100).toString());
                                  setIsCollectModalOpen(true);
                                }}
                                className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs"
                                title="Collect Cash/UPI"
                              >
                                Receive
                              </button>
                              <a
                                href={`https://wa.me/${p.phone || ''}?text=${encodeURIComponent(
                                  `Dear ${p.name}, greeting from ${
                                    shopProfile?.name || 'Shop'
                                  }. Your pending balance is ${formatCurrency(
                                    p.balance_paise
                                  )}. Please clear using UPI: upi://pay?pa=${
                                    shopProfile?.upi_id || 'merchant@bank'
                                  }&am=${(p.balance_paise / 100).toFixed(2)}`
                                )}`}
                                target="_blank"
                                rel="noreferrer"
                                className="p-1 rounded bg-slate-100 hover:bg-emerald-50 text-slate-600 hover:text-emerald-600"
                                title="Send WhatsApp Reminder"
                              >
                                <Share2 className="w-3.5 h-3.5" />
                              </a>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Ledger Transaction History (Right) */}
        <div className="w-full lg:w-96 bg-surface rounded-xl border border-slate-200 shadow-xs p-4 flex flex-col shrink-0">
          <div className="pb-3 border-b border-slate-200 mb-3">
            <h3 className="font-bold text-slate-900 text-sm">
              {selectedParty ? selectedParty.name : 'Select a Customer'}
            </h3>
            <p className="text-xs text-slate-500">
              {selectedParty
                ? `Total Due: ${formatCurrency(selectedParty.balance_paise)}`
                : 'Click any row on the left to view their detailed khata statement'}
            </p>
          </div>

          {selectedParty ? (
            <div className="flex-1 flex flex-col">
              <div className="flex-1 overflow-auto space-y-2 max-h-96 pr-1">
                {ledgerEntries.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-8">No ledger entries recorded yet.</p>
                ) : (
                  ledgerEntries.map((e) => (
                    <div
                      key={e.id}
                      className="p-2.5 rounded-lg border border-slate-100 bg-slate-50 text-xs flex justify-between items-center"
                    >
                      <div>
                        <div className="font-bold text-slate-800">
                          {e.direction === 'DEBIT' ? 'Invoice Issued (Udhaar)' : 'Payment Received'}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          {new Date(e.occurred_at).toLocaleDateString('en-IN')}
                        </div>
                        {e.notes && <div className="text-[11px] text-slate-500">{e.notes}</div>}
                      </div>
                      <div className="text-right">
                        <div
                          className={`font-black text-sm tabular-nums ${
                            e.direction === 'DEBIT' ? 'text-red-600' : 'text-emerald-600'
                          }`}
                        >
                          {e.direction === 'DEBIT' ? '+' : '-'} {formatCurrency(e.amount_paise)}
                        </div>
                        <span className="text-[10px] text-slate-400">
                          Bal: {formatCurrency(e.balance_after_paise)}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {selectedParty.balance_paise > 0 && (
                <div className="pt-3 border-t border-slate-200 mt-3">
                  <button
                    onClick={() => {
                      setCollectAmountRupees((selectedParty.balance_paise / 100).toString());
                      setIsCollectModalOpen(true);
                    }}
                    className="w-full py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-1.5"
                  >
                    <DollarSign className="w-4 h-4" />
                    <span>Receive Customer Payment</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-400 py-12 text-center">
              <BookOpen className="w-8 h-8 mb-2 opacity-50" />
              <p className="text-xs">No customer selected.</p>
            </div>
          )}
        </div>
      </div>

      {/* Collect Payment Modal */}
      {isCollectModalOpen && selectedParty && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-surface rounded-2xl shadow-2xl max-w-sm w-full p-6 border border-slate-200">
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-bold text-base text-slate-900">Receive Payment</h3>
              <button
                onClick={() => setIsCollectModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCollectPayment} className="space-y-4">
              <div>
                <span className="text-xs text-slate-500">Customer:</span>
                <div className="font-bold text-sm text-slate-900">{selectedParty.name}</div>
                <div className="text-xs text-amber-700 font-semibold mt-0.5">
                  Total Udhaar Balance: {formatCurrency(selectedParty.balance_paise)}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Amount Received (₹) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  autoFocus
                  value={collectAmountRupees}
                  onChange={(e) => setCollectAmountRupees(e.target.value)}
                  className="w-full text-xl font-bold p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-600 focus:outline-none tabular-nums"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Payment Mode
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setCollectMode('CASH')}
                    className={`py-2 rounded-lg text-xs font-bold border ${
                      collectMode === 'CASH'
                        ? 'border-blue-600 bg-blue-50 text-blue-700'
                        : 'border-slate-300 text-slate-700'
                    }`}
                  >
                    Cash
                  </button>
                  <button
                    type="button"
                    onClick={() => setCollectMode('UPI')}
                    className={`py-2 rounded-lg text-xs font-bold border ${
                      collectMode === 'UPI'
                        ? 'border-blue-600 bg-blue-50 text-blue-700'
                        : 'border-slate-300 text-slate-700'
                    }`}
                  >
                    UPI QR / NetBanking
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Notes / Ref</label>
                <input
                  type="text"
                  value={collectNotes}
                  onChange={(e) => setCollectNotes(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-lg text-xs"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5"
              >
                <CheckCircle className="w-4 h-4" />
                <span>Confirm & Record Receipt</span>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Add Customer Modal */}
      {isAddPartyModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-surface rounded-2xl shadow-2xl max-w-md w-full p-6 border border-slate-200">
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-bold text-base text-slate-900">Add New Customer</h3>
              <button
                onClick={() => setIsAddPartyModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddParty} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Customer Name *
                </label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. Ramesh Sen"
                  className="w-full p-2.5 border border-slate-300 rounded-lg text-xs font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Mobile Number (For WhatsApp Reminders)
                </label>
                <input
                  type="tel"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  placeholder="9830000000"
                  className="w-full p-2 border border-slate-300 rounded-lg text-xs font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  GSTIN (If B2B Registered Business)
                </label>
                <input
                  type="text"
                  value={newGstin}
                  onChange={(e) => setNewGstin(e.target.value)}
                  placeholder="19AAAPG1234A1Z5"
                  className="w-full p-2 border border-slate-300 rounded-lg text-xs font-mono uppercase"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Address / Landmark</label>
                <input
                  type="text"
                  value={newAddress}
                  onChange={(e) => setNewAddress(e.target.value)}
                  placeholder="Local locality / address"
                  className="w-full p-2 border border-slate-300 rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Opening Udhaar Balance (₹)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={newOpeningBalanceRupees}
                  onChange={(e) => setNewOpeningBalanceRupees(e.target.value)}
                  placeholder="0.00"
                  className="w-full p-2 border border-slate-300 rounded-lg text-xs font-bold text-amber-800"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md transition-all"
              >
                Save Customer to Directory
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
