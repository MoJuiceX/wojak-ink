import Window from './Window'
import { useState, useEffect, useCallback, useRef } from 'react'
import { fetchTibetSwapPairs, fetchWalletBalances, fetchXCHPrice } from '../../services/treasuryApi'
import { CAT_TOKENS, TOKEN_LOGOS, TOKEN_LOGOS_BY_ASSET_ID } from '../../utils/treasuryConstants'
import {
  formatAmount,
  calculateLPValue,
  calculateTokenPrice,
  calculateTotalPortfolioValue,
  formatNumber,
  formatCurrency,
} from '../../utils/treasuryCalculations'
import LoadingSpinner from '../ui/LoadingSpinner'
import TreasuryAnimation from './TreasuryAnimation'
import RateLimitError from './RateLimitError'
import { clearAllCache, getCachedData } from '../../utils/treasuryCache'
import Button from '../ui/Button'
import { MOCK_WALLET_DATA, MOCK_XCH_PRICE, USE_MOCK_DATA } from '../../utils/treasuryMockData'
import '../../styles/treasury.css'

const AUTO_REFRESH_INTERVAL = 5 * 60 * 1000 // 5 minutes
const MIN_REQUEST_INTERVAL = 3000 // 3 seconds minimum between requests (prevent rapid clicks)
const isDevelopment = import.meta.env.DEV || import.meta.env.MODE === 'development'

