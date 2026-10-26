import { describe, expect, it } from 'vitest';
import {
  computeGstinChecksum,
  validateGstin,
  validateHsn,
  validateMobilePhone,
  validatePan,
  validateStateCode,
  validateUpiId,
} from '../src/validators';

describe('GST & Identity Validators', () => {
  it('validates correct GSTIN and checks checksum', () => {
    // Standard test GSTIN: 27AAPFU0939F1ZV
    // Checksum for 27AAPFU0939F1Z:
    const first14 = '27AAPFU0939F1Z';
    const checksum = computeGstinChecksum(first14);
    expect(checksum).toBe('V');

    const result = validateGstin('27AAPFU0939F1ZV');
    expect(result.valid).toBe(true);
    expect(result.stateCode).toBe('27');
    expect(result.stateName).toBe('Maharashtra');
    expect(result.pan).toBe('AAPFU0939F');
  });

  it('rejects GSTIN with invalid checksum', () => {
    const result = validateGstin('27AAPFU0939F1ZA');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('Invalid GSTIN checksum');
  });

  it('rejects GSTIN with invalid state code', () => {
    const result = validateGstin('95AAPFU0939F1ZV');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('Invalid GST state code');
  });

  it('validates PAN format', () => {
    expect(validatePan('AAPFU0939F')).toBe(true);
    expect(validatePan('ABCDE1234F')).toBe(true);
    expect(validatePan('12345ABCDE')).toBe(false);
    expect(validatePan('AAPFU0939')).toBe(false);
  });

  it('validates HSN code length (2 to 8 digits)', () => {
    expect(validateHsn('10')).toBe(true);
    expect(validateHsn('1001')).toBe(true);
    expect(validateHsn('100190')).toBe(true);
    expect(validateHsn('10019010')).toBe(true);
    expect(validateHsn('1')).toBe(false);
    expect(validateHsn('100190100')).toBe(false);
    expect(validateHsn('ABCD')).toBe(false);
  });

  it('validates state codes', () => {
    expect(validateStateCode('19')).toBe(true); // West Bengal
    expect(validateStateCode('27')).toBe(true); // Maharashtra
    expect(validateStateCode('07')).toBe(true); // Delhi
    expect(validateStateCode('99')).toBe(true); // Centre
    expect(validateStateCode('00')).toBe(false);
    expect(validateStateCode('98')).toBe(false);
  });

  it('validates UPI ID format', () => {
    expect(validateUpiId('shopowner@oksbi')).toBe(true);
    expect(validateUpiId('kirana.store@hdfcbank')).toBe(true);
    expect(validateUpiId('invalidupi')).toBe(false);
    expect(validateUpiId('@sbi')).toBe(false);
  });

  it('validates Indian 10-digit mobile phone numbers', () => {
    expect(validateMobilePhone('9876543210')).toBe(true);
    expect(validateMobilePhone('+919876543210')).toBe(true);
    expect(validateMobilePhone('09876543210')).toBe(true);
    expect(validateMobilePhone('5876543210')).toBe(false); // starts with 5
    expect(validateMobilePhone('987654321')).toBe(false); // 9 digits
  });
});
