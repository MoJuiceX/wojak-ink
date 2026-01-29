/* eslint-disable react-refresh/only-export-components */
/**
 * TreasuryContext
 *
 * State management for the Treasury page and bubble visualization.
 */

import {
  createContext,
  useContext,
  useReducer,
  useCallback,
  useEffect,
  type ReactNode,
} from 'react';
import type { PortfolioSummary, WalletInfo, TreasuryState } from '@/types/treasury';
import {
  useTreasuryPortfolio,
  useTreasuryWallet,
  useTreasuryWalletData,
  useRefreshPortfolio,
} from '@/hooks/data/useTreasuryData';
import type { NFTCollection } from '@/services/treasuryService';

// Actions
type TreasuryAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_REFRESHING'; payload: boolean }
  | { type: 'SET_PORTFOLIO'; payload: PortfolioSummary }
  | { type: 'SET_WALLET'; payload: WalletInfo | null }
  | { type: 'SET_ERROR'; payload: Error | null }
  | { type: 'POP_BUBBLE' }
  | { type: 'RESET_BUBBLES' }
  | { type: 'SET_ALL_POPPED'; payload: boolean }
  | { type: 'SET_SOUND_ENABLED'; payload: boolean }
  | { type: 'SET_HAPTICS_ENABLED'; payload: boolean }
  | { type: 'TOGGLE_INFO_TOOLTIP' }
  | { type: 'SET_LAST_REFRESH'; payload: Date };

// Initial state
const initialState: TreasuryState = {
  portfolio: null,
  wallet: null,
  isLoading: true,
  isRefreshing: false,
  error: null,
  poppedCount: 0,
  allPopped: false,
  soundEnabled: true,
  hapticsEnabled: true,
  showInfoTooltip: false,
  lastRefresh: null,
};

// Reducer
function treasuryReducer(state: TreasuryState, action: TreasuryAction): TreasuryState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    case 'SET_REFRESHING':
      return { ...state, isRefreshing: action.payload };
    case 'SET_PORTFOLIO':
      return { ...state, portfolio: action.payload, isLoading: false, error: null };
    case 'SET_WALLET':
      return { ...state, wallet: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload, isLoading: false };
    case 'POP_BUBBLE': {
      const newPoppedCount = state.poppedCount + 1;
      const visibleCount = state.portfolio?.visibleTokenCount || 0;
      return {
        ...state,
        poppedCount: newPoppedCount,
        allPopped: newPoppedCount >= visibleCount,
      };
    }
    case 'RESET_BUBBLES':
      return { ...state, poppedCount: 0, allPopped: false };
    case 'SET_ALL_POPPED':
      return { ...state, allPopped: action.payload };
    case 'SET_SOUND_ENABLED':
      return { ...state, soundEnabled: action.payload };
    case 'SET_HAPTICS_ENABLED':
      return { ...state, hapticsEnabled: action.payload };
    case 'TOGGLE_INFO_TOOLTIP':
      return { ...state, showInfoTooltip: !state.showInfoTooltip };
    case 'SET_LAST_REFRESH':
      return { ...state, lastRefresh: action.payload };
    default:
      return state;
  }
}

// Context value interface
interface TreasuryContextValue extends TreasuryState {
  fetchPortfolio: () => Promise<void>;
  refreshPrices: () => Promise<void>;
  popBubble: () => void;
  resetBubbles: () => void;
  setSoundEnabled: (enabled: boolean) => void;
  setHapticsEnabled: (enabled: boolean) => void;
  toggleInfoTooltip: () => void;
  nftCollections: NFTCollection[];
}

// Create context
const TreasuryContext = createContext<TreasuryContextValue | null>(null);

// Provider props
interface TreasuryProviderProps {
  children: ReactNode;
  mockData?: boolean;
}

// Provider component
export function TreasuryProvider({ children, mockData: _mockData = true }: TreasuryProviderProps) {
  const [state, dispatch] = useReducer(treasuryReducer, initialState);

  // Use TanStack Query hooks for data fetching
  const {
    data: portfolioData,
    isLoading: portfolioLoading,
    isFetching: portfolioFetching,
    error: portfolioError,
  } = useTreasuryPortfolio();

  const { data: walletData } = useTreasuryWallet();
  const { data: rawWalletData } = useTreasuryWalletData();
  const refreshPortfolio = useRefreshPortfolio();

  // Sync query state to context state
  useEffect(() => {
    if (portfolioData) {
      dispatch({ type: 'SET_PORTFOLIO', payload: portfolioData });
      dispatch({ type: 'SET_LAST_REFRESH', payload: new Date() });
    }
  }, [portfolioData]);

  useEffect(() => {
    if (walletData) {
      dispatch({ type: 'SET_WALLET', payload: walletData });
    }
  }, [walletData]);

  useEffect(() => {
    dispatch({ type: 'SET_LOADING', payload: portfolioLoading });
  }, [portfolioLoading]);

  useEffect(() => {
    dispatch({ type: 'SET_REFRESHING', payload: portfolioFetching && !portfolioLoading });
  }, [portfolioFetching, portfolioLoading]);

  useEffect(() => {
    if (portfolioError) {
      dispatch({ type: 'SET_ERROR', payload: portfolioError as Error });
    }
  }, [portfolioError]);

  // Load preferences from localStorage
  useEffect(() => {
    const savedSound = localStorage.getItem('treasury-sound');
    const savedHaptics = localStorage.getItem('treasury-haptics');

    if (savedSound !== null) {
      dispatch({ type: 'SET_SOUND_ENABLED', payload: savedSound === 'true' });
    }
    if (savedHaptics !== null) {
      dispatch({ type: 'SET_HAPTICS_ENABLED', payload: savedHaptics === 'true' });
    }
  }, []);

  // Fetch portfolio (now just triggers a refetch via TanStack Query)
  const fetchPortfolio = useCallback(async () => {
    await refreshPortfolio();
  }, [refreshPortfolio]);

  // Refresh prices
  const refreshPrices = useCallback(async () => {
    await refreshPortfolio();
  }, [refreshPortfolio]);

  // Bubble interactions
  const popBubble = useCallback(() => {
    dispatch({ type: 'POP_BUBBLE' });
  }, []);

  const resetBubbles = useCallback(() => {
    dispatch({ type: 'RESET_BUBBLES' });
  }, []);

  // Preferences
  const setSoundEnabled = useCallback((enabled: boolean) => {
    localStorage.setItem('treasury-sound', String(enabled));
    dispatch({ type: 'SET_SOUND_ENABLED', payload: enabled });
  }, []);

  const setHapticsEnabled = useCallback((enabled: boolean) => {
    localStorage.setItem('treasury-haptics', String(enabled));
    dispatch({ type: 'SET_HAPTICS_ENABLED', payload: enabled });
  }, []);

  // UI
  const toggleInfoTooltip = useCallback(() => {
    dispatch({ type: 'TOGGLE_INFO_TOOLTIP' });
  }, []);

  const value: TreasuryContextValue = {
    ...state,
    fetchPortfolio,
    refreshPrices,
    popBubble,
    resetBubbles,
    setSoundEnabled,
    setHapticsEnabled,
    toggleInfoTooltip,
    nftCollections: rawWalletData?.nftCollections ?? [],
  };

  return <TreasuryContext.Provider value={value}>{children}</TreasuryContext.Provider>;
}

// Hook to use treasury context
export function useTreasury() {
  const context = useContext(TreasuryContext);
  if (!context) {
    throw new Error('useTreasury must be used within a TreasuryProvider');
  }
  return context;
}

export default TreasuryContext;
