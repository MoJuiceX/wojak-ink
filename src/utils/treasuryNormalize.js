/**
 * Treasury Data Normalization Utilities
 * Handles various API response formats and normalizes to a consistent structure
 */

const XCH_DECIMALS = 12
const XCH_MOJOS_PER_XCH = 10n ** BigInt(XCH_DECIMALS) // 1e12

/**
 * Convert a value to BigInt mojos, handling strings, numbers, and bigint-like strings
 * APIs typically return mojos directly (large integers), but we handle both cases
 */
function toMojosBigInt(value) {
  if (value === null || value === undefined) return 0n
  if (typeof value === 'bigint') return value
  if (typeof value === 'string') {
    const cleaned = value.trim()
    if (!cleaned || cleaned === '0') return 0n
    // Try to parse directly as integer (APIs usually return mojos as string integers)
    // If it contains a decimal point, parse as float and assume it's already in mojos
    if (cleaned.includes('.') || cleaned.includes('e') || cleaned.includes('E')) {
      const floatVal = parseFloat(cleaned)
      if (isNaN(floatVal)) return 0n
      // If small (< 1), might be XCH - convert to mojos
      // Otherwise, assume it's already in mojos
      if (floatVal < 1 && floatVal > 0) {
        return BigInt(Math.floor(floatVal * Number(XCH_MOJOS_PER_XCH)))
      }
      return BigInt(Math.floor(floatVal))
    }
    // Integer string - parse directly
    try {
      return BigInt(cleaned)
    } catch {
      const num = parseFloat(cleaned)
      return isNaN(num) ? 0n : BigInt(Math.floor(num))
    }
  }
  if (typeof value === 'number') {
    // If small (< 1), might be XCH - convert to mojos
    // Otherwise, assume it's already in mojos
    if (value < 1 && value > 0) {
      return BigInt(Math.floor(value * Number(XCH_MOJOS_PER_XCH)))
    }
    return BigInt(Math.floor(value))
  }
  return 0n
}

/**
 * Convert mojos to XCH (number)
 */
function mojosToXCH(mojos) {
  if (typeof mojos === 'bigint') {
    return Number(mojos) / Number(XCH_MOJOS_PER_XCH)
  }
  const mojosBigInt = typeof mojos === 'string' || typeof mojos === 'number' 
    ? toMojosBigInt(mojos)
    : BigInt(0)
  return Number(mojosBigInt) / Number(XCH_MOJOS_PER_XCH)
}

/**
 * Normalize wallet balances from various API response formats
 * @param {any} rawJson - Raw API response JSON
 * @returns {{ xch: { amount_mojos: string|bigint, amount_xch: number }, cats: Array, raw: any }}
 */
