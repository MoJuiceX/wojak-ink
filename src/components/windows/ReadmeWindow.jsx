import Window from './Window'
import ReadmeBanner from '../readme/ReadmeBanner'
import { useState, useEffect, useRef } from 'react'

const BASE_FRAMES_COUNT = 4

export default function ReadmeWindow({ onClose }) {
  const [baseIdx, setBaseIdx] = useState(0)
  const pointerDownRef = useRef(null)

  // Global click listener to cycle base overlay
  useEffect(() => {
    const onPointerDown = (e) => {
      pointerDownRef.current = {
        x: e.clientX,
        y: e.clientY,
      }
    }

    const onPointerUp = (e) => {
      if (!pointerDownRef.current) return

      const dx = e.clientX - pointerDownRef.current.x
      const dy = e.clientY - pointerDownRef.current.y
      pointerDownRef.current = null

      // If it was a drag (moved more than 5px), ignore
      if (Math.hypot(dx, dy) > 5) return

      // Ignore clicks on interactive elements
      if (
        e.target.closest(
          'input, textarea, select, button, a, [contenteditable="true"]'
        )
      ) {
        return
      }

      // Cycle base overlay
      setBaseIdx((prevIdx) => (prevIdx + 1) % BASE_FRAMES_COUNT)
    }

    // Use capture phase for reliability
    window.addEventListener('pointerdown', onPointerDown, true)
    window.addEventListener('pointerup', onPointerUp, true)

    return () => {
      window.removeEventListener('pointerdown', onPointerDown, true)
      window.removeEventListener('pointerup', onPointerUp, true)
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
      <ReadmeBanner baseIdx={baseIdx} />

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

