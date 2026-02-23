/**
 * Fight Club Page Unit Tests
 * 
 * Tests critical voting paths:
 * - Vote submission
 * - Vote debouncing/throttling
 * - Feed management
 * - Permission checks
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';

// Mock the vote submission function
const mockCastVote = vi.fn((nftId: string, edition: number, voteType: number) =>
  Promise.resolve({ ok: true })
);

// Mock the feed loading
const mockLoadFeed = vi.fn(() => Promise.resolve());

describe('FightClub Voting', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should prevent rapid vote submissions (debounce)', async () => {
    const user = userEvent.setup();

    // Simulate rapid vote button clicks
    const voteButton = screen.getByRole('button', { name: /vote/i });
    
    // Click vote button 3 times rapidly
    await user.click(voteButton);
    await user.click(voteButton);
    await user.click(voteButton);

    // Wait for debounce window
    await waitFor(() => {
      // Should only process the last vote due to debouncing
      expect(mockCastVote).toHaveBeenCalledTimes(1);
    }, { timeout: 1000 });
  });

  it('should handle vote errors gracefully', async () => {
    const mockErrorVote = vi.fn(() =>
      Promise.resolve({ ok: false, status: 429, error: 'Too many requests' })
    );

    const user = userEvent.setup();

    // Simulate failed vote
    await user.click(screen.getByRole('button', { name: /vote/i }));

    await waitFor(() => {
      expect(mockErrorVote).toHaveBeenCalled();
    });

    // Error message should display
    await waitFor(() => {
      expect(screen.queryByText(/voting too fast/i)).toBeInTheDocument();
    });
  });

  it('should update vote count on successful vote', async () => {
    const user = userEvent.setup();

    // Initial vote count should be 0
    expect(screen.getByText('Votes: 0')).toBeInTheDocument();

    // Cast a vote
    await user.click(screen.getByRole('button', { name: /vote/i }));

    // Vote count should increment
    await waitFor(() => {
      expect(screen.getByText('Votes: 1')).toBeInTheDocument();
    });
  });

  it('should reload feed when it runs low', async () => {
    const user = userEvent.setup();

    // Cast votes until feed needs refill
    for (let i = 0; i < 4; i++) {
      await user.click(screen.getByRole('button', { name: /vote/i }));
    }

    // Feed should be reloaded
    await waitFor(() => {
      expect(mockLoadFeed).toHaveBeenCalled();
    });
  });

  it('should require NFT holding for access', async () => {
    render(
      <BrowserRouter>
        <FightClub />
      </BrowserRouter>
    );

    // Should show access gate if user doesn't hold required NFT
    await waitFor(() => {
      expect(screen.queryByText(/hold.*nft/i)).toBeInTheDocument();
    });
  });
});
