/**
 * Indian Financial Numeral, Currency and Quantity Formatter.
 * Enforces Indian grouping system (Lakh/Crore) and tabular numeric support.
 */

/**
 * Formats integer paise into Indian Rupee string: e.g. 12480000 paise -> "₹ 1,24,800.00"
 */
export function formatCurrency(
  paise: number,
  options?: {
    showSymbol?: boolean;
    showDecimals?: boolean;
    spaceAfterSymbol?: boolean;
  }
): string {
  const showSymbol = options?.showSymbol ?? true;
  const showDecimals = options?.showDecimals ?? true;
  const spaceAfterSymbol = options?.spaceAfterSymbol ?? true;

  const isNegative = paise < 0;
  const absPaise = Math.abs(paise);

  const rupees = Math.floor(absPaise / 100);
  const remainderPaise = absPaise % 100;

  // Format rupees into Indian numbering system: 12,34,567
  const rupeesStr = rupees.toString();
  let formattedRupees = '';

  if (rupeesStr.length <= 3) {
    formattedRupees = rupeesStr;
  } else {
    const lastThree = rupeesStr.substring(rupeesStr.length - 3);
    const otherDigits = rupeesStr.substring(0, rupeesStr.length - 3);
    const groups: string[] = [];

    // Group remaining digits by 2s from right to left
    let remaining = otherDigits;
    while (remaining.length > 2) {
      groups.unshift(remaining.substring(remaining.length - 2));
      remaining = remaining.substring(0, remaining.length - 2);
    }
    if (remaining.length > 0) {
      groups.unshift(remaining);
    }

    formattedRupees = groups.join(',') + ',' + lastThree;
  }

  let result = formattedRupees;
  if (showDecimals) {
    result += '.' + remainderPaise.toString().padStart(2, '0');
  }

  const prefix = showSymbol ? (spaceAfterSymbol ? '₹ ' : '₹') : '';
  return (isNegative ? '-' : '') + prefix + result;
}

const ONES = [
  '',
  'One',
  'Two',
  'Three',
  'Four',
  'Five',
  'Six',
  'Seven',
  'Eight',
  'Nine',
  'Ten',
  'Eleven',
  'Twelve',
  'Thirteen',
  'Fourteen',
  'Fifteen',
  'Sixteen',
  'Seventeen',
  'Eighteen',
  'Nineteen',
];

const TENS = [
  '',
  '',
  'Twenty',
  'Thirty',
  'Forty',
  'Fifty',
  'Sixty',
  'Seventy',
  'Eighty',
  'Ninety',
];

function convertThreeDigitOrLess(n: number): string {
  let str = '';
  if (n >= 100) {
    str += ONES[Math.floor(n / 100)] + ' Hundred ';
    n %= 100;
  }
  if (n >= 20) {
    str += TENS[Math.floor(n / 10)] + (n % 10 > 0 ? ' ' + ONES[n % 10] : '');
  } else if (n > 0) {
    str += ONES[n];
  }
  return str.trim();
}

/**
 * Converts integer paise into Indian English amount in words:
 * e.g. 12480050 paise -> "One Lakh Twenty Four Thousand Eight Hundred Rupees and Fifty Paise Only"
 */
export function amountInWords(paise: number): string {
  if (paise === 0) return 'Zero Rupees Only';

  const absPaise = Math.abs(paise);
  const rupees = Math.floor(absPaise / 100);
  const p = absPaise % 100;

  let words = '';

  if (rupees > 0) {
    const crore = Math.floor(rupees / 10000000);
    let rem = rupees % 10000000;

    const lakh = Math.floor(rem / 100000);
    rem = rem % 100000;

    const thousand = Math.floor(rem / 1000);
    rem = rem % 1000;

    const remainder = rem;

    const parts: string[] = [];

    if (crore > 0) {
      parts.push(convertThreeDigitOrLess(crore) + ' Crore');
    }
    if (lakh > 0) {
      parts.push(convertThreeDigitOrLess(lakh) + ' Lakh');
    }
    if (thousand > 0) {
      parts.push(convertThreeDigitOrLess(thousand) + ' Thousand');
    }
    if (remainder > 0) {
      parts.push(convertThreeDigitOrLess(remainder));
    }

    words = parts.join(' ') + ' Rupees';
  }

  if (p > 0) {
    const paiseWords = convertThreeDigitOrLess(p) + ' Paise';
    if (words) {
      words += ' and ' + paiseWords;
    } else {
      words = paiseWords;
    }
  }

  return words + ' Only';
}

/**
 * Formats integer quantity thousandths (e.g. 1500 milli -> "1.5" or 2000 milli -> "2")
 */
export function formatQuantity(quantityMilli: number, unit?: string): string {
  const isNegative = quantityMilli < 0;
  const absMilli = Math.abs(quantityMilli);

  const whole = Math.floor(absMilli / 1000);
  const fraction = absMilli % 1000;

  let formatted = '';
  if (fraction === 0) {
    formatted = whole.toString();
  } else {
    // Trim trailing zeros: 1500 -> "1.5", 1250 -> "1.25", 1234 -> "1.234"
    const fractionStr = fraction.toString().padStart(3, '0').replace(/0+$/, '');
    formatted = `${whole}.${fractionStr}`;
  }

  const sign = isNegative ? '-' : '';
  const unitSuffix = unit ? ` ${unit}` : '';
  return `${sign}${formatted}${unitSuffix}`;
}
