import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { Sidebar, NavTab } from './components/Sidebar';
import { PosPage } from './pages/PosPage';
import { ProductsPage } from './pages/ProductsPage';
import { LedgersPage } from './pages/LedgersPage';
import { ReportsPage } from './pages/ReportsPage';
import { SettingsPage } from './pages/SettingsPage';
import { GstRegisterPage } from './pages/GstRegisterPage';
import { BankReconciliationPage } from './pages/BankReconciliationPage';
import { db } from './db';
import { seedDemoData } from './db/demoData';
import { SupportedLanguage } from '@shopbill/i18n';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<any>('pos');
  const [currentLang, setCurrentLang] = useState<SupportedLanguage>('en');
  const [shopProfile, setShopProfile] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadProfile = async () => {
    try {
      if (navigator.storage && navigator.storage.persist) {
        navigator.storage.persist().catch(() => {});
      }

      const meta = await db.meta.get('shop_profile');
      if (meta && meta.value) {
        setShopProfile(meta.value);
        if (meta.value.language) {
          setCurrentLang(meta.value.language);
        }
      } else {
        const wasCleared = localStorage.getItem('shopbill_demo_cleared');
        if (!wasCleared) {
          await seedDemoData();
          const seededMeta = await db.meta.get('shop_profile');
          if (seededMeta && seededMeta.value) {
            setShopProfile(seededMeta.value);
          }
        } else {
          const freshProfile = {
            name: 'My Store',
            demo_mode: false,
            language: 'en',
          };
          setShopProfile(freshProfile);
        }
      }
    } catch (err) {
      console.error('Initialization error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F1') {
        e.preventDefault();
        setActiveTab('pos');
      } else if (e.key === 'F2') {
        e.preventDefault();
        setActiveTab('products');
      } else if (e.key === 'F3') {
        e.preventDefault();
        setActiveTab('ledgers');
      } else if (e.key === 'F4') {
        e.preventDefault();
        setActiveTab('reports');
      } else if (e.key === 'F5') {
        e.preventDefault();
        setActiveTab('settings');
      } else if (e.key === 'F6') {
        e.preventDefault();
        setActiveTab('gst-register');
      } else if (e.key === 'F7') {
        e.preventDefault();
        setActiveTab('bank-rec');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  if (isLoading) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-slate-900 text-white">
        <div className="w-12 h-12 rounded-xl bg-blue-600 flex items-center justify-center font-black text-2xl shadow-lg shadow-blue-500/30 animate-pulse mb-4">
          SB
        </div>
        <h2 className="text-lg font-bold">ShopBill GST Engine</h2>
        <p className="text-xs text-slate-400 mt-1">Initializing offline database...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-canvas text-slate-900">
      <Header
        currentLang={currentLang}
        onLanguageChange={(l) => {
          setCurrentLang(l);
          if (shopProfile) {
            const updated = { ...shopProfile, language: l };
            setShopProfile(updated);
            db.meta.put({ key: 'shop_profile', value: updated });
          }
        }}
        shopName={shopProfile?.name}
        isDemoMode={Boolean(shopProfile?.demo_mode)}
        onReloadData={loadProfile}
      />

      <div className="flex-1 flex overflow-hidden">
        <Sidebar activeTab={activeTab as NavTab} onSelectTab={(tab) => setActiveTab(tab)} lang={currentLang} />

        <main className="flex-1 flex flex-col overflow-hidden pb-16 md:pb-0">
          {activeTab === 'pos' && <PosPage shopProfile={shopProfile} />}
          {activeTab === 'products' && <ProductsPage onNavigateToPos={() => setActiveTab('pos')} />}
          {activeTab === 'ledgers' && <LedgersPage shopProfile={shopProfile} />}
          {activeTab === 'reports' && <ReportsPage shopProfile={shopProfile} />}
          {activeTab === 'settings' && (
            <SettingsPage shopProfile={shopProfile} onUpdateShopProfile={setShopProfile} />
          )}
          {activeTab === 'gst-register' && <GstRegisterPage />}
          {activeTab === 'bank-rec' && <BankReconciliationPage />}
        </main>
      </div>
    </div>
  );
};