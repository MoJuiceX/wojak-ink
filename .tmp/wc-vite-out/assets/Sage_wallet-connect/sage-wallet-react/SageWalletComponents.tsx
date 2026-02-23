/**
 * Sage Wallet Connect Button Component
 * 
 * Styled for wojak.ink glassmorphism dark theme with Tang Orange accents.
 * 
 * Design: Dark theme, glassmorphism, orange (#ea580c) primary accent,
 * rounded corners, smooth transitions.
 */

import React, { useState } from 'react';
import { useSageWallet } from './SageWalletProvider';

interface SageConnectButtonProps {
  // Optional custom text
  connectText?: string;
  connectingText?: string;
  disconnectText?: string;
  
  // Show address when connected?
  showAddress?: boolean;
  
  // Button variants
  variant?: 'primary' | 'secondary' | 'glass';
  size?: 'sm' | 'md' | 'lg';
  
  // Full width button?
  fullWidth?: boolean;
  
  // Custom styling (overrides defaults)
  className?: string;
  style?: React.CSSProperties;
  
  // Callbacks
  onConnect?: (address: string) => void;
  onDisconnect?: () => void;
  onError?: (error: Error) => void;
}

export function SageConnectButton({
  connectText = 'Connect Wallet',
  connectingText = 'Connecting...',
  disconnectText = 'Disconnect',
  showAddress = true,
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  className = '',
  style,
  onConnect,
  onDisconnect,
  onError,
}: SageConnectButtonProps) {
  const {
    status,
    address,
    isInitialized,
    connect,
    disconnect,
  } = useSageWallet();
  
  const [isLoading, setIsLoading] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  
  const isConnected = status === 'connected' && !!address;
  const isConnecting = status === 'connecting' || isLoading;
  
  // Shorten address for display
  const shortenAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };
  
  const handleClick = async () => {
    if (!isInitialized) return;
    
    try {
      setIsLoading(true);
      
      if (isConnected) {
        await disconnect();
        onDisconnect?.();
      } else {
        await connect();
      }
    } catch (error) {
      console.error('[SageConnectButton] Error:', error);
      onError?.(error instanceof Error ? error : new Error('Connection failed'));
    } finally {
      setIsLoading(false);
    }
  };
  
  // Call onConnect when address changes
  React.useEffect(() => {
    if (address && isConnected) {
      onConnect?.(address);
    }
  }, [address, isConnected, onConnect]);
  
  // Determine button text and icon
  let buttonText: string;
  let icon: string = '';
  
  if (isConnecting) {
    buttonText = connectingText;
    icon = '⏳';
  } else if (isConnected) {
    buttonText = showAddress ? shortenAddress(address) : disconnectText;
    icon = '🍊';
  } else {
    buttonText = connectText;
    icon = '🔗';
  }
  
  // Size classes
  const sizeStyles: Record<string, React.CSSProperties> = {
    sm: { padding: '8px 16px', fontSize: '13px' },
    md: { padding: '12px 24px', fontSize: '14px' },
    lg: { padding: '16px 32px', fontSize: '16px' },
  };
  
  // Variant styles - wojak.ink glassmorphism theme
  const getVariantStyles = (): React.CSSProperties => {
    const base: React.CSSProperties = {
      fontWeight: 500,
      borderRadius: '9999px', // Full radius for primary CTAs
      cursor: isInitialized && !isConnecting ? 'pointer' : 'not-allowed',
      transition: 'all 0.2s ease',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '8px',
      width: fullWidth ? '100%' : 'auto',
      opacity: !isInitialized || isConnecting ? 0.7 : 1,
      border: 'none',
      outline: 'none',
      ...sizeStyles[size],
    };
    
    switch (variant) {
      case 'primary':
        return {
          ...base,
          backgroundColor: isHovered ? '#c2410c' : '#ea580c', // Tang Orange
          color: 'white',
          boxShadow: isHovered 
            ? '0 4px 20px rgba(234, 88, 12, 0.4)' 
            : '0 2px 10px rgba(234, 88, 12, 0.3)',
        };
        
      case 'secondary':
        return {
          ...base,
          backgroundColor: 'transparent',
          color: '#ea580c',
          border: '1px solid #ea580c',
          boxShadow: isHovered ? '0 0 20px rgba(234, 88, 12, 0.2)' : 'none',
        };
        
      case 'glass':
        return {
          ...base,
          backgroundColor: isHovered 
            ? 'rgba(255, 255, 255, 0.1)' 
            : 'rgba(255, 255, 255, 0.05)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          color: isConnected ? '#22c55e' : 'white',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '12px',
        };
        
      default:
        return base;
    }
  };
  
  const buttonStyle: React.CSSProperties = {
    ...getVariantStyles(),
    ...style,
  };
  
  return (
    <button
      onClick={handleClick}
      disabled={!isInitialized || isConnecting}
      className={className}
      style={buttonStyle}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      title={isConnected ? `Connected: ${address}` : 'Click to connect Sage wallet'}
    >
      <span>{icon}</span>
      <span>{buttonText}</span>
    </button>
  );
}

