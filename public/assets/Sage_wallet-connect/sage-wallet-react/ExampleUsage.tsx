/**
 * Example Usage - Sage Wallet Integration
 * 
 * Styled for wojak.ink glassmorphism dark theme with Tang Orange accents.
 * Mobile-first design with bottom navigation support.
 */

import React, { useState, useEffect } from 'react';
import { 
  SageWalletProvider, 
  useSageWallet, 
  SageConnectButton,
  SageWalletStatus,
  NFTGate,
  WalletFAB,
  type MintGardenNFT 
} from './index';

// ============================================================================
// APP SETUP - Wrap your app with the provider
// ============================================================================

/**
 * Main App Entry Point
 * 
 * The SageWalletProvider must wrap any components that use useSageWallet.
 */
export function AppWithSageWallet() {
  return (
    <SageWalletProvider
      config={{
        // Replace with your WalletConnect project ID
        // Get one at https://cloud.walletconnect.com
        projectId: '6d377259062295c0f6312b4f3e7a5d9b',
        
        // Your app metadata (shown in Sage wallet during connection)
        metadata: {
          name: 'Wojak.ink',
          description: 'Tang Gang NFT Collection - Wojak Farmers Plot',
          url: 'https://wojak.ink',
          icons: ['https://wojak.ink/favicon.ico'],
        },
        
        // Auto-reconnect on page load
        autoConnect: true,
        
        // Optional callbacks
        onConnect: (address) => {
          console.log('🍊 Wallet connected:', address);
        },
        onDisconnect: () => {
          console.log('🔌 Wallet disconnected');
        },
        onError: (error) => {
          console.error('❌ Wallet error:', error);
        },
      }}
    >
      <div style={appContainerStyle}>
        <MainContent />
        {/* Mobile FAB for quick wallet access */}
        <WalletFAB position="bottom-right" />
      </div>
    </SageWalletProvider>
  );
}

// App container - dark background
const appContainerStyle: React.CSSProperties = {
  minHeight: '100vh',
  backgroundColor: '#0a0a0a',
  background: 'linear-gradient(180deg, #0a0a0a 0%, #171717 100%)',
  color: 'white',
  fontFamily: 'system-ui, -apple-system, sans-serif',
};

// ============================================================================
// MAIN CONTENT
// ============================================================================

function MainContent() {
  const { 
    status, 
    address, 
    isInitialized: _isInitialized,
    connect: _connect,
    disconnect,
    hasRequiredNFTs,
    getNFTs,
    signMessage,
  } = useSageWallet();
  
  const [nfts, setNfts] = useState<MintGardenNFT[]>([]);
  const [_hasAccess, setHasAccess] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // Your Wojak Farmers Plot collection ID
  const COLLECTION_ID = 'col1yourwojakfarmersplotcollectionid';
  
  // Check NFT access when wallet connects
  useEffect(() => {
    const checkAccess = async () => {
      if (status === 'connected' && address) {
        setLoading(true);
        const owns = await hasRequiredNFTs(COLLECTION_ID);
        setHasAccess(owns);
        setLoading(false);
      } else {
        setHasAccess(false);
      }
    };
    checkAccess();
  }, [status, address, hasRequiredNFTs]);
  
  // Load user's NFTs
  const loadMyNFTs = async () => {
    if (!address) return;
    setLoading(true);
    try {
      const userNFTs = await getNFTs(COLLECTION_ID);
      setNfts(userNFTs);
    } catch (error) {
      console.error('Failed to load NFTs:', error);
    } finally {
      setLoading(false);
    }
  };
  
  // Sign a message
  const handleSignMessage = async () => {
    try {
      const message = `Welcome to the Grove 🍊\nTimestamp: ${Date.now()}`;
      const result = await signMessage(message);
      console.log('Signature:', result.signature);
      alert('Message signed! Check console for details.');
    } catch (error) {
      console.error('Signing failed:', error);
    }
  };
  
  return (
    <div style={{ padding: '24px', maxWidth: '600px', margin: '0 auto' }}>
      {/* Header */}
      <header style={{ marginBottom: '32px', textAlign: 'center' }}>
        <h1 style={{ 
          fontSize: '28px', 
          fontWeight: 700, 
          marginBottom: '8px',
          background: 'linear-gradient(90deg, #ea580c, #f97316)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
        }}>
          Welcome to the Grove 🍊
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '14px' }}>
          Connect your Sage wallet to explore
        </p>
      </header>
      
      {/* Connect Section */}
      <GlassCard style={{ marginBottom: '16px' }}>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
        }}>
          <div>
            <h2 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '4px' }}>
              Wallet Connection
            </h2>
            <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)', margin: 0 }}>
              {status === 'connected' 
                ? `${address?.slice(0, 8)}...${address?.slice(-6)}`
                : 'Not connected'}
            </p>
          </div>
          
          <SageConnectButton 
            variant="primary"
            size="md"
            connectText="Connect Wallet"
          />
        </div>
      </GlassCard>
      
      {/* Status Card (dev/debug) */}
      {status === 'connected' && (
        <SageWalletStatus 
          style={{ marginBottom: '16px' }}
          showSessionInfo={false}
        />
      )}
      
      {/* NFT Actions */}
      {status === 'connected' && (
        <GlassCard style={{ marginBottom: '16px' }}>
          <h2 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px' }}>
            Actions
          </h2>
          
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <ActionButton onClick={loadMyNFTs} disabled={loading}>
              {loading ? '⏳' : '🖼️'} Load NFTs
            </ActionButton>
            
            <ActionButton onClick={handleSignMessage}>
              ✍️ Sign Message
            </ActionButton>
            
            <ActionButton onClick={disconnect} variant="danger">
              Disconnect
            </ActionButton>
          </div>
          
          {/* NFT Grid */}
          {nfts.length > 0 && (
            <div style={{ 
              marginTop: '20px',
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))',
              gap: '12px',
            }}>
              {nfts.map((nft) => (
                <NFTCard key={nft.encoded_id} nft={nft} />
              ))}
            </div>
          )}
        </GlassCard>
      )}
      
      {/* NFT Gated Content */}
      <GlassCard>
        <h2 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px' }}>
          🔒 Holder-Only Content
        </h2>
        
        <NFTGate collectionId={COLLECTION_ID}>
          <div style={{
            padding: '20px',
            backgroundColor: 'rgba(34, 197, 94, 0.1)',
            border: '1px solid rgba(34, 197, 94, 0.3)',
            borderRadius: '12px',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: '32px', marginBottom: '12px' }}>🎉</div>
            <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '8px' }}>
              Welcome, Wojak Holder!
            </h3>
            <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '14px', margin: 0 }}>
              You have access to exclusive Tang Gang content.
            </p>
          </div>
        </NFTGate>
      </GlassCard>
    </div>
  );
}

