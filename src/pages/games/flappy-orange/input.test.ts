/**
 * Tests for flappy-orange/input.ts
 * Validates pure input handling functions for the Flappy Orange game.
 */

import { describe, it, expect } from 'vitest';
import {
  createInitialGameState,
  handleFlap,
  handleFlapWithDeformation,
  shouldIgnoreTap,
  shouldIgnoreInput,
  shouldBlockTapPropagation,
  startGameFromIdle,
  applyJumpToState,
  handleTapInput,
  getTouchPosition,
  isFlapKey,
  isRestartKey,
  isPauseKey,
} from './input';
import { PHYSICS } from './config';
import type { Bird, GameStateRef } from './types';

// ============================================
// HELPERS
// ============================================

function makeBird(overrides: Partial<Bird> = {}): Bird {
  return {
    y: 200,
    velocity: 0,
    rotation: 0,
    scaleX: 1,
    scaleY: 1,
    velocityX: 0,
    rotationVelocity: 0,
    ...overrides,
  };
}

function makeState(overrides: Partial<GameStateRef> = {}): GameStateRef {
  return {
    bird: makeBird(),
    pipes: [],
    score: 0,
    gameState: 'idle',
    frameCount: 0,
    stars: [],
    isFrozen: false,
    timeScale: 1,
    isDying: false,
    ...overrides,
  };
}

// ============================================
// createInitialGameState
// ============================================

describe('createInitialGameState', () => {
  it('returns a state object with gameState idle', () => {
    const state = createInitialGameState(600);
    expect(state.gameState).toBe('idle');
  });

  it('returns empty pipes array', () => {
    const state = createInitialGameState(600);
    expect(state.pipes).toHaveLength(0);
  });

  it('returns score of 0', () => {
    const state = createInitialGameState(600);
    expect(state.score).toBe(0);
  });

  it('places bird near canvas center vertically', () => {
    const state = createInitialGameState(600);
    expect(state.bird.y).toBe(300);
  });

  it('initializes isFrozen to false', () => {
    const state = createInitialGameState(600);
    expect(state.isFrozen).toBe(false);
  });

  it('initializes timeScale to 1', () => {
    const state = createInitialGameState(600);
    expect(state.timeScale).toBe(1);
  });

  it('initializes isDying to false', () => {
    const state = createInitialGameState(600);
    expect(state.isDying).toBe(false);
  });
});

// ============================================
// handleFlap
// ============================================

describe('handleFlap', () => {
  it('sets velocity to JUMP_VELOCITY', () => {
    const bird = makeBird({ velocity: 0 });
    const result = handleFlap(bird);
    expect(result.velocity).toBe(PHYSICS.JUMP_VELOCITY);
  });

  it('sets rotation to -0.4', () => {
    const bird = makeBird({ rotation: 0 });
    const result = handleFlap(bird);
    expect(result.rotation).toBe(-0.4);
  });

  it('does not mutate the original bird', () => {
    const bird = makeBird({ velocity: 0 });
    handleFlap(bird);
    expect(bird.velocity).toBe(0);
  });

  it('preserves other bird properties', () => {
    const bird = makeBird({ y: 150, scaleX: 0.9 });
    const result = handleFlap(bird);
    expect(result.y).toBe(150);
    expect(result.scaleX).toBe(0.9);
  });
});

// ============================================
// handleFlapWithDeformation
// ============================================

describe('handleFlapWithDeformation', () => {
  it('sets velocity to JUMP_VELOCITY', () => {
    const bird = makeBird();
    const result = handleFlapWithDeformation(bird);
    expect(result.velocity).toBe(PHYSICS.JUMP_VELOCITY);
  });

  it('applies default deformation scaleX = 0.85', () => {
    const bird = makeBird();
    const result = handleFlapWithDeformation(bird);
    expect(result.scaleX).toBe(0.85);
  });

  it('applies default deformation scaleY = 1.3', () => {
    const bird = makeBird();
    const result = handleFlapWithDeformation(bird);
    expect(result.scaleY).toBe(1.3);
  });

  it('accepts custom scale values', () => {
    const bird = makeBird();
    const result = handleFlapWithDeformation(bird, 0.7, 1.5);
    expect(result.scaleX).toBe(0.7);
    expect(result.scaleY).toBe(1.5);
  });

  it('does not mutate the original bird', () => {
    const bird = makeBird({ scaleX: 1, scaleY: 1 });
    handleFlapWithDeformation(bird);
    expect(bird.scaleX).toBe(1);
    expect(bird.scaleY).toBe(1);
  });
});

