# Trait Trade Valuation System — Complete Implementation Guide

## Overview

Build an automated **Trait Trade Valuation** system for Wojak Farmers Plot that:
1. Fetches all NFT sales from MintGarden every 30 minutes via Cloudflare Worker
2. Stores processed data in Cloudflare KV
3. Displays trait valuations in a React + Ionic frontend

**Key Constraint:** Only count secondary sales (after December 20, 2025) to exclude primary mint sales.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Cloudflare Infrastructure                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────────┐    ┌──────────────────┐                   │
│  │  Cron Trigger    │───▶│  Worker          │                   │
│  │  (every 30 min)  │    │  (fetch & process)│                  │
│  └──────────────────┘    └────────┬─────────┘                   │
│                                   │                              │
│                                   ▼                              │
│                          ┌──────────────────┐                   │
│                          │  Cloudflare KV   │                   │
│                          │  (cached data)   │                   │
│                          └────────┬─────────┘                   │
│                                   │                              │
│                                   ▼                              │
│                          ┌──────────────────┐                   │
│                          │  Pages Function  │                   │
│                          │  (API endpoint)  │                   │
│                          └────────┬─────────┘                   │
│                                   │                              │
└───────────────────────────────────┼──────────────────────────────┘
                                    │
                                    ▼
                           ┌──────────────────┐
                           │  React Frontend  │
                           │  (Trade Values)  │
                           └──────────────────┘
```

---

## Part 1: Cloudflare Setup

### 1.1 Create KV Namespace

In Cloudflare Dashboard:
1. Go to **Workers & Pages** → **KV**
2. Click **Create a namespace**
3. Name it: `TRADE_VALUES_KV`
4. Note the namespace ID

### 1.2 Project Structure

```
project-root/
├── functions/
│   ├── api/
│   │   └── trade-values.ts      # API endpoint for frontend
│   └── scheduled/
│       └── fetch-sales.ts       # Cron worker (runs every 30 min)
├── src/
│   ├── pages/
│   │   └── TradeValues.tsx      # Frontend page
│   ├── services/
│   │   └── tradeValuesService.ts
│   └── ...
├── wrangler.toml                 # Cloudflare config
└── package.json
```

### 1.3 Wrangler Configuration

Create or update `wrangler.toml` in project root:

```toml
name = "wojak-farmers-plot"
compatibility_date = "2024-01-01"

# KV Namespace binding
[[kv_namespaces]]
binding = "TRADE_VALUES_KV"
id = "YOUR_KV_NAMESPACE_ID_HERE"  # Replace with actual ID from dashboard

# Cron trigger - runs every 30 minutes
[triggers]
crons = ["*/30 * * * *"]

# Environment variables (set in dashboard for secrets)
# MINTGARDEN_API_BASE = "https://api.mintgarden.io"
```

### 1.4 Bind KV to Pages

In Cloudflare Dashboard:
1. Go to **Pages** → Your project → **Settings** → **Functions**
2. Under **KV namespace bindings**, add:
   - Variable name: `TRADE_VALUES_KV`
   - KV namespace: Select `TRADE_VALUES_KV`

---

## Part 2: Scheduled Worker (Cron Job)

This worker runs every 30 minutes, fetches new sales from MintGarden, and stores processed data in KV.

### 2.1 Create the Worker

Create `functions/scheduled/fetch-sales.ts`:

```typescript
// functions/scheduled/fetch-sales.ts
// Runs every 30 minutes via Cloudflare Cron Trigger

interface Env {
  TRADE_VALUES_KV: KVNamespace;
}

interface NFTEvent {
  type: string;           // 'trade', 'mint', 'transfer'
  timestamp: string;      // ISO timestamp
  price_mojo?: number;    // Price in mojos (1 XCH = 1,000,000,000,000 mojos)
  xch_price?: number;     // Price in XCH (some responses include this directly)
}

interface NFTData {
  encoded_id: string;     // Launcher ID
  data?: {
    metadata_json?: {
      attributes?: Array<{
        trait_type: string;
        value: string;
      }>;
    };
  };
  events?: NFTEvent[];
}

interface Sale {
  edition: number;
  price_xch: number;
  timestamp: string;
  traits: Record<string, string>;
}

interface TraitStats {
  trait_name: string;
  trait_category: string;
  total_sales: number;
  outliers_excluded: number;
  average_xch: number;
  min_xch: number;
  max_xch: number;
  last_trade: string | null;
}

interface StoredData {
  trait_stats: TraitStats[];
  all_sales: Sale[];
  total_sales_count: number;
  last_updated: string;
  fetch_duration_ms: number;
}

// Configuration
const CONFIG = {
  COLLECTION_ID: 'col1wfptqxfx99l8m9h5wd0xfm87hmp5h79kd6w5v33mhgmqdutmpvqsvt3w4s', // Wojak Farmers Plot
  SECONDARY_SALES_CUTOFF: '2025-12-20T00:00:00Z', // Only count sales after this date
  RATE_LIMIT_DELAY_MS: 500,  // 500ms between requests (2 req/sec)
  MAX_RETRIES: 3,
  PAGE_SIZE: 100,
  MOJO_TO_XCH: 1_000_000_000_000,
};

