/**
 * Cloudflare Pages Function: Wallet Balances Proxy
 * Proxies requests to Spacescan.io API to avoid CORS issues
 * 
 * Endpoint: /api/wallet-balances?address=xch1...
 */

export async function onRequestGet(context) {
  const { request, env } = context
  const url = new URL(request.url)
  const address = url.searchParams.get('address')

  if (!address) {
    return new Response(
      JSON.stringify({ error: 'Missing address parameter' }),
      {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    )
  }

  // Try endpoints in priority order
  // PRIMARY: XCHScan (most reliable, returns XCH + CATs in one call)
  // FALLBACK: Spacescan api2 format
  // LAST RESORT: Spacescan XCH-only endpoint
  const endpointsToTry = [
    `https://api.xchscan.com/address/${address}`, // PRIMARY - most reliable
    `https://api2.spacescan.io/1/xch/address/balance/${address}`, // FALLBACK 1
    `https://api.spacescan.io/address/xch-balance/${address}`, // FALLBACK 2 - XCH only
  ]

  const errors = []
  let lastStatus = null

  // Get API key from environment (Cloudflare Pages secret)
  const apiKey = env?.spacescan || env?.SPACESCAN_API_KEY || null
  
  for (const endpoint of endpointsToTry) {
    try {
      // Build headers with API key if available
      const headers = {
        'User-Agent': 'WojakInk-Treasury/1.0',
        'Accept': 'application/json',
      }
      
      // Add API key to headers if available
      // Spacescan uses Authorization: Bearer format
      if (apiKey) {
        headers['Authorization'] = `Bearer ${apiKey}`
        console.log(`[Wallet Balances Proxy] Using API key for ${endpoint}`)
      } else {
        console.log(`[Wallet Balances Proxy] No API key found, using unauthenticated request`)
      }
      
      const response = await fetch(endpoint, {
        method: 'GET',
        headers: headers,
      })

      const status = response.status
      const responseText = await response.text()

      // Log for debugging (will show in wrangler logs)
      console.log(`[Wallet Balances Proxy] ${endpoint} - Status: ${status}`)

      if (response.ok) {
        // Success! Return the response
        try {
          const data = JSON.parse(responseText)
          console.log(`[Wallet Balances Proxy] Success! Response keys:`, Object.keys(data || {}))
          
          return new Response(responseText, {
            status: 200,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*',
              'X-Proxied-Endpoint': endpoint,
              'Cache-Control': 'public, max-age=240', // 4 min cache
            },
          })
        } catch (parseError) {
          // JSON parse failed, but status was OK - return the text anyway
          console.warn(`[Wallet Balances Proxy] JSON parse failed for ${endpoint}:`, parseError)
          return new Response(responseText, {
            status: 200,
            headers: {
              'Content-Type': 'text/plain',
              'Access-Control-Allow-Origin': '*',
              'X-Proxied-Endpoint': endpoint,
            },
          })
        }
      }

      // Not OK - save error details
      const errorInfo = {
        endpoint,
        status,
        error: `HTTP ${status}: ${response.statusText}`,
        responsePreview: responseText.substring(0, 200), // First 200 chars
      }
      errors.push(errorInfo)
      lastStatus = status

      // For 429 (rate limit), continue to next endpoint (don't stop)
      if (status === 429) {
        console.log(`[Wallet Balances Proxy] ⏸️ Rate limited: ${endpoint}, trying next endpoint...`)
        // Wait 1 second before trying next endpoint (be nice to APIs)
        await new Promise(resolve => setTimeout(resolve, 1000))
        continue // Try next endpoint
      }

      // For 404, also continue (endpoint might not exist, but others might work)
      if (status === 404) {
        console.log(`[Wallet Balances Proxy] ❌ Not found: ${endpoint}, trying next endpoint...`)
        continue // Try next endpoint
      }

      // For 500 errors, wait a bit then continue
      if (status >= 500) {
        console.log(`[Wallet Balances Proxy] ❌ Server error: ${endpoint} (${status}), trying next endpoint...`)
        await new Promise(resolve => setTimeout(resolve, 1000))
        continue // Try next endpoint
      }

      // Continue to next endpoint for other errors (502, 503, etc.)
    } catch (error) {
      console.error(`[Wallet Balances Proxy] Error fetching ${endpoint}:`, error)
      errors.push({
        endpoint,
        status: null,
        error: error.message,
        responsePreview: null,
      })
      // Continue to next endpoint
    }
  }

  // All endpoints failed - return structured error
  const hasRateLimit = errors.some(e => e.status === 429)
  const hint = hasRateLimit
    ? 'Rate limit hit. Wait 5-10 minutes and try again.'
    : 'API may be down. Check https://spacescan.io status.'

  return new Response(
    JSON.stringify({
      success: false,
      error: 'All API endpoints failed',
      tried: errors.map(e => ({
        endpoint: e.endpoint,
        status: e.status,
        error: e.error,
      })),
      hint,
      lastStatus,
    }),
    {
      status: lastStatus || 503,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    }
  )
}

