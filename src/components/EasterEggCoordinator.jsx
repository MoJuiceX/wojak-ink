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
  // DEV mode check (Vite-safe expression)
  const isDev = (import.meta?.env?.DEV) ?? (process.env.NODE_ENV === 'development')
  
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

  // DEV panel button handlers
  const handlePapaTest = useCallback((papaType) => {
    if (papaRef.current) {
      // Ensure variants are selected before triggering
      papaRef.current.selectVariants()
      papaRef.current.trigger(papaType)
    }
  }, [])

  const handleZooTest = useCallback((papaType) => {
    if (zooRef.current) {
      // Ensure variant is selected before triggering
      zooRef.current.selectVariant()
      zooRef.current.trigger(papaType)
    }
  }, [])

  return (
    <>
      <PapaEasterEgg ref={papaRef} />
      <ZooEasterEgg ref={zooRef} />
      
      {/* Unified DEV panel */}
      {isDev && (
        <div
          style={{
            position: 'fixed',
            top: '12px',
            right: '12px',
            zIndex: 200000,
            padding: '10px',
            backgroundColor: 'rgba(0, 0, 0, 0.65)',
            borderRadius: '8px',
            fontFamily: 'monospace',
            color: 'white',
            fontSize: '12px',
            pointerEvents: 'auto',
            minWidth: '200px'
          }}
        >
          <div style={{
            marginBottom: '10px',
            fontWeight: 'bold',
            borderBottom: '1px solid rgba(255, 255, 255, 0.3)',
            paddingBottom: '6px',
            fontSize: '13px'
          }}>
            Easter Egg DEV
          </div>
          
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '6px',
            marginBottom: '8px'
          }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <div style={{
                fontSize: '11px',
                fontWeight: 'bold',
                marginBottom: '2px',
                opacity: 0.9
              }}>
                PAPA
              </div>
              <button
                onClick={() => handlePapaTest(1)}
                onMouseDown={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.3)'}
                onMouseUp={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.2)'}
                style={{
                  padding: '6px 12px',
                  fontSize: '12px',
                  cursor: 'pointer',
                  backgroundColor: 'rgba(255, 255, 255, 0.2)',
                  border: '1px solid rgba(255, 255, 255, 0.3)',
                  color: 'white',
                  borderRadius: '3px',
                  height: '32px',
                  pointerEvents: 'auto'
                }}
              >
                Papa1
              </button>
              <button
                onClick={() => handlePapaTest(2)}
                onMouseDown={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.3)'}
                onMouseUp={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.2)'}
                style={{
                  padding: '6px 12px',
                  fontSize: '12px',
                  cursor: 'pointer',
                  backgroundColor: 'rgba(255, 255, 255, 0.2)',
                  border: '1px solid rgba(255, 255, 255, 0.3)',
                  color: 'white',
                  borderRadius: '3px',
                  height: '32px',
                  pointerEvents: 'auto'
                }}
              >
                Papa2
              </button>
              <button
                onClick={() => handlePapaTest(3)}
                onMouseDown={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.3)'}
                onMouseUp={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.2)'}
                style={{
                  padding: '6px 12px',
                  fontSize: '12px',
                  cursor: 'pointer',
                  backgroundColor: 'rgba(255, 255, 255, 0.2)',
                  border: '1px solid rgba(255, 255, 255, 0.3)',
                  color: 'white',
                  borderRadius: '3px',
                  height: '32px',
                  pointerEvents: 'auto'
                }}
              >
                Papa3
              </button>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <div style={{
                fontSize: '11px',
                fontWeight: 'bold',
                marginBottom: '2px',
                opacity: 0.9
              }}>
                ZOO
              </div>
              <button
                onClick={() => handleZooTest(1)}
                onMouseDown={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.3)'}
                onMouseUp={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.2)'}
                style={{
                  padding: '6px 12px',
                  fontSize: '12px',
                  cursor: 'pointer',
                  backgroundColor: 'rgba(255, 255, 255, 0.2)',
                  border: '1px solid rgba(255, 255, 255, 0.3)',
                  color: 'white',
                  borderRadius: '3px',
                  height: '32px',
                  pointerEvents: 'auto'
                }}
              >
                Zoo1
              </button>
              <button
                onClick={() => handleZooTest(2)}
                onMouseDown={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.3)'}
                onMouseUp={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.2)'}
                style={{
                  padding: '6px 12px',
                  fontSize: '12px',
                  cursor: 'pointer',
                  backgroundColor: 'rgba(255, 255, 255, 0.2)',
                  border: '1px solid rgba(255, 255, 255, 0.3)',
                  color: 'white',
                  borderRadius: '3px',
                  height: '32px',
                  pointerEvents: 'auto'
                }}
              >
                Zoo2
              </button>
              <button
                onClick={() => handleZooTest(3)}
                onMouseDown={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.3)'}
                onMouseUp={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.2)'}
                style={{
                  padding: '6px 12px',
                  fontSize: '12px',
                  cursor: 'pointer',
                  backgroundColor: 'rgba(255, 255, 255, 0.2)',
                  border: '1px solid rgba(255, 255, 255, 0.3)',
                  color: 'white',
                  borderRadius: '3px',
                  height: '32px',
                  pointerEvents: 'auto'
                }}
              >
                Zoo3
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

