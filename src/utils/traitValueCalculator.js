/**
 * Calculate trait values from sales events with anti-manipulation filtering
 * 
 * Applies weights (time decay, outlier removal, flag downweight) then calculates
 * simple weighted average of remaining prices.
 */

// Robust median (weighted)
function weightedMedian(values, weights) {
  if (values.length === 0) return null
  if (values.length === 1) return values[0]
  
  const pairs = values.map((v, i) => ({ value: v, weight: weights[i] || 1 }))
  pairs.sort((a, b) => a.value - b.value)
  
  const totalWeight = pairs.reduce((sum, p) => sum + p.weight, 0)
  let cumWeight = 0
  const targetWeight = totalWeight / 2
  
  for (const pair of pairs) {
    cumWeight += pair.weight
    if (cumWeight >= targetWeight) {
      return pair.value
    }
  }
  
  return pairs[pairs.length - 1].value
}

// Robust MAD (Median Absolute Deviation)
function robustMAD(values, median) {
  if (values.length === 0) return 0
  
  const deviations = values.map(v => Math.abs(v - median))
  const mad = weightedMedian(deviations, Array(values.length).fill(1))
  
  return mad === null ? 0 : 1.4826 * mad
}

// Robust z-score
function robustZScore(value, median, mad) {
  if (mad === 0 || mad === null) return 0
  return Math.abs(value - median) / (mad + 1e-10)
}

/**
 * Compute time decay weight (true half-life formula)
 */
function computeTimeDecay(timestamp, halfLifeDays) {
  if (!timestamp) return 1.0
  
  const now = Date.now()
  const eventTime = new Date(timestamp).getTime()
  const ageDays = (now - eventTime) / (1000 * 60 * 60 * 24)
  
  // True half-life formula: exp(-LN2 * ageDays / halfLifeDays)
  return Math.exp(-Math.LN2 * ageDays / halfLifeDays)
}

/**
 * Calculate trait value from sales events with anti-manipulation filtering
 * 
 * @param {Array} salesEvents - Array of { event, price_xch, timestamp, nft_id, launcher, buyer_address, seller_address }
 * @param {Object} options - Weighting options
 * @param {number} options.halfLifeDays - Time decay half-life in days (default: 90)
 * @param {number} options.outlierThreshold - Z-score threshold for outlier removal (default: 3)
 * @returns {Object} { valueXch, tradeCount, filteredCount, trades, filteredTrades }
 */
export function calculateTraitValue(salesEvents, options = {}) {
  if (!salesEvents || salesEvents.length === 0) {
    return {
      valueXch: null,
      tradeCount: 0,
      filteredCount: 0,
      trades: [],
      filteredTrades: []
    }
  }
  
  const {
    halfLifeDays = 90,
    outlierThreshold = 3
  } = options
  
  // Step 1: Extract prices and compute log prices for robust statistics
  const prices = salesEvents.map(s => s.price_xch)
  const logPrices = prices.map(p => Math.log(Math.max(p, 1e-10)))
  
  // Step 2: Compute global median and MAD for outlier detection
  const median = weightedMedian(logPrices, Array(logPrices.length).fill(1))
  const mad = robustMAD(logPrices, median)
  
  // Step 3: Apply weights to each sale
  const weightedSales = []
  
  for (let i = 0; i < salesEvents.length; i++) {
    const sale = salesEvents[i]
    const logPrice = logPrices[i]
    
    // Time decay weight (90-day half-life for sales)
    const wTime = computeTimeDecay(sale.timestamp, halfLifeDays)
    
    // Outlier downweight (robust z-score)
    const z = robustZScore(logPrice, median, mad)
    const wOutlier = 1 / (1 + Math.pow(z / outlierThreshold, 2))
    
    // Flag downweight (for sales with flags)
    let wFlag = 1.0
    if (sale.event && sale.event.flags) {
      if (sale.event.flags.same_owner) wFlag *= 0.2
      if (sale.event.flags.extreme) wFlag *= 0.3
    }
    
    // Combined weight
    const weight = wTime * wOutlier * wFlag
    
    weightedSales.push({
      ...sale,
      weight,
      logPrice,
      zScore: z,
      isOutlier: z > outlierThreshold
    })
  }
  
  // Step 4: Filter out outliers (z-score > threshold)
  const filteredSales = weightedSales.filter(s => !s.isOutlier)
  
  // Step 5: Calculate weighted average
  let valueXch = null
  if (filteredSales.length > 0) {
    const totalWeight = filteredSales.reduce((sum, s) => sum + s.weight, 0)
    if (totalWeight > 0) {
      const weightedSum = filteredSales.reduce((sum, s) => sum + (s.price_xch * s.weight), 0)
      valueXch = weightedSum / totalWeight
    }
  }
  
  return {
    valueXch,
    tradeCount: salesEvents.length,
    filteredCount: filteredSales.length,
    trades: salesEvents, // All trades (for display)
    filteredTrades: filteredSales // Filtered trades (used in calculation)
  }
}


