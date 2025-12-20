import { createContext, useContext, useState, useCallback, useRef, useMemo, useEffect } from 'react'

const OrangeToyContext = createContext()

// Constants
const BASE_REQUIRED_SCORE = 10
const GROWTH_FACTOR = 1.6
const STORAGE_KEY_CLAIMS_COUNT = 'orangeGame_claimsCount'
const STORAGE_KEY_SCORE = 'orangeGame_score' // Optional

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

  // Derived: requiredScore from claimsCount using useMemo
  const requiredScore = useMemo(() => 
    Math.ceil(BASE_REQUIRED_SCORE * Math.pow(GROWTH_FACTOR, claimsCount)), 
    [claimsCount]
  )

  // Derived: totalClaimedPrizes is same as claimsCount
  const totalClaimedPrizes = claimsCount

  // Derived: canClaim
  const canClaim = score >= requiredScore

  // Derived: fillPct for juice meter
  const fillPct = Math.min(1, score / requiredScore)

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
