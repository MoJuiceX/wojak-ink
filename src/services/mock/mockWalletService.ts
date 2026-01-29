/**
 * Mock Wallet Service
 */

import type { IWalletService } from '../interfaces';
import type { NFT, WalletBalance, TokenPrices } from '@/types/domain';
import { mockWalletBalance, mockTokenPrices, mockNFTs } from '@/mocks/data';

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export class MockWalletService implements IWalletService {
  async fetchWalletBalance(address: string): Promise<WalletBalance> {
    void address;
    await delay(200);
    return { ...mockWalletBalance };
  }

  async fetchWalletNFTs(address: string): Promise<NFT[]> {
    void address;
    await delay(300);
    return mockNFTs.slice(0, 5);
  }

  async fetchTokenPrices(): Promise<TokenPrices> {
    await delay(100);
    return { ...mockTokenPrices, updatedAt: new Date() };
  }
}
