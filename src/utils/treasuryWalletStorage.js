/**
 * Wallet Address Storage Utilities
 * Manages wallet address in localStorage
 */

const STORAGE_KEY = 'treasury_wallet_address'
const DEFAULT_ADDRESS = 'xch18tcyy0knvfcgg5dld7gt2zev3qvu0dz5vplhq9gnhwvz9fxyl53qnyppxk'

/**
 * Get wallet address from localStorage, or return default
 * @returns {string} Wallet address
 */
export function getWalletAddress() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored || DEFAULT_ADDRESS
  } catch (error) {
    console.error('Error reading wallet address from localStorage:', error)
    return DEFAULT_ADDRESS
  }
}

/**
 * Save wallet address to localStorage
 * @param {string} address - Wallet address to save
 */
export function setWalletAddress(address) {
  try {
    if (!address || typeof address !== 'string' || address.trim().length === 0) {
      throw new Error('Invalid wallet address')
    }
    localStorage.setItem(STORAGE_KEY, address.trim())
  } catch (error) {
    console.error('Error saving wallet address to localStorage:', error)
    throw error
  }
}

