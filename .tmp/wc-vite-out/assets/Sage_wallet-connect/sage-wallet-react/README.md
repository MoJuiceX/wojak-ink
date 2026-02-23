# Sage Wallet React Integration

Complete WalletConnect integration for **Sage wallet** (Chia blockchain) in React applications.

Converted from Angular services for use with React + Tailwind CSS projects like wojak.ink.

## 📦 Installation

First, install the required WalletConnect dependencies:

```bash
npm install @walletconnect/sign-client @walletconnect/modal @walletconnect/utils @walletconnect/types
```

Then copy the sage-wallet files into your project:

```
src/
  sage-wallet/           # or wherever you want
    index.ts
    sage-wallet-types.ts
    SageWalletProvider.tsx
    SageWalletComponents.tsx
    useSageWalletStandalone.ts
```

---

## 🚀 Quick Start

### Option 1: Provider Pattern (Recommended)

Wrap your app with the provider, then use the hook anywhere:

```tsx
// App.tsx or main.tsx
import { SageWalletProvider } from './sage-wallet';

function App() {
  return (
    <SageWalletProvider
      config={{
        metadata: {
          name: 'Wojak.ink',
          description: 'Tang Gang NFT Collection',
          url: 'https://wojak.ink',
          icons: ['https://wojak.ink/favicon.ico'],
        },
      }}
    >
      <YourApp />
    </SageWalletProvider>
  );
}
```

```tsx
// Any component
import { useSageWallet, SageConnectButton } from './sage-wallet';

function WalletSection() {
  const { address, status, hasRequiredNFTs, getNFTs } = useSageWallet();
  
  const checkNFTs = async () => {
    // Check if user has Wojak Farmers Plot NFTs
    const hasNFT = await hasRequiredNFTs('col1abc123...');
    console.log('Has NFT:', hasNFT);
  };
  
  return (
    <div>
      <SageConnectButton 
        connectText="Connect Sage Wallet"
        onConnect={(addr) => console.log('Connected:', addr)}
      />
      
      {address && (
        <p>Connected: {address.slice(0, 10)}...</p>
      )}
    </div>
  );
}
```

### Option 2: Standalone Hook (No Provider)

For simpler use cases where you don't need global state:

```tsx
import { useSageWalletStandalone } from './sage-wallet';

function WalletButton() {
  const { 
    address, 
    isConnected, 
    connect, 
    disconnect, 
    shortenAddress,
    status 
  } = useSageWalletStandalone({
    metadata: {
      name: 'Wojak.ink',
      description: 'Tang Gang NFT Collection', 
      url: 'https://wojak.ink',
      icons: ['https://wojak.ink/favicon.ico'],
    },
  });
  
  return (
    <button 
      onClick={isConnected ? disconnect : connect}
      className="px-4 py-2 bg-orange-500 text-white rounded"
    >
      {status === 'connecting' && 'Connecting...'}
      {status === 'connected' && shortenAddress()}
      {status === 'disconnected' && 'Connect Sage'}
    </button>
  );
}
```

---

## 🎮 Ready-to-Use Components

### SageConnectButton

A pre-styled connect/disconnect button:

```tsx
import { SageConnectButton } from './sage-wallet';

<SageConnectButton
  connectText="Connect Sage"
  connectingText="Connecting..."
  disconnectText="Disconnect"
  showAddress={true}                    // Show truncated address when connected
  onConnect={(address) => {}}           // Called when connected
  onDisconnect={() => {}}               // Called when disconnected
  onError={(error) => {}}               // Called on error
  className="your-tailwind-classes"     // Override styling
  style={{ backgroundColor: 'orange' }} // Or inline styles
/>
```

### SageWalletStatus

Debug component showing wallet state:

```tsx
import { SageWalletStatus } from './sage-wallet';

<SageWalletStatus />
// Shows: Status, Address, Session Topic, Errors
```

### NFTGate

Show content only if user has NFTs from a collection:

