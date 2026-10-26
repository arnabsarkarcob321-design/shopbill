import React from 'react';
import { ShoppingCart, Package, BookOpen, BarChart3, Settings } from 'lucide-react';
import { translations, SupportedLanguage } from '@shopbill/i18n';

export type NavTab = 'pos' | 'products' | 'ledgers' | 'reports' | 'settings';

interface SidebarProps {
  activeTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  lang: SupportedLanguage;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, onSelectTab, lang }) => {
  const t = translations[lang];

  const items = [
    { id: 'pos' as NavTab, label: t.navPos, icon: ShoppingCart, shortcut: 'F1' },
    { id: 'products' as NavTab, label: t.navProducts, icon: Package, shortcut: 'F2' },
    { id: 'ledgers' as NavTab, label: t.navKhata, icon: BookOpen, shortcut: 'F3' },
    { id: 'reports' as NavTab, label: t.navReports, icon: BarChart3, shortcut: 'F4' },
    { id: 'settings' as NavTab, label: 'Settings & Backup', icon: Settings, shortcut: 'F5' },
  ];

  return (
    <>
      {/* Desktop Left Navigation Rail (Dark Navy-Slate #0F172A) */}
      <aside className="hidden md:flex flex-col w-60 bg-sidebar text-slate-300 min-h-[calc(100vh-4rem)] p-3 border-r border-slate-800 shrink-0 no-print">
        <div className="space-y-1.5 flex-1">
          {items.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSelectTab(item.id)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-900/40'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </div>
                <span
                  className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                    isActive ? 'bg-blue-700 text-blue-100' : 'bg-slate-800 text-slate-500'
                  }`}
                >
                  {item.shortcut}
                </span>
              </button>
            );
          })}
        </div>

        {/* Bottom System Status Widget */}
        <div className="p-3 bg-slate-800/60 rounded-xl border border-slate-700/60 text-xs">
          <div className="flex items-center justify-between font-semibold text-slate-300 mb-1">
            <span>Local Storage</span>
            <span className="text-emerald-400">Persistent</span>
          </div>
          <div className="w-full bg-slate-700 rounded-full h-1.5 overflow-hidden">
            <div className="bg-emerald-500 h-1.5 rounded-full w-1/6"></div>
          </div>
          <p className="text-[10px] text-slate-400 mt-1.5">IndexedDB local engine active</p>
        </div>
      </aside>

      {/* Mobile Bottom Navigation Bar for Android Screens */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-surface border-t border-slate-200 z-30 flex items-center justify-around py-1.5 px-2 shadow-lg no-print">
        {items.slice(0, 4).map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`flex flex-col items-center py-1 px-3 rounded-lg text-xs font-semibold ${
                isActive ? 'text-blue-600' : 'text-slate-500'
              }`}
            >
              <Icon className="w-5 h-5 mb-0.5" />
              <span className="text-[11px] truncate max-w-[70px]">{item.label}</span>
            </button>
          );
        })}
        <button
          onClick={() => onSelectTab('settings')}
          className={`flex flex-col items-center py-1 px-3 rounded-lg text-xs font-semibold ${
            activeTab === 'settings' ? 'text-blue-600' : 'text-slate-500'
          }`}
        >
          <Settings className="w-5 h-5 mb-0.5" />
          <span className="text-[11px]">Settings</span>
        </button>
      </nav>
    </>
  );
};