// Rate-limited fetch with retry
async function rateLimitedFetch(
  url: string, 
  retryCount = 0
): Promise<Response> {
  // Delay before request
  if (retryCount > 0) {
    const backoffMs = Math.min(1000 * Math.pow(2, retryCount), 30000);
    await sleep(backoffMs);
  } else {
    await sleep(CONFIG.RATE_LIMIT_DELAY_MS);
  }

  const response = await fetch(url, {
    headers: {
      'Accept': 'application/json',
      'User-Agent': 'WojakFarmersPlot/1.0',
    },
  });

  if (response.status === 429 || response.status >= 500) {
    if (retryCount < CONFIG.MAX_RETRIES) {
      console.log(`Rate limited or server error (${response.status}), retry ${retryCount + 1}...`);
      return rateLimitedFetch(url, retryCount + 1);
    }
    throw new Error(`Failed after ${CONFIG.MAX_RETRIES} retries: ${response.status}`);
  }

  return response;
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Fetch all NFTs in collection (paginated)
async function fetchAllCollectionNFTs(): Promise<NFTData[]> {
  const allNFTs: NFTData[] = [];
  let page = 1;
  let hasMore = true;

  console.log('Fetching collection NFTs...');

  while (hasMore) {
    const url = `https://api.mintgarden.io/collections/${CONFIG.COLLECTION_ID}/nfts?size=${CONFIG.PAGE_SIZE}&page=${page}`;
    const response = await rateLimitedFetch(url);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch NFTs page ${page}: ${response.status}`);
    }

    const data = await response.json() as { nfts?: NFTData[]; items?: NFTData[] };
    const nfts = data.nfts || data.items || [];
    
    allNFTs.push(...nfts);
    console.log(`Fetched page ${page}, got ${nfts.length} NFTs (total: ${allNFTs.length})`);

    if (nfts.length < CONFIG.PAGE_SIZE) {
      hasMore = false;
    } else {
      page++;
    }

    // Safety limit
    if (page > 100) {
      console.warn('Hit page limit, stopping pagination');
      hasMore = false;
    }
  }

  return allNFTs;
}

// Fetch detailed history for a single NFT
async function fetchNFTHistory(launcherId: string): Promise<NFTEvent[]> {
  const url = `https://api.mintgarden.io/nfts/${launcherId}`;
  const response = await rateLimitedFetch(url);
  
  if (!response.ok) {
    console.warn(`Failed to fetch history for ${launcherId}: ${response.status}`);
    return [];
  }

  const data = await response.json() as NFTData;
  return data.events || [];
}

// Extract traits from NFT metadata
function extractTraits(nft: NFTData): Record<string, string> | null {
  const attributes = nft.data?.metadata_json?.attributes;
  if (!attributes || !Array.isArray(attributes)) return null;

  const traits: Record<string, string> = {};
  for (const attr of attributes) {
    if (attr.trait_type && attr.value) {
      // Normalize category names
      const category = attr.trait_type.toLowerCase().replace(/\s+/g, '_');
      traits[category] = attr.value;
    }
  }

  return Object.keys(traits).length > 0 ? traits : null;
}

// Extract edition number from NFT (assumes name like "Wojak #0042")
function extractEdition(nft: NFTData): number | null {
  const name = nft.data?.metadata_json?.name;
  if (!name) return null;
  
  const match = name.match(/#(\d+)/);
  return match ? parseInt(match[1], 10) : null;
}

// Convert mojo to XCH
function mojoToXCH(mojo: number): number {
  return mojo / CONFIG.MOJO_TO_XCH;
}

// Filter outliers using IQR method
function filterOutliers(prices: number[]): { filtered: number[]; outliersRemoved: number } {
  if (prices.length < 4) {
    return { filtered: prices, outliersRemoved: 0 };
  }

  const sorted = [...prices].sort((a, b) => a - b);
  const q1Index = Math.floor(sorted.length * 0.25);
  const q3Index = Math.floor(sorted.length * 0.75);
  const q1 = sorted[q1Index];
  const q3 = sorted[q3Index];
  const iqr = q3 - q1;
  const lowerBound = q1 - 1.5 * iqr;
  const upperBound = q3 + 1.5 * iqr;

  const filtered = prices.filter(p => p >= lowerBound && p <= upperBound);

  return {
    filtered,
    outliersRemoved: prices.length - filtered.length,
  };
}

// Calculate trait statistics from sales
function calculateTraitStats(sales: Sale[]): TraitStats[] {
  const traitSalesMap = new Map<string, { prices: number[]; timestamps: string[] }>();

  // Group sales by trait
  for (const sale of sales) {
    for (const [category, traitName] of Object.entries(sale.traits)) {
      const key = `${category}:::${traitName}`;
      if (!traitSalesMap.has(key)) {
        traitSalesMap.set(key, { prices: [], timestamps: [] });
      }
      const data = traitSalesMap.get(key)!;
      data.prices.push(sale.price_xch);
      data.timestamps.push(sale.timestamp);
    }
  }

  // Calculate stats for each trait
  const stats: TraitStats[] = [];

  for (const [key, data] of traitSalesMap) {
    const [category, traitName] = key.split(':::');
    const { filtered, outliersRemoved } = filterOutliers(data.prices);

    if (filtered.length === 0) continue;

    const sortedTimestamps = [...data.timestamps].sort().reverse();

    stats.push({
      trait_name: traitName,
      trait_category: category,
      total_sales: filtered.length,
      outliers_excluded: outliersRemoved,
      average_xch: filtered.reduce((a, b) => a + b, 0) / filtered.length,
      min_xch: Math.min(...filtered),
      max_xch: Math.max(...filtered),
      last_trade: sortedTimestamps[0] || null,
    });
  }

  // Sort by average price descending
  stats.sort((a, b) => b.average_xch - a.average_xch);

  return stats;
}

// Main worker handler
export default {
  async scheduled(
    controller: ScheduledController,
    env: Env,
    ctx: ExecutionContext
  ): Promise<void> {
    const startTime = Date.now();
    console.log(`[${new Date().toISOString()}] Starting scheduled sales fetch...`);

    try {
      // Step 1: Fetch all NFTs in collection
      const nfts = await fetchAllCollectionNFTs();
      console.log(`Found ${nfts.length} NFTs in collection`);

      // Step 2: For each NFT, check for trade events after cutoff date
      const allSales: Sale[] = [];
      const cutoffDate = new Date(CONFIG.SECONDARY_SALES_CUTOFF);
      let processedCount = 0;
      let salesFound = 0;

      for (const nft of nfts) {
        processedCount++;
        
        // Log progress every 100 NFTs
        if (processedCount % 100 === 0) {
          console.log(`Processing NFT ${processedCount}/${nfts.length}, found ${salesFound} sales so far...`);
        }

        const edition = extractEdition(nft);
        const traits = extractTraits(nft);
        
        if (!edition || !traits) continue;

        // Check if we need to fetch detailed history
        // Some collection endpoints include events, some don't
        let events = nft.events;
        if (!events || events.length === 0) {
          // Need to fetch individual NFT history
          events = await fetchNFTHistory(nft.encoded_id);
        }

        // Filter for trade events after cutoff
        for (const event of events) {
          if (event.type !== 'trade') continue;

          const eventDate = new Date(event.timestamp);
          if (eventDate <= cutoffDate) continue;

          // Get price (handle both mojo and XCH formats)
          let priceXCH: number;
          if (event.xch_price !== undefined) {
            priceXCH = event.xch_price;
          } else if (event.price_mojo !== undefined) {
            priceXCH = mojoToXCH(event.price_mojo);
          } else {
            continue; // No price info
          }

          if (priceXCH <= 0) continue;

          allSales.push({
            edition,
            price_xch: priceXCH,
            timestamp: event.timestamp,
            traits,
          });
          salesFound++;
        }
      }

      console.log(`Processed ${processedCount} NFTs, found ${allSales.length} secondary sales`);

      // Step 3: Calculate trait statistics
      const traitStats = calculateTraitStats(allSales);
      console.log(`Calculated stats for ${traitStats.length} traits`);

      // Step 4: Store in KV
      const storedData: StoredData = {
        trait_stats: traitStats,
        all_sales: allSales,
        total_sales_count: allSales.length,
        last_updated: new Date().toISOString(),
        fetch_duration_ms: Date.now() - startTime,
      };

      await env.TRADE_VALUES_KV.put(
        'trade_values_data',
        JSON.stringify(storedData),
        {
          // Cache metadata for quick access
          metadata: {
            total_sales: allSales.length,
            total_traits: traitStats.length,
            last_updated: storedData.last_updated,
          },
        }
      );

      console.log(`✅ Successfully stored data in KV (took ${storedData.fetch_duration_ms}ms)`);

    } catch (error) {
      console.error('❌ Error in scheduled fetch:', error);
      throw error;
    }
  },

  // Also allow manual trigger via HTTP
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    
    if (url.pathname === '/trigger-fetch') {
      // Manually trigger the fetch (useful for testing)
      ctx.waitUntil(this.scheduled({} as ScheduledController, env, ctx));
      return new Response(JSON.stringify({ message: 'Fetch triggered' }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response('Not found', { status: 404 });
  },
};
```

---

## Part 3: API Endpoint (Pages Function)

This endpoint serves the cached data to the frontend.

### 3.1 Create the API Endpoint

Create `functions/api/trade-values.ts`:

```typescript
// functions/api/trade-values.ts
// API endpoint that serves cached trade values data from KV

interface Env {
  TRADE_VALUES_KV: KVNamespace;
}

interface StoredData {
  trait_stats: TraitStats[];
  all_sales: Sale[];
  total_sales_count: number;
  last_updated: string;
  fetch_duration_ms: number;
}

interface TraitStats {
  trait_name: string;
  trait_category: string;
  total_sales: number;
  outliers_excluded: number;
  average_xch: number;
  min_xch: number;
  max_xch: number;
  last_trade: string | null;
}

interface Sale {
  edition: number;
  price_xch: number;
  timestamp: string;
  traits: Record<string, string>;
}

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json',
};

export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  // Handle CORS preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (request.method !== 'GET') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: corsHeaders }
    );
  }

  try {
    // Get data from KV
    const data = await env.TRADE_VALUES_KV.get('trade_values_data', 'json') as StoredData | null;

    if (!data) {
      return new Response(
        JSON.stringify({ 
          error: 'No data available yet. Data is being fetched.',
          trait_stats: [],
          all_sales: [],
          total_sales_count: 0,
          last_updated: null,
        }),
        { status: 200, headers: corsHeaders }
      );
    }

    // Parse query params for filtering
    const url = new URL(request.url);
    const category = url.searchParams.get('category');
    const includeSales = url.searchParams.get('include_sales') === 'true';

    let responseData: Partial<StoredData> = {
      trait_stats: data.trait_stats,
      total_sales_count: data.total_sales_count,
      last_updated: data.last_updated,
    };

    // Filter by category if specified
    if (category && category !== 'all') {
      responseData.trait_stats = data.trait_stats.filter(
        t => t.trait_category.toLowerCase() === category.toLowerCase()
      );
    }

    // Include full sales data only if requested (larger payload)
    if (includeSales) {
      responseData.all_sales = data.all_sales;
    }

    return new Response(
      JSON.stringify(responseData),
      { 
        status: 200, 
        headers: {
          ...corsHeaders,
          'Cache-Control': 'public, max-age=60', // Client can cache for 1 minute
        },
      }
    );

  } catch (error) {
    console.error('Error fetching trade values:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: corsHeaders }
    );
  }
};

// Also support /api/trade-values/sales/:trait endpoint for specific trait sales
export const onRequestGet: PagesFunction<Env> = onRequest;
```

### 3.2 Trait-Specific Sales Endpoint

Create `functions/api/trade-values/[trait].ts` for fetching sales of a specific trait:

```typescript
// functions/api/trade-values/[trait].ts
// Returns recent sales for a specific trait

interface Env {
  TRADE_VALUES_KV: KVNamespace;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json',
};

export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env, params } = context;

  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const traitName = params.trait as string;
  if (!traitName) {
    return new Response(
      JSON.stringify({ error: 'Trait name required' }),
      { status: 400, headers: corsHeaders }
    );
  }

  try {
    const data = await env.TRADE_VALUES_KV.get('trade_values_data', 'json') as any;
    
    if (!data) {
      return new Response(
        JSON.stringify({ error: 'No data available' }),
        { status: 404, headers: corsHeaders }
      );
    }

    // Find sales containing this trait
    const decodedTrait = decodeURIComponent(traitName);
    const traitSales = data.all_sales.filter((sale: any) => 
      Object.values(sale.traits).some(
        (t: any) => t.toLowerCase() === decodedTrait.toLowerCase()
      )
    );

    // Sort by timestamp descending (most recent first)
    traitSales.sort((a: any, b: any) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    // Return top 20 recent sales
    return new Response(
      JSON.stringify({
        trait_name: decodedTrait,
        sales: traitSales.slice(0, 20),
        total_sales: traitSales.length,
      }),
      { status: 200, headers: corsHeaders }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: corsHeaders }
    );
  }
};
```

---

## Part 4: Frontend Service Layer

### 4.1 Trade Values Service

Create `src/services/tradeValuesService.ts`:

```typescript
// src/services/tradeValuesService.ts

