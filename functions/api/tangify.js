const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Expose-Headers': 'X-Tangify-Model',
}

const MAX_IMAGE_BYTES = 6 * 1024 * 1024 // 6MB

function base64ToBytes(b64) {
  if (typeof atob === 'function') {
    const bin = atob(b64)
    const bytes = new Uint8Array(bin.length)
    for (let i = 0; i < bin.length; i++) {
      bytes[i] = bin.charCodeAt(i)
    }
    return bytes
  }
  // fallback if needed (for Node.js environments)
  const buf = Buffer.from(b64, 'base64')
  return new Uint8Array(buf)
}

async function callEdits({ model, apiKey, imageFile, prompt }) {
  const fd = new FormData()
  fd.append('model', model)
  fd.append('image', imageFile, imageFile.name || 'input.png')
  fd.append('prompt', prompt)
  fd.append('size', '1024x1024')

  if (model === 'gpt-image-1') {
    fd.append('input_fidelity', 'high')
    // DO NOT add response_format (not supported)
  }

  if (model === 'dall-e-2') {
    fd.append('response_format', 'b64_json')
  }

  try {
    // Add timeout using AbortController (Cloudflare Workers support this)
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 120000) // 120 second timeout

    const response = await fetch('https://api.openai.com/v1/images/edits', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}` },
      body: fd,
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    let json = null
    try {
      json = await response.json()
    } catch (e) {
      console.warn('OpenAI response was not JSON:', e)
      // Try to get text response for debugging
      try {
        const text = await response.text()
        console.warn('OpenAI response text:', text.substring(0, 500))
      } catch (e2) {
        console.warn('Could not read response as text either')
      }
    }

    return { ok: response.ok, status: response.status, json }
  } catch (error) {
    // Handle network errors, timeouts, etc.
    if (error.name === 'AbortError') {
      console.error('OpenAI API request timed out after 120 seconds')
      return { 
        ok: false, 
        status: 504, 
        json: { error: { message: 'Request timed out. The image generation is taking too long.' } } 
      }
    }
    console.error('OpenAI API request failed:', error)
    return { 
      ok: false, 
      status: 500, 
      json: { error: { message: `Network error: ${error.message || 'Connection failed'}` } } 
    }
  }
}

function isVerificationOrPermissionError(json, status) {
  if (!(status === 401 || status === 403)) return false

  const msg = (json?.error?.message || '').toLowerCase()

  return (
    msg.includes('must be verified') ||
    msg.includes('organization must be verified') ||
    msg.includes('verify organization') ||
    msg.includes('not authorized') ||
    msg.includes('permission') ||
    msg.includes('insufficient') ||
    msg.includes('identity')
  )
}

export async function onRequestPost(context) {
  const { request, env } = context

  if (request.method === 'OPTIONS') {
    return new Response(null, { 
      status: 204,
      headers: corsHeaders 
    })
  }

  try {
    const apiKey = env.OPENAI_API_KEY

    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'OpenAI API key not configured' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Parse multipart form-data
    let form
    try {
      form = await request.formData()
    } catch (parseError) {
      console.error('Failed to parse form data:', parseError)
      return new Response(
        JSON.stringify({ error: 'Invalid request. Expected multipart/form-data.' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Extract and validate image
    const imageFile = form.get('image')
    
    if (!imageFile || !(imageFile instanceof File)) {
      return new Response(
        JSON.stringify({ error: 'No image file provided. Expected "image" field with a file.' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    if (imageFile.size === 0) {
      return new Response(
        JSON.stringify({ error: 'Image file is empty.' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    if (imageFile.size > MAX_IMAGE_BYTES) {
      return new Response(
        JSON.stringify({ error: `Image file too large. Maximum size is ${MAX_IMAGE_BYTES / (1024 * 1024)}MB.` }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Extract and validate prompt
    const userPrompt = (form.get('prompt') || '').toString().trim()
    
    if (!userPrompt || userPrompt.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No prompt provided. Prompt is required.' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }
    
    // Build final prompt with hard constraints
    const HARD_CONSTRAINTS = `Keep the exact original drawing style and pose. Do not redraw the face or body shape. Only add accessories and background elements on top. Maintain black outlines, minimal shading, and the same character proportions.`
    const FINAL_PROMPT = `${HARD_CONSTRAINTS}\n\n${userPrompt}`

    // Try gpt-image-1 first (best quality)
    const r1 = await callEdits({
      model: 'gpt-image-1',
      apiKey,
      imageFile,
      prompt: FINAL_PROMPT,
    })

    if (r1.ok) {
      // gpt-image-1 succeeded - decode b64_json and return PNG
      if (!r1.json) {
        return new Response(
          JSON.stringify({ error: 'OpenAI request failed (non-JSON response)' }),
          { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      const b64Json = r1.json.data?.[0]?.b64_json
      if (!b64Json) {
        return new Response(
          JSON.stringify({ error: 'No image data in response (missing b64_json)' }),
          { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      const bytes = base64ToBytes(b64Json)
      return new Response(bytes, {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'image/png',
          'X-Tangify-Model': 'gpt-image-1',
          'Cache-Control': 'no-store',
        },
      })
    }

    // Check if verification/permission error (precise matching)
    if (isVerificationOrPermissionError(r1.json, r1.status)) {
      // Fallback to dall-e-2
      const r2 = await callEdits({
        model: 'dall-e-2',
        apiKey,
        imageFile,
        prompt: FINAL_PROMPT,
      })

      if (r2.ok) {
        // dall-e-2 succeeded - decode b64_json and return PNG
        if (!r2.json) {
          return new Response(
            JSON.stringify({ error: 'OpenAI request failed (non-JSON response)' }),
            { 
              status: 500, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          )
        }

        const b64Json = r2.json.data?.[0]?.b64_json
        if (!b64Json) {
          return new Response(
            JSON.stringify({ error: 'No image data in response (missing b64_json)' }),
            { 
              status: 500, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          )
        }

        const bytes = base64ToBytes(b64Json)
        return new Response(bytes, {
          status: 200,
          headers: {
            ...corsHeaders,
            'Content-Type': 'image/png',
            'X-Tangify-Model': 'dall-e-2',
            'Cache-Control': 'no-store',
          },
        })
      } else {
        // dall-e-2 also failed - return error
        let errorMessage = 'Failed to edit image'
        if (r2.json?.error?.message) {
          errorMessage = r2.json.error.message
        } else if (!r2.json) {
          errorMessage = 'OpenAI request failed (non-JSON response)'
        }

        return new Response(
          JSON.stringify({ error: errorMessage }),
          { 
            status: r2.status, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }
    } else {
      // gpt-image-1 failed for other reasons (not verification/permission) - return error
      let errorMessage = 'Failed to edit image'
      if (r1.json?.error?.message) {
        errorMessage = r1.json.error.message
      } else if (r1.json?.error) {
        // Handle case where error is directly in json.error (not json.error.message)
        errorMessage = typeof r1.json.error === 'string' ? r1.json.error : JSON.stringify(r1.json.error)
      } else if (!r1.json) {
        errorMessage = 'OpenAI request failed (non-JSON response)'
      }

      return new Response(
        JSON.stringify({ error: errorMessage }),
        { 
          status: r1.status || 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

  } catch (error) {
    console.error('Tangify error:', error)
    // Provide more detailed error messages
    let errorMessage = error.message || 'Internal server error'
    let statusCode = 500
    
    // Handle specific error types
    if (error.message?.includes('timeout') || error.message?.includes('AbortError')) {
      errorMessage = 'Request timed out. The image generation is taking too long. Please try again with a smaller image or simpler prompt.'
      statusCode = 504
    } else if (error.message?.includes('network') || error.message?.includes('fetch') || error.message?.includes('connection')) {
      errorMessage = `Network connection error: ${error.message}. Please check your internet connection and try again.`
      statusCode = 503
    }
    
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: statusCode, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
}

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: corsHeaders,
  })
}
