/**
 * Validate Chia bech32m wallet address format.
 * xch1 prefix + 58 bech32 characters = 62 total.
 * Mirrors functions/lib/validation.ts — keep in sync.
 */
export function isValidChiaAddress(address: string): boolean {
  return /^xch1[a-z0-9]{58}$/.test(address);
}
