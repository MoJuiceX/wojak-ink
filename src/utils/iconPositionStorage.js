/**
 * localStorage utilities for desktop icon positions
 * Handles storage, loading, error handling for icon positions
 */

import { DESKTOP_MAIN_ORDER, DESKTOP_GAMES_ORDER, DESKTOP_LINKS_ORDER } from '../constants/apps'
import { snapToGrid, getGridSize } from './iconGrid'

const ICON_POSITIONS_KEY = 'wojak_desktop_icon_positions'

// Icon dimensions
const ICON_WIDTH = 96
const ICON_HEIGHT = 80 // 32px icon + ~48px label + gap
const ICON_GAP = 8
const BASE_X = 20
const BASE_Y = 20

// Get grid size for consistent spacing
const { y: GRID_SIZE_Y } = getGridSize()

/**
 * Check if localStorage is available
 * @returns {boolean} True if localStorage is available
 */
function isLocalStorageAvailable() {
  try {
    const test = '__storage_test__'
    localStorage.setItem(test, test)
    localStorage.removeItem(test)
    return true
  } catch (e) {
    return false
  }
}

/**
 * Load icon positions from localStorage
 * @returns {Object} Object mapping appId to {x, y} positions
 */
export function loadIconPositions() {
  if (!isLocalStorageAvailable()) {
    return {}
  }

  try {
    const stored = localStorage.getItem(ICON_POSITIONS_KEY)
    if (!stored) return {}
    
    const parsed = JSON.parse(stored)
    return typeof parsed === 'object' && parsed !== null ? parsed : {}
  } catch (error) {
    console.error('Error loading icon positions:', error)
    return {}
  }
}

/**
 * Save icon positions to localStorage
 * @param {Object} positions - Object mapping appId to {x, y} positions
 * @returns {{ success: boolean, error?: string }} Result object
 */
export function saveAllIconPositions(positions) {
  if (!isLocalStorageAvailable()) {
    return { success: false, error: 'localStorage not available' }
  }

  try {
    const json = JSON.stringify(positions)
    localStorage.setItem(ICON_POSITIONS_KEY, json)
    return { success: true }
  } catch (error) {
    if (error.name === 'QuotaExceededError') {
      return { success: false, error: 'QuotaExceededError' }
    }
    console.error('Error saving icon positions:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Save a single icon position
 * @param {string} appId - App ID
 * @param {number} x - X coordinate
 * @param {number} y - Y coordinate
 * @returns {{ success: boolean, error?: string }} Result object
 */
export function saveIconPosition(appId, x, y) {
  const positions = loadIconPositions()
  positions[appId] = { x, y }
  return saveAllIconPositions(positions)
}

/**
 * Clear all icon positions from localStorage (reset to defaults)
 * @returns {{ success: boolean, error?: string }} Result object
 */
export function clearAllIconPositions() {
  if (!isLocalStorageAvailable()) {
    return { success: false, error: 'localStorage not available' }
  }

  try {
    localStorage.removeItem(ICON_POSITIONS_KEY)
    return { success: true }
  } catch (error) {
    console.error('Error clearing icon positions:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Get default position for an icon based on its order
 * Matches the reference image layout:
 * - Left column: Main apps and games (README, MINT_INFO, GALLERY, MARKETPLACE, WOJAK_GENERATOR, RARITY_EXPLORER, FAQ, TANGGANG, CRATE)
 * - Right column: Folders and Recycle Bin (handled separately in DesktopImageIcons.jsx)
 * @param {string} appId - App ID
 * @param {number} index - Index in its section
 * @param {string} section - Section name: 'main', 'games', or 'links'
 * @param {boolean} isMobile - Whether mobile viewport
 * @returns {{x: number, y: number}} Default position
 */
export function getDefaultPosition(appId, index, section, isMobile = false) {
  let y = BASE_Y

  if (section === 'main') {
    // Filter out PAINT on mobile for accurate positioning
    const mainOrder = isMobile 
      ? DESKTOP_MAIN_ORDER.filter(id => id !== 'PAINT')
      : DESKTOP_MAIN_ORDER
    const actualIndex = mainOrder.indexOf(appId)
    if (actualIndex >= 0) {
      // Use grid spacing (80px) for consistent vertical alignment
      y = BASE_Y + (actualIndex * GRID_SIZE_Y)
    }
  } else if (section === 'games') {
    // Games are now in DESKTOP_MAIN_ORDER, so this shouldn't be used
    // But keep for backward compatibility
    const mainCount = isMobile
      ? DESKTOP_MAIN_ORDER.filter(id => id !== 'PAINT').length
      : DESKTOP_MAIN_ORDER.length
    y = BASE_Y + (mainCount * GRID_SIZE_Y) + (index * GRID_SIZE_Y)
  } else if (section === 'links') {
    // Links are positioned after main items
    const mainCount = isMobile
      ? DESKTOP_MAIN_ORDER.filter(id => id !== 'PAINT').length
      : DESKTOP_MAIN_ORDER.length
    const gamesCount = DESKTOP_GAMES_ORDER.length
    y = BASE_Y + (mainCount * GRID_SIZE_Y) + (gamesCount * GRID_SIZE_Y) + (index * GRID_SIZE_Y)
  }

  const position = { x: BASE_X, y }
  // Snap to grid to ensure consistent spacing
  return snapToGrid(position.x, position.y)
}

