import { describe, expect, it } from 'vitest';
import { amountInWords, formatCurrency, formatQuantity } from '../src/formatter';
import { translations } from '../src/translations';

describe('i18n Formatter & Translations', () => {
  it('formats currency using Indian Lakh/Crore grouping', () => {
    expect(formatCurrency(12480000)).toBe('₹ 1,24,800.00');
    expect(formatCurrency(85300)).toBe('₹ 853.00');
    expect(formatCurrency(1500000000)).toBe('₹ 1,50,00,000.00');
    expect(formatCurrency(0)).toBe('₹ 0.00');
    expect(formatCurrency(-5000)).toBe('-₹ 50.00');
    expect(formatCurrency(12480000, { showDecimals: false })).toBe('₹ 1,24,800');
  });

  it('converts paise to Indian English words', () => {
    expect(amountInWords(12480000)).toBe(
      'One Lakh Twenty Four Thousand Eight Hundred Rupees Only'
    );
    expect(amountInWords(50)).toBe('Fifty Paise Only');
    expect(amountInWords(1050)).toBe('Ten Rupees and Fifty Paise Only');
    expect(amountInWords(0)).toBe('Zero Rupees Only');
  });

  it('formats quantities accurately from milli units', () => {
    expect(formatQuantity(1000)).toBe('1');
    expect(formatQuantity(1500, 'kg')).toBe('1.5 kg');
    expect(formatQuantity(250, 'g')).toBe('0.25 g');
    expect(formatQuantity(1234, 'pcs')).toBe('1.234 pcs');
  });

  it('provides complete translation dictionaries for EN, HI, BN', () => {
    expect(translations.en.appName).toBe('ShopBill');
    expect(translations.hi.appName).toBe('शॉपबिल');
    expect(translations.bn.appName).toBe('শপবিল');

    expect(translations.en.grandTotal).toBe('Grand Total');
    expect(translations.hi.grandTotal).toBe('कुल देय राशि');
    expect(translations.bn.grandTotal).toBe('সর্বমোট প্রদেয়');
  });
});
