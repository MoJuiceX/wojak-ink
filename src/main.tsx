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

function renderLoadError(message: string, detail?: string) {
  const root = document.getElementById('root')
  if (!root) return
  root.innerHTML = ''
  const wrap = document.createElement('div')
  wrap.style.cssText = 'position:fixed;inset:0;background:#0a0a0f;color:rgba(255,255,255,0.95);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;font-family:system-ui,sans-serif;text-align:center;padding:24px;'
  wrap.innerHTML = `
    <p style="font-size:20px;font-weight:600;">${message}</p>
    ${detail ? `<p style="font-size:14px;color:rgba(255,255,255,0.6);max-width:420px;">${detail}</p>` : ''}
    <button type="button" onclick="window.location.reload()" style="padding:12px 24px;font-size:16px;background:#ea580c;color:#fff;border:none;border-radius:10px;cursor:pointer;">Reload page</button>
  `
  root.appendChild(wrap)
}

try {
  const rootEl = document.getElementById('root')
  if (!rootEl) {
    renderLoadError('App root not found.', '')
  } else {
    createRoot(rootEl).render(
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
  }
} catch (err) {
  console.error('[wojak.ink] Failed to start app:', err)
  renderLoadError(
    'Something went wrong loading Wojak.ink.',
    'Try refreshing the page. If you use Brave, try disabling Shields for this site or use another browser.',
  )
}
