/**
 * Multilingual Translations for ShopBill UI (English, Hindi, Bengali).
 * Matches UI/UX Design System Specification (LOC-1, TR-CLI-9).
 */

export type SupportedLanguage = 'en' | 'hi' | 'bn';

export interface TranslationDictionary {
  appName: string;
  tagline: string;
  // Navigation & Tabs
  navPos: string;
  navProducts: string;
  navKhata: string;
  navReports: string;
  navMore: string;
  // Common Actions
  save: string;
  cancel: string;
  delete: string;
  edit: string;
  search: string;
  clear: string;
  confirm: string;
  print: string;
  share: string;
  download: string;
  close: string;
  // POS Terminal
  posTitle: string;
  newBill: string;
  holdBill: string;
  heldBills: string;
  resumeBill: string;
  collectPayment: string;
  quickCash: string;
  walkInCustomer: string;
  addCustomer: string;
  item: string;
  qty: string;
  rate: string;
  discount: string;
  taxable: string;
  gst: string;
  cess: string;
  total: string;
  taxSummary: string;
  subtotal: string;
  roundOff: string;
  grandTotal: string;
  // Payments
  paymentMode: string;
  cash: string;
  upi: string;
  card: string;
  credit: string;
  cheque: string;
  amountTendered: string;
  changeDue: string;
  // Statuses
  offlineSafe: string;
  demoMode: string;
  synced: string;
  pendingSync: string;
  inStock: string;
  lowStock: string;
  outOfStock: string;
}

