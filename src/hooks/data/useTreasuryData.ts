/**
 * Treasury Data Hooks
 *
 * TanStack Query hooks for treasury/portfolio data.
 */

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo, useState } from 'react';
import { treasuryService } from '@/services/treasuryService';
import { DATA_CACHE_MAP } from '@/config/query/cacheConfig';
import { getTokenLogo } from '@/services/treasuryFallback';
import type { PortfolioSummary, WalletInfo, WalletToken } from '@/types/treasury';
import type { TokenBalance } from '@/services/treasuryService';

// Query keys
export const treasuryKeys = {
  all: ['treasury'] as const,
  walletData: () => [...treasuryKeys.all, 'walletData'] as const,
  xchPrice: () => [...treasuryKeys.all, 'xchPrice'] as const,
} as const;

/**
 * Fetch complete wallet data
 * Shows cached/fallback data IMMEDIATELY, then refreshes in background
 */
export function useTreasuryWalletData() {
  // Get cached data synchronously for instant display (always returns data, never null)
  const cachedData = treasuryService.getCachedWalletData();
  const isCacheStale = treasuryService.isCacheStale();
  // Check if we have actual NFTs (not just empty collections)
  const totalNfts = cachedData?.nftCollections?.reduce((sum, c) => sum + (c.nfts?.length ?? 0), 0) ?? 0;
  const hasActualNfts = totalNfts > 0;

  return useQuery({
    queryKey: treasuryKeys.walletData(),
    queryFn: () => treasuryService.fetchWalletData(),
    // If we have no actual NFTs, set staleTime to 0 to force refetch
    staleTime: hasActualNfts ? DATA_CACHE_MAP.walletBalance.staleTime : 0,
    gcTime: DATA_CACHE_MAP.walletBalance.gcTime,
    // Show cached/fallback data immediately - NEVER show loading state
    initialData: cachedData,
    // Mark initialData as stale if we have no actual NFTs
    initialDataUpdatedAt: hasActualNfts ? undefined : 0,
    // Only refetch if cache is stale or no actual NFTs
    refetchOnMount: isCacheStale || !hasActualNfts,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: false, // Don't retry on failure - just use cache
  });
}

/**
 * Fetch XCH price - shows cached price immediately if fresh enough
 * Max cache age: 1 hour - beyond that, fetch fresh data
 */
export function useXchPrice() {
  const cachedPrice = treasuryService.getCachedXchPrice();
  const cachedData = treasuryService.getCachedWalletData();

  // Check if cached price is fresh enough (max 1 hour old)
  const MAX_PRICE_AGE = 60 * 60 * 1000; // 1 hour
  const [mountTime] = useState(() => Date.now());
  const cacheAge = cachedData?.lastUpdated
    ? mountTime - cachedData.lastUpdated.getTime()
    : Infinity;
  const isCacheFresh = cacheAge < MAX_PRICE_AGE;

  // Only use cached price as initial data if it's less than 1 hour old
  const initialPrice = isCacheFresh ? cachedPrice : undefined;

  return useQuery({
    queryKey: treasuryKeys.xchPrice(),
    queryFn: () => treasuryService.getXchPrice(),
    ...DATA_CACHE_MAP.tokenPrices,
    initialData: initialPrice,
    // If cache is stale (>1hr), mark initialData as old to trigger refetch
    initialDataUpdatedAt: isCacheFresh ? undefined : 0,
  });
}

/**
 * Hook to refresh wallet data
 */
export function useRefreshTreasury() {
  const queryClient = useQueryClient();

  return useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: treasuryKeys.walletData() });
  }, [queryClient]);
}

/**
 * Convert TokenBalance to WalletToken
 */
function convertToWalletToken(token: TokenBalance): WalletToken {
  const valueUSD = token.valueUsd || token.balance * token.priceUsd;

  return {
    id: token.assetId,
    symbol: token.symbol,
    name: token.name,
    type: token.assetId === 'xch' ? 'native' : 'cat',
    balance: BigInt(Math.floor(token.balance * 1e12)), // Convert to mojos
    balanceFormatted: token.balance,
    decimals: 12,
    priceUSD: token.priceUsd,
    valueUSD: valueUSD,
    logoUrl: getTokenLogo(token.symbol, token.logoUrl), // Use custom icons if available
    logoFallback: token.symbol.charAt(0).toUpperCase(),
    color: token.color || '#4ade80',
    isVisible: valueUSD >= 10, // $10 minimum to appear in bubble map
  };
}