// ============================================
// shouldIgnoreTap
// ============================================

describe('shouldIgnoreTap', () => {
  it('returns true when gameState is gameover', () => {
    expect(shouldIgnoreTap('gameover', false)).toBe(true);
  });

  it('returns true when exit dialog is showing', () => {
    expect(shouldIgnoreTap('playing', true)).toBe(true);
  });

  it('returns false during idle', () => {
    expect(shouldIgnoreTap('idle', false)).toBe(false);
  });

  it('returns false during playing with no dialog', () => {
    expect(shouldIgnoreTap('playing', false)).toBe(false);
  });

  it('returns true when gameover AND exit dialog both active', () => {
    expect(shouldIgnoreTap('gameover', true)).toBe(true);
  });
});

// ============================================
// shouldIgnoreInput
// ============================================

describe('shouldIgnoreInput', () => {
  it('returns true when gameover', () => {
    expect(shouldIgnoreInput('gameover', false, false)).toBe(true);
  });

  it('returns true when isDying', () => {
    expect(shouldIgnoreInput('playing', true, false)).toBe(true);
  });

  it('returns true when exit dialog is showing', () => {
    expect(shouldIgnoreInput('playing', false, true)).toBe(true);
  });

  it('returns false when playing, not dying, no dialog', () => {
    expect(shouldIgnoreInput('playing', false, false)).toBe(false);
  });

  it('returns false when idle and no dying or dialog', () => {
    expect(shouldIgnoreInput('idle', false, false)).toBe(false);
  });
});

// ============================================
// shouldBlockTapPropagation
// ============================================

describe('shouldBlockTapPropagation', () => {
  it('blocks taps on a button element', () => {
    const button = document.createElement('button');
    document.body.appendChild(button);
    expect(shouldBlockTapPropagation(button)).toBe(true);
    document.body.removeChild(button);
  });

  it('does not block taps on a plain div', () => {
    const div = document.createElement('div');
    document.body.appendChild(div);
    expect(shouldBlockTapPropagation(div)).toBe(false);
    document.body.removeChild(div);
  });

  it('blocks taps on children of button', () => {
    const button = document.createElement('button');
    const span = document.createElement('span');
    button.appendChild(span);
    document.body.appendChild(button);
    expect(shouldBlockTapPropagation(span)).toBe(true);
    document.body.removeChild(button);
  });
});

// ============================================
// startGameFromIdle
// ============================================

describe('startGameFromIdle', () => {
  it('transitions idle state to playing', () => {
    const state = makeState({ gameState: 'idle' });
    startGameFromIdle(state, []);
    expect(state.gameState).toBe('playing');
  });

  it('does not transition from playing', () => {
    const state = makeState({ gameState: 'playing' });
    startGameFromIdle(state, []);
    expect(state.gameState).toBe('playing');
  });

  it('does not transition from gameover', () => {
    const state = makeState({ gameState: 'gameover' });
    startGameFromIdle(state, []);
    expect(state.gameState).toBe('gameover');
  });

  it('assigns stars when transitioning from idle', () => {
    const stars = [{ x: 10, y: 20, size: 1, alpha: 0.5 }];
    const state = makeState({ gameState: 'idle' });
    startGameFromIdle(state, stars);
    expect(state.stars).toEqual(stars);
  });
});

// ============================================
// applyJumpToState
// ============================================

