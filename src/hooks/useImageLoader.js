import { useState, useEffect } from 'react'
import { getLayerImagesBySubfolder } from '../lib/memeImageManifest'

export function useImageLoader(layerName) {
  const [images, setImages] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    setLoading(true)
    setError(null)

    try {
      const loadedImages = getLayerImagesBySubfolder(layerName)
      setImages(loadedImages)
      setLoading(false)
    } catch (err) {
      setError(err)
      setLoading(false)
    }
  }, [layerName])

  return { images, loading, error }
}

