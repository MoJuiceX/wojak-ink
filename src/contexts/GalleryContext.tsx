/* eslint-disable react-refresh/only-export-components */
/**
 * Gallery Context
 *
 * State management for the Gallery page and NFT Explorer.
 */

import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
  useRef,
  type ReactNode,
} from 'react';
import { useSearchParams } from 'react-router-dom';
import type { NFT, CharacterType, SortMode, FilterMode } from '@/types/nft';
import { useGalleryNFTs } from '@/hooks/data/useGalleryData';
import { useListings } from '@/hooks/data/useMarket';
import { imagePreloader } from '@/services/imagePreloader';
import { safeStorage } from '@/utils/safeStorage';

const SWIPE_HINT_KEY = 'wojak-seen-swipe-hint';

export interface GalleryState {
  // View state
  selectedCharacter: CharacterType | null;

  // Explorer state
  explorerOpen: boolean;
  currentNftIndex: number;
  nfts: NFT[];
  isLoading: boolean;
  error: Error | null;

  // Filters & sorting
  sortMode: SortMode;
  filterMode: FilterMode;
  maxPriceFilter: number | null;
  searchQuery: string;

  // UI state
  activeInfoTab: 'main' | 'metadata' | 'combat' | 'history';
  hasSeenSwipeHint: boolean;

  // Preloading
  preloadedImages: Set<string>;
}

export interface GalleryActions {
  selectCharacter: (type: CharacterType | null) => void;
  openExplorer: (nftId?: string) => void;
  closeExplorer: () => void;

  navigateToNft: (index: number) => void;
  navigateNext: () => void;
  navigatePrevious: () => void;
  shuffleToRandom: () => void;

  setSortMode: (mode: SortMode) => void;
  setFilterMode: (mode: FilterMode) => void;
  setMaxPriceFilter: (price: number | null) => void;
  setSearchQuery: (query: string) => void;

  setActiveInfoTab: (tab: 'main' | 'metadata' | 'combat' | 'history') => void;
  dismissSwipeHint: () => void;

  preloadImages: (nftIds: string[]) => void;
}

export interface GalleryContextValue extends GalleryState, GalleryActions {
  currentNft: NFT | null;
  filteredNfts: NFT[];
  listedCount: number;
}

export const GalleryContext = createContext<GalleryContextValue | undefined>(undefined);

interface GalleryProviderProps {
  children: ReactNode;
}

