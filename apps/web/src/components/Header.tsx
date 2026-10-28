import React from 'react';
import { ShieldCheck, Database, Languages, Zap } from 'lucide-react';
import { clearDemoData, seedDemoData } from '../db/demoData';
import { SupportedLanguage } from '@shopbill/i18n';

interface HeaderProps {
  currentLang: SupportedLanguage;
  onLanguageChange: (lang: SupportedLanguage) => void;
  shopName: string;
  isDemoMode: boolean;
  onReloadData: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentLang,
  onLanguageChange,
  shopName,
  isDemoMode,
  onReloadData,
}) => {
  const handleToggleDemo = async () => {
    if (isDemoMode) {
      if (confirm('Are you sure you want to clear demo data and start your real shop?')) {
        await clearDemoData();
        onReloadData();
        window.location.reload();
      }
    } else {
      if (confirm('Load demo products, customers and transactions?')) {
        await seedDemoData();
        onReloadData();
        window.location.reload();
      }
    }
  };

  return (
    <header className="h-16 bg-surface border-b border-slate-200 px-4 md:px-6 flex items-center justify-between sticky top-0 z-20 shadow-sm no-print">
      {/* Brand & Active Shop */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center text-white font-black text-lg shadow-sm shadow-blue-500/30">
          SB
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-bold text-slate-900 tracking-tight text-base md:text-lg">
              ShopBill
            </h1>
            <span className="text-[10px] font-semibold tracking-wider uppercase px-2 py-0.5 rounded bg-blue-100 text-blue-700">
              GST POS v1.0
            </span>
          </div>
          <p className="text-xs text-slate-500 font-medium truncate max-w-[180px] md:max-w-xs">
            {shopName || 'My Store'}
          </p>
        </div>
      </div>

      {/* Trust & Status Pills */}
      <div className="flex items-center gap-2 md:gap-3">
        {/* Offline Safe Indicator */}
        <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold shadow-xs">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          <span>Offline Safe • Live</span>
        </div>

        {/* Demo Mode Toggle Banner Pill */}
        {isDemoMode ? (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 border border-amber-300 text-amber-800 text-xs font-semibold">
            <Zap className="w-3.5 h-3.5 text-amber-600 fill-amber-500" />
            <span className="hidden md:inline">Demo Data</span>
            <button
              onClick={handleToggleDemo}
              className="ml-1 text-[11px] underline font-bold hover:text-amber-950 transition-colors"
              title="Clear demo data to begin real shop operations"
            >
              [Clear]
            </button>
          </div>
        ) : (
          <button
            onClick={handleToggleDemo}
            className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-medium transition-colors"
          >
            <Database className="w-3.5 h-3.5" />
            <span>Load Demo Data</span>
          </button>
        )}

        {/* Language Selector */}
        <div className="flex items-center gap-1 bg-slate-100 border border-slate-200 rounded-lg p-1">
          <Languages className="w-3.5 h-3.5 text-slate-500 ml-1.5" />
          <select
            value={currentLang}
            onChange={(e) => onLanguageChange(e.target.value as SupportedLanguage)}
            className="bg-transparent text-xs font-bold text-slate-700 py-0.5 px-1.5 rounded focus:outline-none cursor-pointer"
          >
            <option value="en">English (EN)</option>
            <option value="hi">हिन्दी (HI)</option>
            <option value="bn">বাংলা (BN)</option>
          </select>
        </div>
      </div>
    </header>
  );
};