// ============================================================================
// REUSABLE STYLED COMPONENTS
// ============================================================================

/**
 * Glass Card - Glassmorphism container
 */
function GlassCard({ 
  children, 
  style 
}: { 
  children: React.ReactNode; 
  style?: React.CSSProperties;
}) {
  return (
    <div style={{
      backgroundColor: 'rgba(255, 255, 255, 0.03)',
      backdropFilter: 'blur(10px)',
      WebkitBackdropFilter: 'blur(10px)',
      border: '1px solid rgba(255, 255, 255, 0.08)',
      borderRadius: '16px',
      padding: '20px',
      ...style,
    }}>
      {children}
    </div>
  );
}

/**
 * Action Button - Secondary style button
 */
function ActionButton({ 
  children, 
  onClick, 
  disabled = false,
  variant = 'default',
}: { 
  children: React.ReactNode; 
  onClick?: () => void;
  disabled?: boolean;
  variant?: 'default' | 'danger';
}) {
  const [isHovered, setIsHovered] = useState(false);
  
  const baseStyle: React.CSSProperties = {
    padding: '10px 16px',
    fontSize: '13px',
    fontWeight: 500,
    borderRadius: '10px',
    border: '1px solid',
    cursor: disabled ? 'not-allowed' : 'pointer',
    transition: 'all 0.2s ease',
    opacity: disabled ? 0.5 : 1,
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
  };
  
  const variantStyles = {
    default: {
      backgroundColor: isHovered ? 'rgba(255,255,255,0.1)' : 'transparent',
      borderColor: 'rgba(255,255,255,0.2)',
      color: 'white',
    },
    danger: {
      backgroundColor: isHovered ? 'rgba(239, 68, 68, 0.2)' : 'transparent',
      borderColor: 'rgba(239, 68, 68, 0.5)',
      color: '#ef4444',
    },
  };
  
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{ ...baseStyle, ...variantStyles[variant] }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {children}
    </button>
  );
}

/**
 * NFT Card - Display a single NFT
 */
function NFTCard({ nft }: { nft: MintGardenNFT }) {
  return (
    <div style={{
      backgroundColor: 'rgba(255,255,255,0.05)',
      borderRadius: '12px',
      overflow: 'hidden',
      border: '1px solid rgba(255,255,255,0.08)',
    }}>
      <img 
        src={nft.preview_uri || nft.thumbnail_uri} 
        alt={nft.name}
        style={{ 
          width: '100%', 
          aspectRatio: '1',
          objectFit: 'cover',
        }}
      />
      <div style={{ padding: '8px' }}>
        <p style={{ 
          fontSize: '11px', 
          margin: 0,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}>
          {nft.name}
        </p>
      </div>
    </div>
  );
}

// ============================================================================
// STANDALONE HOOK EXAMPLE
// ============================================================================

import { useSageWalletStandalone } from './useSageWalletStandalone';

/**
 * Minimal example using standalone hook (no provider)
 */
export function MinimalWalletButton() {
  const { 
    isConnected, 
    status,
    connect, 
    disconnect,
    shortenAddress,
    error: _error,
  } = useSageWalletStandalone({
    metadata: {
      name: 'Wojak.ink',
      description: 'Tang Gang NFTs',
      url: 'https://wojak.ink',
      icons: [],
    },
  });
  
  return (
    <button
      onClick={isConnected ? disconnect : connect}
      style={{
        padding: '12px 24px',
        borderRadius: '9999px',
        backgroundColor: isConnected ? '#22c55e' : '#ea580c',
        color: 'white',
        border: 'none',
        cursor: 'pointer',
        fontSize: '14px',
        fontWeight: 500,
      }}
    >
      {status === 'connecting' && '⏳ Connecting...'}
      {status === 'connected' && `🍊 ${shortenAddress()}`}
      {status === 'disconnected' && '🔗 Connect Sage'}
    </button>
  );
}

export default AppWithSageWallet;