```tsx
import { NFTGate } from './sage-wallet';

<NFTGate
  collectionId="col1yourwojakfarmersplotcollectionid"
  fallback={<p>You need a Wojak NFT to see this!</p>}
  loadingComponent={<p>Checking your NFTs...</p>}
  onAccessGranted={() => console.log('Access granted!')}
  onAccessDenied={() => console.log('Access denied')}
>
  <SecretContent />
</NFTGate>
```

---

## 🔧 API Reference

### useSageWallet() / useSageWalletStandalone()

Both hooks return:

```typescript
{
  // State
  status: 'disconnected' | 'connecting' | 'connected';
  address: string;                    // Chia address (xch1...)
  session: SageSession | null;        // WalletConnect session info
  error: string | null;               // Last error message
  isInitialized: boolean;             // WalletConnect ready?
  
  // Actions
  connect(): Promise<void>;           // Open WalletConnect modal
  disconnect(): Promise<void>;        // Disconnect wallet
  signMessage(message: string): Promise<SignMessageResult>;
  getAssetBalance(assetId?: string): Promise<AssetBalance>;
  takeOffer(offer: string, fee?: number): Promise<any>;
  hasRequiredNFTs(collectionId: string): Promise<boolean>;
  getNFTs(collectionId?: string): Promise<MintGardenNFT[]>;
}

// Standalone hook also includes:
{
  isConnected: boolean;               // Convenience: status === 'connected' && !!address
  shortenAddress(addr?: string): string;  // "xch1ab...xy12"
}
```

### Configuration Options

```typescript
interface SageWalletConfig {
  // WalletConnect Project ID (get yours at https://cloud.walletconnect.com)
  projectId?: string;
  
  // Your app metadata (shown in wallet)
  metadata?: {
    name: string;
    description: string;
    url: string;
    icons: string[];
  };
  
  // WalletConnect relay (default: 'wss://relay.walletconnect.com')
  relayUrl?: string;
  
  // LocalStorage key for session persistence
  storageKey?: string;
  
  // Auto-reconnect on page load (default: true)
  autoConnect?: boolean;
  
  // Callbacks
  onConnect?: (address: string) => void;
  onDisconnect?: () => void;
  onError?: (error: Error) => void;
}
```

---

## 📋 Common Use Cases

### Check if User Owns a Wojak NFT

```tsx
const { address, hasRequiredNFTs } = useSageWallet();

useEffect(() => {
  const check = async () => {
    if (address) {
      const owns = await hasRequiredNFTs('col1wojakfarmersplot...');
      if (owns) {
        // Grant access
      }
    }
  };
  check();
}, [address]);
```

### Get User's NFTs from Collection

```tsx
const { address, getNFTs } = useSageWallet();

const loadNFTs = async () => {
  const nfts = await getNFTs('col1wojakfarmersplot...');
  console.log('User owns:', nfts.length, 'NFTs');
  
  nfts.forEach(nft => {
    console.log(nft.name, nft.preview_uri);
  });
};
```

### Sign a Message for Verification

```tsx
const { signMessage, address } = useSageWallet();

const verify = async () => {
  const message = `Sign in to Wojak.ink\nNonce: ${Date.now()}`;
  const { signature, publicKey } = await signMessage(message);
  
  // Send to your backend to verify
  await fetch('/api/verify', {
    method: 'POST',
    body: JSON.stringify({ address, message, signature, publicKey }),
  });
};
```

### Accept an Offer (NFT Purchase)

```tsx
const { takeOffer } = useSageWallet();

const buyNFT = async (offerString: string) => {
  try {
    const result = await takeOffer(offerString, 0); // fee in mojos
    console.log('Offer accepted!', result);
  } catch (error) {
    console.error('Failed to accept offer:', error);
  }
};
```

---

## 🎨 Styling & Design System

Components are pre-styled to match wojak.ink's glassmorphism dark theme:

