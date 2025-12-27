/**
 * EasterEggCoordinator - Coordinates Papa and Zoo Easter Egg triggers
 * 
 * Randomly selects between Papa (left) and Zoo (right) on each threshold trigger.
 * Uses anti-streak bias with chaos override for organic randomness.
 * 
 * Session gating: Only one trigger per threshold per session (handled by usePapaEggTriggers).
 * Resets when fillPct goes from >0 to 0.
 */

import { useRef, useCallback } from 'react'
import { useOrangeToy } from '../contexts/OrangeToyContext'
import { usePapaEggTriggers } from '../hooks/usePapaEggTriggers'
import { PAPA_CONFIG } from './PapaEasterEgg'
import PapaEasterEgg from './PapaEasterEgg'
import ZooEasterEgg from './ZooEasterEgg'

export default function EasterEggCoordinator() {
  const { fillPct } = useOrangeToy()
  const papaRef = useRef(null)
  const zooRef = useRef(null)
  const lastCharacterRef = useRef(null) // 'PAPA' | 'ZOO' | null

  // Random selection with anti-streak bias + chaos override
  const selectCharacter = useCallback(() => {
    const chaosRoll = Math.random()
    
    // 10% chance: pure 50/50 random (chaos override)
    if (chaosRoll < 0.1) {
      const selected = Math.random() < 0.5 ? 'PAPA' : 'ZOO'
      lastCharacterRef.current = selected
      return selected
    }
    
    // Otherwise: anti-streak bias
    const last = lastCharacterRef.current
    if (last === 'PAPA') {
      // Last was Papa => 65% Zoo / 35% Papa
      const selected = Math.random() < 0.65 ? 'ZOO' : 'PAPA'
      lastCharacterRef.current = selected
      return selected
    } else if (last === 'ZOO') {
      // Last was Zoo => 65% Papa / 35% Zoo
      const selected = Math.random() < 0.65 ? 'PAPA' : 'ZOO'
      lastCharacterRef.current = selected
      return selected
    } else {
      // null (first trigger) => 50/50
      const selected = Math.random() < 0.5 ? 'PAPA' : 'ZOO'
      lastCharacterRef.current = selected
      return selected
    }
  }, [])

  // Handle trigger from usePapaEggTriggers hook
  const handleTrigger = useCallback((papaType, isFirstTrigger) => {
    // Select which character to show
    const character = selectCharacter()
    
    if (character === 'PAPA') {
      // Select Papa variants on first trigger
      if (isFirstTrigger && papaRef.current) {
        papaRef.current.selectVariants()
      }
      // Trigger Papa animation
      if (papaRef.current) {
        papaRef.current.trigger(papaType)
      }
    } else {
      // Select Zoo variant on first trigger
      if (isFirstTrigger && zooRef.current) {
        zooRef.current.selectVariant()
      }
      // Trigger Zoo animation
      if (zooRef.current) {
        zooRef.current.trigger(papaType)
      }
    }
  }, [selectCharacter])

  // Use hook for threshold detection and session gating
  usePapaEggTriggers(fillPct, PAPA_CONFIG, handleTrigger)

  // Reset last character and Papa rarity when session resets (fillPct goes from >0 to 0)
  const prevFillPctRef = useRef(null)
  if (prevFillPctRef.current !== null && prevFillPctRef.current > 0 && fillPct === 0) {
    lastCharacterRef.current = null
    // Clear Papa rarity on session reset
    try {
      sessionStorage.removeItem('papaEggRarity')
      // Reset Papa rarity state
      if (papaRef.current) {
        papaRef.current.resetRarity()
      }
    } catch (err) {
      if (process.env.NODE_ENV === 'development') {
        console.debug('[EasterEggCoordinator] Error clearing rarity:', err)
      }
    }
  }
  prevFillPctRef.current = fillPct

  return (
    <>
      <PapaEasterEgg ref={papaRef} />
      <ZooEasterEgg ref={zooRef} />
    </>
  )
}