export function GalleryProvider({ children }: GalleryProviderProps) {
  const [searchParams, setSearchParams] = useSearchParams();

  // View state
  const [selectedCharacter, setSelectedCharacter] = useState<CharacterType | null>(
    (searchParams.get('type') as CharacterType) || null
  );

  // Explorer state
  const [explorerOpen, setExplorerOpen] = useState(false);
  const [currentNftIndex, setCurrentNftIndex] = useState(0);

  // Use TanStack Query for NFT data
  const {
    data: rawNfts = [],
    isLoading: isLoadingNfts,
    error: queryError,
  } = useGalleryNFTs(selectedCharacter);
  const error = queryError instanceof Error ? queryError : null;

  // Fetch listings from marketplace APIs
  const { data: listings = [] } = useListings();

  // Merge NFTs with listing data
  const nfts = useMemo(() => {
    if (listings.length === 0) return rawNfts;

    // Create a map of nftId -> listing for quick lookup
    const listingsByNftId = new Map(listings.map(l => [l.nftId, l]));

    return rawNfts.map(nft => {
      // Extract the NFT number from the ID (e.g., "wojak-123" -> "123")
      const nftNumber = nft.id.split('-').pop() || nft.tokenId;
      const listing = listingsByNftId.get(nftNumber) || listingsByNftId.get(nft.tokenId);

      if (listing) {
        return {
          ...nft,
          listing: {
            price: listing.priceXch * 1_000_000_000_000, // Convert to mojos
            priceXCH: listing.priceXch,
            priceUSD: listing.priceUsd || listing.priceXch * 30, // Estimate if not provided
            seller: 'unknown',
            listedAt: listing.listingDate ? new Date(listing.listingDate) : new Date(),
            marketplace: listing.source as 'mintgarden' | 'dexie' | 'spacescan',
            listingUrl: listing.source === 'mintgarden'
              ? `https://mintgarden.io/nfts/${listing.launcherId || ''}`
              : `https://dexie.space/offers/${listing.launcherId || ''}`,
          },
        };
      }
      return nft;
    });
  }, [rawNfts, listings]);

  const isLoading = isLoadingNfts;

  // Filters & sorting
  // Always start with defaults: all NFTs, sorted by ID ascending
  const [sortMode, setSortModeState] = useState<SortMode>('id-asc');
  const [filterMode, setFilterModeState] = useState<FilterMode>('all');
  const [maxPriceFilter, setMaxPriceFilter] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // UI state
  const [activeInfoTab, setActiveInfoTab] = useState<'main' | 'metadata' | 'combat' | 'history'>('main');
  const [hasSeenSwipeHint, setHasSeenSwipeHint] = useState(() => {
    if (typeof window === 'undefined') return true;
    return safeStorage.getItem(SWIPE_HINT_KEY) === 'true';
  });

  // Preloading
  const [preloadedImages, setPreloadedImages] = useState<Set<string>>(new Set());

  // Sync URL params (only character type and filter mode, not sort mode)
  // Sort mode is explorer-only and should not persist
  useEffect(() => {
    const params = new URLSearchParams();
    if (selectedCharacter) params.set('type', selectedCharacter);
    if (filterMode !== 'all') params.set('filter', filterMode);

    const newSearch = params.toString();
    const currentSearch = searchParams.toString();

    if (newSearch !== currentSearch) {
      setSearchParams(params, { replace: true });
    }
  }, [selectedCharacter, filterMode, searchParams, setSearchParams]);

  // Filter and sort NFTs
  const filteredNfts = useMemo(() => {
    let result = [...nfts];

    // Apply filter mode
    if (filterMode === 'listed') {
      result = result.filter((nft) => nft.listing);
    }

    // Apply max price filter
    if (maxPriceFilter !== null && filterMode === 'listed') {
      result = result.filter(
        (nft) => nft.listing && nft.listing.priceXCH <= maxPriceFilter
      );
    }

    // Apply search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (nft) =>
          nft.name.toLowerCase().includes(query) ||
          nft.id.toLowerCase().includes(query)
      );
    }

    // Apply sorting
    switch (sortMode) {
      case 'id-asc':
        result.sort((a, b) => a.id.localeCompare(b.id));
        break;
      case 'id-desc':
        result.sort((a, b) => b.id.localeCompare(a.id));
        break;
      case 'rarity-asc':
        // Lower rank = rarer, so ascending shows rarest first
        result.sort((a, b) => a.rarityRank - b.rarityRank);
        break;
      case 'rarity-desc':
        // Higher rank = more common, so descending shows most common first
        result.sort((a, b) => b.rarityRank - a.rarityRank);
        break;
      case 'price-asc':
        // Sort by price ascending: listed NFTs first (by price), then unlisted (by ID)
        result.sort((a, b) => {
          const aHasPrice = a.listing?.priceXCH != null;
          const bHasPrice = b.listing?.priceXCH != null;

          // Both have prices: sort by price ascending
          if (aHasPrice && bHasPrice) {
            return (a.listing?.priceXCH ?? 0) - (b.listing?.priceXCH ?? 0);
          }
          // Only a has price: a comes first
          if (aHasPrice && !bHasPrice) return -1;
          // Only b has price: b comes first
          if (!aHasPrice && bHasPrice) return 1;
          // Neither has price: sort by ID
          return a.id.localeCompare(b.id);
        });
        break;
      case 'price-desc':
        // Sort by price descending: listed NFTs first (by price), then unlisted (by ID)
        result.sort((a, b) => {
          const aHasPrice = a.listing?.priceXCH != null;
          const bHasPrice = b.listing?.priceXCH != null;

          // Both have prices: sort by price descending
          if (aHasPrice && bHasPrice) {
            return (b.listing?.priceXCH ?? 0) - (a.listing?.priceXCH ?? 0);
          }
          // Only a has price: a comes first
          if (aHasPrice && !bHasPrice) return -1;
          // Only b has price: b comes first
          if (!aHasPrice && bHasPrice) return 1;
          // Neither has price: sort by ID
          return a.id.localeCompare(b.id);
        });
        break;
      default:
        result.sort((a, b) => a.id.localeCompare(b.id));
        break;
    }

    return result;
  }, [nfts, filterMode, maxPriceFilter, searchQuery, sortMode]);

  const listedCount = useMemo(
    () => nfts.filter((nft) => nft.listing).length,
    [nfts]
  );

  const currentNft = useMemo(
    () => filteredNfts[currentNftIndex] || null,
    [filteredNfts, currentNftIndex]
  );

  // Actions
  const selectCharacter = useCallback((type: CharacterType | null) => {
    setSelectedCharacter(type);
    setCurrentNftIndex(0);
    // Reset to default filter and sort when changing categories
    setFilterModeState('all');
    setSortModeState('id-asc');
  }, []);

  const openExplorer = useCallback(
    (nftId?: string) => {
      if (nftId) {
        const index = filteredNfts.findIndex((nft) => nft.id === nftId);
        if (index >= 0) {
          setCurrentNftIndex(index);
        }
      }
      setExplorerOpen(true);
    },
    [filteredNfts]
  );

  const closeExplorer = useCallback(() => {
    setExplorerOpen(false);
  }, []);

  const navigateToNft = useCallback(
    (index: number) => {
      if (index >= 0 && index < filteredNfts.length) {
        setCurrentNftIndex(index);
      }
    },
    [filteredNfts.length]
  );

  const navigateNext = useCallback(() => {
    setCurrentNftIndex((prev) =>
      prev < filteredNfts.length - 1 ? prev + 1 : prev
    );
  }, [filteredNfts.length]);

  const navigatePrevious = useCallback(() => {
    setCurrentNftIndex((prev) => (prev > 0 ? prev - 1 : prev));
  }, []);

  const shuffleToRandom = useCallback(() => {
    const randomIndex = Math.floor(Math.random() * filteredNfts.length);
    setCurrentNftIndex(randomIndex);
  }, [filteredNfts.length]);

  const setSortMode = useCallback((mode: SortMode) => {
    setSortModeState(mode);
    // Reset to first item when changing sort mode from grid
    // But keep current NFT if explorer is open
    if (!explorerOpen) {
      setCurrentNftIndex(0);
    }
  }, [explorerOpen]);

  const setFilterMode = useCallback((mode: FilterMode) => {
    setFilterModeState(mode);
    setCurrentNftIndex(0);
  }, []);

  const dismissSwipeHint = useCallback(() => {
    setHasSeenSwipeHint(true);
    safeStorage.setItem(SWIPE_HINT_KEY, 'true');
  }, []);

  // Track navigation direction for smarter preloading
  const prevIndexRef = useRef(currentNftIndex);

  const preloadImages = useCallback((nftIds: string[]) => {
    const urls = nftIds
      .map((id) => nfts.find((n) => n.id === id)?.imageUrl)
      .filter((url): url is string => !!url);

    imagePreloader.preloadBatch(urls, 'high');

    // Update local state for backwards compatibility
    nftIds.forEach((id) => {
      setPreloadedImages((prev) => new Set(prev).add(id));
    });
  }, [nfts]);

  // Smart preloading for explorer - preloads more images in scroll direction
  useEffect(() => {
    if (!explorerOpen || filteredNfts.length === 0) return;

    // Determine navigation direction
    const direction = currentNftIndex > prevIndexRef.current ? 'forward' :
                      currentNftIndex < prevIndexRef.current ? 'backward' : null;
    prevIndexRef.current = currentNftIndex;

    // Get all image URLs
    const imageUrls = filteredNfts.map((nft) => nft.imageUrl);

    // Use smart preloading based on direction
    imagePreloader.preloadForExplorer(imageUrls, currentNftIndex, direction);

    // Update preloadedImages state for UI feedback
    queueMicrotask(() => {
      const preloadRange = 5;
      for (let i = -preloadRange; i <= preloadRange; i++) {
        const idx = currentNftIndex + i;
        if (idx >= 0 && idx < filteredNfts.length) {
          setPreloadedImages((prev) => new Set(prev).add(filteredNfts[idx].id));
        }
      }
    });
  }, [currentNftIndex, explorerOpen, filteredNfts]);

  const value = useMemo<GalleryContextValue>(
    () => ({
      // State
      selectedCharacter,
      explorerOpen,
      currentNftIndex,
      nfts,
      isLoading,
      error,
      sortMode,
      filterMode,
      maxPriceFilter,
      searchQuery,
      activeInfoTab,
      hasSeenSwipeHint,
      preloadedImages,

      // Computed
      currentNft,
      filteredNfts,
      listedCount,

      // Actions
      selectCharacter,
      openExplorer,
      closeExplorer,
      navigateToNft,
      navigateNext,
      navigatePrevious,
      shuffleToRandom,
      setSortMode,
      setFilterMode,
      setMaxPriceFilter,
      setSearchQuery,
      setActiveInfoTab,
      dismissSwipeHint,
      preloadImages,
    }),
    [
      selectedCharacter,
      explorerOpen,
      currentNftIndex,
      nfts,
      isLoading,
      error,
      sortMode,
      filterMode,
      maxPriceFilter,
      searchQuery,
      activeInfoTab,
      hasSeenSwipeHint,
      preloadedImages,
      currentNft,
      filteredNfts,
      listedCount,
      selectCharacter,
      openExplorer,
      closeExplorer,
      navigateToNft,
      navigateNext,
      navigatePrevious,
      shuffleToRandom,
      setSortMode,
      setFilterMode,
      setActiveInfoTab,
      dismissSwipeHint,
      preloadImages,
    ]
  );

  return (
    <GalleryContext.Provider value={value}>{children}</GalleryContext.Provider>
  );
}

export default GalleryProvider;
