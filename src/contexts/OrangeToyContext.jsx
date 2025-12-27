import { createContext, useContext, useState, useCallback, useRef, useMemo, useEffect } from 'react'

const OrangeToyContext = createContext()

// Constants
const BASE_REQUIRED_SCORE = 10
const GROWTH_FACTOR = 1.15 // Reduced from 1.6 to 1.3 to 1.15 for much less steep progression
const STORAGE_KEY_CLAIMS_COUNT = 'orangeGame_claimsCount'
const STORAGE_KEY_SCORE = 'orangeGame_score' // Optional

// Glass frame paths - exact paths as specified (g1-g7 only, clamp to g7 when full)
const GLASS_MAX = 7
const GLASS_FRAMES = Array.from({ length: GLASS_MAX }, (_, i) => `/assets/images/banners/g${i + 1}.png`);

// Helper function to get glass frame based on score progress
function getGlassFrame(score, requiredScore) {
  const denom = Math.max(1, requiredScore || 1);
  const progress = Math.max(0, Math.min(1, score / denom));
  const idx = 1 + Math.floor(progress * (GLASS_MAX - 1)); // 1..7
  return GLASS_FRAMES[Math.min(GLASS_MAX - 1, Math.max(0, idx - 1))];
}

/**
 * OrangeToyProvider component that manages orange game state and provides game functions.
 * 
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - Child components that can access orange toy context
 * @returns {React.ReactElement} The context provider
 */
export function OrangeToyProvider({ children }) {
  // Load claimsCount from localStorage on mount
  const [claimsCount, setClaimsCount] = useState(() => {
    if (typeof window === 'undefined') return 0
    try {
      const stored = localStorage.getItem(STORAGE_KEY_CLAIMS_COUNT)
      return stored ? parseInt(stored, 10) || 0 : 0
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('[OrangeToyContext] Error loading claimsCount from localStorage:', error)
      }
      return 0
    }
  })

  // Load score from localStorage on mount (optional)
  const [score, setScore] = useState(() => {
    if (typeof window === 'undefined') return 0
    try {
      const stored = localStorage.getItem(STORAGE_KEY_SCORE)
      return stored ? parseInt(stored, 10) || 0 : 0
    } catch (error) {
      return 0
    }
  })

  const [tryAgainOpen, setTryAgainOpen] = useState(false)
  const orangeExistsRef = useRef(false)

  // Derived: requiredScore is now a fixed constant (no growth)
  // Increased by 75%: 15 * 1.75 = 26.25, rounded to 26
  const REQUIRED_SCORE = 26 // Fixed constant (increased from 15 by 75%)
  const requiredScore = REQUIRED_SCORE // Simple constant, no useMemo needed

  // Derived: totalClaimedPrizes is same as claimsCount
  const totalClaimedPrizes = claimsCount

  // Derived: canClaim
  const canClaim = score >= requiredScore

  // Derived: fillPct for juice meter
  const fillPct = Math.min(1, score / requiredScore)

  // Derived: glassSrc for glass fill display
  const glassSrc = useMemo(() => getGlassFrame(score, requiredScore), [score, requiredScore])

  // Save claimsCount to localStorage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_CLAIMS_COUNT, String(claimsCount))
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('[OrangeToyContext] Error saving claimsCount to localStorage:', error)
      }
    }
  }, [claimsCount])

  // Optional: Save score to localStorage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_SCORE, String(score))
    } catch (error) {
      // Silently fail for score persistence
    }
  }, [score])

  const incrementScore = useCallback(() => {
    setScore(prev => prev + 1)
  }, [])

  const addPoints = useCallback((delta) => {
    setScore(prev => prev + delta)
  }, [])

  const claimPrize = useCallback(() => {
    // Early exit if can't claim
    if (score < requiredScore) return

    // DEV: Log claim
    if (import.meta?.env?.DEV || process.env.NODE_ENV === 'development') {
      console.log('[OrangeToyContext] Claim prize triggered, resetting score')
    }

    // Reset score to 0 (explicit rule: always reset to 0, never subtract)
    setScore(0)

    // Increment claimsCount (single source of truth)
    setClaimsCount(prev => prev + 1)

    // Open popup
    setTryAgainOpen(true)
  }, [score, requiredScore])

  const spawnOrange = useCallback(() => {
    // Trigger orange spawn by setting ref flag (OrangeToyLayer checks this ref)
    orangeExistsRef.current = true
  }, [])

  const closeTryAgain = useCallback(() => {
    setTryAgainOpen(false)
  }, [])

  const value = {
    score,
    claimsCount,
    totalClaimedPrizes,
    requiredScore,
    canClaim,
    fillPct,
    glassSrc,
    tryAgainOpen,
    incrementScore,
    addPoints,
    claimPrize,
    spawnOrange,
    closeTryAgain,
    orangeExistsRef,
  }

  return (
    <OrangeToyContext.Provider value={value}>
      {children}
    </OrangeToyContext.Provider>
  )
}

/**
 * Hook to access OrangeToyContext
 * @returns {Object} Orange toy context value
 */
export function useOrangeToy() {
  const context = useContext(OrangeToyContext)
  if (!context) {
    throw new Error('useOrangeToy must be used within OrangeToyProvider')
  }
  return context
}
