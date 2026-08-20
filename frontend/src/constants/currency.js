/**
 * Centralized Currency & Monetization Controller
 * Configured for India-based hospital deployment (Default: ₹ INR).
 */

export const CURRENCY_SYMBOL = '₹';
export const CURRENCY_CODE = 'INR';
export const CURRENCY_NAME = 'Indian Rupee';

/**
 * Formats a numeric value with standard 2 decimal places and the centralized currency symbol.
 * @param {number|string} amount - Value to format
 * @param {string} [symbol=CURRENCY_SYMBOL] - Optional custom symbol
 * @returns {string} e.g. "₹150.00"
 */
export const formatCurrency = (amount, symbol = CURRENCY_SYMBOL) => {
  const num = Number(amount);
  if (isNaN(num)) return `${symbol}0.00`;
  return `${symbol}${num.toFixed(2)}`;
};

/**
 * Formats a numeric value with Indian numbering system grouping (lakhs/crores).
 * @param {number|string} amount
 * @param {string} [symbol=CURRENCY_SYMBOL]
 * @returns {string} e.g. "₹1,50,000.00"
 */
export const formatCurrencyLocale = (amount, symbol = CURRENCY_SYMBOL, locale = 'en-IN') => {
  const num = Number(amount);
  if (isNaN(num)) return `${symbol}0.00`;
  return `${symbol}${num.toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

export default {
  CURRENCY_SYMBOL,
  CURRENCY_CODE,
  CURRENCY_NAME,
  formatCurrency,
  formatCurrencyLocale,
};
