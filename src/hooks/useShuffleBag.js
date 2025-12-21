import { useRef, useEffect } from 'react'

// Helper: Fisher-Yates shuffle
function shuffle(array) {
  const arr = [...array]
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

// Helper: Validate bag structure
function validateBag(bag, N) {
  if (!Array.isArray(bag)) return false
  if (bag.length > N) return false
  if (bag.length === 0) return false // Empty bag is invalid (should regenerate)
  
  const seen = new Set()
  for (const item of bag) {
    if (typeof item !== 'number' || !Number.isInteger(item)) return false
    if (item < 0 || item >= N) return false // Out of range
    if (seen.has(item)) return false // Duplicate
    seen.add(item)
  }
  
  return true
}

// Helper: Create fresh shuffled bag, avoiding immediate repeat
function makeFreshBag(N, lastUsedIndex) {
  if (N <= 1) return [0]
  
  let bag = Array.from({ length: N }, (_, i) => i)
  bag = shuffle(bag)
  
  // Avoid immediate repeat: if first index equals lastUsedIndex, try to fix
  if (lastUsedIndex >= 0 && lastUsedIndex < N && bag[0] === lastUsedIndex) {
    // Try reshuffling up to 5 times
    for (let attempt = 0; attempt < 5; attempt++) {
      bag = shuffle(bag)
      if (bag[0] !== lastUsedIndex) break
    }
    
    // If still same after 5 attempts, rotate by 1
    if (bag[0] === lastUsedIndex) {
      bag.push(bag.shift())
    }
  }
  
  return bag
}

/**
 * useShuffleBag - Hook for managing shuffle bag system
 * 
 * @param {Object} options
 * @param {string} options.bagKey - localStorage key for bag array (e.g., 'papaEggBag1')
 * @param {string} options.lastKey - localStorage key for last used index (e.g., 'papaEggLast1')
 * @param {number} options.N - Total number of items (e.g., IMAGE_SETS.length)
 * @returns {Object} { getNextIndex: () => number }
 */
export function useShuffleBag({ bagKey, lastKey, N }) {
  const bagRef = useRef([])
  const lastIndexRef = useRef(-1)
  const initializedRef = useRef(false)

  // Load from localStorage on mount
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (initializedRef.current) return

    let bag = []
    let lastIndex = -1

    try {
      const storedBag = localStorage.getItem(bagKey)
      if (storedBag) {
        bag = JSON.parse(storedBag)
      }
      const storedLast = localStorage.getItem(lastKey)
      if (storedLast) {
        const parsed = parseInt(storedLast, 10)
        if (!isNaN(parsed) && parsed >= -1 && parsed < N) {
          lastIndex = parsed
        }
      }
    } catch (err) {
      if (process.env.NODE_ENV === 'development') {
        console.debug(`[useShuffleBag] Error loading ${bagKey}/${lastKey}:`, err)
      }
    }

    if (!validateBag(bag, N)) {
      bag = makeFreshBag(N, lastIndex)
      try {
        localStorage.setItem(bagKey, JSON.stringify(bag))
      } catch (err) {
        if (process.env.NODE_ENV === 'development') {
          console.debug(`[useShuffleBag] Error saving ${bagKey}:`, err)
        }
      }
    }

    bagRef.current = bag
    lastIndexRef.current = lastIndex
    initializedRef.current = true
  }, [bagKey, lastKey, N])

  const getNextIndex = () => {
    // Lazy initialization if not done yet
    if (!initializedRef.current && typeof window !== 'undefined') {
      let bag = []
      let lastIndex = -1

      try {
        const storedBag = localStorage.getItem(bagKey)
        if (storedBag) {
          bag = JSON.parse(storedBag)
        }
        const storedLast = localStorage.getItem(lastKey)
        if (storedLast) {
          const parsed = parseInt(storedLast, 10)
          if (!isNaN(parsed) && parsed >= -1 && parsed < N) {
            lastIndex = parsed
          }
        }
      } catch (err) {
        if (process.env.NODE_ENV === 'development') {
          console.debug(`[useShuffleBag] Error loading ${bagKey}/${lastKey}:`, err)
        }
      }

      if (!validateBag(bag, N)) {
        bag = makeFreshBag(N, lastIndex)
        try {
          localStorage.setItem(bagKey, JSON.stringify(bag))
        } catch (err) {
          if (process.env.NODE_ENV === 'development') {
            console.debug(`[useShuffleBag] Error saving ${bagKey}:`, err)
          }
        }
      }

      bagRef.current = bag
      lastIndexRef.current = lastIndex
      initializedRef.current = true
    }

    let bag = bagRef.current
    if (!bag || bag.length === 0 || !validateBag(bag, N)) {
      bag = makeFreshBag(N, lastIndexRef.current)
      bagRef.current = bag
      try {
        localStorage.setItem(bagKey, JSON.stringify(bag))
      } catch (err) {
        if (process.env.NODE_ENV === 'development') {
          console.debug(`[useShuffleBag] Error saving ${bagKey}:`, err)
        }
      }
    }

    const nextIndex = bag.shift()
    bagRef.current = bag
    lastIndexRef.current = nextIndex

    try {
      localStorage.setItem(bagKey, JSON.stringify(bag))
      localStorage.setItem(lastKey, String(nextIndex))
    } catch (err) {
      if (process.env.NODE_ENV === 'development') {
        console.debug(`[useShuffleBag] Error saving ${bagKey}/${lastKey}:`, err)
      }
    }

    return nextIndex
  }

  return { getNextIndex }
}
