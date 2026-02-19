import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ClerkProvider } from '@clerk/clerk-react'
import { register as registerServiceWorker } from './serviceWorkerRegistration'
import { ErrorBoundary } from './components/ErrorBoundary'

import './index.css'
import App from './App.tsx'

// Capture admin secret from URL before React Router / contexts can strip query params
if (window.location.pathname === '/admin') {
  window.__ADMIN_SECRET__ = new URLSearchParams(window.location.search).get('secret') || '';
}

// Clerk publishable key from environment
const CLERK_PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY

// Warn if key is missing (auth will be disabled)
if (!CLERK_PUBLISHABLE_KEY) {
  console.warn(
    '[Clerk] Missing VITE_CLERK_PUBLISHABLE_KEY. Auth features will be disabled.\n' +
    'Add it to .env.local - see .env.example for details.'
  )
}

// Clerk appearance customization - orange theme with white backgrounds
const clerkAppearance = {
  variables: {
    colorPrimary: '#ea580c',
    colorText: '#1f2937',
    colorTextSecondary: '#6b7280',
    colorBackground: '#ffffff',
    colorInputBackground: '#f9fafb',
    colorInputText: '#1f2937',
  },
  elements: {
    // Root and card containers
    rootBox: {
      backgroundColor: '#ffffff',
    },
    card: {
      backgroundColor: '#ffffff',
      border: '1px solid #e5e7eb',
      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
    },
    // Headers
    headerTitle: {
      color: '#1f2937',
    },
    headerSubtitle: {
      color: '#6b7280',
    },
    // Identity preview (Continue as screen)
    identityPreview: {
      backgroundColor: '#ffffff',
    },
    identityPreviewText: {
      color: '#1f2937',
    },
    identityPreviewEditButton: {
      color: '#ea580c',
    },
    // Form elements
    formButtonPrimary: {
      backgroundColor: '#ea580c',
      color: '#ffffff',
    },
    formFieldLabel: {
      color: '#374151',
    },
    formFieldInput: {
      backgroundColor: '#f9fafb',
      color: '#1f2937',
      borderColor: '#d1d5db',
    },
    // Social buttons
    socialButtonsBlockButton: {
      backgroundColor: '#ffffff',
      color: '#1f2937',
      border: '1px solid #e5e7eb',
    },
    socialButtonsBlockButtonText: {
      color: '#1f2937',
    },
    // Divider
    dividerLine: {
      backgroundColor: '#e5e7eb',
    },
    dividerText: {
      color: '#9ca3af',
    },
    // Footer
    footer: {
      backgroundColor: '#ffffff',
    },
    footerAction: {
      backgroundColor: '#ffffff',
    },
    footerActionLink: {
      color: '#ea580c',
    },
    footerActionText: {
      color: '#6b7280',
    },
    // User button popover
    userButtonPopoverCard: {
      backgroundColor: '#ffffff',
      border: '1px solid #e5e7eb',
    },
    userButtonPopoverActionButton: {
      color: '#ea580c !important',
    },
    userButtonPopoverActionButtonText: {
      color: '#ea580c !important',
    },
    userButtonPopoverActionButtonIcon: {
      color: '#ea580c !important',
    },
    userButtonPopoverCustomItemButton: {
      color: '#ea580c !important',
    },
    userButtonPopoverFooter: {
      backgroundColor: '#fff7ed',
    },
    // Menu items
    menuButton: {
      color: '#ea580c !important',
    },
    menuList: {
      backgroundColor: '#ffffff',
    },
    menuItem: {
      color: '#ea580c !important',
    },
  },
}

// Register service worker for PWA support
registerServiceWorker({})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      {CLERK_PUBLISHABLE_KEY ? (
        <ClerkProvider
          publishableKey={CLERK_PUBLISHABLE_KEY}
          afterSignOutUrl="/"
          appearance={clerkAppearance}
        >
          <App />
        </ClerkProvider>
      ) : (
        <App />
      )}
    </ErrorBoundary>
  </StrictMode>,
)
