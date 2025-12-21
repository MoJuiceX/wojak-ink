import { useRef, useEffect } from 'react'

/**
 * Hook for detecting Papa Easter Egg threshold crossings and session gating
 * @param {number} fillPct - Current fill percentage (0 to 1)
 * @param {Object} papaConfig - Configuration object with papaType-number keys containing threshold values
 * @param {Function} onTrigger - Callback when threshold is crossed: (papaType: 1|2|3, isFirstTrigger: boolean) => void
 */
export function usePapaEggTriggers(fillPct, papaConfig, onTrigger) {
  const prevFillPctRef = useRef(null)
  const triggeredThresholdsRef = useRef(new Set())
  const loadedFromStorageRef = useRef(false)

  // Load triggered thresholds from sessionStorage on mount
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (loadedFromStorageRef.current) return

    try {
      const stored = sessionStorage.getItem('papaEasterEggTriggered')
      if (stored) {
        const thresholds = JSON.parse(stored)
        triggeredThresholdsRef.current = new Set(thresholds)
      }
    } catch (err) {
      if (process.env.NODE_ENV === 'development') {
        console.debug('[usePapaEggTriggers] sessionStorage error:', err)
      }
    }
    loadedFromStorageRef.current = true
  }, [])

  // Watch for threshold crossings
  useEffect(() => {
    // Always update prevFillPctRef (even if already shown) to prevent getting stuck
    const prevFillPct = prevFillPctRef.current
    prevFillPctRef.current = fillPct

    // Check if we've already loaded from sessionStorage (SSR-safe)
    if (typeof window === 'undefined') return

    // Clear triggered thresholds when score resets (prize claimed)
    // When fillPct goes from > 0 to 0, the prize was claimed and score reset
    if (prevFillPct !== null && prevFillPct > 0 && fillPct === 0) {
      triggeredThresholdsRef.current.clear()
      try {
        sessionStorage.removeItem('papaEasterEggTriggered')
      } catch (err) {
        if (process.env.NODE_ENV === 'development') {
          console.debug('[usePapaEggTriggers] sessionStorage clear error:', err)
        }
      }
      return
    }

    // Ensure we've loaded from sessionStorage
    if (!loadedFromStorageRef.current) {
      try {
        const stored = sessionStorage.getItem('papaEasterEggTriggered')
        if (stored) {
          const thresholds = JSON.parse(stored)
          triggeredThresholdsRef.current = new Set(thresholds)
        }
      } catch (err) {
        if (process.env.NODE_ENV === 'development') {
          console.debug('[usePapaEggTriggers] sessionStorage error:', err)
        }
      }
      loadedFromStorageRef.current = true
    }

    // Check for threshold crossings for each papaType
    for (const papaType of [1, 2, 3]) {
      const config = papaConfig[papaType]
      if (!config) continue

      const threshold = config.threshold
      const thresholdKey = String(threshold * 100) // Convert to string key like '5', '45', '85'

      // Check if this threshold has already been triggered
      if (triggeredThresholdsRef.current.has(thresholdKey)) continue

      // Check for upward crossing
      if (prevFillPct !== null && prevFillPct < threshold && fillPct >= threshold) {
        // Compute isFirstTrigger BEFORE adding current threshold
        const isFirstTrigger = triggeredThresholdsRef.current.size === 0

        // Call callback BEFORE marking threshold (critical ordering)
        onTrigger(papaType, isFirstTrigger)

        // Mark threshold as triggered
        triggeredThresholdsRef.current.add(thresholdKey)
        try {
          sessionStorage.setItem('papaEasterEggTriggered', JSON.stringify(Array.from(triggeredThresholdsRef.current)))
        } catch (err) {
          if (process.env.NODE_ENV === 'development') {
            console.debug('[usePapaEggTriggers] sessionStorage set error:', err)
          }
        }
        return // Only trigger one threshold per fillPct change
      }
    }
  }, [fillPct, papaConfig, onTrigger])
}
