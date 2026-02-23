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

// Clerk publishable key from environment. Must be a real key from dashboard.clerk.com.
// When missing or placeholder, we do NOT wrap with ClerkProvider.
const CLERK_PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY as string | undefined
// Optional: override where Clerk loads its script from. On localhost, clerk.wojak.ink does not resolve;
// set this to your Frontend API URL from Clerk Dashboard → Domains (the *.clerk.accounts.dev URL).
const CLERK_JS_URL_RAW = import.meta.env.VITE_CLERK_JS_URL as string | undefined
const isLocalhost = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
// Use a CDN for script load on localhost when custom domain (clerk.wojak.ink) is set but doesn't resolve
const CLERK_JS_CDN_FALLBACK = 'https://cdn.jsdelivr.net/npm/@clerk/clerk-js@5/dist/clerk.browser.js'
const clerkWojakInk = CLERK_JS_URL_RAW === 'https://clerk.wojak.ink' || (CLERK_JS_URL_RAW?.includes?.('clerk.wojak.ink') ?? false)
const CLERK_JS_URL =
  isLocalhost && (!CLERK_JS_URL_RAW || clerkWojakInk)
    ? CLERK_JS_CDN_FALLBACK
    : CLERK_JS_URL_RAW
if (isLocalhost && (!CLERK_JS_URL_RAW || clerkWojakInk)) {
  console.warn(
    '[Clerk] clerk.wojak.ink does not resolve on localhost. Script will load from CDN; auth may still fail until you set VITE_CLERK_JS_URL to your Frontend API URL (e.g. https://XXX.clerk.accounts.dev) in .env.local from Clerk Dashboard → Domains.'
  )
}
// When using a resolvable FAPI URL (e.g. *.clerk.accounts.dev), tell Clerk to use it for API calls too
if (CLERK_JS_URL_RAW && CLERK_JS_URL_RAW.startsWith('https://') && CLERK_JS_URL_RAW.includes('clerk.accounts.dev')) {
  try {
    ;(window as unknown as { __clerk_domain?: string }).__clerk_domain = new URL(CLERK_JS_URL_RAW).hostname
  } catch {
    // ignore
  }
}

const CLERK_PLACEHOLDER = 'pk_test_placeholder_no_real_key'
const hasClerkKey =
  typeof CLERK_PUBLISHABLE_KEY === 'string' &&
  CLERK_PUBLISHABLE_KEY.length > 0 &&
  CLERK_PUBLISHABLE_KEY !== CLERK_PLACEHOLDER &&
  (CLERK_PUBLISHABLE_KEY.startsWith('pk_test_') || CLERK_PUBLISHABLE_KEY.startsWith('pk_live_'))

if (!hasClerkKey) {
  console.warn(
    '[Clerk] Missing or invalid VITE_CLERK_PUBLISHABLE_KEY. Auth features will be disabled.\n' +
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
          {hasClerkKey && CLERK_PUBLISHABLE_KEY ? (
            <ClerkProvider
              publishableKey={CLERK_PUBLISHABLE_KEY}
              {...(CLERK_JS_URL ? { clerkJSUrl: CLERK_JS_URL } : {})}
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
