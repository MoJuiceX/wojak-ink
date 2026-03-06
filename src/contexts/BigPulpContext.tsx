/* eslint-disable react-refresh/only-export-components */
/**
 * BigPulp Context
 *
 * State management for the BigPulp Intelligence system.
 */

import {
  createContext,
  useContext,
  useReducer,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type {
  NFTAnalysis,
  BigPulpState,
  BigPulpMood,
  BigPulpTab,
  MarketStats,
  HeatMapCell,
  PriceDistribution,
  AttributeStats,
  NFTSale,
  NFTBasic,
  HeatMapViewMode,
} from '@/types/bigpulp';
import {
  generateBigPulpResponse,
  getSearchingMessage,
  getErrorMessage,
  getWelcomeMessage,
} from '@/config/bigpulpResponses';
import { getBigPulpV9Entry, type BigPulpNFTData } from '@/services/bigPulpV9Service';
import {
  useBigPulpMarketStats,
  useBigPulpHeatMap,
  useBigPulpPriceDistribution,
  useBigPulpAttributes,
  useBigPulpTopSales,
  useBigPulpRarestFinds,
  useSearchNFTMutation,
  useRandomAnalysisMutation,
  useHeatmapCacheMetadata,
} from '@/hooks/data/useBigPulpData';
import type { CacheMetadata } from '@/services/heatmapCache';
import { loadBadgeSystem, loadBadgeMapping, type BadgeMapping } from '@/services/badgeService';
import type { BadgeOption } from '@/components/bigpulp/HeatMap';

// ============ State Types ============

interface BigPulpContextState {
  // NFT Analysis
  currentAnalysis: NFTAnalysis | null;
  searchQuery: string;
  isLoading: boolean;
  error: string | null;

  // BigPulp Character
  bigPulp: BigPulpState;

  // NFT Data from big_pulp_v9_output.json
  currentNftDescription: string | null;
  currentNftHeadTrait: string | null;
  currentNftTraits: Record<string, string> | null;
  currentNftHpTraits: string[] | null;
  currentNftNamedCombos: string[] | null;
  currentNftCultures: string[] | null;
  currentNftIsFiveHp: boolean;
  currentNftIsHomieEdition: boolean;
  currentNftHomieName: string | null;

  // Tab State
  activeTab: BigPulpTab;
  isModalOpen: boolean; // Mobile modal

  // Market Data
  marketStats: MarketStats | null;
  heatMapData: HeatMapCell[][] | null;
  heatMapViewMode: HeatMapViewMode;
  priceDistribution: PriceDistribution | null;

  // Attributes Data
  attributes: AttributeStats[];
  selectedCategory: string | null;

  // Ask Tab Data
  topSales: NFTSale[];
  rarestFinds: NFTBasic[];
}

// ============ Action Types ============

interface V9NftPayload {
  traits: Record<string, string> | null;
  description: string | null;
  headTrait: string | null;
  hpTraits: string[] | null;
  namedCombos: string[] | null;
  cultures: string[] | null;
  isFiveHp: boolean;
  isHomieEdition: boolean;
  homieName: string | null;
}

type BigPulpAction =
  | { type: 'SET_SEARCH_QUERY'; payload: string }
  | { type: 'START_SEARCH' }
  | { type: 'SEARCH_SUCCESS'; payload: { analysis: NFTAnalysis } & V9NftPayload }
  | { type: 'SEARCH_ERROR'; payload: string }
  | { type: 'CLEAR_SEARCH' }
  | { type: 'SET_TAB'; payload: BigPulpTab }
  | { type: 'TOGGLE_MODAL'; payload: boolean }
  | { type: 'SET_HEATMAP_VIEW_MODE'; payload: HeatMapViewMode }
  | { type: 'SET_CATEGORY_FILTER'; payload: string | null }
  | { type: 'UPDATE_BIGPULP_MESSAGE'; payload: { message: string; mood: BigPulpMood } }
  | { type: 'SET_BIGPULP_TYPING'; payload: boolean }
  | { type: 'ADVANCE_MESSAGE_QUEUE' }
  | { type: 'SET_BIGPULP_HEAD_VARIANT'; payload: string }
  | { type: 'LOAD_MARKET_DATA'; payload: { stats?: MarketStats; heatMap?: HeatMapCell[][]; distribution?: PriceDistribution } }
  | { type: 'LOAD_ATTRIBUTES'; payload: AttributeStats[] }
  | { type: 'LOAD_ASK_DATA'; payload: { topSales: NFTSale[]; rarestFinds: NFTBasic[] } }
  | { type: 'UPDATE_NFT_TRAITS'; payload: V9NftPayload };

// ============ Initial State ============

const initialBigPulpState: BigPulpState = {
  mood: 'chill',
  headVariant: 'default',
  message: getWelcomeMessage(),
  isTyping: true,
  messageQueue: [],
};

const initialState: BigPulpContextState = {
  currentAnalysis: null,
  searchQuery: '',
  isLoading: false,
  error: null,
  bigPulp: initialBigPulpState,
  currentNftDescription: null,
  currentNftHeadTrait: null,
  currentNftTraits: null,
  currentNftHpTraits: null,
  currentNftNamedCombos: null,
  currentNftCultures: null,
  currentNftIsFiveHp: false,
  currentNftIsHomieEdition: false,
  currentNftHomieName: null,
  activeTab: 'market',
  isModalOpen: false,
  marketStats: null,
  heatMapData: null,
  heatMapViewMode: 'all',
  priceDistribution: null,
  attributes: [],
  selectedCategory: null,
  topSales: [],
  rarestFinds: [],
};

// ============ Reducer ============

function bigPulpReducer(
  state: BigPulpContextState,
  action: BigPulpAction
): BigPulpContextState {
  switch (action.type) {
    case 'SET_SEARCH_QUERY':
      return {
        ...state,
        searchQuery: action.payload,
        error: null,
      };

    case 'START_SEARCH':
      return {
        ...state,
        isLoading: true,
        error: null,
        bigPulp: {
          ...state.bigPulp,
          message: getSearchingMessage(),
          mood: 'thinking',
          isTyping: true,
          messageQueue: [],
        },
      };

    case 'SEARCH_SUCCESS': {
      const { analysis, description, headTrait, traits, hpTraits, namedCombos, cultures, isFiveHp, isHomieEdition, homieName } = action.payload;
      // Use description from big_pulp_v9_output.json if available, otherwise fallback to generated response
      const response = generateBigPulpResponse(analysis);
      const message = description || response.message;
      return {
        ...state,
        isLoading: false,
        currentAnalysis: analysis,
        currentNftDescription: description,
        currentNftHeadTrait: headTrait,
        currentNftTraits: traits,
        currentNftHpTraits: hpTraits,
        currentNftNamedCombos: namedCombos,
        currentNftCultures: cultures,
        currentNftIsFiveHp: isFiveHp,
        currentNftIsHomieEdition: isHomieEdition,
        currentNftHomieName: homieName,
        error: null,
        bigPulp: {
          mood: response.mood,
          headVariant: response.headVariant || 'default',
          message: message,
          isTyping: true,
          messageQueue: [], // No follow-up when using description
        },
      };
    }

    case 'SEARCH_ERROR':
      return {
        ...state,
        isLoading: false,
        error: action.payload,
        bigPulp: {
          ...state.bigPulp,
          message: getErrorMessage('notFound'),
          mood: 'neutral',
          isTyping: true,
          messageQueue: [],
        },
      };

    case 'CLEAR_SEARCH':
      return {
        ...state,
        currentAnalysis: null,
        searchQuery: '',
        error: null,
        currentNftDescription: null,
        currentNftHeadTrait: null,
        currentNftTraits: null,
        currentNftHpTraits: null,
        currentNftNamedCombos: null,
        currentNftCultures: null,
        currentNftIsFiveHp: false,
        currentNftIsHomieEdition: false,
        currentNftHomieName: null,
        bigPulp: {
          ...initialBigPulpState,
          message: getWelcomeMessage(),
        },
      };

    case 'SET_TAB':
      return {
        ...state,
        activeTab: action.payload,
      };

    case 'TOGGLE_MODAL':
      return {
        ...state,
        isModalOpen: action.payload,
      };

    case 'SET_HEATMAP_VIEW_MODE':
      return {
        ...state,
        heatMapViewMode: action.payload,
      };

    case 'SET_CATEGORY_FILTER':
      return {
        ...state,
        selectedCategory: action.payload,
      };

    case 'UPDATE_BIGPULP_MESSAGE':
      return {
        ...state,
        bigPulp: {
          ...state.bigPulp,
          message: action.payload.message,
          mood: action.payload.mood,
          isTyping: true,
        },
      };

    case 'SET_BIGPULP_TYPING':
      return {
        ...state,
        bigPulp: {
          ...state.bigPulp,
          isTyping: action.payload,
        },
      };

    case 'ADVANCE_MESSAGE_QUEUE': {
      const [nextMessage, ...remaining] = state.bigPulp.messageQueue;
      if (!nextMessage) return state;
      return {
        ...state,
        bigPulp: {
          ...state.bigPulp,
          message: nextMessage,
          messageQueue: remaining,
          isTyping: true,
        },
      };
    }

    case 'SET_BIGPULP_HEAD_VARIANT':
      return {
        ...state,
        bigPulp: {
          ...state.bigPulp,
          headVariant: action.payload,
        },
      };

    case 'LOAD_MARKET_DATA':
      return {
        ...state,
        marketStats: action.payload.stats ?? state.marketStats,
        heatMapData: action.payload.heatMap ?? state.heatMapData,
        priceDistribution: action.payload.distribution ?? state.priceDistribution,
      };

    case 'LOAD_ATTRIBUTES':
      return {
        ...state,
        attributes: action.payload,
      };

    case 'LOAD_ASK_DATA':
      return {
        ...state,
        topSales: action.payload.topSales,
        rarestFinds: action.payload.rarestFinds,
      };

    case 'UPDATE_NFT_TRAITS':
      return {
        ...state,
        currentNftTraits: action.payload.traits,
        currentNftDescription: action.payload.description,
        currentNftHeadTrait: action.payload.headTrait,
        currentNftHpTraits: action.payload.hpTraits,
        currentNftNamedCombos: action.payload.namedCombos,
        currentNftCultures: action.payload.cultures,
        currentNftIsFiveHp: action.payload.isFiveHp,
        currentNftIsHomieEdition: action.payload.isHomieEdition,
        currentNftHomieName: action.payload.homieName,
      };

    default:
      return state;
  }
}

// ============ Context ============

interface BigPulpContextValue extends BigPulpContextState {
  // Search actions
  setSearchQuery: (query: string) => void;
  searchNFT: (id: string) => Promise<void>;
  surpriseMe: () => Promise<void>;
  clearSearch: () => void;

  // Tab actions
  setActiveTab: (tab: BigPulpTab) => void;
  toggleModal: (open: boolean) => void;

  // Heat map actions
  setHeatMapViewMode: (mode: HeatMapViewMode) => void;

  // Attributes actions
  setCategoryFilter: (category: string | null) => void;

  // BigPulp character actions
  onTypingComplete: () => void;
  skipMessage: () => void;

  // Loading states for tabs
  isMarketLoading: boolean;
  isAskLoading: boolean;
  isAttributesLoading: boolean;

  // Heatmap cache state
  heatmapCacheMetadata: CacheMetadata | null;
  isHeatmapRefetching: boolean;
  refetchHeatmap: () => void;

  // Badge filtering
  badges: BadgeOption[];
  selectedBadge: string | null;
  setSelectedBadge: (badge: string | null) => void;
  badgeMapping: BadgeMapping | null;
}

const BigPulpContext = createContext<BigPulpContextValue | null>(null);

// ============ Provider ============

interface BigPulpProviderProps {
  children: ReactNode;
  mockData?: boolean;
}

export function BigPulpProvider({
  children,
  mockData = true,
}: BigPulpProviderProps) {
  void mockData; // Reserved for development mode
  const [state, dispatch] = useReducer(bigPulpReducer, initialState);

  // Badge state
  const [badges, setBadges] = useState<BadgeOption[]>([]);
  const [selectedBadge, setSelectedBadge] = useState<string | null>(null);
  const [badgeMapping, setBadgeMapping] = useState<BadgeMapping | null>(null);

  // Load badge data on mount
  useEffect(() => {
    async function loadBadges() {
      try {
        const [system, mapping] = await Promise.all([
          loadBadgeSystem(),
          loadBadgeMapping(),
        ]);

        // Convert badge definitions to BadgeOptions sorted by count
        const badgeOptions: BadgeOption[] = Object.entries(system.badges)
          .map(([name, def]) => ({ name, count: def.count, listedCount: 0 }))
          .sort((a, b) => b.count - a.count);

        setBadges(badgeOptions);
        setBadgeMapping(mapping);
      } catch (err) {
        console.error('Failed to load badge data:', err);
      }
    }
    loadBadges();
  }, []);

  // Use TanStack Query hooks for data fetching
  const { data: marketStatsData, isLoading: isMarketStatsLoading } = useBigPulpMarketStats();
  const {
    data: heatMapData,
    isLoading: isHeatMapLoading,
    isRefetching: isHeatmapRefetching,
    refetch: refetchHeatmap,
  } = useBigPulpHeatMap();
  const { data: priceDistributionData, isLoading: isDistributionLoading } = useBigPulpPriceDistribution();
  const { data: attributesData, isLoading: isAttributesLoading } = useBigPulpAttributes();
  const { data: topSalesData, isLoading: isTopSalesLoading } = useBigPulpTopSales();
  const { data: rarestFindsData, isLoading: isRarestLoading } = useBigPulpRarestFinds();

  // Get heatmap cache metadata for staleness indicator
  const heatmapCacheMetadata = useHeatmapCacheMetadata();

  // Update badge listed counts when heatmap data changes
  useEffect(() => {
    if (!heatMapData || !badgeMapping) return;

    // Collect all listed NFT IDs from heatmap data
    const listedNftIds = new Set<string>();
    for (const row of heatMapData) {
      for (const cell of row) {
        for (const nft of cell.nfts) {
          // Extract numeric ID from NFT id (e.g., "WFP-361" -> "361")
          const numericId = nft.id.replace(/\D/g, '');
          listedNftIds.add(numericId);
        }
      }
    }

    // Count listed NFTs for each badge by iterating through badge mapping
    const badgeListedCounts: Record<string, number> = {};
    for (const [nftId, entry] of Object.entries(badgeMapping.nft_badges)) {
      if (listedNftIds.has(nftId)) {
        for (const badgeInfo of entry.badges) {
          badgeListedCounts[badgeInfo.badge] = (badgeListedCounts[badgeInfo.badge] || 0) + 1;
        }
      }
    }

    // Update badges with listed counts
    queueMicrotask(() => {
      setBadges(prevBadges => {
        if (prevBadges.length === 0) return prevBadges;
        return prevBadges.map(badge => ({
          ...badge,
          listedCount: badgeListedCounts[badge.name] || 0,
        }));
      });
    });
  }, [heatMapData, badgeMapping]);

  // Combined loading states
  const isMarketLoading = isMarketStatsLoading || isHeatMapLoading || isDistributionLoading;
  const isAskLoading = isMarketStatsLoading || isTopSalesLoading || isRarestLoading;

  const searchMutation = useSearchNFTMutation();
  const randomMutation = useRandomAnalysisMutation();

  // Sync market data to context state — dispatch each source independently
  // so partial data is shown even if one source fails
  useEffect(() => {
    if (marketStatsData || heatMapData || priceDistributionData) {
      dispatch({
        type: 'LOAD_MARKET_DATA',
        payload: {
          stats: marketStatsData,
          heatMap: heatMapData,
          distribution: priceDistributionData,
        },
      });
    }
  }, [marketStatsData, heatMapData, priceDistributionData]);

  // Sync attributes data
  useEffect(() => {
    if (attributesData) {
      dispatch({
        type: 'LOAD_ATTRIBUTES',
        payload: attributesData,
      });
    }
  }, [attributesData]);

  // Sync ask tab data
  useEffect(() => {
    if (topSalesData && rarestFindsData) {
      dispatch({
        type: 'LOAD_ASK_DATA',
        payload: {
          topSales: topSalesData,
          rarestFinds: rarestFindsData,
        },
      });
    }
  }, [topSalesData, rarestFindsData]);

  // Helper to extract V9 payload from NFT data
  const getV9Payload = useCallback((nftData: BigPulpNFTData | undefined): V9NftPayload => ({
    traits: nftData?.traits || null,
    description: nftData?.description || null,
    headTrait: nftData?.traits?.Head || null,
    hpTraits: nftData?.hp_traits || null,
    namedCombos: nftData?.named_combos || null,
    cultures: nftData?.cultures || null,
    isFiveHp: nftData?.is_five_hp || false,
    isHomieEdition: nftData?.is_homie_edition || false,
    homieName: nftData?.homie_name || null,
  }), []);

  // Search actions
  const setSearchQuery = useCallback((query: string) => {
    dispatch({ type: 'SET_SEARCH_QUERY', payload: query });
  }, []);

  const searchNFT = useCallback(
    async (id: string) => {
      dispatch({ type: 'START_SEARCH' });

      const numId = parseInt(id, 10);
      if (isNaN(numId) || numId < 1 || numId > 4200) {
        dispatch({ type: 'SEARCH_ERROR', payload: 'NFT not found' });
        return;
      }

      try {
        const [analysis, nftData] = await Promise.all([
          searchMutation.mutateAsync(numId),
          getBigPulpV9Entry(numId).catch((error) => {
            console.error('Failed to load big_pulp_v9_output.json:', error);
            return undefined;
          }),
        ]);
        if (analysis) {
          dispatch({
            type: 'SEARCH_SUCCESS',
            payload: { analysis, ...getV9Payload(nftData) }
          });
        } else {
          dispatch({ type: 'SEARCH_ERROR', payload: 'NFT not found' });
        }
      } catch {
        dispatch({ type: 'SEARCH_ERROR', payload: 'NFT not found' });
      }
    },
    [searchMutation, getV9Payload]
  );

  const surpriseMe = useCallback(async () => {
    dispatch({ type: 'START_SEARCH' });

    try {
      const analysis = await randomMutation.mutateAsync();
      const nftIdStr = analysis.nft.id.replace('WFP-', '');
      dispatch({ type: 'SET_SEARCH_QUERY', payload: nftIdStr });

      const nftData = await getBigPulpV9Entry(nftIdStr).catch((error) => {
        console.error('Failed to load big_pulp_v9_output.json:', error);
        return undefined;
      });
      dispatch({
        type: 'SEARCH_SUCCESS',
        payload: { analysis, ...getV9Payload(nftData) }
      });
    } catch {
      dispatch({ type: 'SEARCH_ERROR', payload: 'Failed to get random NFT' });
    }
  }, [randomMutation, getV9Payload]);

  const clearSearch = useCallback(() => {
    dispatch({ type: 'CLEAR_SEARCH' });
  }, []);

  // Tab actions
  const setActiveTab = useCallback((tab: BigPulpTab) => {
    dispatch({ type: 'SET_TAB', payload: tab });
  }, []);

  const toggleModal = useCallback((open: boolean) => {
    dispatch({ type: 'TOGGLE_MODAL', payload: open });
  }, []);

  // Heat map actions
  const setHeatMapViewMode = useCallback((mode: HeatMapViewMode) => {
    dispatch({ type: 'SET_HEATMAP_VIEW_MODE', payload: mode });
  }, []);

  // Attributes actions
  const setCategoryFilter = useCallback((category: string | null) => {
    dispatch({ type: 'SET_CATEGORY_FILTER', payload: category });
  }, []);

  // BigPulp character actions
  const onTypingComplete = useCallback(() => {
    dispatch({ type: 'SET_BIGPULP_TYPING', payload: false });
  }, []);

  const skipMessage = useCallback(() => {
    dispatch({ type: 'ADVANCE_MESSAGE_QUEUE' });
  }, []);

  // Wrap refetch in a stable callback
  const handleRefetchHeatmap = useCallback(() => {
    refetchHeatmap();
  }, [refetchHeatmap]);

  const value = useMemo<BigPulpContextValue>(
    () => ({
      ...state,
      setSearchQuery,
      searchNFT,
      surpriseMe,
      clearSearch,
      setActiveTab,
      toggleModal,
      setHeatMapViewMode,
      setCategoryFilter,
      onTypingComplete,
      skipMessage,
      isMarketLoading,
      isAskLoading,
      isAttributesLoading,
      // Heatmap cache state
      heatmapCacheMetadata,
      isHeatmapRefetching,
      refetchHeatmap: handleRefetchHeatmap,
      // Badge filtering
      badges,
      selectedBadge,
      setSelectedBadge,
      badgeMapping,
    }),
    [
      state,
      setSearchQuery,
      searchNFT,
      surpriseMe,
      clearSearch,
      setActiveTab,
      toggleModal,
      setHeatMapViewMode,
      setCategoryFilter,
      onTypingComplete,
      skipMessage,
      isMarketLoading,
      isAskLoading,
      isAttributesLoading,
      heatmapCacheMetadata,
      isHeatmapRefetching,
      handleRefetchHeatmap,
      badges,
      selectedBadge,
      badgeMapping,
    ]
  );

  return (
    <BigPulpContext.Provider value={value}>{children}</BigPulpContext.Provider>
  );
}

// ============ Hook ============

export function useBigPulp(): BigPulpContextValue {
  const context = useContext(BigPulpContext);
  if (!context) {
    throw new Error('useBigPulp must be used within a BigPulpProvider');
  }
  return context;
}