/**
 * Sage Wallet Status Display Component
 * 
 * Glassmorphism card showing wallet connection status.
 * Designed for wojak.ink dark theme.
 */

interface SageWalletStatusProps {
  className?: string;
  style?: React.CSSProperties;
  showSessionInfo?: boolean;
}

export function SageWalletStatus({ 
  className, 
  style,
  showSessionInfo = false 
}: SageWalletStatusProps) {
  const { status, address, session, error, isInitialized } = useSageWallet();
  
  // Glass card base styles
  const cardStyle: React.CSSProperties = {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    backdropFilter: 'blur(10px)',
    WebkitBackdropFilter: 'blur(10px)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: '16px',
    padding: '16px 20px',
    color: 'white',
    fontFamily: 'system-ui, -apple-system, sans-serif',
    ...style,
  };
  
  const labelStyle: React.CSSProperties = {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: '12px',
    fontWeight: 500,
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    marginBottom: '4px',
  };
  
  const valueStyle: React.CSSProperties = {
    color: 'white',
    fontSize: '14px',
    fontWeight: 500,
  };
  
  const statusDotStyle = (connected: boolean): React.CSSProperties => ({
    display: 'inline-block',
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    backgroundColor: connected ? '#22c55e' : status === 'connecting' ? '#eab308' : '#6b7280',
    marginRight: '8px',
    boxShadow: connected ? '0 0 8px rgba(34, 197, 94, 0.5)' : 'none',
  });
  
  if (!isInitialized) {
    return (
      <div className={className} style={cardStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ animation: 'spin 1s linear infinite' }}>⏳</span>
          <span style={{ color: 'rgba(255, 255, 255, 0.7)' }}>Initializing wallet...</span>
        </div>
      </div>
    );
  }
  
  return (
    <div className={className} style={cardStyle}>
      {/* Status Row */}
      <div style={{ marginBottom: address ? '12px' : '0' }}>
        <div style={labelStyle}>Status</div>
        <div style={{ ...valueStyle, display: 'flex', alignItems: 'center' }}>
          <span style={statusDotStyle(status === 'connected')} />
          {status === 'connected' ? 'Connected' : 
           status === 'connecting' ? 'Connecting...' : 
           'Disconnected'}
        </div>
      </div>
      
      {/* Address Row */}
      {address && (
        <div style={{ marginBottom: showSessionInfo && session ? '12px' : '0' }}>
          <div style={labelStyle}>Address</div>
          <div style={{ 
            ...valueStyle, 
            fontFamily: 'monospace',
            fontSize: '13px',
            color: '#ea580c',
            wordBreak: 'break-all',
          }}>
            {address}
          </div>
        </div>
      )}
      
      {/* Session Info (optional) */}
      {showSessionInfo && session && (
        <div>
          <div style={labelStyle}>Session</div>
          <div style={{ 
            ...valueStyle, 
            fontFamily: 'monospace',
            fontSize: '11px',
            color: 'rgba(255, 255, 255, 0.5)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}>
            {session.topic}
          </div>
        </div>
      )}
      
      {/* Error Display */}
      {error && (
        <div style={{ 
          marginTop: '12px',
          padding: '8px 12px',
          backgroundColor: 'rgba(239, 68, 68, 0.1)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          borderRadius: '8px',
          color: '#ef4444',
          fontSize: '13px',
        }}>
          ⚠️ {error}
        </div>
      )}
    </div>
  );
}

/**
 * NFT Gate Component
 * 
 * Shows children only if user has NFTs from specified collection.
 * Designed for wojak.ink glassmorphism dark theme.
 */

interface NFTGateProps {
  collectionId: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
  loadingComponent?: React.ReactNode;
  onAccessGranted?: () => void;
  onAccessDenied?: () => void;
}

export function NFTGate({
  collectionId,
  children,
  fallback,
  loadingComponent,
  onAccessGranted,
  onAccessDenied,
}: NFTGateProps) {
  const { status, address, hasRequiredNFTs } = useSageWallet();
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  
  // Glassmorphism card styles
  const cardStyle: React.CSSProperties = {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    backdropFilter: 'blur(10px)',
    WebkitBackdropFilter: 'blur(10px)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: '16px',
    padding: '24px',
    textAlign: 'center',
    color: 'white',
    fontFamily: 'system-ui, -apple-system, sans-serif',
  };
  
  // Default fallback - "Not Connected" state
  const defaultNotConnectedFallback = (
    <div style={cardStyle}>
      <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔒</div>
      <h3 style={{ 
        fontSize: '18px', 
        fontWeight: 600, 
        marginBottom: '8px',
        color: 'white',
      }}>
        Connect Your Wallet
      </h3>
      <p style={{ 
        color: 'rgba(255, 255, 255, 0.6)', 
        fontSize: '14px',
        margin: 0,
      }}>
        Connect your Sage wallet to access this content
      </p>
    </div>
  );
  
  // Default fallback - "No NFT" state
  const defaultNoNFTFallback = (
    <div style={cardStyle}>
      <div style={{ fontSize: '48px', marginBottom: '16px' }}>🍊</div>
      <h3 style={{ 
        fontSize: '18px', 
        fontWeight: 600, 
        marginBottom: '8px',
        color: 'white',
      }}>
        NFT Required
      </h3>
      <p style={{ 
        color: 'rgba(255, 255, 255, 0.6)', 
        fontSize: '14px',
        margin: 0,
      }}>
        You need a Wojak Farmers Plot NFT to access this content
      </p>
    </div>
  );
  
  // Default loading state
  const defaultLoadingComponent = (
    <div style={cardStyle}>
      <div style={{ 
        fontSize: '32px', 
        marginBottom: '16px',
        animation: 'pulse 2s infinite',
      }}>
        🔍
      </div>
      <p style={{ 
        color: 'rgba(255, 255, 255, 0.6)', 
        fontSize: '14px',
        margin: 0,
      }}>
        Checking NFT ownership...
      </p>
    </div>
  );
  
  React.useEffect(() => {
    const checkNFTs = async () => {
      if (status !== 'connected' || !address) {
        setHasAccess(null);
        return;
      }
      
      setIsChecking(true);
      try {
        const result = await hasRequiredNFTs(collectionId);
        setHasAccess(result);
        
        if (result) {
          onAccessGranted?.();
        } else {
          onAccessDenied?.();
        }
      } catch (error) {
        console.error('[NFTGate] Check failed:', error);
        setHasAccess(false);
        onAccessDenied?.();
      } finally {
        setIsChecking(false);
      }
    };
    
    checkNFTs();
  }, [status, address, collectionId, hasRequiredNFTs, onAccessGranted, onAccessDenied]);
  
  // Not connected
  if (status !== 'connected') {
    return <>{fallback || defaultNotConnectedFallback}</>;
  }
  
  // Checking
  if (isChecking || hasAccess === null) {
    return <>{loadingComponent || defaultLoadingComponent}</>;
  }
  
  // Show children if has access, fallback otherwise
  return <>{hasAccess ? children : (fallback || defaultNoNFTFallback)}</>;
}

/**
 * Wallet Modal Trigger
 * 
 * A floating action button (FAB) style wallet trigger for mobile.
 * Matches wojak.ink mobile-first design patterns.
 */

interface WalletFABProps {
  position?: 'bottom-right' | 'bottom-left';
  className?: string;
}

export function WalletFAB({ 
  position = 'bottom-right',
  className = '',
}: WalletFABProps) {
  const { status, address, connect, disconnect, isInitialized } = useSageWallet();
  const [isOpen, setIsOpen] = useState(false);
  
  const isConnected = status === 'connected' && !!address;
  
  const positionStyles: Record<string, React.CSSProperties> = {
    'bottom-right': { bottom: '24px', right: '24px' },
    'bottom-left': { bottom: '24px', left: '24px' },
  };
  
  const fabStyle: React.CSSProperties = {
    position: 'fixed',
    ...positionStyles[position],
    width: '56px',
    height: '56px',
    borderRadius: '50%',
    backgroundColor: isConnected ? '#22c55e' : '#ea580c',
    color: 'white',
    border: 'none',
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '24px',
    transition: 'all 0.2s ease',
    zIndex: 1000,
  };
  
  const handleClick = async () => {
    if (!isInitialized) return;
    
    if (isConnected) {
      setIsOpen(!isOpen);
    } else {
      await connect();
    }
  };
  
  return (
    <>
      <button
        onClick={handleClick}
        style={fabStyle}
        className={className}
        title={isConnected ? 'Wallet options' : 'Connect wallet'}
      >
        {status === 'connecting' ? '⏳' : isConnected ? '🍊' : '🔗'}
      </button>
      
      {/* Dropdown menu when connected */}
      {isOpen && isConnected && (
        <div style={{
          position: 'fixed',
          ...positionStyles[position],
          bottom: '88px',
          backgroundColor: 'rgba(23, 23, 23, 0.95)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '16px',
          padding: '8px',
          minWidth: '200px',
          zIndex: 999,
        }}>
          {/* Address display */}
          <div style={{
            padding: '12px 16px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
            fontSize: '12px',
            color: 'rgba(255, 255, 255, 0.6)',
          }}>
            Connected
            <div style={{ 
              color: '#ea580c', 
              fontFamily: 'monospace',
              marginTop: '4px',
            }}>
              {address.slice(0, 10)}...{address.slice(-6)}
            </div>
          </div>
          
          {/* Disconnect button */}
          <button
            onClick={async () => {
              await disconnect();
              setIsOpen(false);
            }}
            style={{
              width: '100%',
              padding: '12px 16px',
              backgroundColor: 'transparent',
              border: 'none',
              color: '#ef4444',
              fontSize: '14px',
              textAlign: 'left',
              cursor: 'pointer',
              borderRadius: '8px',
              transition: 'background 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.1)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            Disconnect
          </button>
        </div>
      )}
      
      {/* Backdrop to close menu */}
      {isOpen && (
        <div 
          onClick={() => setIsOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 998,
          }}
        />
      )}
    </>
  );
}
