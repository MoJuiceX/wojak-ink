import Window from './Window'
import { useEffect, useRef, useState } from 'react'

const overlayBanners = [
  '/assets/images/banners/base1n.png',
  '/assets/images/banners/base2n.png',
  '/assets/images/banners/base3n.png',
  '/assets/images/banners/base4n.png',
]

export default function ReadmeWindow({ onClose }) {
  const layerIdRef = useRef(0)
  const newLayer = (src) => ({ id: ++layerIdRef.current, src, isNew: true, fadeOut: false })

  const [overlayStack, setOverlayStack] = useState(() => [newLayer(overlayBanners[0])]) // base1 visible immediately
  const [nextIndex, setNextIndex] = useState(1) // next click adds base2
  const fadeOutTimeoutsRef = useRef(new Map()) // Track timeouts by layer ID

  const FADE_IN_MS = 200 // Fade-in animation duration (matches CSS animation)
  const FADE_OUT_DELAY_MS = FADE_IN_MS // Fade out immediately after new banner fully appears

  useEffect(() => {
    const onClick = () => {
      setNextIndex((currentIndex) => {
        const src = overlayBanners[currentIndex]

        setOverlayStack((prev) => {
          // Filter out layers that are already fading out (they'll be removed soon anyway)
          const activeLayers = prev.filter((layer) => !layer.fadeOut)
          
          // Clear previous "new" flags
          const clearedPrev = activeLayers.map((layer) => ({ ...layer, isNew: false }))
          const newLayerItem = newLayer(src)
          const stacked = [...clearedPrev, newLayerItem]

          // If there's at least 2 layers (the new one + at least one previous), fade out the second-to-last
          if (stacked.length >= 2) {
            // Capture the ID of the layer that should fade out (the one that was on top before the new one)
            const layerToFadeOutId = stacked[stacked.length - 2].id
            
            // Clear any existing timeout for this specific layer (in case it was already scheduled)
            const existingTimeout = fadeOutTimeoutsRef.current.get(layerToFadeOutId)
            if (existingTimeout) {
              clearTimeout(existingTimeout)
              fadeOutTimeoutsRef.current.delete(layerToFadeOutId)
            }
            
            // Set timeout to fade out the previous layer after new banner fully appears
            const timeoutId = setTimeout(() => {
              setOverlayStack((currentStack) => {
                // Check if the layer still exists in the stack before trying to fade it out
                const layerExists = currentStack.some((layer) => layer.id === layerToFadeOutId)
                if (!layerExists) {
                  // Layer was already removed, clean up and return
                  fadeOutTimeoutsRef.current.delete(layerToFadeOutId)
                  return currentStack
                }
                
                // Find the layer by ID and mark it for fade-out (if not already fading)
                const updatedStack = currentStack.map((layer) => {
                  if (layer.id === layerToFadeOutId && !layer.fadeOut) {
                    return { ...layer, fadeOut: true }
                  }
                  return layer
                })
                return updatedStack
              })
              
              // Remove the faded-out layer after animation completes (200ms)
              setTimeout(() => {
                setOverlayStack((currentStack) => {
                  const filtered = currentStack.filter((layer) => !layer.fadeOut)
                  // Clean up timeout reference
                  fadeOutTimeoutsRef.current.delete(layerToFadeOutId)
                  return filtered
                })
              }, 200)
            }, FADE_OUT_DELAY_MS)
            
            // Store the timeout ID
            fadeOutTimeoutsRef.current.set(layerToFadeOutId, timeoutId)
          }

          return stacked
        })

        return (currentIndex + 1) % overlayBanners.length
      })
    }

    window.addEventListener('pointerdown', onClick, true)
    return () => {
      window.removeEventListener('pointerdown', onClick, true)
      // Clear all pending timeouts
      fadeOutTimeoutsRef.current.forEach((timeoutId) => {
        clearTimeout(timeoutId)
      })
      fadeOutTimeoutsRef.current.clear()
    }
  }, [])

  return (
    <Window
      id="window-readme-txt"
      title="README.TXT"
      style={{ 
        width: 'var(--window-size-readme)', 
        maxWidth: 'var(--window-max-width)',
        minWidth: 'var(--window-min-width)'
      }}
      className="readme-window"
      allowScroll={true}
      onClose={onClose}
    >
      <div className="readme-banner-stack">
        <img
          src="/assets/images/banners/NEWconstantbanner1.png"
          alt="Wojak Farmers Plot banner"
          className="readme-banner-base"
        />
        {overlayStack.map((layer) => (
          <img
            key={layer.id}
            src={layer.src}
            alt=""
            className={`readme-banner-overlay ${layer.isNew ? 'is-new' : ''} ${layer.fadeOut ? 'fade-out' : ''}`}
            draggable="false"
          />
        ))}
      </div>

      <p className="readme-title" style={{ marginTop: '1em' }}>
        <b>Art for the Grove 🍊</b>
      </p>
      <p>
        Wojak Farmers Plot is my personal contribution to TangGang culture — a
        collection built from my journey inside this community. These NFTs are
        handcrafted one by one, made with intention, humour, and a lot of love
        for the culture we're all building together.
      </p>

      <p>
        The art explores many different sides of crypto culture. Some pieces are
        playful, some are more cyberpunk, some are pure meme energy — but every
        single NFT tells a story. And they're meant to be used. Meme them.
        Screenshot them. Right-click save them. That's the point. Memes are
        cultural weapons, and this collection gives the community more tools to
        express this. This is my way of adding to the lore of the TangGang.
      </p>

      <p>
        <b>The goal is simple:</b>
        <br />
        Create art, share it with the gang, and bring it back to the grove. This
        is how we build user aligned incentives.
      </p>

      <ul>
        <li>
          <b>Supply:</b> 4200
        </li>
        <li>
          <b>Chain:</b>{' '}
          <a href="https://www.chia.net/" target="_blank" rel="noreferrer">
            Chia.net
          </a>
        </li>
      </ul>

      <hr />

      <p>
        <b>Marketplace</b>
      </p>
      <p>
        View the collection on Crate:
        <a
          href="https://wojakfarmersplot.crate.ink/#/collection-detail/WOJAKFARMERSPLOT"
          target="_blank"
          rel="noreferrer"
        >
          wojakfarmersplot.crate.ink
        </a>
      </p>

      <p style={{ fontSize: '2em', fontWeight: 'bold', color: 'red' }}>
        Minting paused due to platform issues. Resuming shortly.
      </p>

      <p>
        <b>X / Twitter</b>
      </p>
      <p>
        Follow updates here:
        <a href="https://x.com/MoJuiceX" target="_blank" rel="noreferrer">
          https://x.com/MoJuiceX
        </a>
      </p>

      <hr />
    </Window>
  )
}