- **Primary accent**: Tang Orange (#ea580c)
- **Background**: Deep dark grays with gradients
- **Cards**: Glass effect with blur, subtle borders, rounded-xl
- **Buttons**: Full radius for CTAs, subtle hover states

### Button Variants

```tsx
// Primary (filled orange) - main CTAs
<SageConnectButton variant="primary" />

// Secondary (orange outline) - less emphasis
<SageConnectButton variant="secondary" />

// Glass (transparent with blur) - subtle
<SageConnectButton variant="glass" />
```

### Button Sizes

```tsx
<SageConnectButton size="sm" />  // Compact
<SageConnectButton size="md" />  // Default
<SageConnectButton size="lg" />  // Large CTA
```

### Mobile-First with WalletFAB

For mobile UX, use the floating action button:

```tsx
import { WalletFAB } from './sage-wallet';

function App() {
  return (
    <SageWalletProvider>
      <YourContent />
      <WalletFAB position="bottom-right" />
    </SageWalletProvider>
  );
}
```

### Custom Styling with Tailwind

Override defaults with className:

```tsx
<SageConnectButton 
  className="px-6 py-3 bg-orange-600 hover:bg-orange-700 rounded-full text-white font-semibold shadow-lg shadow-orange-500/30"
  style={{}} // Clear inline styles
/>
```

### Glass Card Pattern

```tsx
// Reusable glass card for your UI
<div className="bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-xl p-5">
  <SageConnectButton variant="primary" />
</div>
```
```

---

## 🔐 NFT Gating Pattern

For your Wojak.ink website, you can gate features by NFT ownership:

```tsx
function ProtectedFeature() {
  const { status, address, hasRequiredNFTs } = useSageWallet();
  const [canAccess, setCanAccess] = useState(false);
  const [checking, setChecking] = useState(false);
  
  useEffect(() => {
    const checkAccess = async () => {
      if (status !== 'connected' || !address) {
        setCanAccess(false);
        return;
      }
      
      setChecking(true);
      const hasNFT = await hasRequiredNFTs('YOUR_COLLECTION_ID');
      setCanAccess(hasNFT);
      setChecking(false);
    };
    
    checkAccess();
  }, [status, address]);
  
  if (status !== 'connected') {
    return <p>Connect your Sage wallet to continue</p>;
  }
  
  if (checking) {
    return <p>Verifying NFT ownership...</p>;
  }
  
  if (!canAccess) {
    return <p>You need a Wojak Farmers Plot NFT!</p>;
  }
  
  return <YourProtectedContent />;
}
```

---

## 🐛 Troubleshooting

### "Not initialized" error
Make sure you've wrapped your app with `SageWalletProvider` or wait for `isInitialized` to be true.

### Connection fails silently
Check browser console for WalletConnect errors. Common issues:
- Invalid project ID
- Popup blocked
- User rejected the connection

### NFT check returns false unexpectedly
- Verify the collection ID is correct
- Check the address format (should start with `xch1`)
- MintGarden API might be rate limited - add retry logic

### Session not persisting
The session is stored in localStorage under the key specified in config (default: `'sage-wallet-session'`). Make sure localStorage isn't being cleared.

---

## 📁 File Structure

```
sage-wallet/
├── index.ts                    # Main exports
├── sage-wallet-types.ts        # TypeScript types & constants
├── SageWalletProvider.tsx      # React context & provider
├── SageWalletComponents.tsx    # Ready-to-use UI components
├── useSageWalletStandalone.ts  # Standalone hook (no provider)
└── README.md                   # This file
```

---

## 🔗 Related Links

- [Sage Wallet](https://sagewallet.co/) - Mobile Chia wallet
- [WalletConnect Docs](https://docs.walletconnect.com/)
- [MintGarden API](https://api.mintgarden.io/) - NFT lookup
- [Chia Network](https://www.chia.net/)

---

## Integration Notes for Claude Code

When integrating into an existing React project:

1. **Install dependencies** first (see Installation section)
2. **Copy all files** to a `src/sage-wallet/` directory  
3. **Add the provider** to your app root (App.tsx or main.tsx)
4. **Use the hook** in any component that needs wallet access
5. **Configure metadata** with the actual site name/URL

For Windows 98 themed projects, the SageConnectButton can be styled to match using the example CSS above.

The collection ID for Wojak Farmers Plot NFT checking should be passed to `hasRequiredNFTs()` - get this from MintGarden.io.