export default function TreasuryWindow({ isOpen, onClose }) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [errorDetails, setErrorDetails] = useState(null) // For detailed error info (status code, etc.)
  const [treasuryData, setTreasuryData] = useState(null)
  const [xchPriceUSD, setXchPriceUSD] = useState(0)
  const [isRateLimitError, setIsRateLimitError] = useState(false)
  const [lastUpdated, setLastUpdated] = useState(null)
  const lastRequestTimeRef = useRef(0)
  const refreshTimeoutRef = useRef(null)

  const fetchTreasuryData = useCallback(async (bypassCache = false) => {
    // Enforce minimum interval between requests (prevent rapid clicks)
    const now = Date.now()
    const timeSinceLastRequest = now - lastRequestTimeRef.current
    
    if (timeSinceLastRequest < MIN_REQUEST_INTERVAL && lastRequestTimeRef.current > 0) {
      // Too soon since last request, skip this request
      console.log('Request skipped - too soon since last request')
      return
    }
    
    lastRequestTimeRef.current = Date.now()
    
    setLoading(true)
    setError(null)
    setErrorDetails(null)
    setIsRateLimitError(false)

    try {
      // USE MOCK DATA FOR NOW (APIs are blocked/rate-limited)
      const useMockData = USE_MOCK_DATA || localStorage.getItem('treasury_use_mock_data') === 'true'
      
      if (useMockData) {
        console.log('[Treasury] Using MOCK data (APIs blocked)')
        
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 500))
        
        // Use mock wallet data
        const balances = MOCK_WALLET_DATA
        const price = MOCK_XCH_PRICE
        
        // Still fetch TibetSwap pairs for real token prices (this API works!)
        let pairs = null
        try {
          pairs = await fetchTibetSwapPairs(bypassCache)
        } catch (e) {
          console.error('Pairs fetch failed:', e)
          const cached = getCachedData('tibetswap_pairs')
          pairs = cached || []
          if (!cached) {
            console.warn('No cached pairs data available')
          }
        }
        
        // Calculate token values using real TibetSwap prices
        const tokenHoldings = []
        const catMetadataMap = new Map()
        CAT_TOKENS.forEach((catToken) => {
          catMetadataMap.set(catToken.assetId.toLowerCase(), {
            symbol: catToken.symbol,
            decimals: catToken.decimals,
          })
        })
        
        balances.cats.forEach((cat) => {
          const assetId = cat.assetId.toLowerCase()
          const metadata = catMetadataMap.get(assetId) || {
            symbol: cat.symbol || `CAT:${assetId.substring(0, 8)}...`,
            decimals: cat.decimals || 3,
          }
          
          // Find matching pair for pricing
          const matchingPair = pairs ? pairs.find(
            (p) => p.asset_id?.toLowerCase() === assetId
          ) : null
          
          let tokenPrice = null
          let valueInXCH = 0
          let tokenImage = null
          
          if (matchingPair) {
            tokenPrice = calculateTokenPrice(matchingPair)
            valueInXCH = cat.amount_cat * tokenPrice
            // Only use API image if it exists and is not empty
            const apiImage = matchingPair.asset_image_url
            if (apiImage && apiImage.trim() !== '' && apiImage !== 'null' && apiImage !== 'undefined') {
              tokenImage = apiImage
            }
          }
          
          // ALWAYS check for custom logo - use it if available (even if API provided one)
          // This ensures our custom logos are used for CHAD, PIZZA, PP
          let customLogo = null
          // First try by symbol (exact match)
          if (TOKEN_LOGOS[metadata.symbol]) {
            customLogo = TOKEN_LOGOS[metadata.symbol]
          } else {
            // Try case-insensitive symbol match
            const matchingKey = Object.keys(TOKEN_LOGOS).find(
              key => key.toUpperCase() === metadata.symbol.toUpperCase()
            )
            if (matchingKey) {
              customLogo = TOKEN_LOGOS[matchingKey]
            } else {
              // Fallback: try by asset ID (most reliable) - case-insensitive
              const assetIdLower = assetId.toLowerCase()
              if (TOKEN_LOGOS_BY_ASSET_ID[assetIdLower]) {
                customLogo = TOKEN_LOGOS_BY_ASSET_ID[assetIdLower]
              } else if (TOKEN_LOGOS_BY_ASSET_ID[assetId]) {
                customLogo = TOKEN_LOGOS_BY_ASSET_ID[assetId]
              }
            }
          }
          
          // Use custom logo if found, otherwise use API image
          if (customLogo) {
            tokenImage = customLogo
            if (isDevelopment) {
              console.log(`[Treasury] ✅ Using custom logo for ${metadata.symbol} (${assetId}):`, tokenImage)
            }
          } else if (!tokenImage && isDevelopment) {
            console.log(`[Treasury] ❌ No logo found for ${metadata.symbol} (assetId: ${assetId})`)
            console.log(`[Treasury] Available logos:`, Object.keys(TOKEN_LOGOS))
            console.log(`[Treasury] Available asset IDs:`, Object.keys(TOKEN_LOGOS_BY_ASSET_ID))
          }
          
          tokenHoldings.push({
            assetId,
            symbol: metadata.symbol,
            balanceMojos: Number(cat.amount_mojos),
            balanceTokens: cat.amount_cat,
            tokenPrice: tokenPrice,
            valueInXCH: valueInXCH,
            tokenImage: tokenImage,
            name: cat.name || null,
          })
        })
        
        // Calculate totals
        const totalTokensXCH = tokenHoldings.reduce((sum, t) => sum + (t.valueInXCH || 0), 0)
        const totalXCH = balances.xch.amount_xch + totalTokensXCH
        const totalUSD = totalXCH * price
        
        setTreasuryData({
          xchBalance: balances.xch.amount_xch,
          tokenHoldings: tokenHoldings,
          lpPositions: [], // No LP positions in mock data
          totals: {
            totalXCH: totalXCH,
            totalUSD: totalUSD,
          },
        })
        
        setXchPriceUSD(price)
        setLoading(false)
        setLastUpdated(new Date())
        return // Exit early - mock data loaded
      }
      
      // REAL API CODE (currently blocked)
      // Fetch data individually for resilience - don't fail all if one fails
      let pairs = null
      let balances = null
      let price = 0

      try {
        pairs = await fetchTibetSwapPairs(bypassCache)
      } catch (e) {
        console.error('Pairs fetch failed:', e)
        const cached = getCachedData('tibetswap_pairs')
        pairs = cached || []
        if (!cached) {
          console.warn('No cached pairs data available')
        }
      }

      // Fetch wallet balances - this will throw if it fails (no silent zeros)
      // Note: This code path is not used when USE_MOCK_DATA is true
      try {
        balances = await fetchWalletBalances('', bypassCache)
      } catch (e) {
        // Try to parse structured error (JSON)
        let errorData = null
        try {
          errorData = JSON.parse(e.message)
        } catch {
          // Not JSON, try to extract info from plain message
          const message = e.message || 'Failed to fetch wallet balances'
          const statusMatch = message.match(/HTTP (\d{3})|\((\d{3})\)|status[:\s]+(\d{3})/i)
          const statusCode = statusMatch ? parseInt(statusMatch[1] || statusMatch[2] || statusMatch[3], 10) : null
          
          errorData = {
            message: message,
            endpoint: null,
            status: statusCode,
            triedEndpoints: [],
            hint: statusCode === 429
              ? 'Rate limit exceeded. Wait 5-10 minutes for the rate limit to reset, then try again.'
              : statusCode === 404
              ? 'API endpoint not found. Check if the wallet address is valid.'
              : statusCode
              ? `HTTP ${statusCode} error.`
              : 'Unable to fetch wallet balances. Please check your connection and try again.',
          }
        }
        
        // Extract status code
        const statusCode = errorData.status ? String(errorData.status) : null
        
        setError('Wallet balances unavailable')
        setErrorDetails({
          status: statusCode,
          message: errorData.message,
          endpoint: errorData.endpoint,
          triedEndpoints: errorData.triedEndpoints || [],
          hint: errorData.hint || (statusCode === '404' 
            ? 'API endpoint not found. Check if the wallet address is valid.'
            : statusCode === '429'
            ? 'Rate limit exceeded. Please wait 5-10 minutes and try again.'
            : statusCode
            ? `HTTP ${statusCode} error.`
            : 'Unable to fetch wallet balances. Please check your connection and try again.')
        })
        
        // Try cache for rate limits only
        if (statusCode === '429') {
          const cached = getCachedData('wallet_balances', '')
          if (cached) {
            balances = cached
            setError(null)
            setErrorDetails(null)
          } else {
            setIsRateLimitError(true)
            throw e // Re-throw to prevent processing
          }
        } else {
          throw e // Re-throw to prevent processing with invalid data
        }
      }

      // Price fetch is optional - can show XCH values without USD
      try {
        price = await fetchXCHPrice(bypassCache)
      } catch (e) {
        console.error('Price fetch failed:', e)
        const cached = getCachedData('xch_price')
        price = cached !== null ? cached : 0
        if (cached === null) {
          console.warn('No cached price data available - USD values will show as $0.00')
        }
      }

      // Validate we have balances (should never be null if fetchWalletBalances succeeded)
      if (!balances) {
        throw new Error('Unable to fetch wallet balances. Please try again later.')
      }

      // Process LP positions
      const lpPositions = []
      const lpBalanceMap = new Map()

      // Build map of LP token balances from normalized cats array
      balances.cats.forEach((cat) => {
        const mojosValue = typeof cat.amount_mojos === 'bigint' 
          ? Number(cat.amount_mojos) 
          : parseFloat(cat.amount_mojos) || 0
        lpBalanceMap.set(cat.assetId.toLowerCase(), mojosValue)
      })

      // Find LP positions (where liquidity_asset_id has a balance > 0)
      if (pairs && pairs.length > 0) {
        pairs.forEach((pair) => {
          const liquidityAssetId = pair.liquidity_asset_id?.toLowerCase()
          if (liquidityAssetId && lpBalanceMap.has(liquidityAssetId)) {
            const lpBalanceMojos = lpBalanceMap.get(liquidityAssetId)
            if (lpBalanceMojos > 0) {
              const lpValue = calculateLPValue(lpBalanceMojos, pair)
              const tokenSymbol = pair.asset_short_name || 'UNKNOWN'
              const tokenImage = pair.asset_image_url || null

              lpPositions.push({
                pairId: pair.pair_id || pair.launcher_id,
                liquidityAssetId,
                tokenAssetId: pair.asset_id,
                tokenSymbol,
                tokenImage,
                lpBalanceMojos,
                lpBalanceTokens: formatAmount(lpBalanceMojos, 3), // LP tokens use 3 decimals
                ...lpValue,
              })
            }
          }
        })
      }

      // Process ALL CAT token balances (auto-discover, no filtering)
      const tokenHoldings = []
      
      // Create a map of known CAT metadata for symbol/name lookup
      const catMetadataMap = new Map()
      CAT_TOKENS.forEach((catToken) => {
        catMetadataMap.set(catToken.assetId.toLowerCase(), {
          symbol: catToken.symbol,
          decimals: catToken.decimals,
        })
      })

      // Process all CATs from the API response
      balances.cats.forEach((cat) => {
        const assetId = cat.assetId.toLowerCase()
        
        // Skip if this is an LP token (already processed above)
        const isLPToken = pairs && pairs.some(
          (p) => p.liquidity_asset_id?.toLowerCase() === assetId
        )
        if (isLPToken) return

        // Get metadata if available, otherwise use defaults
        const metadata = catMetadataMap.get(assetId) || {
          symbol: cat.symbol || `CAT:${assetId.substring(0, 8)}...`,
          decimals: cat.decimals || 3,
        }
        
        const balanceMojos = typeof cat.amount_mojos === 'bigint' 
          ? Number(cat.amount_mojos) 
          : parseFloat(cat.amount_mojos) || 0
        
        const balanceTokens = cat.amount_cat !== null && cat.amount_cat !== undefined
          ? cat.amount_cat
          : formatAmount(balanceMojos, metadata.decimals)
        
        // Find matching pair for pricing
        const matchingPair = pairs ? pairs.find(
          (p) => p.asset_id?.toLowerCase() === assetId
        ) : null

        let tokenPrice = null
        let valueInXCH = 0
        let tokenImage = null

        if (matchingPair) {
          tokenPrice = calculateTokenPrice(matchingPair)
          if (tokenPrice !== null) {
            valueInXCH = balanceTokens * tokenPrice
          }
          // Only use API image if it exists and is not empty
          const apiImage = matchingPair.asset_image_url
          if (apiImage && apiImage.trim() !== '' && apiImage !== 'null' && apiImage !== 'undefined') {
            tokenImage = apiImage
          }
        }

        // ALWAYS check for custom logo - use it if available (even if API provided one)
        // This ensures our custom logos are used for CHAD, PIZZA, PP
        let customLogo = null
        // First try by symbol (exact match)
        if (TOKEN_LOGOS[metadata.symbol]) {
          customLogo = TOKEN_LOGOS[metadata.symbol]
        } else {
          // Try case-insensitive symbol match
          const matchingKey = Object.keys(TOKEN_LOGOS).find(
            key => key.toUpperCase() === metadata.symbol.toUpperCase()
          )
          if (matchingKey) {
            customLogo = TOKEN_LOGOS[matchingKey]
          } else {
            // Fallback: try by asset ID (most reliable) - case-insensitive
            const assetIdLower = assetId.toLowerCase()
            if (TOKEN_LOGOS_BY_ASSET_ID[assetIdLower]) {
              customLogo = TOKEN_LOGOS_BY_ASSET_ID[assetIdLower]
            } else if (TOKEN_LOGOS_BY_ASSET_ID[assetId]) {
              customLogo = TOKEN_LOGOS_BY_ASSET_ID[assetId]
            }
          }
        }
        
        // Use custom logo if found, otherwise use API image
        if (customLogo) {
          tokenImage = customLogo
          if (isDevelopment) {
            console.log(`[Treasury] ✅ Using custom logo for ${metadata.symbol} (${assetId}):`, tokenImage)
          }
        } else if (!tokenImage && isDevelopment) {
          console.log(`[Treasury] ❌ No logo found for ${metadata.symbol} (assetId: ${assetId})`)
          console.log(`[Treasury] Available logos:`, Object.keys(TOKEN_LOGOS))
          console.log(`[Treasury] Available asset IDs:`, Object.keys(TOKEN_LOGOS_BY_ASSET_ID))
        }

        tokenHoldings.push({
          assetId: cat.assetId,
          symbol: metadata.symbol,
          balanceMojos,
          balanceTokens,
          tokenPrice,
          valueInXCH,
          tokenImage,
          name: cat.name || null,
        })
      })

      // Use normalized XCH balance
      const xchBalance = balances.xch.amount_xch

      // Calculate totals
      const portfolioData = {
        lpPositions,
        tokenHoldings,
        xchBalance,
        xchPriceUSD: price,
      }
      const totals = calculateTotalPortfolioValue(portfolioData)
      
      // Store price in state for display
      setXchPriceUSD(price)

      setTreasuryData({
        lpPositions,
        tokenHoldings,
        xchBalance,
        totals,
      })
      
      setLastUpdated(new Date())
    } catch (err) {
      console.error('Failed to fetch treasury data:', err)
      
      // Error state is already set in the balances catch block above
      // If we get here from a different error, set it now
      if (!error) {
        const errorMessage = err.message || 'Failed to load treasury data'
        setError(errorMessage)
        setErrorDetails({
          message: errorMessage,
          hint: 'Please check your connection and try again.'
        })
      }
      
      // Check if this is a real rate limit error
      const errorMsg = err.message || ''
      if (errorMsg.includes('429') || errorMsg.includes('Rate limit')) {
        setIsRateLimitError(true)
      }
    } finally {
      setLoading(false)
    }
  }, [])

  // Debounced refresh handler
  const handleRefresh = useCallback(() => {
    // Clear any pending refresh
    if (refreshTimeoutRef.current) {
      clearTimeout(refreshTimeoutRef.current)
    }
    
    // Clear cache and fetch fresh data
    clearAllCache()
    refreshTimeoutRef.current = setTimeout(() => {
      fetchTreasuryData(true) // bypassCache = true for manual refresh
    }, 300) // 300ms debounce
  }, [fetchTreasuryData])

  // Handle retry from rate limit error
  const handleRetry = useCallback(() => {
    clearAllCache()
    fetchTreasuryData(true) // bypassCache = true when retrying after rate limit
  }, [fetchTreasuryData])


  // Fetch data on mount and when window opens (cache will be used if available)
  useEffect(() => {
    if (isOpen) {
      // Use cache if available, otherwise fetch fresh data
      fetchTreasuryData(false)
      
      return () => {
        if (refreshTimeoutRef.current) {
          clearTimeout(refreshTimeoutRef.current)
        }
      }
    } else {
      // Reset state when window closes
      setIsRateLimitError(false)
      setError(null)
    }
  }, [isOpen, fetchTreasuryData])

    // Auto-refresh every 5 minutes (don't bypass cache for auto-refresh)
  useEffect(() => {
    if (!isOpen) return

    const interval = setInterval(() => {
      // Only auto-refresh if not currently loading and no error
      if (!loading && !error) {
        fetchTreasuryData(false) // Use cache for auto-refresh
      }
    }, AUTO_REFRESH_INTERVAL)

    return () => clearInterval(interval)
  }, [isOpen, fetchTreasuryData, loading, error])

  if (!isOpen) return null

  return (
    <Window
      id="treasury-window"
      title="TREASURY"
      icon="/icon/icons1/tresury_Icon.png"
      style={{
        width: '900px',
        height: '700px', // WINDOW HEIGHT - Change this number to make window taller/shorter
        maxWidth: 'calc(100vw - 40px)',
        maxHeight: 'calc(100vh - 40px)', // Maximum height (viewport height minus padding)
        left: '20px',
        top: '20px',
      }}
      onClose={onClose}
      allowScroll={true}
    >
      <div className="treasury-window">
        {/* Treasury Animation Background */}
        <TreasuryAnimation />

        {loading && !treasuryData && (
          <div className="treasury-loading" style={{ position: 'relative', zIndex: 2 }}>
            <LoadingSpinner size="large" />
            <p style={{ marginTop: '16px', color: '#888' }}>Loading treasury data...</p>
          </div>
        )}

        {error && !treasuryData && (
          isRateLimitError ? (
            <RateLimitError 
              onRetry={handleRetry}
              errorMessage={error}
            />
          ) : (
            <div className="treasury-error" style={{ 
              position: 'relative', 
              zIndex: 2,
              background: 'var(--input-face)',
              border: '2px inset var(--border-dark)',
              padding: '16px',
              margin: '16px',
              color: 'var(--state-error)',
            }}>
              <div style={{ fontWeight: 'bold', marginBottom: '8px', fontSize: '13px' }}>
                ⚠️ {error}
              </div>
              {errorDetails && (
                <div style={{ fontSize: '11px', marginBottom: '12px', color: 'var(--text-2)' }}>
                  {errorDetails.status && (
                    <div style={{ marginBottom: '4px' }}>
                      <strong>Status:</strong> {errorDetails.status}
                    </div>
                  )}
                  {errorDetails.triedEndpoints && errorDetails.triedEndpoints.length > 0 && (
                    <div style={{ marginBottom: '8px' }}>
                      <strong>Endpoints tried:</strong>
                      <ul style={{ margin: '4px 0', paddingLeft: '20px', listStyle: 'none' }}>
                        {errorDetails.triedEndpoints.map((ep, idx) => (
                          <li key={idx} style={{ marginBottom: '2px' }}>
                            ❌ {ep.endpoint || ep}
                            {ep.status && ` (${ep.status})`}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  <div style={{ marginTop: '8px', padding: '8px', background: 'rgba(255, 255, 0, 0.1)', border: '1px solid rgba(255, 255, 0, 0.3)' }}>
                    <strong>💡 Hint:</strong> {errorDetails.hint}
                  </div>
                </div>
              )}
              <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                <Button
                  onClick={handleRefresh}
                  onMouseDown={(e) => e.stopPropagation()}
                  onPointerDown={(e) => e.stopPropagation()}
                >
                  Retry Now
                </Button>
                {errorDetails?.status === '429' && (
                  <a
                    href="https://spacescan.io"
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      padding: '4px 12px',
                      background: 'var(--button-face)',
                      border: '1px solid var(--border-dark)',
                      color: 'var(--button-text)',
                      textDecoration: 'none',
                      fontSize: '11px',
                    }}
                    onMouseDown={(e) => e.stopPropagation()}
                    onPointerDown={(e) => e.stopPropagation()}
                  >
                    Check API Status
                  </a>
                )}
              </div>
            </div>
          )
        )}

        {treasuryData && !loading && (
          <div style={{ position: 'relative', zIndex: 1 }}>
            {/* Total Portfolio Value */}
            <div className="treasury-total">
              <div className="treasury-total-label">Total Portfolio Value</div>
              <div className="treasury-total-xch">
                {formatNumber(treasuryData.totals.totalXCH, 4)} XCH
              </div>
              <div className="treasury-total-usd">
                {formatCurrency(treasuryData.totals.totalUSD)}
              </div>
            </div>

            {/* XCH Balance Section */}
            <div className="treasury-section">
              <div className="treasury-section-header">XCH Balance</div>
              <div className="treasury-positions">
                <div className="treasury-position-card">
                  <div className="treasury-position-logo">
                    <img
                      src="/icon/XCH_logo.png"
                      alt="XCH"
                      onError={(e) => {
                        e.target.style.display = 'none'
                      }}
                    />
                  </div>
                  <div className="treasury-position-info" style={{ flex: 1 }}>
                    <div className="treasury-position-name">XCH</div>
                    <div className="treasury-position-amount">
                      {formatNumber(treasuryData.xchBalance, 4)} XCH
                    </div>
                    <div className="treasury-position-details">
                      Price: {formatCurrency(xchPriceUSD)} per XCH
                    </div>
                  </div>
                  <div className="treasury-position-value">
                    <div className="treasury-position-value-xch">
                      {formatNumber(treasuryData.xchBalance, 4)} XCH
                    </div>
                    <div className="treasury-position-value-usd">
                      {formatCurrency(treasuryData.xchBalance * xchPriceUSD)}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Liquidity Positions */}
            {treasuryData.lpPositions.length > 0 && (
              <div className="treasury-section">
                <div className="treasury-section-header">Liquidity Positions</div>
                <div className="treasury-positions">
                  {treasuryData.lpPositions.map((position) => (
                    <div key={position.pairId} className="treasury-position-card">
                      <div className="treasury-position-logo">
                        {position.tokenImage ? (
                          <img
                            src={position.tokenImage}
                            alt={position.tokenSymbol}
                            onError={(e) => {
                              e.target.style.display = 'none'
                            }}
                          />
                        ) : null}
                      </div>
                      <div className="treasury-position-info">
                        <div className="treasury-position-name">
                          XCH-{position.tokenSymbol} LP
                        </div>
                        <div className="treasury-position-amount">
                          {formatNumber(position.lpBalanceTokens, 4)} LP Tokens
                        </div>
                        <div className="treasury-position-details">
                          {formatNumber(position.xchPortion, 4)} XCH +{' '}
                          {formatNumber(position.tokenPortion, 4)} {position.tokenSymbol}
                        </div>
                      </div>
                      <div className="treasury-position-value">
                        <div className="treasury-position-value-xch">
                          {formatNumber(position.valueInXCH, 4)} XCH
                        </div>
                        <div className="treasury-position-value-usd">
                          {formatCurrency(position.valueInXCH * xchPriceUSD)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Token Holdings */}
            {treasuryData.tokenHoldings.length > 0 && (
              <div className="treasury-section">
                <div className="treasury-section-header">Token Holdings</div>
                <div className="treasury-positions">
                  {[...treasuryData.tokenHoldings]
                    .sort((a, b) => {
                      // Sort by USD value (valueInXCH * xchPriceUSD), highest first
                      const valueA = (a.valueInXCH || 0) * xchPriceUSD
                      const valueB = (b.valueInXCH || 0) * xchPriceUSD
                      return valueB - valueA
                    })
                    .map((holding) => (
                    <div key={holding.assetId} className="treasury-position-card">
                      <div className="treasury-position-logo">
                        {holding.tokenImage ? (
                          <img
                            src={holding.tokenImage}
                            alt={holding.symbol}
                            onError={(e) => {
                              console.warn(`[Treasury] Failed to load logo for ${holding.symbol}:`, holding.tokenImage)
                              // Don't hide - show placeholder instead
                              e.target.style.display = 'none'
                            }}
                            onLoad={() => {
                              console.log(`[Treasury] Successfully loaded logo for ${holding.symbol}:`, holding.tokenImage)
                            }}
                          />
                        ) : (
                          <div style={{ 
                            color: '#888', 
                            fontSize: '10px', 
                            textAlign: 'center',
                            padding: '4px'
                          }}>
                            {holding.symbol.substring(0, 3)}
                          </div>
                        )}
                      </div>
                      <div className="treasury-position-info">
                        <div className="treasury-position-name">{holding.symbol}</div>
                        <div className="treasury-position-amount">
                          {formatNumber(holding.balanceTokens, 4)} Tokens
                        </div>
                        {holding.tokenPrice !== null && (
                          <div className="treasury-position-details">
                            Price: {formatNumber(holding.tokenPrice, 6)} XCH
                          </div>
                        )}
                      </div>
                      <div className="treasury-position-value">
                        <div className="treasury-position-value-xch">
                          {holding.valueInXCH > 0
                            ? `${formatNumber(holding.valueInXCH, 4)} XCH`
                            : '--'}
                        </div>
                        <div className="treasury-position-value-usd">
                          {holding.valueInXCH > 0
                            ? formatCurrency(holding.valueInXCH * xchPriceUSD)
                            : '--'}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Empty State Messages */}
            {treasuryData.lpPositions.length === 0 &&
              treasuryData.tokenHoldings.length === 0 && (
                <div className="treasury-empty">
                  No LP positions or token holdings found in this wallet.
                </div>
              )}

            {/* Last Updated - Bottom of window */}
            {lastUpdated && (
              <div style={{
                marginTop: '16px',
                paddingTop: '8px',
                borderTop: '1px solid var(--border-mid, #c0c0c0)',
                textAlign: 'center',
              }}>
                <span style={{ 
                  color: 'var(--text-2, #666666)', 
                  fontSize: '9px',
                  fontStyle: 'italic',
                }}>
                  Last updated: {new Date(lastUpdated).toLocaleTimeString()}
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </Window>
  )
}

