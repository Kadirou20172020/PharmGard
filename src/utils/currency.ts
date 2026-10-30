/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export const CURRENCY_CODE = 'DZD';
export const CURRENCY_LABEL = 'DZD';
export const CURRENCY_NAME = 'Dinar Algérien';

/**
 * Formats a monetary number in Algerian Dinars (DZD)
 * E.g. 1 250,00 DZD or 15 000 DZD
 */
export function formatDZD(amount: number, options?: { decimals?: number }): string {
  if (isNaN(amount) || amount === null || amount === undefined) {
    return `0,00 ${CURRENCY_LABEL}`;
  }
  const decimals = options?.decimals ?? 2;
  const formatted = amount.toLocaleString('fr-DZ', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
  return `${formatted} ${CURRENCY_LABEL}`;
}
