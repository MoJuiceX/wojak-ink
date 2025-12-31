/**
 * Grid utilities for desktop icon alignment
 * Provides grid snapping functionality similar to Windows 98
 */

const GRID_SIZE = 64 // Grid spacing in pixels (increased from 48px for better spacing)
const GRID_SIZE_X = GRID_SIZE // Horizontal grid spacing
const GRID_SIZE_Y = GRID_SIZE // Vertical grid spacing
const GRID_OFFSET_X = 0 // Grid offset from desktop left edge
const GRID_OFFSET_Y = 0 // Grid offset from desktop top edge

const GRID_SNAPPING_KEY = 'wojak_desktop_grid_snapping'

/**
 * Get current grid size
 * @returns {{x: number, y: number}} Grid size in pixels
 */
export function getGridSize() {
  return { x: GRID_SIZE_X, y: GRID_SIZE_Y }
}

/**
 * Get grid offset
 * @returns {{x: number, y: number}} Grid offset in pixels
 */
export function getGridOffset() {
  return { x: GRID_OFFSET_X, y: GRID_OFFSET_Y }
}

/**
 * Check if grid snapping is enabled
 * @returns {boolean} True if grid snapping is enabled
 */
export function isGridSnappingEnabled() {
  // Always enabled for Windows 98 authenticity
  return true
}

/**
 * Set grid snapping enabled state
 * @param {boolean} enabled - Whether grid snapping should be enabled
 */
export function setGridSnappingEnabled(enabled) {
  try {
    localStorage.setItem(GRID_SNAPPING_KEY, enabled ? 'true' : 'false')
  } catch (error) {
    console.error('Error setting grid snapping:', error)
  }
}

/**
 * Snap coordinates to nearest grid point
 * @param {number} x - X coordinate
 * @param {number} y - Y coordinate
 * @param {boolean} useOffset - Whether to apply grid offset (default: true)
 * @returns {{x: number, y: number}} Snapped coordinates
 */
export function snapToGrid(x, y, useOffset = true) {
  const gridSize = getGridSize()
  const gridOffset = useOffset ? getGridOffset() : { x: 0, y: 0 }

  // Adjust coordinates by offset
  const adjustedX = x - gridOffset.x
  const adjustedY = y - gridOffset.y

  // Snap to nearest grid point with explicit integer rounding
  const gridCellX = Math.round(adjustedX / gridSize.x)
  const gridCellY = Math.round(adjustedY / gridSize.y)

  // Calculate snapped position and ensure integer values
  const snappedX = gridCellX * gridSize.x
  const snappedY = gridCellY * gridSize.y

  // Add offset back and round to integers (prevent floating point drift)
  return {
    x: Math.round(snappedX + gridOffset.x),
    y: Math.round(snappedY + gridOffset.y)
  }
}

/**
 * Check if coordinates are on grid
 * @param {number} x - X coordinate
 * @param {number} y - Y coordinate
 * @param {boolean} useOffset - Whether to apply grid offset (default: true)
 * @returns {boolean} True if coordinates are on grid
 */
export function isOnGrid(x, y, useOffset = true) {
  const snapped = snapToGrid(x, y, useOffset)
  return snapped.x === x && snapped.y === y
}

