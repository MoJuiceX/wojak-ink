import { XCH_DECIMALS } from './treasuryConstants'

/**
 * Format mojos to human-readable amount
 * @param {string|number} mojos - Amount in mojos
 * @param {number} decimals - Number of decimals (12 for XCH, 3 for CATs)
 * @returns {number} Human-readable amount
 */
export function formatAmount(mojos, decimals) {
  const mojosNum = typeof mojos === 'string' ? parseFloat(mojos) : mojos
  if (isNaN(mojosNum) || mojosNum === 0) return 0
  return mojosNum / Math.pow(10, decimals)
}

/**
 * Calculate token price in XCH from pair reserves
 * @param {Object} pair - Pair object with xch_reserve and token_reserve
 * @returns {number} Token price in XCH (or null if invalid)
 */
export function calculateTokenPrice(pair) {
  if (!pair || !pair.xch_reserve || !pair.token_reserve) {
    return null
  }

  const xchReserve = parseFloat(pair.xch_reserve)
  const tokenReserve = parseFloat(pair.token_reserve)

  if (xchReserve <= 0 || tokenReserve <= 0) {
    return null
  }

  // XCH reserve is in mojos (1e12), token reserve is in mojos (1e3 for 3 decimals)
  // Price = (XCH amount) / (Token amount)
  const xchAmount = formatAmount(xchReserve, XCH_DECIMALS)
  const tokenAmount = formatAmount(tokenReserve, 3)

  if (tokenAmount <= 0) {
    return null
  }

  return xchAmount / tokenAmount
}

/**
 * Calculate LP position value
 * @param {string|number} lpBalanceMojos - LP token balance in mojos
 * @param {Object} pair - Pair object with reserves and liquidity
 * @returns {Object} LP position details { share, xchPortion, tokenPortion, tokenPrice, valueInXCH }
 */
export function calculateLPValue(lpBalanceMojos, pair) {
  if (!pair || !pair.liquidity || !pair.xch_reserve || !pair.token_reserve) {
    return {
      share: 0,
      xchPortion: 0,
      tokenPortion: 0,
      tokenPrice: null,
      valueInXCH: 0,
    }
  }

  const lpBalance = typeof lpBalanceMojos === 'string' ? parseFloat(lpBalanceMojos) : lpBalanceMojos
  const poolLiquidity = typeof pair.liquidity === 'string' ? parseFloat(pair.liquidity) : pair.liquidity

  if (lpBalance <= 0 || poolLiquidity <= 0) {
    return {
      share: 0,
      xchPortion: 0,
      tokenPortion: 0,
      tokenPrice: null,
      valueInXCH: 0,
    }
  }

  // Calculate share of the pool
  const share = lpBalance / poolLiquidity

  // Calculate your portions
  const xchReserve = parseFloat(pair.xch_reserve)
  const tokenReserve = parseFloat(pair.token_reserve)

  const xchPortion = share * formatAmount(xchReserve, XCH_DECIMALS)
  const tokenPortion = share * formatAmount(tokenReserve, 3)

  // Calculate token price
  const tokenPrice = calculateTokenPrice(pair)

  // Calculate total LP value in XCH
  const valueInXCH = tokenPrice !== null
    ? xchPortion + (tokenPortion * tokenPrice)
    : xchPortion // If token price unavailable, just use XCH portion

  return {
    share,
    xchPortion,
    tokenPortion,
    tokenPrice,
    valueInXCH,
  }
}

/**
 * Calculate total portfolio value
 * @param {Object} data - Treasury data object
 * @returns {Object} { totalXCH, totalUSD }
 */
export function calculateTotalPortfolioValue(data) {
  let totalXCH = 0

  // Sum LP positions
  if (data.lpPositions && Array.isArray(data.lpPositions)) {
    data.lpPositions.forEach(position => {
      if (position.valueInXCH) {
        totalXCH += position.valueInXCH
      }
    })
  }

  // Sum token holdings
  if (data.tokenHoldings && Array.isArray(data.tokenHoldings)) {
    data.tokenHoldings.forEach(holding => {
      if (holding.valueInXCH) {
        totalXCH += holding.valueInXCH
      }
    })
  }

  // Add XCH balance
  if (data.xchBalance) {
    totalXCH += data.xchBalance
  }

  // Calculate USD value
  const xchPrice = data.xchPriceUSD || 0
  const totalUSD = totalXCH * xchPrice

  return {
    totalXCH,
    totalUSD,
  }
}

/**
 * Format number with commas and fixed decimals
 * @param {number} num - Number to format
 * @param {number} decimals - Number of decimal places
 * @returns {string} Formatted number string
 */
export function formatNumber(num, decimals = 2) {
  if (num === null || num === undefined || isNaN(num)) {
    return '--'
  }

  // Handle very small numbers
  if (Math.abs(num) < 0.000001 && num !== 0) {
    return num.toExponential(2)
  }

  return num.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
}

/**
 * Format currency (USD) with dollar sign
 * @param {number} amount - Amount in USD
 * @returns {string} Formatted currency string
 */
export function formatCurrency(amount) {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return '--'
  }

  return `$${formatNumber(amount, 2)}`
}

