/**
 * Treasury Constants
 * Wallet address, CAT token definitions, and API endpoints
 */

export const WALLET_ADDRESS = 'xch18tcyy0knvfcgg5dld7gt2zev3qvu0dz5vplhq9gnhwvz9fxyl53qnyppxk'

/**
 * Token logo mappings for tokens without API-provided logos
 * Maps token symbol to logo path
 */
export const TOKEN_LOGOS = {
  '$CHAD': '/icon/icon_chad.png',  // Chat/Chad token logo
  '$PIZZA': '/icon/icon_pizza.png', // Pizza token logo
  '$PP': '/icon/icon_pp.png',       // PP token logo
}

/**
 * Token logo mappings by asset ID (for more reliable matching)
 * Maps asset ID (lowercase) to logo path
 */
export const TOKEN_LOGOS_BY_ASSET_ID = {
  '0941dc178e75d3699fab42a002034cae455ba5dfc91a9a9f58b62c48c9cea754': '/icon/icon_chad.png',  // $CHAD
  'dd37f678dda586fad9b1daeae1f7c5c137ffa6d947e1ed5c7b4f3c430da80638': '/icon/icon_pizza.png', // $PIZZA
  '84d31c80c619070ba45ce4dc5cc0bed2ae4341a0da1d69504e28243e6ccbef37': '/icon/icon_pp.png',    // $PP
}

/**
 * CAT Tokens to track (all with 3 decimals = 1000 mojos per token)
 */
export const CAT_TOKENS = [
  {
    assetId: 'ccda69ff6c44d687994efdbee30689be51d2347f739287ab4bb7b52344f8bf1d',
    symbol: '$Bepe',
    decimals: 3, // 1 token = 1000 mojos
  },
  {
    assetId: 'e816ee18ce2337c4128449bc539fbbe2ecfdd2098c4e7cab4667e223c3bdc23d',
    symbol: '$HOA',
    decimals: 3,
  },
  {
    assetId: 'eb2155a177b6060535dd8e72e98ddb0c77aea21fab53737de1c1ced3cb38e4c4',
    symbol: '$SP',
    decimals: 3,
  },
  {
    assetId: '84d31c80c619070ba45ce4dc5cc0bed2ae4341a0da1d69504e28243e6ccbef37',
    symbol: '$PP',
    decimals: 3,
  },
  {
    assetId: '69326954fe16117cd6250e929748b2a1ab916347598bc8180749279cfae21ddb',
    symbol: '$CHIA',
    decimals: 3,
  },
  {
    assetId: 'a09af8b0d12b27772c64f89cf0d1db95186dca5b1871babc5108ff44f36305e6',
    symbol: '$CASTER',
    decimals: 3,
  },
  {
    assetId: '37b231bbdc0002a4fbbb65de0007a9cf1645a292888711968a8abb9a3e40596e',
    symbol: '$go4me',
    decimals: 3,
  },
  {
    assetId: '0941dc178e75d3699fab42a002034cae455ba5dfc91a9a9f58b62c48c9cea754',
    symbol: '$CHAD',
    decimals: 3,
  },
  {
    assetId: 'ab558b1b841365a24d1ff2264c55982e55664a8b6e45bc107446b7e667bb463b',
    symbol: '$SPROUT',
    decimals: 3,
  },
  {
    assetId: 'dd37f678dda586fad9b1daeae1f7c5c137ffa6d947e1ed5c7b4f3c430da80638',
    symbol: '$PIZZA',
    decimals: 3,
  },
  {
    assetId: '1ad673d21799c9a224014ca71f9fe07cbc836fa23fa97b3be275d46d0b8bd9da',
    symbol: '$NECKCOIN',
    decimals: 3,
  },
  {
    assetId: '3b19b64418682ad60c6278d85f8076a108c9fb4ca385d401c6d41ba2bfa9612e',
    symbol: '$JOCK',
    decimals: 3,
  },
]

/**
 * API Endpoints
 */
export const TIBETSWAP_API_BASE = 'https://api.v2.tibetswap.io'
export const SPACESCAN_API_BASE = 'https://api.spacescan.io'
export const COINGECKO_API_BASE = 'https://api.coingecko.com/api/v3'

/**
 * XCH decimals: 1 XCH = 1,000,000,000,000 mojos (1e12)
 */
export const XCH_DECIMALS = 12

