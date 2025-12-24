/**
 * API retry utility with exponential backoff and timeout handling
 */

const DEFAULT_MAX_RETRIES = 3
const DEFAULT_TIMEOUT = 10000 // 10 seconds
const DEFAULT_BASE_DELAY = 1000 // 1 second

/**
 * Creates a fetch request with retry logic, timeout, and offline detection
 * @param {string} url - Request URL
 * @param {RequestInit} options - Fetch options
 * @param {Object} retryConfig - Retry configuration
 * @param {number} retryConfig.maxRetries - Maximum number of retries (default: 3)
 * @param {number} retryConfig.timeout - Request timeout in ms (default: 10000)
 * @param {number} retryConfig.baseDelay - Base delay for exponential backoff in ms (default: 1000)
 * @param {number[]} retryConfig.retryStatuses - HTTP status codes to retry (default: [429, 502, 503, 504])
 * @returns {Promise<Response>}
 */
export async function fetchWithRetry(url, options = {}, retryConfig = {}) {
  const {
    maxRetries = DEFAULT_MAX_RETRIES,
    timeout = DEFAULT_TIMEOUT,
    baseDelay = DEFAULT_BASE_DELAY,
    retryStatuses = [429, 502, 503, 504]
  } = retryConfig

  // Check offline status
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    throw new Error('Network request failed: You are offline')
  }

  let lastError = null

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      // Create timeout promise
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error(`Request timeout after ${timeout}ms`)), timeout)
      })

      // Race between fetch and timeout
      const response = await Promise.race([
        fetch(url, options),
        timeoutPromise
      ])

      // Check if we should retry based on status code
      if (retryStatuses.includes(response.status)) {
        // Check for Retry-After header
        const retryAfter = response.headers.get('Retry-After')
        let delay = baseDelay * Math.pow(2, attempt) // Exponential backoff

        if (retryAfter) {
          // Use Retry-After header if provided (in seconds)
          delay = parseInt(retryAfter, 10) * 1000
        }

        if (attempt < maxRetries) {
          // Wait before retrying
          await new Promise(resolve => setTimeout(resolve, delay))
          continue // Retry
        }
      }

      // Success or non-retryable error
      if (!response.ok && !retryStatuses.includes(response.status)) {
        // Non-retryable error - throw immediately
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      // Success
      return response

    } catch (error) {
      lastError = error

      // Don't retry on timeout or offline errors
      if (error.message.includes('timeout') || error.message.includes('offline')) {
        throw error
      }

      // Don't retry on last attempt
      if (attempt >= maxRetries) {
        throw error
      }

      // Calculate delay for retry
      const delay = baseDelay * Math.pow(2, attempt)
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }

  throw lastError || new Error('Request failed after all retries')
}

/**
 * Wrapper for fetch that adds retry logic to API calls
 * @param {string} url - Request URL
 * @param {RequestInit} options - Fetch options
 * @param {Object} retryConfig - Retry configuration (optional)
 * @returns {Promise<Response>}
 */
export function apiFetch(url, options = {}, retryConfig = {}) {
  return fetchWithRetry(url, options, retryConfig)
}

