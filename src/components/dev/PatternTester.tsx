/**
 * Pattern Tester - Dev Mode Component
 *
 * Allows testing all 20 arcade light patterns individually.
 * Useful for verifying CSS animations and pattern behavior.
 *
 * Usage:
 * 1. Import and render inside ArcadeLightsProvider
 * 2. Click any pattern button to activate it
 * 3. Patterns show in the ArcadeFrame if visible
 *
 * @example
 * <ArcadeLightsProvider>
 *   <ArcadeFrame>
 *     <PatternTester />
 *   </ArcadeFrame>
 * </ArcadeLightsProvider>
 */

import { useState } from 'react';
import { useArcadeLights } from '@/contexts/ArcadeLightsContext';
import {
  PATTERNS,
  PATTERN_NAMES,
  type PatternCategory,
} from '@/config/arcade-light-patterns';
import { DEFAULT_EVENT_MAPPINGS, type GameEvent } from '@/config/arcade-light-mappings';

// Group patterns by category for organized display
const PATTERN_CATEGORIES: { name: PatternCategory; label: string; color: string }[] = [
  { name: 'ambient', label: 'Ambient', color: '#60a5fa' },
  { name: 'flash', label: 'Flash', color: '#f59e0b' },
  { name: 'wave', label: 'Wave', color: '#10b981' },
  { name: 'radial', label: 'Radial', color: '#8b5cf6' },
  { name: 'chase', label: 'Chase', color: '#ec4899' },
  { name: 'warning', label: 'Warning', color: '#ef4444' },
  { name: 'celebration', label: 'Celebration', color: '#fbbf24' },
];

// Sample game events to test
const SAMPLE_EVENTS: GameEvent[] = [
  'game:start',
  'game:over',
  'game:highScore',
  'play:active',
  'score:small',
  'score:medium',
  'score:large',
  'score:huge',
  'progress:forward',
  'collect:coin',
  'combo:low',
  'combo:mid',
  'combo:high',
  'combo:max',
  'damage:light',
  'damage:heavy',
  'perfect:hit',
];

export function PatternTester() {
  const { setPattern, triggerEvent, pattern: activePattern } = useArcadeLights();
  const [mode, setMode] = useState<'patterns' | 'events'>('patterns');

  const getPatternsByCategory = (category: PatternCategory) =>
    PATTERN_NAMES.filter(name => PATTERNS[name].category === category);

  return (
    <div
      style={{
        position: 'absolute',
        top: '10%',
        left: '50%',
        transform: 'translateX(-50%)',
        width: '80%',
        maxWidth: '600px',
        maxHeight: '80%',
        overflow: 'auto',
        background: 'var(--color-black-90)',
        borderRadius: '12px',
        padding: '20px',
        color: 'white',
        fontFamily: 'system-ui, sans-serif',
        zIndex: 1000,
      }}
    >
      <h2 style={{ margin: '0 0 16px', fontSize: '18px', fontWeight: 'bold' }}>
        🎮 Arcade Light Pattern Tester
      </h2>

      {/* Mode Toggle */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
        <button
          onClick={() => setMode('patterns')}
          style={{
            flex: 1,
            padding: '8px 16px',
            background: mode === 'patterns' ? '#3b82f6' : '#374151',
            border: 'none',
            borderRadius: '6px',
            color: 'white',
            cursor: 'pointer',
            fontSize: '14px',
          }}
        >
          Direct Patterns
        </button>
        <button
          onClick={() => setMode('events')}
          style={{
            flex: 1,
            padding: '8px 16px',
            background: mode === 'events' ? '#3b82f6' : '#374151',
            border: 'none',
            borderRadius: '6px',
            color: 'white',
            cursor: 'pointer',
            fontSize: '14px',
          }}
        >
          Game Events
        </button>
      </div>

      {/* Active Pattern Display */}
      <div
        style={{
          padding: '12px',
          background: '#1f2937',
          borderRadius: '8px',
          marginBottom: '16px',
          textAlign: 'center',
        }}
      >
        <span style={{ color: '#9ca3af', fontSize: '12px' }}>Active Pattern:</span>
        <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#60a5fa' }}>
          {activePattern || 'none'}
        </div>
      </div>

      {mode === 'patterns' ? (
        /* Pattern Buttons by Category */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {PATTERN_CATEGORIES.map(category => {
            const patterns = getPatternsByCategory(category.name);
            return (
              <div key={category.name}>
                <h3
                  style={{
                    margin: '0 0 8px',
                    fontSize: '14px',
                    color: category.color,
                    fontWeight: '600',
                  }}
                >
                  {category.label} ({patterns.length})
                </h3>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {patterns.map(name => {
                    const def = PATTERNS[name];
                    const isActive = activePattern === name;
                    return (
                      <button
                        key={name}
                        onClick={() => setPattern(name)}
                        style={{
                          padding: '8px 12px',
                          background: isActive ? category.color : '#374151',
                          border: `2px solid ${isActive ? 'white' : 'transparent'}`,
                          borderRadius: '6px',
                          color: 'white',
                          cursor: 'pointer',
                          fontSize: '12px',
                          transition: 'all 0.15s ease',
                        }}
                        title={`${def.description} (${def.duration}ms, ${def.loop ? 'loop' : 'once'})`}
                      >
                        {name}
                        <span
                          style={{
                            marginLeft: '4px',
                            fontSize: '10px',
                            opacity: 0.7,
                          }}
                        >
                          {def.loop ? '∞' : `${def.duration}ms`}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Event Buttons */
        <div>
          <p style={{ margin: '0 0 12px', fontSize: '12px', color: '#9ca3af' }}>
            Click events to see how they map to patterns:
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {SAMPLE_EVENTS.map(event => {
              const mappedPattern = DEFAULT_EVENT_MAPPINGS[event];
              return (
                <button
                  key={event}
                  onClick={() => triggerEvent(event)}
                  style={{
                    padding: '8px 12px',
                    background: '#374151',
                    border: 'none',
                    borderRadius: '6px',
                    color: 'white',
                    cursor: 'pointer',
                    fontSize: '11px',
                    transition: 'all 0.15s ease',
                  }}
                  title={`Maps to: ${mappedPattern}`}
                >
                  {event}
                  <span
                    style={{
                      display: 'block',
                      fontSize: '9px',
                      color: '#60a5fa',
                      marginTop: '2px',
                    }}
                  >
                    → {mappedPattern}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Pattern Info */}
      <div
        style={{
          marginTop: '16px',
          padding: '12px',
          background: '#1f2937',
          borderRadius: '8px',
          fontSize: '11px',
          color: '#9ca3af',
        }}
      >
        <strong>Total Patterns:</strong> {PATTERN_NAMES.length}
        <br />
        <strong>Categories:</strong> {PATTERN_CATEGORIES.map(c => c.label).join(', ')}
      </div>
    </div>
  );
}

export default PatternTester;
