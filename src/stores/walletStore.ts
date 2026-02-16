/**
 * Wallet Store
 *
 * Zustand store for wallet connection, balance, and owned NFTs.
 * Persists wallet address and connection state to localStorage.
 */

import { create } from 'zustand';
import { persist, devtools } from 'zustand/middleware';
import { treasuryService } from '@/services/treasuryService';

// ============ Types ============

export interface CATBalance {
  assetId: string;
  name: string;
  ticker: string;
  amount: number;
  value: number; // USD value
}

export interface WalletBalance {
  xch: number;
  cats: CATBalance[];
}

export interface WalletState {
  // State
  address: string | null;
  isConnected: boolean;
  balance: WalletBalance;
  ownedNFTs: string[]; // Array of NFT IDs

  // Actions
  connect: (address: string) => void;
  disconnect: () => void;
  setBalance: (balance: WalletBalance) => void;
  setOwnedNFTs: (nfts: string[]) => void;

  // Computed
  getTotalValue: () => number;
}

// ============ Initial State ============

const initialBalance: WalletBalance = {
  xch: 0,
  cats: [],
};

// ============ Store ============

export const useWalletStore = create<WalletState>()(
  devtools(
    persist(
      (set, get) => ({
        // State
        address: null,
        isConnected: false,
        balance: initialBalance,
        ownedNFTs: [],

        // Actions
        connect: (address: string) =>
          set(
            { address, isConnected: true },
            false,
            'wallet/connect'
          ),

        disconnect: () =>
          set(
            {
              address: null,
              isConnected: false,
              balance: initialBalance,
              ownedNFTs: [],
            },
            false,
            'wallet/disconnect'
          ),

        setBalance: (balance: WalletBalance) =>
          set({ balance }, false, 'wallet/setBalance'),

        setOwnedNFTs: (nfts: string[]) =>
          set({ ownedNFTs: nfts }, false, 'wallet/setOwnedNFTs'),

        // Computed values
        getTotalValue: () => {
          const { balance } = get();
          const xchPrice = treasuryService.getCachedXchPrice();
          const xchValue = balance.xch * xchPrice;
          const catsValue = balance.cats.reduce((sum, cat) => sum + cat.value, 0);
          return xchValue + catsValue;
        },
      }),
      {
        name: 'wallet-storage',
        partialize: (state) => ({
          address: state.address,
          isConnected: state.isConnected,
        }),
      }
    ),
    { name: 'WalletStore' }
  )
);
