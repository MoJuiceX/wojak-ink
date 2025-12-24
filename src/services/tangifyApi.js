// Tangify API service for calling Cloudflare Pages Function
import { fetchWithRetry } from '../utils/apiRetry'

/**
 * Call the Tangify API to generate a realistic version of the wojak
 * @param {string} prompt - The prompt describing the wojak to generate
 * @returns {Promise<{imageData: string}>} The generated image as base64 data URL
 * @throws {Error} If the API call fails
 */
export async function tangifyWojak(prompt) {
  try {
    const response = await fetchWithRetry('/api/tangify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ prompt }),
    }, {
      maxRetries: 2, // Tangify is expensive, limit retries
      timeout: 30000, // 30 seconds for AI generation
      baseDelay: 2000, // 2 second base delay
      retryStatuses: [429, 502, 503, 504, 500] // Retry on rate limits and server errors
    })

    const data = await response.json()
    
    // Support both new format (imageData) and legacy format (imageUrl) for backwards compatibility
    if (!data.imageData && !data.imageUrl) {
      throw new Error('No image data returned from API')
    }

    return { 
      imageData: data.imageData || data.imageUrl,
      // Keep imageUrl for backwards compatibility if needed
      imageUrl: data.imageUrl 
    }
  } catch (error) {
    console.error('Tangify API error:', error)
    
    // Provide user-friendly error messages
    if (error.message.includes('timeout')) {
      throw new Error('Request timed out. The AI generation is taking longer than expected. Please try again.')
    }
    if (error.message.includes('offline')) {
      throw new Error('You are offline. Please check your internet connection and try again.')
    }
    if (error.message.includes('429')) {
      throw new Error('Rate limit exceeded. Please wait a moment and try again.')
    }
    
    throw error
  }
}

