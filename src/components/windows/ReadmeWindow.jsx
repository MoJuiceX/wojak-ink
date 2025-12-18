import Window from './Window'
import { useEffect, useRef, useState } from 'react'

const overlayBanners = [
  '/assets/images/banners/base1.png',
  '/assets/images/banners/base2.png',
  '/assets/images/banners/base3.png',
  '/assets/images/banners/base4.png',
]

export default function ReadmeWindow({ onClose }) {
  const layerIdRef = useRef(0)
  const newLayer = (src) => ({ id: ++layerIdRef.current, src, isNew: true })

  const [overlayStack, setOverlayStack] = useState(() => [newLayer(overlayBanners[0])]) // base1 visible immediately
  const [nextIndex, setNextIndex] = useState(1) // next click adds base2
  const clearAfterFadeRef = useRef(null)

  const FADE_MS = 200

  useEffect(() => {
    const onClick = () => {
      setNextIndex((currentIndex) => {
        const src = overlayBanners[currentIndex]

        setOverlayStack((prev) => {
          // Clear previous "new" flags and add a new top layer with a stable id
          const clearedPrev = prev.map((layer) => ({ ...layer, isNew: false }))
          const stacked = [...clearedPrev, newLayer(src)].slice(-5) // allow one extra during wrap transition

          const isWrapToBase1 = currentIndex === 0 && prev.length > 0

          if (isWrapToBase1) {
            // base4 (and older) stay visible underneath while base1 fades in on top
            // After fade completes, clear old stack and keep only base1
            if (clearAfterFadeRef.current) {
              clearTimeout(clearAfterFadeRef.current)
            }
            clearAfterFadeRef.current = setTimeout(() => {
              setOverlayStack((prev) => {
                const top = prev[prev.length - 1]
                if (!top) return [newLayer(overlayBanners[0])]
                // keep the same element, just mark it not-new so it won’t re-animate
                return [{ ...top, isNew: false }]
              })
            }, FADE_MS + 30)

            return stacked
          }

          // Normal case: keep a max of 4 layers in the stack
          return stacked
            .map((layer, idx) => ({
              ...layer,
              isNew: idx === stacked.length - 1,
            }))
            .slice(-4)
        })

        return (currentIndex + 1) % overlayBanners.length
      })
    }

    window.addEventListener('pointerdown', onClick, true)
    return () => {
      window.removeEventListener('pointerdown', onClick, true)
      if (clearAfterFadeRef.current) {
        clearTimeout(clearAfterFadeRef.current)
      }
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
            className={`readme-banner-overlay ${layer.isNew ? 'is-new' : ''}`}
            draggable="false"
          />
        ))}
      </div>

      <p className="readme-title">
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
        <li>
          <span className="readme-mint-row">
            <b>Mint:</b> Friday Dec 19th, 2025
            <a
              href="https://x.com/MoJuiceX/status/2000923383891157444"
              target="_blank"
              rel="noreferrer"
              className="readme-launch-space-link"
              title="Open Launch X Space"
            >
              <img
                src="/assets/images/banners/x-space-launch.png?v=2"
                alt="Launch Space"
                className="readme-launch-space-thumb"
              />
            </a>
          </span>
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