/**
 * Combined treasury data hook
 */
export function useTreasury() {
  const walletData = useTreasuryWalletData();
  const xchPrice = useXchPrice();
  const refreshTreasury = useRefreshTreasury();

  return {
    walletData: walletData.data ?? null,
    xchBalance: walletData.data?.xchBalance ?? 0,
    xchPriceUsd: xchPrice.data ?? walletData.data?.xchPriceUsd ?? 0,
    tokens: walletData.data?.tokens ?? [],
    nftCollections: walletData.data?.nftCollections ?? [],
    totalTokenValueUsd: walletData.data?.totalTokenValueUsd ?? 0,
    isLoading: walletData.isLoading,
    isRefreshing: walletData.isFetching && !walletData.isLoading,
    error: walletData.error,
    refreshPrices: refreshTreasury,
    lastUpdated: walletData.data?.lastUpdated ?? null,
    explorerUrl: treasuryService.getWalletExplorerUrl(),
  };
}

// Legacy hooks for backward compatibility
export function useTreasuryPortfolio() {
  const walletData = useTreasuryWalletData();

  const portfolioData = useMemo((): PortfolioSummary | null => {
    if (!walletData.data) return null;

    const xchValueUSD = walletData.data.xchBalance * walletData.data.xchPriceUsd;
    const catsValueUSD = walletData.data.totalTokenValueUsd;
    const totalValueUSD = xchValueUSD + catsValueUSD;

    // Convert tokens to WalletToken format
    const tokens: WalletToken[] = walletData.data.tokens.map(convertToWalletToken);

    // Add XCH as the first token
    const xchToken: WalletToken = {
      id: 'xch',
      symbol: 'XCH',
      name: 'Chia',
      type: 'native',
      balance: BigInt(walletData.data.xchBalanceMojos),
      balanceFormatted: walletData.data.xchBalance,
      decimals: 12,
      priceUSD: walletData.data.xchPriceUsd,
      valueUSD: xchValueUSD,
      logoUrl: '/assets/icons/icon_XCH.png',
      logoFallback: 'X',
      color: '#4ade80',
      isVisible: xchValueUSD >= 10, // $10 minimum to appear in bubble map
    };

    const allTokens = [xchToken, ...tokens];
    const visibleTokens = allTokens.filter(t => t.isVisible);
    const smallTokens = allTokens.filter(t => !t.isVisible);

    return {
      totalValueUSD,
      totalValueXCH: totalValueUSD / walletData.data.xchPriceUsd,
      xchValueUSD,
      catsValueUSD,
      xchPriceUSD: walletData.data.xchPriceUsd,
      lastUpdated: walletData.data.lastUpdated,
      tokens: allTokens,
      visibleTokens,
      smallTokens,
      tokenCount: allTokens.length,
      visibleTokenCount: visibleTokens.length,
    };
  }, [walletData.data]);

  return {
    data: portfolioData,
    isLoading: walletData.isLoading,
    isFetching: walletData.isFetching,
    error: walletData.error,
  };
}

export function useTreasuryWallet() {
  const walletData = useTreasuryWalletData();

  const walletInfo = useMemo((): WalletInfo | null => {
    if (!walletData.data) return null;

    const explorerUrl = treasuryService.getWalletExplorerUrl();
    const address = explorerUrl.split('/').pop() || '';
    const addressTruncated = address.length > 12
      ? `${address.slice(0, 8)}...${address.slice(-4)}`
      : address;

    return {
      address,
      addressTruncated,
      explorerUrl,
      isConnected: true,
    };
  }, [walletData.data]);

  return {
    data: walletInfo,
    isLoading: walletData.isLoading,
    isFetching: walletData.isFetching,
    error: walletData.error,
  };
}

export function useRefreshPortfolio() {
  return useRefreshTreasury();
}