export function normalizeWalletBalances(rawJson) {
  if (!rawJson || typeof rawJson !== 'object') {
    throw new Error('Invalid API response: not an object')
  }

  // Log which format we detected (for debugging)
  let format = 'unknown'

  // Step 1: Find the root data object (handle nested responses)
  let root = rawJson
  if (rawJson.data && typeof rawJson.data === 'object') {
    root = rawJson.data
    format = 'format2' // Format 2: nested in data
  } else if (rawJson.result && typeof rawJson.result === 'object') {
    root = rawJson.result
    format = 'format2-variant' // Variant of Format 2
  } else {
    // Check for Format 1 (direct) or Format 4 (camelCase) or Format 3 (XCHScan)
    if (rawJson.xch_balance !== undefined) {
      format = 'format1' // Format 1: Spacescan standard
    } else if (rawJson.xchBalance !== undefined) {
      format = 'format4' // Format 4: camelCase
    } else if (rawJson.balance !== undefined && rawJson.cats) {
      format = 'format3' // Format 3: XCHScan object map
    }
  }

  if (format === 'unknown' && root === rawJson) {
    // Try to detect format from root
    if (rawJson.xch_balance !== undefined) {
      format = 'format1'
    } else if (rawJson.xchBalance !== undefined) {
      format = 'format4'
    } else if (rawJson.balance !== undefined && rawJson.cats) {
      format = 'format3'
    }
  }

  console.log('[Treasury] Detected response format:', format)

  // Step 2: Find XCH balance (try multiple field names)
  const xchCandidateKeys = [
    'xch_balance',
    'xchBalance',
    'balance',
    'xch',
    'chia_balance',
    'chiaBalance',
  ]
  
  let xchMojos = 0n
  let foundXCH = false
  
  for (const key of xchCandidateKeys) {
    if (root[key] !== null && root[key] !== undefined) {
      xchMojos = toMojosBigInt(root[key])
      foundXCH = true
      break
    }
  }

  // Step 3: Find CAT balances (try multiple field names and formats)
  // Handle Format 3 (XCHScan) first since it's at root level
  if (format === 'format3' && rawJson.cats && typeof rawJson.cats === 'object' && !Array.isArray(rawJson.cats)) {
    // Format 3: XCHScan object map { "assetId": "amount", ... }
    const cats = []
    for (const [assetId, amount] of Object.entries(rawJson.cats)) {
      if (!assetId || !amount) continue
      
      // Assume 3 decimals for CAT tokens
      const catDecimals = 3
      const amountMojos = toMojosBigInt(amount)
      const amountCat = Number(amountMojos) / Math.pow(10, catDecimals)
      
      cats.push({
        assetId: String(assetId).toLowerCase(),
        amount_mojos: amountMojos,
        amount_cat: amountCat,
        decimals: catDecimals,
        symbol: null,
        name: null,
      })
    }
    
    return {
      xch: {
        amount_mojos: toMojosBigInt(rawJson.balance),
        amount_xch: mojosToXCH(toMojosBigInt(rawJson.balance)),
      },
      cats: cats.sort((a, b) => {
        const aAmount = typeof a.amount_mojos === 'bigint' ? a.amount_mojos : toMojosBigInt(a.amount_mojos)
        const bAmount = typeof b.amount_mojos === 'bigint' ? b.amount_mojos : toMojosBigInt(b.amount_mojos)
        if (aAmount > bAmount) return -1
        if (aAmount < bAmount) return 1
        return 0
      }),
      raw: rawJson,
    }
  }

  // Handle other formats (1, 2, 4) - all use array format
  const catCandidateKeys = [
    'cat_balances',
    'catBalances',
    'cats',
    'assets',
    'tokens',
    'cat_tokens',
  ]

  const cats = []
  
  for (const key of catCandidateKeys) {
    const catData = root[key]
    if (!catData) continue

    // Format A: Array of objects [{ asset_id, amount, code?, name? }, ...]
    if (Array.isArray(catData)) {
      for (const item of catData) {
        if (!item || typeof item !== 'object') continue
        
        const assetId = item.asset_id || item.assetId || item.id || null
        const amount = item.amount || item.balance || 0
        const symbol = item.code || item.symbol || item.short_name || null
        const name = item.name || null

        if (assetId && amount) {
          // Assume CAT tokens use 3 decimals (1000 mojos per token) unless specified
          const catDecimals = item.decimals || 3
          const amountMojos = toMojosBigInt(amount)
          const amountCat = Number(amountMojos) / Math.pow(10, catDecimals)
          
          cats.push({
            assetId: String(assetId).toLowerCase(),
            amount_mojos: amountMojos,
            amount_cat: amountCat,
            decimals: catDecimals,
            symbol: symbol || null,
            name: name || null,
          })
        }
      }
      break // Found array format, done
    }

    // Format B: Object map { "<assetId>": "<amount>", ... } (fallback for other formats)
    if (typeof catData === 'object' && !Array.isArray(catData)) {
      for (const [assetId, amount] of Object.entries(catData)) {
        if (!assetId || !amount) continue
        
        // Assume 3 decimals for CAT tokens
        const catDecimals = 3
        const amountMojos = toMojosBigInt(amount)
        const amountCat = Number(amountMojos) / Math.pow(10, catDecimals)
        
        cats.push({
          assetId: String(assetId).toLowerCase(),
          amount_mojos: amountMojos,
          amount_cat: amountCat,
          decimals: catDecimals,
          symbol: null,
          name: null,
        })
      }
      break // Found object map format, done
    }
  }

  return {
    xch: {
      amount_mojos: xchMojos,
      amount_xch: mojosToXCH(xchMojos),
    },
    cats: cats.sort((a, b) => {
      // Sort by amount descending (largest first)
      const aAmount = typeof a.amount_mojos === 'bigint' ? a.amount_mojos : toMojosBigInt(a.amount_mojos)
      const bAmount = typeof b.amount_mojos === 'bigint' ? b.amount_mojos : toMojosBigInt(b.amount_mojos)
      if (aAmount > bAmount) return -1
      if (aAmount < bAmount) return 1
      return 0
    }),
    raw: rawJson,
  }
}