export const translations: Record<SupportedLanguage, TranslationDictionary> = {
  en: {
    appName: 'ShopBill',
    tagline: 'Offline-first GST Billing & Inventory',
    navPos: 'Billing POS',
    navProducts: 'Products',
    navKhata: 'Udhaar Khata',
    navReports: 'GST Reports',
    navMore: 'More',
    save: 'Save',
    cancel: 'Cancel',
    delete: 'Delete',
    edit: 'Edit',
    search: 'Search products, barcode, customer...',
    clear: 'Clear',
    confirm: 'Confirm',
    print: 'Print',
    share: 'Share',
    download: 'Download',
    close: 'Close',
    posTitle: 'Point of Sale',
    newBill: 'New Bill',
    holdBill: 'Hold Bill',
    heldBills: 'Held Bills',
    resumeBill: 'Resume',
    collectPayment: 'Collect Payment',
    quickCash: 'Quick Cash',
    walkInCustomer: 'Walk-in Customer',
    addCustomer: 'Add Customer',
    item: 'Item',
    qty: 'Qty',
    rate: 'Price',
    discount: 'Disc',
    taxable: 'Taxable',
    gst: 'GST',
    cess: 'Cess',
    total: 'Total',
    taxSummary: 'Tax Breakdown',
    subtotal: 'Subtotal',
    roundOff: 'Round-off',
    grandTotal: 'Grand Total',
    paymentMode: 'Payment Mode',
    cash: 'Cash',
    upi: 'UPI QR',
    card: 'Card',
    credit: 'Udhaar / Credit',
    cheque: 'Cheque',
    amountTendered: 'Cash Tendered',
    changeDue: 'Change Due',
    offlineSafe: 'Offline Safe',
    demoMode: 'Demo Data Mode',
    synced: 'Cloud Synced',
    pendingSync: 'Sync Outbox',
    inStock: 'In Stock',
    lowStock: 'Low Stock',
    outOfStock: 'Out of Stock',
  },
  hi: {
    appName: 'शॉपबिल',
    tagline: 'ऑफ़लाइन जीएसटी बिलिंग और इन्वेंट्री',
    navPos: 'बिलिंग POS',
    navProducts: 'सामान (प्रोडक्ट्स)',
    navKhata: 'उधार खाता',
    navReports: 'जीएसटी रिपोर्ट्स',
    navMore: 'अन्य',
    save: 'सहेजें',
    cancel: 'रद्द करें',
    delete: 'हटाएं',
    edit: 'संपादित करें',
    search: 'सामान, बारकोड या ग्राहक खोजें...',
    clear: 'साफ़ करें',
    confirm: 'पुष्टि करें',
    print: 'प्रिंट करें',
    share: 'शेयर करें',
    download: 'डाउनलोड',
    close: 'बंद करें',
    posTitle: 'काउंटर बिलिंग',
    newBill: 'नया बिल',
    holdBill: 'बिल रोकें (Hold)',
    heldBills: 'रुके हुए बिल',
    resumeBill: 'फिर शुरू करें',
    collectPayment: 'भुगतान लें',
    quickCash: 'नकद प्रिंट',
    walkInCustomer: 'काउंटर ग्राहक',
    addCustomer: 'ग्राहक जोड़ें',
    item: 'सामान',
    qty: 'मात्रा',
    rate: 'मूल्य',
    discount: 'छूट',
    taxable: 'कर योग्य',
    gst: 'जीएसटी',
    cess: 'सेस',
    total: 'कुल योग',
    taxSummary: 'टैक्स विवरण',
    subtotal: 'उप-योग',
    roundOff: 'राउंड ऑफ',
    grandTotal: 'कुल देय राशि',
    paymentMode: 'भुगतान का तरीका',
    cash: 'नकद',
    upi: 'यूपीआई QR',
    card: 'कार्ड',
    credit: 'उधार (खाता)',
    cheque: 'चेक',
    amountTendered: 'प्राप्त नकद',
    changeDue: 'वापस देने योग्य',
    offlineSafe: 'ऑफ़लाइन सुरक्षित',
    demoMode: 'डेमो मोड',
    synced: 'क्लाउड सिंक',
    pendingSync: 'सिंक कतार',
    inStock: 'उपलब्ध स्टॉक',
    lowStock: 'कम स्टॉक',
    outOfStock: 'स्टॉक समाप्त',
  },
  bn: {
    appName: 'শপবিল',
    tagline: 'অফলাইন জিএসটি বিলিং ও স্টক খাতা',
    navPos: 'বিলিং POS',
    navProducts: 'পণ্য তালিকা',
    navKhata: 'বাকি খাতা',
    navReports: 'জিএসটি রিপোর্ট',
    navMore: 'অন্যান্য',
    save: 'সংরক্ষণ',
    cancel: 'বাতিল',
    delete: 'মুছুন',
    edit: 'সম্পাদনা',
    search: 'পণ্য, বারকোড বা ক্রেতা খুঁজুন...',
    clear: 'পরিষ্কার',
    confirm: 'নিশ্চিত করুন',
    print: 'প্রিন্ট',
    share: 'শেয়ার',
    download: 'ডাউনলোড',
    close: 'বন্ধ করুন',
    posTitle: 'কাউন্টার বিলিং',
    newBill: 'নতুন বিল',
    holdBill: 'বিল হোল্ড করুন',
    heldBills: 'হোল্ড করা বিল',
    resumeBill: 'পুনরায় শুরু',
    collectPayment: 'টাকা গ্রহণ',
    quickCash: 'নগদ প্রিন্ট',
    walkInCustomer: 'সাধারণ ক্রেতা',
    addCustomer: 'ক্রেতা যোগ করুন',
    item: 'পণ্য',
    qty: 'পরিমাণ',
    rate: 'দাম',
    discount: 'ছাড়',
    taxable: 'করযোগ্য মূল্য',
    gst: 'জিএসটি',
    cess: 'সেস',
    total: 'মোট',
    taxSummary: 'ট্যাক্স বিবরণ',
    subtotal: 'মোট দাম',
    roundOff: 'রাউন্ড অফ',
    grandTotal: 'সর্বমোট প্রদেয়',
    paymentMode: 'পেমেন্ট মাধ্যম',
    cash: 'নগদ',
    upi: 'ইউপিআই QR',
    card: 'কার্ড',
    credit: 'বাকি খাতা',
    cheque: 'চেক',
    amountTendered: 'প্রাপ্ত নগদ',
    changeDue: 'ফেরত টাকা',
    offlineSafe: 'অফলাইন নিরাপদ',
    demoMode: 'ডেমো মোড',
    synced: 'ক্লাউড সিঙ্কড',
    pendingSync: 'সিঙ্ক অপেক্ষমান',
    inStock: 'মজুদ আছে',
    lowStock: 'স্বল্প স্টক',
    outOfStock: 'স্টক শেষ',
  },
};
