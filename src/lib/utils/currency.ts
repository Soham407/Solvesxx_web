/**
 * Currency and Unit Conversion Utilities
 * Centralized source of truth for financial formatting across the platform.
 */

/**
 * Convert paise (integer) to rupees (decimal) for display.
 * @param paise Amount in paise
 * @returns Amount in rupees
 */
export const toRupees = (paise: number): number => paise / 100;

/**
 * Convert rupees (decimal) to paise (integer) for storage.
 * @param rupees Amount in rupees
 * @returns Amount in paise
 */
export const toPaise = (rupees: number): number => Math.round(rupees * 100);

/**
 * Format an amount in paise into a localized INR currency string.
 * @param paiseAmount Amount in paise
 * @returns Formatted currency string (e.g., ₹1,234)
 */
export const formatCurrency = (paiseAmount: number, fractionDigits: number = 0): string => {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: fractionDigits,
  }).format(toRupees(paiseAmount));
};
