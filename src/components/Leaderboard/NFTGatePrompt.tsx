/**
 * NFT Gate Prompt Component
 *
 * Displayed to users without NFT avatars to encourage them to
 * connect a wallet and set an NFT avatar for leaderboard competition.
 */

import './Leaderboard.css';

interface NFTGatePromptProps {
  onConnectWallet?: () => void;
}

export function NFTGatePrompt({ onConnectWallet }: NFTGatePromptProps) {
  return (
    <div className="nft-gate-prompt">
      <div className="gate-content">
        <div className="gate-icon">🔒</div>
        <h3>Unlock Leaderboard Competition</h3>
        <p>
          Connect your wallet and set a <strong>Wojak NFT</strong> as your avatar
          to compete on the global leaderboard and earn exclusive rewards!
        </p>

        <div className="gate-benefits">
          <div className="benefit">
            <span className="benefit-icon">🏆</span>
            <span>Compete for rankings</span>
          </div>
          <div className="benefit">
            <span className="benefit-icon">🎁</span>
            <span>Win seasonal rewards</span>
          </div>
          <div className="benefit">
            <span className="benefit-icon">⭐</span>
            <span>Unlock exclusive badges</span>
          </div>
        </div>

        <div className="gate-actions">
          {onConnectWallet && (
            <button type="button" onClick={onConnectWallet} className="connect-button">
              Connect Wallet & Set NFT Avatar
            </button>
          )}

          <a
            href="https://mintgarden.io/collections/wojak-farmers-plot-col1kfy44w3nlkqq8z3j8z9mhc3nw9pzwvlsmhsyhc0z6a7luvzukfsufegk5"
            target="_blank"
            rel="noopener noreferrer"
            className="get-nft-link"
          >
            Don't have a Wojak NFT? Get one here →
          </a>
        </div>
      </div>
    </div>
  );
}

export default NFTGatePrompt;
