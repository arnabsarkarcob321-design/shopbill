/**
 * Official Indian GST, PAN, HSN, State Code, and UPI Validation Utilities.
 */

const GST_CHARS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';

export const GST_STATE_CODES: Record<string, { name: string; is_ut: boolean }> = {
  '01': { name: 'Jammu and Kashmir', is_ut: true },
  '02': { name: 'Himachal Pradesh', is_ut: false },
  '03': { name: 'Punjab', is_ut: false },
  '04': { name: 'Chandigarh', is_ut: true },
  '05': { name: 'Uttarakhand', is_ut: false },
  '06': { name: 'Haryana', is_ut: false },
  '07': { name: 'Delhi', is_ut: true },
  '08': { name: 'Rajasthan', is_ut: false },
  '09': { name: 'Uttar Pradesh', is_ut: false },
  '10': { name: 'Bihar', is_ut: false },
  '11': { name: 'Sikkim', is_ut: false },
  '12': { name: 'Arunachal Pradesh', is_ut: false },
  '13': { name: 'Nagaland', is_ut: false },
  '14': { name: 'Manipur', is_ut: false },
  '15': { name: 'Mizoram', is_ut: false },
  '16': { name: 'Tripura', is_ut: false },
  '17': { name: 'Meghalaya', is_ut: false },
  '18': { name: 'Assam', is_ut: false },
  '19': { name: 'West Bengal', is_ut: false },
  '20': { name: 'Jharkhand', is_ut: false },
  '21': { name: 'Odisha', is_ut: false },
  '22': { name: 'Chhattisgarh', is_ut: false },
  '23': { name: 'Madhya Pradesh', is_ut: false },
  '24': { name: 'Gujarat', is_ut: false },
  '26': { name: 'Dadra and Nagar Haveli and Daman and Diu', is_ut: true },
  '27': { name: 'Maharashtra', is_ut: false },
  '29': { name: 'Karnataka', is_ut: false },
  '30': { name: 'Goa', is_ut: false },
  '31': { name: 'Lakshadweep', is_ut: true },
  '32': { name: 'Kerala', is_ut: false },
  '33': { name: 'Tamil Nadu', is_ut: false },
  '34': { name: 'Puducherry', is_ut: true },
  '35': { name: 'Andaman and Nicobar Islands', is_ut: true },
  '36': { name: 'Telangana', is_ut: false },
  '37': { name: 'Andhra Pradesh', is_ut: false },
  '38': { name: 'Ladakh', is_ut: true },
  '97': { name: 'Other Territory', is_ut: true },
  '99': { name: 'Centre Jurisdiction', is_ut: false },
};

/**
 * Computes the official Modulo-36 checksum character for the first 14 characters of a GSTIN.
 */
export function computeGstinChecksum(first14: string): string | null {
  if (first14.length !== 14) return null;
  const upper = first14.toUpperCase();

  let sum = 0;
  for (let i = 0; i < 14; i++) {
    const char = upper[i];
    if (!char) return null;
    const codePoint = GST_CHARS.indexOf(char);
    if (codePoint === -1) return null;

    const weight = i % 2 === 0 ? 1 : 2;
    const product = codePoint * weight;
    const quotient = Math.floor(product / 36);
    const remainder = product % 36;
    sum += quotient + remainder;
  }

  const checkCharIndex = (36 - (sum % 36)) % 36;
  return GST_CHARS[checkCharIndex] ?? null;
}

export interface GstinValidationResult {
  valid: boolean;
  stateCode?: string;
  stateName?: string;
  pan?: string;
  entityNumber?: string;
  checksum?: string;
  error?: string;
}

/**
 * Validates a 15-character Indian Goods and Services Tax Identification Number (GSTIN).
 */
export function validateGstin(gstin: string): GstinValidationResult {
  if (!gstin) {
    return { valid: false, error: 'GSTIN is required' };
  }

  const clean = gstin.trim().toUpperCase();
  if (clean.length !== 15) {
    return { valid: false, error: 'GSTIN must be exactly 15 characters long' };
  }

  const gstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
  if (!gstinRegex.test(clean)) {
    return { valid: false, error: 'Invalid GSTIN structure or characters' };
  }

  const stateCode = clean.substring(0, 2);
  const stateMeta = GST_STATE_CODES[stateCode];
  if (!stateMeta) {
    return { valid: false, error: `Invalid GST state code: ${stateCode}` };
  }

  const first14 = clean.substring(0, 14);
  const expectedChecksum = computeGstinChecksum(first14);
  const actualChecksum = clean[14];

  if (expectedChecksum !== actualChecksum) {
    return {
      valid: false,
      stateCode,
      stateName: stateMeta.name,
      error: `Invalid GSTIN checksum digit (expected ${expectedChecksum}, got ${actualChecksum})`,
    };
  }

  return {
    valid: true,
    stateCode,
    stateName: stateMeta.name,
    pan: clean.substring(2, 12),
    entityNumber: clean.substring(12, 13),
    checksum: actualChecksum,
  };
}

/**
 * Validates an Indian Permanent Account Number (PAN).
 */
export function validatePan(pan: string): boolean {
  if (!pan) return false;
  const clean = pan.trim().toUpperCase();
  return /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(clean);
}

/**
 * Validates an Indian HSN or SAC code (2 to 8 digits).
 */
export function validateHsn(hsn: string): boolean {
  if (!hsn) return false;
  const clean = hsn.trim();
  return /^[0-9]{2,8}$/.test(clean);
}

/**
 * Validates a 2-digit GST state code.
 */
export function validateStateCode(code: string): boolean {
  if (!code) return false;
  return code in GST_STATE_CODES;
}

/**
 * Validates a standard Indian UPI ID (e.g., merchant@bank).
 */
export function validateUpiId(upiId: string): boolean {
  if (!upiId) return false;
  const clean = upiId.trim();
  return /^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}$/.test(clean);
}

/**
 * Validates an Indian 10-digit mobile number, with optional +91 or 0 prefix.
 */
export function validateMobilePhone(phone: string): boolean {
  if (!phone) return false;
  const clean = phone.replace(/[\s\-()]/g, '');
  return /^(?:\+91|91|0)?[6-9]\d{9}$/.test(clean);
}
