import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import ErrorBoundary from './components/ErrorBoundary'
import { preloadCriticalAssets } from './utils/imagePreload'
import './styles/layout.css'
import './styles/safeArea.css'
import './index.css'

// Preload critical assets on app initialization
preloadCriticalAssets()

// Temporarily disable StrictMode to prevent double renders that cause duplicate icons
// StrictMode intentionally double-renders in development, which conflicts with our drag-and-drop
ReactDOM.createRoot(document.getElementById('root')).render(
  <ErrorBoundary>
    <BrowserRouter
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true,
      }}
    >
      <App />
    </BrowserRouter>
  </ErrorBoundary>
)

