/**
 * Shared validation utilities.
 * Single source of truth for address validation across all API endpoints.
 */

/**
 * Validate Chia bech32m wallet address format.
 * xch1 prefix + 58 bech32 characters = 62 total.
 */
export function isValidChiaAddress(address: string): boolean {
  return /^xch1[a-z0-9]{58}$/.test(address);
}
