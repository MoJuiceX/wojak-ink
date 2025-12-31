import { useState, useEffect, useCallback } from 'react'

/**
 * Theme manager hook
 * Provides theme and accent state management with localStorage persistence
 * 
 * @returns {Object} { theme, accent, setTheme, setAccent }
 */
export function useTheme() {
  const [theme, setThemeState] = useState(() => {
    try {
      return localStorage.getItem('theme') || 'classic'
    } catch (e) {
      return 'classic'
    }
  })
  
  const [accent, setAccentState] = useState(() => {
    try {
      return localStorage.getItem('accent') || 'default'
    } catch (e) {
      return 'default'
    }
  })

  // Sync with DOM attributes
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  useEffect(() => {
    document.documentElement.setAttribute('data-accent', accent)
  }, [accent])

  const setTheme = useCallback((newTheme) => {
    try {
      localStorage.setItem('theme', newTheme)
      setThemeState(newTheme)
      document.documentElement.setAttribute('data-theme', newTheme)
      window.dispatchEvent(new CustomEvent('themeChanged', { detail: { theme: newTheme } }))
      window.dispatchEvent(new CustomEvent('appearanceChanged', { 
        detail: { 
          theme: newTheme, 
          accent 
        } 
      }))
    } catch (e) {
      console.error('Failed to save theme:', e)
    }
  }, [accent])

  const setAccent = useCallback((newAccent) => {
    try {
      localStorage.setItem('accent', newAccent)
      setAccentState(newAccent)
      document.documentElement.setAttribute('data-accent', newAccent)
      window.dispatchEvent(new CustomEvent('accentChanged', { detail: { accent: newAccent } }))
      window.dispatchEvent(new CustomEvent('appearanceChanged', { 
        detail: { 
          theme, 
          accent: newAccent 
        } 
      }))
    } catch (e) {
      console.error('Failed to save accent:', e)
    }
  }, [theme])

  // Listen for external changes
  useEffect(() => {
    const handleThemeChange = (e) => {
      if (e.detail.theme !== theme) {
        setThemeState(e.detail.theme)
      }
    }
    
    const handleAccentChange = (e) => {
      if (e.detail.accent !== accent) {
        setAccentState(e.detail.accent)
      }
    }

    window.addEventListener('themeChanged', handleThemeChange)
    window.addEventListener('accentChanged', handleAccentChange)

    return () => {
      window.removeEventListener('themeChanged', handleThemeChange)
      window.removeEventListener('accentChanged', handleAccentChange)
    }
  }, [theme, accent])

  return { theme, accent, setTheme, setAccent }
}

