export interface TraitStats {
  trait_name: string;
  trait_category: string;
  total_sales: number;
  outliers_excluded: number;
  average_xch: number;
  min_xch: number;
  max_xch: number;
  last_trade: string | null;
  current_floor_xch?: number | null;  // Added from listings
}

export interface Sale {
  edition: number;
  price_xch: number;
  timestamp: string;
  traits: Record<string, string>;
}

export interface TradeValuesData {
  trait_stats: TraitStats[];
  all_sales?: Sale[];
  total_sales_count: number;
  last_updated: string | null;
}

export interface TraitSalesData {
  trait_name: string;
  sales: Sale[];
  total_sales: number;
}

const API_BASE = '/api/trade-values';

// Fetch trait statistics
export async function fetchTradeValues(category?: string): Promise<TradeValuesData> {
  const params = new URLSearchParams();
  if (category && category !== 'all') {
    params.set('category', category);
  }

  const url = `${API_BASE}${params.toString() ? '?' + params.toString() : ''}`;
  
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch trade values: ${response.status}`);
  }

  return response.json();
}

// Fetch sales for a specific trait
export async function fetchTraitSales(traitName: string): Promise<TraitSalesData> {
  const response = await fetch(`${API_BASE}/${encodeURIComponent(traitName)}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch trait sales: ${response.status}`);
  }

  return response.json();
}

// Merge with current floor prices from existing market service
// Import your existing fetchMintGardenListings function
import { fetchMintGardenListings } from './marketApi'; // Adjust import path

export async function fetchTradeValuesWithFloors(): Promise<TradeValuesData> {
  // Fetch both in parallel
  const [tradeData, listings] = await Promise.all([
    fetchTradeValues(),
    fetchMintGardenListings().catch(() => []), // Don't fail if listings fail
  ]);

  // Build floor price map from listings
  const floorPrices = new Map<string, number>();
  
  for (const listing of listings) {
    // Extract traits from listing and find lowest price per trait
    const traits = listing.traits || listing.metadata?.attributes || [];
    for (const trait of traits) {
      const traitName = trait.value || trait.name;
      if (!traitName) continue;
      
      const price = listing.xch_price || listing.price_xch;
      if (!price) continue;

      const currentFloor = floorPrices.get(traitName);
      if (!currentFloor || price < currentFloor) {
        floorPrices.set(traitName, price);
      }
    }
  }

  // Merge floor prices into trait stats
  const statsWithFloors = tradeData.trait_stats.map(stat => ({
    ...stat,
    current_floor_xch: floorPrices.get(stat.trait_name) ?? null,
  }));

  return {
    ...tradeData,
    trait_stats: statsWithFloors,
  };
}
```

### 4.2 React Hook

Create `src/hooks/useTradeValues.ts`:

```typescript
// src/hooks/useTradeValues.ts
import { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  fetchTradeValuesWithFloors, 
  fetchTraitSales,
  TraitStats, 
  Sale,
  TraitSalesData,
} from '../services/tradeValuesService';

export type SortField = keyof TraitStats;
export type SortDirection = 'asc' | 'desc';

export function useTradeValues() {
  const [traitStats, setTraitStats] = useState<TraitStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [totalSalesCount, setTotalSalesCount] = useState(0);

  // Sorting
  const [sortField, setSortField] = useState<SortField>('average_xch');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  // Filtering
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Selected trait for detail view
  const [selectedTrait, setSelectedTrait] = useState<TraitStats | null>(null);
  const [selectedTraitSales, setSelectedTraitSales] = useState<Sale[]>([]);
  const [loadingTraitSales, setLoadingTraitSales] = useState(false);

  // Fetch main data
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const data = await fetchTradeValuesWithFloors();
      setTraitStats(data.trait_stats);
      setLastUpdated(data.last_updated);
      setTotalSalesCount(data.total_sales_count);
    } catch (err) {
      setError('Failed to load trade data. Pull down to retry.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Fetch sales for selected trait
  const loadTraitSales = useCallback(async (traitName: string) => {
    try {
      setLoadingTraitSales(true);
      const data = await fetchTraitSales(traitName);
      setSelectedTraitSales(data.sales);
    } catch (err) {
      console.error('Failed to load trait sales:', err);
      setSelectedTraitSales([]);
    } finally {
      setLoadingTraitSales(false);
    }
  }, []);

  // When trait is selected, load its sales
  useEffect(() => {
    if (selectedTrait) {
      loadTraitSales(selectedTrait.trait_name);
    } else {
      setSelectedTraitSales([]);
    }
  }, [selectedTrait, loadTraitSales]);

  // Filtered & sorted data
  const filteredStats = useMemo(() => {
    let result = [...traitStats];

    // Category filter
    if (categoryFilter !== 'all') {
      result = result.filter(
        t => t.trait_category.toLowerCase() === categoryFilter.toLowerCase()
      );
    }

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(t => 
        t.trait_name.toLowerCase().includes(query)
      );
    }

    // Sort
    result.sort((a, b) => {
      const aVal = a[sortField] ?? 0;
      const bVal = b[sortField] ?? 0;
      
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        const comparison = aVal.localeCompare(bVal);
        return sortDirection === 'asc' ? comparison : -comparison;
      }
      
      const comparison = (aVal as number) < (bVal as number) ? -1 : (aVal as number) > (bVal as number) ? 1 : 0;
      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [traitStats, categoryFilter, searchQuery, sortField, sortDirection]);

  // Handle sort column click
  const handleSort = useCallback((field: SortField) => {
    if (field === sortField) {
      setSortDirection(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  }, [sortField]);

  // Get unique categories for filter dropdown
  const categories = useMemo(() => {
    const cats = new Set(traitStats.map(t => t.trait_category));
    return ['all', ...Array.from(cats).sort()];
  }, [traitStats]);

  return {
    // Data
    traitStats,
    filteredStats,
    loading,
    error,
    lastUpdated,
    totalSalesCount,
    traitCount: traitStats.length,
    categories,

    // Sorting
    sortField,
    sortDirection,
    handleSort,

    // Filtering
    categoryFilter,
    setCategoryFilter,
    searchQuery,
    setSearchQuery,

    // Detail view
    selectedTrait,
    setSelectedTrait,
    selectedTraitSales,
    loadingTraitSales,

    // Actions
    refresh: loadData,
  };
}
```

---

## Part 5: Frontend Components

### 5.1 Main Page Component

Create `src/pages/TradeValues.tsx`:

```tsx
// src/pages/TradeValues.tsx
import React from 'react';
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonIcon,
  IonSearchbar,
  IonSelect,
  IonSelectOption,
  IonSpinner,
  IonRefresher,
  IonRefresherContent,
  IonModal,
  IonButtons,
  IonButton,
  RefresherEventDetail,
} from '@ionic/react';
import { statsChart, close } from 'ionicons/icons';
import { useTradeValues } from '../hooks/useTradeValues';
import { TraitTable } from '../components/TradeValues/TraitTable';
import { TraitDetailContent } from '../components/TradeValues/TraitDetailContent';
import { formatRelativeTime } from '../utils/formatters';
import './TradeValues.css';

const TradeValues: React.FC = () => {
  const {
    filteredStats,
    loading,
    error,
    lastUpdated,
    totalSalesCount,
    traitCount,
    categories,
    sortField,
    sortDirection,
    handleSort,
    categoryFilter,
    setCategoryFilter,
    searchQuery,
    setSearchQuery,
    selectedTrait,
    setSelectedTrait,
    selectedTraitSales,
    loadingTraitSales,
    refresh,
  } = useTradeValues();

  const handleRefresh = async (event: CustomEvent<RefresherEventDetail>) => {
    await refresh();
    event.detail.complete();
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Trade Values</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent className="trade-values-content">
        <IonRefresher slot="fixed" onIonRefresh={handleRefresh}>
          <IonRefresherContent />
        </IonRefresher>

        {/* Filter Card */}
        <IonCard className="filter-card">
          <IonCardContent>
            <div className="filter-row">
              <IonSelect
                value={categoryFilter}
                onIonChange={e => setCategoryFilter(e.detail.value)}
                interface="popover"
                className="category-select"
                placeholder="Category"
              >
                {categories.map(cat => (
                  <IonSelectOption key={cat} value={cat}>
                    {cat === 'all' ? 'All Categories' : cat.replace(/_/g, ' ')}
                  </IonSelectOption>
                ))}
              </IonSelect>
              <IonSearchbar
                value={searchQuery}
                onIonInput={e => setSearchQuery(e.detail.value || '')}
                placeholder="Search traits..."
                className="trait-search"
                debounce={300}
              />
            </div>
          </IonCardContent>
        </IonCard>

        {/* Main Content */}
        {loading ? (
          <div className="loading-container">
            <IonSpinner name="crescent" />
            <p>Loading trade data...</p>
          </div>
        ) : error ? (
          <div className="error-container">
            <p>{error}</p>
          </div>
        ) : (
          <>
            {/* Values Card */}
            <IonCard className="values-card">
              <IonCardHeader>
                <IonCardTitle className="section-title">
                  <IonIcon icon={statsChart} className="section-icon" />
                  Trait Values
                  <span className="trait-count">({filteredStats.length})</span>
                </IonCardTitle>
              </IonCardHeader>
              <IonCardContent>
                <TraitTable
                  data={filteredStats}
                  sortField={sortField}
                  sortDirection={sortDirection}
                  onSort={handleSort}
                  onRowClick={setSelectedTrait}
                />
              </IonCardContent>
            </IonCard>

            {/* Status Bar */}
            <div className="status-bar">
              <span>{totalSalesCount} sales analyzed</span>
              <span className="divider">•</span>
              <span>{traitCount} traits</span>
              <span className="divider">•</span>
              <span>Updated {formatRelativeTime(lastUpdated)}</span>
            </div>
          </>
        )}

        {/* Detail Modal */}
        <IonModal 
          isOpen={!!selectedTrait} 
          onDidDismiss={() => setSelectedTrait(null)}
          className="trait-detail-modal"
        >
          <IonHeader>
            <IonToolbar>
              <IonTitle>{selectedTrait?.trait_name}</IonTitle>
              <IonButtons slot="end">
                <IonButton onClick={() => setSelectedTrait(null)}>
                  <IonIcon icon={close} />
                </IonButton>
              </IonButtons>
            </IonToolbar>
          </IonHeader>
          <IonContent className="trait-detail-content">
            {selectedTrait && (
              <TraitDetailContent
                trait={selectedTrait}
                sales={selectedTraitSales}
                loading={loadingTraitSales}
              />
            )}
          </IonContent>
        </IonModal>
      </IonContent>
    </IonPage>
  );
};

export default TradeValues;
```

### 5.2 Trait Table Component

Create `src/components/TradeValues/TraitTable.tsx`:

```tsx
// src/components/TradeValues/TraitTable.tsx
import React from 'react';
import { TraitStats } from '../../services/tradeValuesService';
import { formatRelativeTime } from '../../utils/formatters';
import './TraitTable.css';

interface TraitTableProps {
  data: TraitStats[];
  sortField: keyof TraitStats;
  sortDirection: 'asc' | 'desc';
  onSort: (field: keyof TraitStats) => void;
  onRowClick: (trait: TraitStats) => void;
}

export const TraitTable: React.FC<TraitTableProps> = ({
  data,
  sortField,
  sortDirection,
  onSort,
  onRowClick,
}) => {
  const renderSortIndicator = (field: keyof TraitStats) => {
    if (sortField !== field) return null;
    return sortDirection === 'asc' ? ' ▲' : ' ▼';
  };

  const getFloorClass = (trait: TraitStats) => {
    if (!trait.current_floor_xch) return '';
    if (trait.current_floor_xch < trait.average_xch * 0.9) return 'floor-undervalued';
    if (trait.current_floor_xch > trait.average_xch * 1.1) return 'floor-overvalued';
    return '';
  };

  if (data.length === 0) {
    return (
      <div className="empty-state">
        <p>No traits found matching your filters.</p>
      </div>
    );
  }

  return (
    <div className="trait-table-container">
      <table className="trait-table">
        <thead>
          <tr>
            <th onClick={() => onSort('trait_name')}>
              Trait{renderSortIndicator('trait_name')}
            </th>
            <th className="hide-mobile" onClick={() => onSort('trait_category')}>
              Category{renderSortIndicator('trait_category')}
            </th>
            <th className="hide-mobile" onClick={() => onSort('total_sales')}>
              Sales{renderSortIndicator('total_sales')}
            </th>
            <th onClick={() => onSort('average_xch')}>
              Avg{renderSortIndicator('average_xch')}
            </th>
            <th className="hide-mobile" onClick={() => onSort('min_xch')}>
              Min{renderSortIndicator('min_xch')}
            </th>
            <th className="hide-mobile" onClick={() => onSort('max_xch')}>
              Max{renderSortIndicator('max_xch')}
            </th>
            <th onClick={() => onSort('current_floor_xch')}>
              Floor{renderSortIndicator('current_floor_xch')}
            </th>
            <th className="hide-mobile" onClick={() => onSort('last_trade')}>
              Last{renderSortIndicator('last_trade')}
            </th>
          </tr>
        </thead>
        <tbody>
          {data.map((trait) => (
            <tr
              key={`${trait.trait_category}-${trait.trait_name}`}
              onClick={() => onRowClick(trait)}
            >
              <td className="trait-name">{trait.trait_name}</td>
              <td className="trait-category hide-mobile">
                {trait.trait_category.replace(/_/g, ' ')}
              </td>
              <td className="hide-mobile">{trait.total_sales}</td>
              <td className="price">{trait.average_xch.toFixed(2)}</td>
              <td className="price hide-mobile">{trait.min_xch.toFixed(2)}</td>
              <td className="price hide-mobile">{trait.max_xch.toFixed(2)}</td>
              <td className={`price ${getFloorClass(trait)}`}>
                {trait.current_floor_xch?.toFixed(2) ?? '—'}
              </td>
              <td className="last-trade hide-mobile">
                {formatRelativeTime(trait.last_trade)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
```

### 5.3 Trait Detail Component

Create `src/components/TradeValues/TraitDetailContent.tsx`:

```tsx
// src/components/TradeValues/TraitDetailContent.tsx
import React from 'react';
import { IonCard, IonCardContent, IonSpinner } from '@ionic/react';
import { TraitStats, Sale } from '../../services/tradeValuesService';
import { formatRelativeTime } from '../../utils/formatters';
import './TraitDetailContent.css';

interface TraitDetailContentProps {
  trait: TraitStats;
  sales: Sale[];
  loading: boolean;
}

export const TraitDetailContent: React.FC<TraitDetailContentProps> = ({
  trait,
  sales,
  loading,
}) => {
  const formatDate = (timestamp: string | null) => {
    if (!timestamp) return '—';
    return new Date(timestamp).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <div className="trait-detail-wrapper">
      <IonCard className="detail-card">
        <IonCardContent>
          <div className="stat-grid">
            <div className="stat-item">
              <span className="stat-label">Category</span>
              <span className="stat-value">
                {trait.trait_category.replace(/_/g, ' ')}
              </span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Total Sales</span>
              <span className="stat-value">
                {trait.total_sales}
                {trait.outliers_excluded > 0 && (
                  <span className="outlier-note">
                    ({trait.outliers_excluded} outlier{trait.outliers_excluded > 1 ? 's' : ''} excluded)
                  </span>
                )}
              </span>
            </div>

            <div className="stat-item highlight">
              <span className="stat-label">Average Price</span>
              <span className="stat-value price">
                {trait.average_xch.toFixed(2)} XCH
              </span>
            </div>

            <div className="stat-item">
              <span className="stat-label">Price Range</span>
              <span className="stat-value">
                {trait.min_xch.toFixed(2)} – {trait.max_xch.toFixed(2)} XCH
              </span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Current Floor</span>
              <span className="stat-value floor">
                {trait.current_floor_xch?.toFixed(2) ?? 'No listings'} XCH
              </span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Last Sold</span>
              <span className="stat-value">{formatDate(trait.last_trade)}</span>
            </div>
          </div>
        </IonCardContent>
      </IonCard>

      {/* Recent Sales */}
      <IonCard className="sales-card">
        <IonCardContent>
          <h3 className="recent-sales-title">Recent Sales</h3>
          
          {loading ? (
            <div className="sales-loading">
              <IonSpinner name="dots" />
            </div>
          ) : sales.length === 0 ? (
            <p className="no-sales">No recent sales data available.</p>
          ) : (
            <div className="recent-sales-list">
              {sales.slice(0, 10).map((sale, index) => (
                <div className="sale-item" key={`${sale.edition}-${index}`}>
                  <span className="sale-edition">#{sale.edition}</span>
                  <span className="sale-price">{sale.price_xch.toFixed(2)} XCH</span>
                  <span className="sale-time">{formatRelativeTime(sale.timestamp)}</span>
                </div>
              ))}
            </div>
          )}
        </IonCardContent>
      </IonCard>
    </div>
  );
};
```

### 5.4 Utility Functions

Create or update `src/utils/formatters.ts`:

```typescript
// src/utils/formatters.ts

export function formatRelativeTime(timestamp: string | null): string {
  if (!timestamp) return '—';

  const now = new Date();
  const date = new Date(timestamp);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 30) return `${diffDays}d ago`;

  return date.toLocaleDateString();
}

export function formatXCH(value: number | null, decimals = 2): string {
  if (value === null || value === undefined) return '—';
  return value.toFixed(decimals);
}
```

---

## Part 6: CSS Styles

Create `src/pages/TradeValues.css`:

```css
/* ============================================
   Trade Values Page - Tang Gang Cyberpunk Orange
   ============================================ */

.trade-values-content {
  --background: var(--app-background);
}

/* Filter Card */
.filter-card {
  background: var(--app-card-background);
  border-radius: 16px;
  border: 1px solid var(--app-card-border);
  margin: var(--space-md);
}

.filter-row {
  display: flex;
  gap: var(--space-md);
  align-items: center;
  flex-wrap: wrap;
}

.category-select {
  flex: 0 0 auto;
  min-width: 160px;
  --background: rgba(255, 255, 255, 0.05);
  --border-radius: 8px;
  text-transform: capitalize;
}

.trait-search {
  flex: 1;
  --background: rgba(255, 255, 255, 0.05);
  --border-radius: 8px;
  --box-shadow: none;
}

/* Values Card */
.values-card {
  background: var(--app-card-background);
  border-radius: 16px;
  border: 1px solid var(--app-card-border);
  margin: var(--space-md);
}

.section-title {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  color: var(--ion-text-color);
  font-size: 1.1rem;
  font-weight: 600;
}

.section-icon {
  color: var(--ion-color-primary);
  font-size: 1.3rem;
}

.trait-count {
  font-weight: 400;
  font-size: 0.9rem;
  color: rgba(255, 255, 255, 0.5);
  margin-left: var(--space-sm);
}

/* Loading & Error States */
.loading-container,
.error-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  color: rgba(255, 255, 255, 0.6);
}

.loading-container ion-spinner {
  --color: var(--ion-color-primary);
  width: 40px;
  height: 40px;
  margin-bottom: var(--space-md);
}

/* Status Bar */
.status-bar {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: var(--space-sm);
  padding: var(--space-md) var(--space-lg);
  color: rgba(255, 255, 255, 0.4);
  font-size: 0.75rem;
}

.status-bar .divider {
  color: rgba(255, 255, 255, 0.2);
}

/* Detail Modal */
.trait-detail-modal {
  --background: var(--app-background);
}

.trait-detail-content {
  --background: var(--app-background);
}

/* Responsive */
@media (max-width: 600px) {
  .filter-row {
    flex-direction: column;
  }

  .category-select {
    width: 100%;
  }
}
```

Create `src/components/TradeValues/TraitTable.css`:

```css
/* ============================================
   Trait Table Styles
   ============================================ */

.trait-table-container {
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  margin: 0 calc(-1 * var(--space-md));
  padding: 0 var(--space-md);
}

.trait-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.875rem;
}

.trait-table th {
  text-align: left;
  padding: var(--space-sm) var(--space-md);
  color: rgba(255, 255, 255, 0.6);
  font-weight: 500;
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  cursor: pointer;
  user-select: none;
  white-space: nowrap;
  transition: color 0.15s ease;
}

.trait-table th:hover {
  color: var(--ion-color-primary);
}

.trait-table td {
  padding: var(--space-sm) var(--space-md);
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  color: var(--ion-text-color);
}

.trait-table tbody tr {
  transition: background 0.15s ease;
  cursor: pointer;
}

.trait-table tbody tr:hover {
  background: rgba(255, 107, 0, 0.1);
}

.trait-table tbody tr:active {
  background: rgba(255, 107, 0, 0.2);
}

.trait-name {
  font-weight: 500;
  color: #fff;
}

.trait-category {
  color: rgba(255, 255, 255, 0.5);
  font-size: 0.8rem;
  text-transform: capitalize;
}

.price {
  font-family: 'SF Mono', 'Fira Code', 'Roboto Mono', monospace;
  color: var(--ion-color-primary);
}

.last-trade {
  color: rgba(255, 255, 255, 0.5);
  font-size: 0.8rem;
}

/* Floor Price Indicators */
.floor-undervalued {
  color: #4ade80 !important;
  text-shadow: 0 0 8px rgba(74, 222, 128, 0.4);
}

.floor-overvalued {
  color: #f87171 !important;
}

/* Empty State */
.empty-state {
  text-align: center;
  padding: 40px 20px;
  color: rgba(255, 255, 255, 0.5);
}

/* Mobile Responsive */
@media (max-width: 768px) {
  .trait-table {
    font-size: 0.8rem;
  }

  .trait-table th,
  .trait-table td {
    padding: var(--space-sm);
  }

  .hide-mobile {
    display: none;
  }
}
```

Create `src/components/TradeValues/TraitDetailContent.css`:

```css
/* ============================================
   Trait Detail Content Styles
   ============================================ */

.trait-detail-wrapper {
  padding: var(--space-md);
}

.detail-card,
.sales-card {
  background: var(--app-card-background);
  border-radius: 16px;
  border: 1px solid var(--app-card-border);
  margin-bottom: var(--space-md);
}

.stat-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--space-md);
}

.stat-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.stat-item.highlight {
  grid-column: span 2;
  background: linear-gradient(135deg, rgba(255, 107, 0, 0.15), rgba(255, 107, 0, 0.05));
  border: 1px solid rgba(255, 107, 0, 0.25);
  border-radius: var(--radius-md);
  padding: var(--space-md);
  text-align: center;
}

.stat-label {
  font-size: 0.7rem;
  color: rgba(255, 255, 255, 0.5);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.stat-value {
  font-size: 1rem;
  font-weight: 500;
  color: #fff;
}

.stat-value.price {
  color: var(--ion-color-primary);
  font-family: 'SF Mono', 'Fira Code', 'Roboto Mono', monospace;
  font-size: 1.5rem;
}

.stat-value.floor {
  color: #4ade80;
}

.outlier-note {
  font-size: 0.7rem;
  color: rgba(255, 255, 255, 0.4);
  font-weight: 400;
  display: block;
  margin-top: 2px;
}

/* Recent Sales */
.recent-sales-title {
  font-size: 0.9rem;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.8);
  margin: 0 0 var(--space-md) 0;
}

.sales-loading {
  display: flex;
  justify-content: center;
  padding: var(--space-lg);
}

.no-sales {
  text-align: center;
  color: rgba(255, 255, 255, 0.4);
  font-size: 0.875rem;
}

.recent-sales-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.sale-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--space-sm) var(--space-md);
  background: rgba(255, 255, 255, 0.03);
  border-radius: var(--radius-md);
}

.sale-edition {
  font-weight: 500;
  color: #fff;
  font-size: 0.875rem;
}

.sale-price {
  font-family: 'SF Mono', 'Fira Code', 'Roboto Mono', monospace;
  color: var(--ion-color-primary);
  font-size: 0.875rem;
}

.sale-time {
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.4);
}
```

---

## Part 7: Add Route

Update your `App.tsx` to include the new page:

```tsx
// In App.tsx, add the route
import TradeValues from './pages/TradeValues';

// Add to your routes:
<Route path="/trade-values" component={TradeValues} exact />

// If using tabs, add a tab button:
<IonTabButton tab="trade-values" href="/trade-values">
  <IonIcon icon={statsChart} />
  <IonLabel>Trade Values</IonLabel>
</IonTabButton>
```

---

## Part 8: Deployment Checklist

### 8.1 Before First Deploy

1. **Create KV Namespace:**
   - Cloudflare Dashboard → Workers & Pages → KV → Create namespace
   - Name: `TRADE_VALUES_KV`
   - Copy the namespace ID

2. **Update wrangler.toml:**
   - Replace `YOUR_KV_NAMESPACE_ID_HERE` with actual ID

3. **Bind KV to Pages:**
   - Pages → Settings → Functions → KV namespace bindings
   - Variable name: `TRADE_VALUES_KV`
   - Select your namespace

4. **Deploy:**
   ```bash
   npm run build
   npx wrangler pages deploy dist
   ```

### 8.2 After Deploy

1. **Trigger Initial Fetch:**
   - Visit `https://wojak.ink/trigger-fetch` to manually trigger first data fetch
   - Or wait up to 30 minutes for cron to run

2. **Verify Data:**
   - Visit `https://wojak.ink/api/trade-values`
   - Should return JSON with trait_stats

3. **Monitor:**
   - Cloudflare Dashboard → Workers & Pages → Your worker → Logs
   - Check for errors in scheduled runs

---

## Summary

This system:
- Runs automatically every 30 minutes via Cloudflare Cron
- Fetches all NFT sales from MintGarden with rate limiting (500ms delay, 3 retries)
- Filters for secondary sales only (after December 20, 2025)
- Calculates trait statistics with IQR outlier filtering
- Stores everything in Cloudflare KV
- Serves data via API endpoint to React frontend
- Displays in Tang Gang Cyberpunk Orange themed UI

**The user can verify the math:** Average is just sum/count. Outliers are filtered using standard IQR method. Everything is transparent.

**Zero maintenance required:** Once deployed, it runs automatically forever.