describe('applyJumpToState', () => {
  it('applies jump velocity when playing', () => {
    const state = makeState({ gameState: 'playing', bird: makeBird({ velocity: 0 }) });
    applyJumpToState(state);
    expect(state.bird.velocity).toBe(PHYSICS.JUMP_VELOCITY);
  });

  it('does not apply jump when idle', () => {
    const state = makeState({ gameState: 'idle', bird: makeBird({ velocity: 0 }) });
    applyJumpToState(state);
    expect(state.bird.velocity).toBe(0);
  });

  it('does not apply jump when gameover', () => {
    const state = makeState({ gameState: 'gameover', bird: makeBird({ velocity: 0 }) });
    applyJumpToState(state);
    expect(state.bird.velocity).toBe(0);
  });

  it('sets bird rotation to -0.4 when playing', () => {
    const state = makeState({ gameState: 'playing', bird: makeBird({ rotation: 0 }) });
    applyJumpToState(state);
    expect(state.bird.rotation).toBe(-0.4);
  });
});

// ============================================
// handleTapInput
// ============================================

describe('handleTapInput', () => {
  it('returns didStart=true when transitioning from idle', () => {
    const state = makeState({ gameState: 'idle' });
    const result = handleTapInput(state, []);
    expect(result.didStart).toBe(true);
  });

  it('returns didStart=false when already playing', () => {
    const state = makeState({ gameState: 'playing' });
    const result = handleTapInput(state, []);
    expect(result.didStart).toBe(false);
  });

  it('applies jump velocity when playing', () => {
    const state = makeState({ gameState: 'playing', bird: makeBird({ velocity: 0 }) });
    handleTapInput(state, []);
    expect(state.bird.velocity).toBe(PHYSICS.JUMP_VELOCITY);
  });

  it('transitions and applies jump when starting from idle', () => {
    const state = makeState({ gameState: 'idle', bird: makeBird({ velocity: 0 }) });
    handleTapInput(state, []);
    expect(state.gameState).toBe('playing');
    expect(state.bird.velocity).toBe(PHYSICS.JUMP_VELOCITY);
  });
});

// ============================================
// getTouchPosition
// ============================================

describe('getTouchPosition', () => {
  it('returns null when no touches present', () => {
    const event = { touches: [] } as unknown as TouchEvent;
    expect(getTouchPosition(event)).toBeNull();
  });

  it('returns clientX and clientY from first touch', () => {
    const event = {
      touches: [{ clientX: 100, clientY: 200 }],
    } as unknown as TouchEvent;
    const pos = getTouchPosition(event);
    expect(pos).toEqual({ x: 100, y: 200 });
  });
});

// ============================================
// KEYBOARD HELPERS
// ============================================

describe('isFlapKey', () => {
  it('returns true for Space code', () => {
    const event = { code: 'Space', key: 'a' } as KeyboardEvent;
    expect(isFlapKey(event)).toBe(true);
  });

  it('returns true for space key value', () => {
    const event = { code: 'KeyA', key: ' ' } as KeyboardEvent;
    expect(isFlapKey(event)).toBe(true);
  });

  it('returns false for other keys', () => {
    const event = { code: 'KeyA', key: 'a' } as KeyboardEvent;
    expect(isFlapKey(event)).toBe(false);
  });
});

describe('isRestartKey', () => {
  it('returns true for KeyR code', () => {
    const event = { code: 'KeyR', key: 'a' } as KeyboardEvent;
    expect(isRestartKey(event)).toBe(true);
  });

  it('returns true for lowercase r key', () => {
    const event = { code: 'KeyA', key: 'r' } as KeyboardEvent;
    expect(isRestartKey(event)).toBe(true);
  });

  it('returns true for uppercase R key', () => {
    const event = { code: 'KeyA', key: 'R' } as KeyboardEvent;
    expect(isRestartKey(event)).toBe(true);
  });

  it('returns false for other keys', () => {
    const event = { code: 'KeyT', key: 't' } as KeyboardEvent;
    expect(isRestartKey(event)).toBe(false);
  });
});

describe('isPauseKey', () => {
  it('returns true for Escape code', () => {
    const event = { code: 'Escape', key: 'a' } as KeyboardEvent;
    expect(isPauseKey(event)).toBe(true);
  });

  it('returns true for Escape key value', () => {
    const event = { code: 'Other', key: 'Escape' } as KeyboardEvent;
    expect(isPauseKey(event)).toBe(true);
  });

  it('returns false for Space', () => {
    const event = { code: 'Space', key: ' ' } as KeyboardEvent;
    expect(isPauseKey(event)).toBe(false);
  });
});
