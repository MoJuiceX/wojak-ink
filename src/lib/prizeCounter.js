/**
 * Deterministic prize counter based on calendar days
 * Uses a repeating +3, +2 pattern starting from BASE_DATE
 */

// Constants
const BASE_DATE = '2025-12-16' // Launch date
const BASE_COUNT = 13 // Starting count on BASE_DATE

/**
 * Normalize a date to local midnight (00:00:00)
 * @param {Date} date - Date to normalize
 * @returns {Date} Date at local midnight
 */
function normalizeToMidnight(date) {
  const normalized = new Date(date)
  normalized.setHours(0, 0, 0, 0)
  return normalized
}

/**
 * Calculate the number of whole days between two dates (local time)
 * @param {Date} date1 - First date
 * @param {Date} date2 - Second date
 * @returns {number} Number of days (can be negative)
 */
function daysBetween(date1, date2) {
  const d1 = normalizeToMidnight(date1)
  const d2 = normalizeToMidnight(date2)
  const diffMs = d2.getTime() - d1.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  return diffDays
}

/**
 * Get the total prizes claimed count for today
 * Based on days since BASE_DATE with repeating +3, +2 pattern
 * 
 * Pattern:
 * - Day 0 (BASE_DATE): BASE_COUNT (no increase)
 * - Day 1: BASE_COUNT + 3
 * - Day 2: BASE_COUNT + 3 + 2
 * - Day 3: BASE_COUNT + 3 + 2 + 3
 * - Day 4: BASE_COUNT + 3 + 2 + 3 + 2
 * - etc.
 * 
 * @returns {number} Total prizes claimed count
 * 
 * Examples (self-check):
 * - On BASE_DATE (2025-12-16) => 13
 * - One day after (2025-12-17) => 13 + 3 = 16
 * - Two days after (2025-12-18) => 13 + 3 + 2 = 18
 * - Three days after (2025-12-19) => 13 + 3 + 2 + 3 = 21
 * - Four days after (2025-12-20) => 13 + 3 + 2 + 3 + 2 = 23
 */
export function getPrizesClaimedToday() {
  const today = new Date()
  const baseDate = new Date(BASE_DATE)
  
  // Calculate day index (days since BASE_DATE)
  const dayIndex = daysBetween(baseDate, today)
  
  // If before BASE_DATE, return BASE_COUNT
  if (dayIndex < 0) {
    return BASE_COUNT
  }
  
  // If on BASE_DATE (dayIndex === 0), return BASE_COUNT with no increase
  if (dayIndex === 0) {
    return BASE_COUNT
  }
  
  // Calculate sum of pattern for days 1 through dayIndex (inclusive)
  // Pattern: day 1 = +3, day 2 = +2, day 3 = +3, day 4 = +2, ...
  // Odd days (1, 3, 5, ...) add 3, even days (2, 4, 6, ...) add 2
  let totalIncrease = 0
  
  for (let day = 1; day <= dayIndex; day++) {
    if (day % 2 === 1) {
      // Odd day (1, 3, 5, ...) => +3
      totalIncrease += 3
    } else {
      // Even day (2, 4, 6, ...) => +2
      totalIncrease += 2
    }
  }
  
  return BASE_COUNT + totalIncrease
}

