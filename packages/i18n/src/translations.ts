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
  // Reports & Day Close
  reportsTitle: string;
  reportsSubtitle: string;
  exportCsvRegister: string;
  dayCloseTitle: string;
  dayCloseSubtitle: string;
  lockDrawerSession: string;
  salesRegisterTitle: string;
  colInvoice: string;
  colDateTime: string;
  colParty: string;
  colTaxable: string;
  colTaxes: string;
  colGrandTotal: string;
  colPayment: string;
  colStatus: string;
  colAction: string;
  cancelInvoiceTitle: string;
  cancelInvoiceReason: string;
  // Sidebar & Day Close details
  navSettings: string;
  settingsShort: string;
  openingDrawerCash: string;
  todaysCashSales: string;
  expectedCashInDrawer: string;
  actualCashCount: string;
  sessionCloseNotesPlaceholder: string;
  statusFinalized: string;
  // Products & Live Stock
  productsTitle: string;
  productsSubtitle: string;
  addNewProduct: string;
  editProductTitle: string;
  searchProductsPlaceholder: string;
  prodColItemBarcode: string;
  prodColCategory: string;
  prodColHsn: string;
  prodColGstRate: string;
  prodColSellingPrice: string;
  prodColStockOnHand: string;
  prodColStatus: string;
  prodColAction: string;
  statusAvailable: string;
  // Udhaar Khata (Ledgers)
  searchCustomerPlaceholder: string;
  addCustomerBtn: string;
  addNewCustomerTitle: string;
  ledgerColCustomerName: string;
  ledgerColPhoneGstin: string;
  ledgerColOutstanding: string;
  ledgerColAction: string;
  receiveBtn: string;
  receiveCustomerPayment: string;
  receivePaymentTitle: string;
  selectCustomerTitle: string;
  noCustomerSelected: string;
  noLedgerEntries: string;
  invoiceIssuedUdhaar: string;
  paymentReceivedText: string;
  amountReceivedLabel: string;
  // Remaining polish keys for Ledgers, Products & Reports
  totalCustomerDirectory: string;
  clickRowKhataHint: string;
  allCategoriesOption: string;
  openingPlusCashBills: string;
  turnoverLabel: string;
  // Settings & Backup
  settingsPageTitle: string;
  shopGstIdentityTitle: string;
  shopNameLabel: string;
  shopNamePlaceholder: string;
  taglineLabel: string;
  taglinePlaceholder: string;
  phoneRequiredLabel: string;
  taxSchemeLabel: string;
  gstinIfRegisteredLabel: string;
  stateJurisdictionLabel: string;
  shopAddressLabel: string;
  shopAddressPlaceholder: string;
  invoicePrefixLabel: string;
  shopUpiIdLabel: string;
  shopUpiPlaceholder: string;
  backupPassphraseLabel: string;
  backupPassphrasePlaceholder: string;
  restorePassphrasePlaceholder: string;
  // Billing POS
  posSearchPlaceholder: string;
  posColItemDesc: string;
  posColQuantity: string;
  posColPrice: string;
  posColTotal: string;
  posBillSummaryTitle: string;
  posSelectCustomerTitle: string;
  posHeldBillsTitle: string;
  // Remaining Billing POS labels
  posWalkInCustomer: string;
  posWalkInDefaultCash: string;
  posHeldBillsCount: string;
  posHoldF8: string;
  posShortcutPayF9: string;
  posShortcutQuickCashF10: string;
  posGrossTaxableSubtotal: string;
  posInvoiceDiscountPct: string;
  posRoundOff: string;
  posTotalAmountDue: string;
  posCollectPaymentF9: string;
  posQuickCashPrintF10: string;
  // Badges & remaining screen labels
  posEmptyCartTitle: string;
  posShortcutHoldF8: string;
  ledgerTotalOutstandingBadge: string;
  ledgerCustomersWithDuesBadge: string;
  ledgerWhatsappRemindersBadge: string;
  settingsEncryptedBackupTitle: string;
  settingsExportEncryptedBtn: string;
  settingsRestoreBackupTitle: string;
  settingsDecryptRestoreBtn: string;
  settingsClearDemoBtn: string;
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
    reportsTitle: 'Reports & Day Close Drawer',
    reportsSubtitle: 'Cash drawer audit, monthly 7-tab CA GST pack, and sales register',
    exportCsvRegister: 'Export CA / GST Register (.csv)',
    dayCloseTitle: 'Day Close Cash Drawer Reconciliation',
    dayCloseSubtitle: 'Verify physically counted drawer cash against recorded transactions',
    lockDrawerSession: "Lock Today's Drawer Session",
    salesRegisterTitle: 'Sales & Tax Invoices Register',
    colInvoice: 'Invoice #',
    colDateTime: 'Date / Time',
    colParty: 'Party',
    colTaxable: 'Taxable',
    colTaxes: 'Taxes',
    colGrandTotal: 'Grand Total',
    colPayment: 'Payment',
    colStatus: 'Status',
    colAction: 'Action',
    cancelInvoiceTitle: 'Cancel Invoice',
    cancelInvoiceReason: 'Mandatory Reason for Cancellation *',
    navSettings: 'Settings & Backup',
    settingsShort: 'Settings',
    openingDrawerCash: 'Opening Drawer Cash',
    todaysCashSales: "Today's Cash Sales",
    expectedCashInDrawer: 'Expected Cash in Drawer',
    actualCashCount: 'Actual Cash Count (₹)',
    sessionCloseNotesPlaceholder: 'Session close notes / remarks (optional)',
    statusFinalized: 'Finalized',
    productsTitle: 'Products & Live Stock',
    productsSubtitle: 'Manage catalogue, barcode SKUs, HSN codes, and stock thresholds',
    addNewProduct: 'Add New Product [F2]',
    editProductTitle: 'Edit Product',
    searchProductsPlaceholder: 'Search by product name, barcode, SKU or HSN...',
    prodColItemBarcode: 'Item Name / Barcode',
    prodColCategory: 'Category',
    prodColHsn: 'HSN Code',
    prodColGstRate: 'GST Rate',
    prodColSellingPrice: 'Selling Price',
    prodColStockOnHand: 'Stock On Hand',
    prodColStatus: 'Status',
    prodColAction: 'Action',
    statusAvailable: 'Available',
    searchCustomerPlaceholder: 'Search customer by name or phone...',
    addCustomerBtn: 'Add Customer',
    addNewCustomerTitle: 'Add New Customer',
    ledgerColCustomerName: 'Customer Name',
    ledgerColPhoneGstin: 'Phone / GSTIN',
    ledgerColOutstanding: 'Outstanding Udhaar',
    ledgerColAction: 'Action',
    receiveBtn: 'Receive',
    receiveCustomerPayment: 'Receive Customer Payment',
    receivePaymentTitle: 'Receive Payment',
    selectCustomerTitle: 'Select a Customer',
    noCustomerSelected: 'No customer selected.',
    noLedgerEntries: 'No ledger entries recorded yet.',
    invoiceIssuedUdhaar: 'Invoice Issued (Udhaar)',
    paymentReceivedText: 'Payment Received',
    amountReceivedLabel: 'Amount Received (₹) *',
    totalCustomerDirectory: 'Total Customer Directory',
    clickRowKhataHint: 'Click any row on the left to view their detailed khata statement',
    allCategoriesOption: 'All Categories',
    openingPlusCashBills: 'Opening + Cash bills',
    turnoverLabel: 'Turnover:',
    settingsPageTitle: 'Shop Settings & Security',
    shopGstIdentityTitle: 'Shop & GST Identity',
    shopNameLabel: 'Shop Name (Appears on Bills) *',
    shopNamePlaceholder: 'e.g. Gupta Kirana & General Store',
    taglineLabel: 'Tagline / Slogan',
    taglinePlaceholder: 'e.g. Your Trusted Daily Store',
    phoneRequiredLabel: 'Phone *',
    taxSchemeLabel: 'Tax Scheme',
    gstinIfRegisteredLabel: 'GSTIN (If Registered)',
    stateJurisdictionLabel: 'State / Jurisdiction',
    shopAddressLabel: 'Shop Address',
    shopAddressPlaceholder: 'Shop street address, market name, city, pin code',
    invoicePrefixLabel: 'Invoice Number Prefix',
    shopUpiIdLabel: 'Shop UPI ID (For Dynamic QR on Bill)',
    shopUpiPlaceholder: 'name@okaxis / shop@icici',
    backupPassphraseLabel: 'Backup Passphrase (Min 6 chars)',
    backupPassphrasePlaceholder: 'Enter strong password...',
    restorePassphrasePlaceholder: 'Passphrase used during export...',
    posSearchPlaceholder: 'Scan barcode or type product name, SKU (Press Ctrl+K)...',
    posColItemDesc: 'Item Description',
    posColQuantity: 'Quantity',
    posColPrice: 'Price',
    posColTotal: 'Total',
    posBillSummaryTitle: 'Bill Summary',
    posSelectCustomerTitle: 'Select Customer',
    posHeldBillsTitle: 'Held Bills',
    posWalkInCustomer: 'Walk-in Customer',
    posWalkInDefaultCash: 'Walk-in Customer (Default Cash)',
    posHeldBillsCount: 'Held Bills',
    posHoldF8: 'Hold [F8]',
    posShortcutPayF9: 'F9: Pay',
    posShortcutQuickCashF10: 'F10: Quick Cash',
    posGrossTaxableSubtotal: 'Gross Taxable Subtotal:',
    posInvoiceDiscountPct: 'Invoice Discount (%):',
    posRoundOff: 'Round-off:',
    posTotalAmountDue: 'Total Amount Due',
    posCollectPaymentF9: 'Collect Payment [F9]',
    posQuickCashPrintF10: 'Quick Cash & Print [F10]',
    posEmptyCartTitle: 'Billing Cart is Empty',
    posShortcutHoldF8: 'F8: Hold',
    ledgerTotalOutstandingBadge: 'Total Outstanding Udhaar',
    ledgerCustomersWithDuesBadge: 'Customers with Dues',
    ledgerWhatsappRemindersBadge: 'Automated WhatsApp Reminders',
    settingsEncryptedBackupTitle: 'Encrypted Local Backup (.enc)',
    settingsExportEncryptedBtn: 'Export Encrypted Backup',
    settingsRestoreBackupTitle: 'Restore from Backup',
    settingsDecryptRestoreBtn: 'Decrypt & Restore Shop',
    settingsClearDemoBtn: 'Clear Demo Data (Start Fresh Store)',
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
    reportsTitle: 'रिपोर्ट्स और डे क्लोज़ ड्रॉअर',
    reportsSubtitle: 'कैश ड्रॉअर ऑडिट, मासिक 7-टैब CA GST पैक और बिक्री रजिस्टर',
    exportCsvRegister: 'CA / GST रजिस्टर निर्यात करें (.csv)',
    dayCloseTitle: 'डे क्लोज़ कैश ड्रॉअर मिलान',
    dayCloseSubtitle: 'दर्ज लेनदेन के साथ ड्रॉअर नकदी का मिलान करें',
    lockDrawerSession: 'आज का ड्रॉअर सत्र लॉक करें',
    salesRegisterTitle: 'बिक्री और टैक्स चालान रजिस्टर',
    colInvoice: 'चालान #',
    colDateTime: 'दिनांक / समय',
    colParty: 'पार्टी',
    colTaxable: 'कर योग्य',
    colTaxes: 'टैक्स',
    colGrandTotal: 'कुल योग',
    colPayment: 'भुगतान',
    colStatus: 'स्थिति',
    colAction: 'कार्रवाई',
    cancelInvoiceTitle: 'चालान रद्द करें',
    cancelInvoiceReason: 'रद्द करने का अनिवार्य कारण *',
    navSettings: 'सेटिंग्स और बैकअप',
    settingsShort: 'सेटिंग्स',
    openingDrawerCash: 'ओपनिंग ड्रॉअर कैश',
    todaysCashSales: 'आज की नकद बिक्री',
    expectedCashInDrawer: 'ड्रॉअर में अपेक्षित नकदी',
    actualCashCount: 'वास्तविक नकद गिनती (₹)',
    sessionCloseNotesPlaceholder: 'सत्र समाप्ति नोट्स / टिप्पणी (वैकल्पिक)',
    statusFinalized: 'अंतिम रूप दिया गया',
    productsTitle: 'सामान और लाइव स्टॉक',
    productsSubtitle: 'कैटलॉग, बारकोड SKU, HSN कोड और स्टॉक सीमा प्रबंधित करें',
    addNewProduct: 'नया सामान जोड़ें [F2]',
    editProductTitle: 'सामान संपादित करें',
    searchProductsPlaceholder: 'सामान का नाम, बारकोड, SKU या HSN खोजें...',
    prodColItemBarcode: 'सामान का नाम / बारकोड',
    prodColCategory: 'श्रेणी',
    prodColHsn: 'HSN Code',
    prodColGstRate: 'GST Rate',
    prodColSellingPrice: 'विक्रय मूल्य',
    prodColStockOnHand: 'उपलब्ध स्टॉक',
    prodColStatus: 'स्थिति',
    prodColAction: 'कार्रवाई',
    statusAvailable: 'उपलब्ध',
    searchCustomerPlaceholder: 'नाम या फ़ोन से ग्राहक खोजें...',
    addCustomerBtn: 'ग्राहक जोड़ें',
    addNewCustomerTitle: 'नया ग्राहक जोड़ें',
    ledgerColCustomerName: 'ग्राहक का नाम',
    ledgerColPhoneGstin: 'फ़ोन / GSTIN',
    ledgerColOutstanding: 'बकाया उधार',
    ledgerColAction: 'कार्रवाई',
    receiveBtn: 'प्राप्त करें',
    receiveCustomerPayment: 'ग्राहक भुगतान प्राप्त करें',
    receivePaymentTitle: 'भुगतान प्राप्त करें',
    selectCustomerTitle: 'ग्राहक चुनें',
    noCustomerSelected: 'कोई ग्राहक नहीं चुना गया।',
    noLedgerEntries: 'अभी तक कोई खाता प्रविष्टि दर्ज नहीं है।',
    invoiceIssuedUdhaar: 'चालान जारी (उधार)',
    paymentReceivedText: 'भुगतान प्राप्त हुआ',
    amountReceivedLabel: 'प्राप्त राशि (₹) *',
    totalCustomerDirectory: 'कुल ग्राहक निर्देशिका',
    clickRowKhataHint: 'विस्तृत खाता विवरण देखने के लिए बाईं ओर किसी भी पंक्ति पर क्लिक करें',
    allCategoriesOption: 'सभी श्रेणियां',
    openingPlusCashBills: 'ओपनिंग + नकद बिल',
    turnoverLabel: 'कुल कारोबार:',
    settingsPageTitle: 'दुकान सेटिंग्स और सुरक्षा',
    shopGstIdentityTitle: 'दुकान और GST पहचान',
    shopNameLabel: 'दुकान का नाम (बिल पर दिखेगा) *',
    shopNamePlaceholder: 'उदा. Gupta Kirana & General Store',
    taglineLabel: 'टैगलाइन / स्लोगन',
    taglinePlaceholder: 'उदा. आपका भरोसेमंद दैनिक स्टोर',
    phoneRequiredLabel: 'फ़ोन *',
    taxSchemeLabel: 'कर योजना',
    gstinIfRegisteredLabel: 'GSTIN (यदि पंजीकृत हो)',
    stateJurisdictionLabel: 'राज्य / क्षेत्राधिकार',
    shopAddressLabel: 'दुकान का पता',
    shopAddressPlaceholder: 'दुकान का पता, बाज़ार का नाम, शहर, पिन कोड',
    invoicePrefixLabel: 'चालान संख्या उपसर्ग',
    shopUpiIdLabel: 'दुकान UPI ID (बिल पर डायनामिक QR के लिए)',
    shopUpiPlaceholder: 'name@okaxis / shop@icici',
    backupPassphraseLabel: 'बैकअप पासफ़्रेज़ (न्यूनतम 6 अक्षर)',
    backupPassphrasePlaceholder: 'मज़बूत पासवर्ड दर्ज करें...',
    restorePassphrasePlaceholder: 'निर्यात के समय उपयोग किया गया पासफ़्रेज़...',
    posSearchPlaceholder: 'बारकोड स्कैन करें या उत्पाद का नाम, SKU लिखें (Ctrl+K दबाएं)...',
    posColItemDesc: 'वस्तु का विवरण',
    posColQuantity: 'मात्रा',
    posColPrice: 'मूल्य',
    posColTotal: 'कुल',
    posBillSummaryTitle: 'बिल सारांश',
    posSelectCustomerTitle: 'ग्राहक चुनें',
    posHeldBillsTitle: 'होल्ड किए गए बिल',
    posWalkInCustomer: 'वॉक-इन ग्राहक',
    posWalkInDefaultCash: 'वॉक-इन ग्राहक (डिफ़ॉल्ट नकद)',
    posHeldBillsCount: 'होल्ड बिल',
    posHoldF8: 'होल्ड [F8]',
    posShortcutPayF9: 'F9: भुगतान',
    posShortcutQuickCashF10: 'F10: क्विक कैश',
    posGrossTaxableSubtotal: 'कुल कर योग्य उप-योग:',
    posInvoiceDiscountPct: 'चालान छूट (%):',
    posRoundOff: 'राउंड-ऑफ़:',
    posTotalAmountDue: 'कुल देय राशि',
    posCollectPaymentF9: 'भुगतान लें [F9]',
    posQuickCashPrintF10: 'क्विक कैश और प्रिंट [F10]',
    posEmptyCartTitle: 'बिलिंग कार्ट खाली है',
    posShortcutHoldF8: 'F8: होल्ड',
    ledgerTotalOutstandingBadge: 'कुल बकाया उधार',
    ledgerCustomersWithDuesBadge: 'बकाया वाले ग्राहक',
    ledgerWhatsappRemindersBadge: 'स्वचालित WhatsApp रिमाइंडर',
    settingsEncryptedBackupTitle: 'एन्क्रिप्टेड लोकल बैकअप (.enc)',
    settingsExportEncryptedBtn: 'एन्क्रिप्टेड बैकअप निर्यात करें',
    settingsRestoreBackupTitle: 'बैकअप से पुनर्स्थापित करें',
    settingsDecryptRestoreBtn: 'डिक्रिप्ट करें और स्टोर पुनर्स्थापित करें',
    settingsClearDemoBtn: 'डेमो डेटा साफ़ करें (नया स्टोर शुरू करें)',
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
    inStock: 'উপলব্ধ স্টক',
    lowStock: 'কম স্টক',
    outOfStock: 'স্টক শেষ',
    reportsTitle: 'রিপোর্ট ও ডে ক্লোজ ড্রয়ার',
    reportsSubtitle: 'ক্যাশ ড্রয়ার অডিট, মাসিক ৭-ট্যাব CA GST প্যাক ও বিক্রয় রেজিস্টার',
    exportCsvRegister: 'CA / GST রেজিস্টার এক্সপোর্ট করুন (.csv)',
    dayCloseTitle: 'ডে ক্লোজ ক্যাশ ড্রয়ার মিলান',
    dayCloseSubtitle: 'রেকর্ড করা লেনদেনের সাথে ড্রয়ারের নগদ মিলিয়ে দেখুন',
    lockDrawerSession: 'আজকের ড্রয়ার সেশন লক করুন',
    salesRegisterTitle: 'বিক্রয় ও ট্যাক্স ইনভয়েস রেজিস্টার',
    colInvoice: 'ইনভয়েস #',
    colDateTime: 'তারিখ / সময়',
    colParty: 'পার্টি',
    colTaxable: 'করযোগ্য',
    colTaxes: 'ট্যাক্স',
    colGrandTotal: 'সর্বমোট',
    colPayment: 'পেমেন্ট',
    colStatus: 'অবস্থা',
    colAction: 'অ্যাকশন',
    cancelInvoiceTitle: 'ইনভয়েস বাতিল করুন',
    cancelInvoiceReason: 'বাতিল করার বাধ্যতামূলক কারণ *',
    navSettings: 'সেটিংস ও ব্যাকআপ',
    settingsShort: 'সেটিংস',
    openingDrawerCash: 'ওপেনিং ড্রয়ার ক্যাশ',
    todaysCashSales: 'আজকের নগদ বিক্রয়',
    expectedCashInDrawer: 'ড্রয়ারে প্রত্যাশিত নগদ',
    actualCashCount: 'প্রকৃত নগদ গণনা (₹)',
    sessionCloseNotesPlaceholder: 'সেশন সমাপ্তির নোট / মন্তব্য (ঐচ্ছিক)',
    statusFinalized: 'চূড়ান্ত করা হয়েছে',
    productsTitle: 'পণ্য ও লাইভ স্টক',
    productsSubtitle: 'ক্যাটালগ, বারকোড SKU, HSN কোড ও স্টক সীমা পরিচালনা করুন',
    addNewProduct: 'নতুন পণ্য যোগ করুন [F2]',
    editProductTitle: 'পণ্য সম্পাদনা করুন',
    searchProductsPlaceholder: 'পণ্যের নাম, বারকোড, SKU বা HSN খুঁজুন...',
    prodColItemBarcode: 'পণ্যের নাম / বারকোড',
    prodColCategory: 'বিভাগ',
    prodColHsn: 'HSN Code',
    prodColGstRate: 'GST Rate',
    prodColSellingPrice: 'বিক্রয় মূল্য',
    prodColStockOnHand: 'উপলব্ধ স্টক',
    prodColStatus: 'অবস্থা',
    prodColAction: 'অ্যাকশন',
    statusAvailable: 'উপলব্ধ',
    searchCustomerPlaceholder: 'নাম বা ফোন দিয়ে ক্রেতা খুঁজুন...',
    addCustomerBtn: 'ক্রেতা যোগ করুন',
    addNewCustomerTitle: 'নতুন ক্রেতা যোগ করুন',
    ledgerColCustomerName: 'ক্রেতার নাম',
    ledgerColPhoneGstin: 'ফোন / GSTIN',
    ledgerColOutstanding: 'বকেয়া বাকি',
    ledgerColAction: 'অ্যাকশন',
    receiveBtn: 'গ্রহণ করুন',
    receiveCustomerPayment: 'ক্রেতার পেমেন্ট গ্রহণ করুন',
    receivePaymentTitle: 'পেমেন্ট গ্রহণ করুন',
    selectCustomerTitle: 'একজন ক্রেতা নির্বাচন করুন',
    noCustomerSelected: 'কোনো ক্রেতা নির্বাচিত নয়।',
    noLedgerEntries: 'এখনও কোনো খাতার এন্ট্রি রেকর্ড করা হয়নি।',
    invoiceIssuedUdhaar: 'ইনভয়েস ইস্যু (বাকি)',
    paymentReceivedText: 'পেমেন্ট গৃহীত হয়েছে',
    amountReceivedLabel: 'প্রাপ্ত পরিমাণ (₹) *',
    totalCustomerDirectory: 'মোট ক্রেতা ডিরেক্টরি',
    clickRowKhataHint: 'বিস্তারিত খাতার বিবরণ দেখতে বামের যেকোনো সারিতে ক্লিক করুন',
    allCategoriesOption: 'সমস্ত বিভাগ',
    openingPlusCashBills: 'ওপেনিং + নগদ বিল',
    turnoverLabel: 'মোট টার্নওভার:',
    settingsPageTitle: 'দোকান সেটিংস ও নিরাপত্তা',
    shopGstIdentityTitle: 'দোকান ও GST পরিচয়',
    shopNameLabel: 'দোকানের নাম (বিলে দেখা যাবে) *',
    shopNamePlaceholder: 'যেমন Gupta Kirana & General Store',
    taglineLabel: 'ট্যাগলাইন / স্লোগান',
    taglinePlaceholder: 'যেমন আপনার বিশ্বস্ত দৈনিক দোকান',
    phoneRequiredLabel: 'ফোন *',
    taxSchemeLabel: 'কর প্রকল্প',
    gstinIfRegisteredLabel: 'GSTIN (নিবন্ধিত হলে)',
    stateJurisdictionLabel: 'রাজ্য / এখতিয়ার',
    shopAddressLabel: 'দোকানের ঠিকানা',
    shopAddressPlaceholder: 'দোকানের ঠিকানা, বাজারের নাম, শহর, পিন কোড',
    invoicePrefixLabel: 'ইনভয়েস নম্বর উপসর্গ',
    shopUpiIdLabel: 'দোকান UPI ID (বিলে ডায়নামিক QR-এর জন্য)',
    shopUpiPlaceholder: 'name@okaxis / shop@icici',
    backupPassphraseLabel: 'ব্যাকআপ পাসফ্রেজ (ন্যূনতম ৬ অক্ষর)',
    backupPassphrasePlaceholder: 'শক্তিশালী পাসওয়ার্ড লিখুন...',
    restorePassphrasePlaceholder: 'এক্সপোর্টের সময় ব্যবহৃত পাসফ্রেজ...',
    posSearchPlaceholder: 'বারকোড স্ক্যান করুন বা পণ্যের নাম, SKU লিখুন (Ctrl+K চাপুন)...',
    posColItemDesc: 'পণ্যের বিবরণ',
    posColQuantity: 'পরিমাণ',
    posColPrice: 'দাম',
    posColTotal: 'মোট',
    posBillSummaryTitle: 'বিল সারসংক্ষেপ',
    posSelectCustomerTitle: 'ক্রেতা নির্বাচন করুন',
    posHeldBillsTitle: 'হোল্ড করা বিল',
    posWalkInCustomer: 'সাধারণ ক্রেতা',
    posWalkInDefaultCash: 'সাধারণ ক্রেতা (ডিফল্ট নগদ)',
    posHeldBillsCount: 'হোল্ড বিল',
    posHoldF8: 'হোল্ড [F8]',
    posShortcutPayF9: 'F9: পেমেন্ট',
    posShortcutQuickCashF10: 'F10: কুইক ক্যাশ',
    posGrossTaxableSubtotal: 'মোট করযোগ্য সাব-টোটাল:',
    posInvoiceDiscountPct: 'ইনভয়েস ছাড় (%):',
    posRoundOff: 'রাউন্ড-অফ:',
    posTotalAmountDue: 'মোট বকেয়া পরিমাণ',
    posCollectPaymentF9: 'টাকা গ্রহণ করুন [F9]',
    posQuickCashPrintF10: 'क्विक कैश और प्रिंट [F10]',
    posEmptyCartTitle: 'बिलिंग कार्ट खाली है',
    posShortcutHoldF8: 'F8: होल्ड',
    ledgerTotalOutstandingBadge: 'कुल बकाया उधार',
    ledgerCustomersWithDuesBadge: 'बकाया वाले ग्राहक',
    ledgerWhatsappRemindersBadge: 'स्वचालित WhatsApp रिमाइंडर',
    settingsEncryptedBackupTitle: 'एन्क्रिप्टेड लोकल बैकअप (.enc)',
    settingsExportEncryptedBtn: 'एन्क्रिप्टेड बैकअप निर्यात करें',
    settingsRestoreBackupTitle: 'बैकअप से पुनर्स्थापित करें',
    settingsDecryptRestoreBtn: 'डिक्रिप्ट करें और स्टोर पुनर्स्थापित करें',
    settingsClearDemoBtn: 'डेमो डेटा साफ़ करें (नया स्टोर शुरू करें)',
  },
};
