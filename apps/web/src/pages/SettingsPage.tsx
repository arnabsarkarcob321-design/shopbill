import React, { useState, useEffect } from 'react';
import {
  Save,
  Shield,
  Download,
  Upload,
  Building,
  HardDrive,
  CheckCircle,
  Trash2,
  RefreshCw,
} from 'lucide-react';
import { db } from '../db';
import { clearDemoData, seedDemoData } from '../db/demoData';
import { GST_STATE_CODES } from '@shopbill/gst-engine';

interface SettingsPageProps {
  shopProfile: any;
  onUpdateShopProfile: (newProfile: any) => void;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({
  shopProfile,
  onUpdateShopProfile,
}) => {
  const [name, setName] = useState(shopProfile?.name || '');
  const [tagline, setTagline] = useState(shopProfile?.tagline || '');
  const [address, setAddress] = useState(shopProfile?.address || '');
  const [phone, setPhone] = useState(shopProfile?.phone || '');
  const [gstin, setGstin] = useState(shopProfile?.gstin || '');
  const [stateCode, setStateCode] = useState(shopProfile?.state_code || '19');
  const [taxScheme, setTaxScheme] = useState(shopProfile?.tax_scheme || 'REGULAR');
  const [prefix, setPrefix] = useState(shopProfile?.invoice_prefix || 'SB/26-27/');
  const [upiId, setUpiId] = useState(shopProfile?.upi_id || '');

  const [backupPassphrase, setBackupPassphrase] = useState('');
  const [restorePassphrase, setRestorePassphrase] = useState('');
  const [restoreFile, setRestoreFile] = useState<File | null>(null);
  const [isProcessingBackup, setIsProcessingBackup] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [storageEstimate, setStorageEstimate] = useState<{ usedMb: string; quotaMb: string } | null>(
    null
  );

  useEffect(() => {
    if (navigator.storage && navigator.storage.estimate) {
      navigator.storage.estimate().then((est) => {
        const used = ((est.usage || 0) / (1024 * 1024)).toFixed(1);
        const quota = ((est.quota || 0) / (1024 * 1024)).toFixed(0);
        setStorageEstimate({ usedMb: used, quotaMb: quota });
      });
    }
  }, []);

  const handleGstinChange = (val: string) => {
    const clean = val.toUpperCase().trim();
    setGstin(clean);
    if (clean.length >= 2) {
      const code = clean.substring(0, 2);
      if (code in GST_STATE_CODES) {
        setStateCode(code);
      }
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    const updated = {
      ...shopProfile,
      name: name.trim(),
      tagline: tagline.trim(),
      address: address.trim(),
      phone: phone.trim(),
      gstin: gstin.trim(),
      state_code: stateCode,
      state_name: GST_STATE_CODES[stateCode]?.name || 'West Bengal',
      tax_scheme: taxScheme,
      invoice_prefix: prefix.trim(),
      upi_id: upiId.trim(),
    };

    await db.meta.put({ key: 'shop_profile', value: updated });
    onUpdateShopProfile(updated);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  // Local AES-256-GCM Encrypted Backup Export
  const handleExportBackup = async () => {
    if (!backupPassphrase || backupPassphrase.length < 6) {
      alert('Please enter a strong backup passphrase (at least 6 characters).');
      return;
    }

    setIsProcessingBackup(true);
    try {
      const dump = {
        version: 1,
        exported_at: new Date().toISOString(),
        products: await db.products.toArray(),
        parties: await db.parties.toArray(),
        invoices: await db.invoices.toArray(),
        invoice_lines: await db.invoice_lines.toArray(),
        payments: await db.payments.toArray(),
        stock_movements: await db.stock_movements.toArray(),
        ledger_entries: await db.ledger_entries.toArray(),
        counters: await db.counters.toArray(),
        meta: await db.meta.toArray(),
      };

      const jsonStr = JSON.stringify(dump);
      const enc = new TextEncoder();
      const dataBytes = enc.encode(jsonStr);

      // Web Crypto API Key Derivation (PBKDF2 + AES-GCM)
      const salt = crypto.getRandomValues(new Uint8Array(16));
      const iv = crypto.getRandomValues(new Uint8Array(12));

      const keyMaterial = await crypto.subtle.importKey(
        'raw',
        enc.encode(backupPassphrase),
        'PBKDF2',
        false,
        ['deriveKey']
      );

      const aesKey = await crypto.subtle.deriveKey(
        {
          name: 'PBKDF2',
          salt,
          iterations: 100000,
          hash: 'SHA-256',
        },
        keyMaterial,
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt']
      );

      const encryptedContent = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv },
        aesKey,
        dataBytes
      );

      // Package payload: Salt (16) + IV (12) + Ciphertext
      const blobBytes = new Uint8Array(salt.length + iv.length + encryptedContent.byteLength);
      blobBytes.set(salt, 0);
      blobBytes.set(iv, salt.length);
      blobBytes.set(new Uint8Array(encryptedContent), salt.length + iv.length);

      const blob = new Blob([blobBytes], { type: 'application/octet-stream' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute(
        'download',
        `ShopBill_Backup_${new Date().toISOString().split('T')[0]}.shopbill.enc`
      );
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setBackupPassphrase('');
      alert('Encrypted backup successfully exported and downloaded!');
    } catch (err: any) {
      alert(`Backup error: ${err.message}`);
    } finally {
      setIsProcessingBackup(false);
    }
  };

  // Restore from Encrypted Backup File
  const handleRestoreBackup = async () => {
    if (!restoreFile || !restorePassphrase) {
      alert('Please select the .shopbill.enc file and enter the passphrase.');
      return;
    }

    if (!confirm('Restoring will replace all current database records. Proceed?')) {
      return;
    }

    setIsProcessingBackup(true);
    try {
      const buffer = await restoreFile.arrayBuffer();
      const salt = new Uint8Array(buffer.slice(0, 16));
      const iv = new Uint8Array(buffer.slice(16, 28));
      const ciphertext = buffer.slice(28);

      const enc = new TextEncoder();
      const keyMaterial = await crypto.subtle.importKey(
        'raw',
        enc.encode(restorePassphrase),
        'PBKDF2',
        false,
        ['deriveKey']
      );

      const aesKey = await crypto.subtle.deriveKey(
        {
          name: 'PBKDF2',
          salt,
          iterations: 100000,
          hash: 'SHA-256',
        },
        keyMaterial,
        { name: 'AES-GCM', length: 256 },
        false,
        ['decrypt']
      );

      const decrypted = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv },
        aesKey,
        ciphertext
      );

      const dec = new TextDecoder();
      const jsonStr = dec.decode(decrypted);
      const dump = JSON.parse(jsonStr);

      if (!dump.version || !dump.products || !dump.invoices) {
        throw new Error('Invalid or corrupted ShopBill backup structure.');
      }

      await db.transaction(
        'rw',
        [
          db.products,
          db.parties,
          db.invoices,
          db.invoice_lines,
          db.payments,
          db.stock_movements,
          db.ledger_entries,
          db.counters,
          db.meta,
        ],
        async () => {
          await db.products.clear();
          await db.parties.clear();
          await db.invoices.clear();
          await db.invoice_lines.clear();
          await db.payments.clear();
          await db.stock_movements.clear();
          await db.ledger_entries.clear();
          await db.counters.clear();

          for (const p of dump.products) await db.products.put(p);
          for (const pt of dump.parties) await db.parties.put(pt);
          for (const inv of dump.invoices) await db.invoices.put(inv);
          for (const l of dump.invoice_lines) await db.invoice_lines.put(l);
          for (const pmt of dump.payments) await db.payments.put(pmt);
          for (const sm of dump.stock_movements) await db.stock_movements.put(sm);
          for (const le of dump.ledger_entries) await db.ledger_entries.put(le);
          for (const c of dump.counters) await db.counters.put(c);
          for (const m of dump.meta) await db.meta.put(m);
        }
      );

      alert('Database successfully restored from backup! The app will now reload.');
      window.location.reload();
    } catch (err: any) {
      alert(`Restore failed: ${err.message || 'Incorrect passphrase or corrupted file.'}`);
    } finally {
      setIsProcessingBackup(false);
    }
  };

  return (
    <div className="flex-1 p-4 md:p-6 bg-canvas overflow-auto space-y-6">
      {/* Page Title */}
      <div>
        <h2 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">
          Shop Settings & Security
        </h2>
        <p className="text-xs text-slate-500 font-medium">
          Configure business identity, tax registration, UPI payments, and encrypted backups
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Business Profile Form */}
        <div className="lg:col-span-2 bg-surface rounded-2xl border border-slate-200 shadow-xs p-5 md:p-6">
          <div className="flex items-center gap-2.5 pb-4 border-b border-slate-200 mb-5">
            <Building className="w-5 h-5 text-blue-600" />
            <h3 className="font-bold text-slate-900 text-sm">Shop & GST Identity</h3>
          </div>

          <form onSubmit={handleSaveProfile} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Shop Name (Appears on Bills) *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Gupta Kirana & General Store"
                className="w-full p-2.5 border border-slate-300 rounded-lg text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Tagline / Slogan
              </label>
              <input
                type="text"
                value={tagline}
                onChange={(e) => setTagline(e.target.value)}
                placeholder="e.g. Your Trusted Daily Store"
                className="w-full p-2 border border-slate-300 rounded-lg text-xs"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Phone *</label>
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-lg text-xs font-mono font-bold"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Tax Scheme
                </label>
                <select
                  value={taxScheme}
                  onChange={(e) => setTaxScheme(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-lg text-xs font-bold text-slate-700"
                >
                  <option value="REGULAR">Regular Taxpayer (Issues Tax Invoices)</option>
                  <option value="COMPOSITION">Composition Scheme (Issues Bill of Supply)</option>
                  <option value="UNREGISTERED">Unregistered / Small Shop</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  GSTIN (If Registered)
                </label>
                <input
                  type="text"
                  value={gstin}
                  onChange={(e) => handleGstinChange(e.target.value)}
                  placeholder="19AAAPG1234A1Z5"
                  className="w-full p-2 border border-slate-300 rounded-lg text-xs font-mono uppercase font-bold"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  State / Jurisdiction
                </label>
                <select
                  value={stateCode}
                  onChange={(e) => setStateCode(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-lg text-xs font-semibold"
                >
                  {Object.entries(GST_STATE_CODES).map(([code, meta]) => (
                    <option key={code} value={code}>
                      {code} - {meta.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Shop Address</label>
              <textarea
                rows={2}
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Shop street address, market name, city, pin code"
                className="w-full p-2 border border-slate-300 rounded-lg text-xs"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Invoice Number Prefix
                </label>
                <input
                  type="text"
                  value={prefix}
                  onChange={(e) => setPrefix(e.target.value)}
                  placeholder="SB/26-27/"
                  className="w-full p-2 border border-slate-300 rounded-lg text-xs font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Shop UPI ID (For Dynamic QR on Bill)
                </label>
                <input
                  type="text"
                  value={upiId}
                  onChange={(e) => setUpiId(e.target.value)}
                  placeholder="name@okaxis / shop@icici"
                  className="w-full p-2 border border-slate-300 rounded-lg text-xs font-mono font-bold"
                />
              </div>
            </div>

            <div className="pt-2 flex items-center justify-between">
              {savedSuccess ? (
                <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-600">
                  <CheckCircle className="w-4 h-4" />
                  Settings saved successfully!
                </span>
              ) : (
                <span></span>
              )}

              <button
                type="submit"
                className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md transition-all flex items-center gap-1.5"
              >
                <Save className="w-4 h-4" />
                <span>Save Changes</span>
              </button>
            </div>
          </form>
        </div>

        {/* Right Col: Encrypted Backup & Storage Health */}
        <div className="space-y-6">
          {/* Encrypted Backup Panel */}
          <div className="bg-surface rounded-2xl border border-slate-200 shadow-xs p-5">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-200 mb-3 text-slate-900 font-bold text-sm">
              <Shield className="w-4 h-4 text-emerald-600" />
              <span>Encrypted Local Backup (.enc)</span>
            </div>
            <p className="text-xs text-slate-500 mb-4">
              Export an authenticated AES-256-GCM encrypted archive to protect against hardware failure or lost devices.
            </p>

            <div className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Backup Passphrase (Min 6 chars)
                </label>
                <input
                  type="password"
                  value={backupPassphrase}
                  onChange={(e) => setBackupPassphrase(e.target.value)}
                  placeholder="Enter strong password..."
                  className="w-full p-2 border border-slate-300 rounded-lg text-xs"
                />
              </div>

              <button
                disabled={isProcessingBackup || backupPassphrase.length < 6}
                onClick={handleExportBackup}
                className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2"
              >
                <Download className="w-4 h-4 text-emerald-400" />
                <span>Export Encrypted Backup</span>
              </button>
            </div>

            {/* Restore Section */}
            <div className="mt-5 pt-4 border-t border-slate-200">
              <span className="block text-xs font-bold text-slate-900 mb-2">
                Restore from Backup
              </span>
              <div className="space-y-2">
                <input
                  type="file"
                  accept=".enc"
                  onChange={(e) => setRestoreFile(e.target.files?.[0] || null)}
                  className="w-full text-xs text-slate-500 file:mr-2 file:py-1 file:px-2 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-slate-100"
                />
                <input
                  type="password"
                  value={restorePassphrase}
                  onChange={(e) => setRestorePassphrase(e.target.value)}
                  placeholder="Passphrase used during export..."
                  className="w-full p-2 border border-slate-300 rounded-lg text-xs"
                />
                <button
                  disabled={!restoreFile || !restorePassphrase || isProcessingBackup}
                  onClick={handleRestoreBackup}
                  className="w-full py-2 rounded-xl bg-amber-600 hover:bg-amber-700 disabled:opacity-40 text-white font-bold text-xs transition-all flex items-center justify-center gap-1.5"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Decrypt & Restore Shop</span>
                </button>
              </div>
            </div>
          </div>

          {/* Storage Quota Panel */}
          {storageEstimate && (
            <div className="bg-surface rounded-2xl border border-slate-200 shadow-xs p-5 text-xs">
              <div className="flex items-center gap-2 font-bold text-slate-900 mb-2">
                <HardDrive className="w-4 h-4 text-slate-500" />
                <span>Device Storage Allocation</span>
              </div>
              <div className="flex justify-between text-slate-600 mb-1.5">
                <span>Database Usage:</span>
                <span className="font-bold tabular-nums text-slate-900">
                  {storageEstimate.usedMb} MB / {storageEstimate.quotaMb} MB
                </span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                <div className="bg-blue-600 h-2 rounded-full w-[2%]"></div>
              </div>
              <p className="text-[10px] text-slate-400 mt-2">
                Storage persistence requested via navigator.storage.persist().
              </p>
            </div>
          )}

          {/* Demo Data & Store Reset */}
          <div className="bg-surface rounded-2xl border border-slate-200 shadow-xs p-5 text-xs">
            <div className="flex items-center gap-2 font-bold text-slate-900 mb-2">
              <Trash2 className="w-4 h-4 text-rose-500" />
              <span>Store Data & Demo Mode</span>
            </div>
            <p className="text-slate-500 mb-4 leading-relaxed">
              Clear demo products, sample khata debtor accounts, and test invoices to start taking real customer payments with a clean slate.
            </p>
            <div className="flex flex-col gap-2">
              <button
                onClick={async () => {
                  if (confirm('Are you sure you want to clear all demo data and start with a fresh blank store?')) {
                    await clearDemoData();
                    window.location.reload();
                  }
                }}
                className="w-full py-2.5 px-3 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 font-bold text-xs transition-colors flex items-center justify-center gap-2"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear Demo Data (Start Fresh Store)</span>
              </button>
              <button
                onClick={async () => {
                  if (confirm('Load demo kirana & pharmacy products, dummy customers, and sample bills?')) {
                    await seedDemoData();
                    window.location.reload();
                  }
                }}
                className="w-full py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition-colors flex items-center justify-center gap-2"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Re-Load Demo Store Data</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
