import { useEffect, useRef, useState } from 'react'

export function useIntersectionObserver(options = {}) {
  const [isIntersecting, setIsIntersecting] = useState(false)
  const [hasIntersected, setHasIntersected] = useState(false)
  const elementRef = useRef(null)

  useEffect(() => {
    const element = elementRef.current
    if (!element) return

    const observer = new IntersectionObserver(([entry]) => {
      setIsIntersecting(entry.isIntersecting)
      if (entry.isIntersecting && !hasIntersected) {
        setHasIntersected(true)
      }
    }, {
      rootMargin: '50px', // Start loading 50px before element is visible
      threshold: 0.01,
      ...options,
    })

    observer.observe(element)

    return () => {
      observer.disconnect()
    }
  }, [hasIntersected, options])

  return { elementRef, isIntersecting, hasIntersected }
}

