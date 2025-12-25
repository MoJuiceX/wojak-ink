/**
 * Upload image to Imgur for sharing
 * @param {Blob} imageBlob - Image blob to upload
 * @returns {Promise<string>} Returns the hosted image URL
 */
export async function uploadToImgur(imageBlob) {
  const formData = new FormData()
  formData.append('image', imageBlob)
  
  // Imgur API endpoint
  // Note: Client-ID is optional for anonymous uploads, but recommended for reliability
  // To get a Client-ID: https://api.imgur.com/oauth2/addclient
  const headers = {}
  
  // If IMGUR_CLIENT_ID is available as env var, use it
  // In production, set this via build-time env vars or config
  const clientId = import.meta.env.VITE_IMGUR_CLIENT_ID || null
  
  if (clientId) {
    headers['Authorization'] = `Client-ID ${clientId}`
  }
  
  try {
    const response = await fetch('https://api.imgur.com/3/image', {
      method: 'POST',
      headers: headers,
      body: formData
    })
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.data?.error || `Imgur upload failed: ${response.status}`)
    }
    
    const data = await response.json()
    
    if (!data.success) {
      throw new Error(data.data?.error || 'Imgur upload failed')
    }
    
    // Return direct image URL (not album URL)
    return data.data.link || data.data.url
  } catch (error) {
    console.error('Error uploading to Imgur:', error)
    throw error
  }
}

