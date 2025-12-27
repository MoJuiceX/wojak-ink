import Window from './Window'
import { Button, FieldRow } from '../ui'
import { useEffect, useRef, useState } from 'react'

export default function MintInfoWindow({ onNotifyClick, onClose }) {
  const contentRef = useRef(null)
  const [winWidth, setWinWidth] = useState(null)
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 640)

  useEffect(() => {
    const el = contentRef.current
    if (!el) return

    const compute = () => {
      // Don't recalculate during drag to prevent layout shifts
      const windowEl = el.closest('.window')
      if (windowEl && windowEl.classList.contains('dragging')) {
        return
      }

      // On mobile, always use full width
      if (window.innerWidth <= 640) {
        setWinWidth(null) // Let CSS handle full width on mobile
        return
      }

      const contentW = el.scrollWidth
      const padding = 40 // window inner padding + borders buffer
      const maxW = Math.min(1100, window.innerWidth - 80) // clamp for desktop
      const minW = 420

      const target = Math.max(minW, Math.min(maxW, contentW + padding))
      setWinWidth(target)
    }

    compute()

    // Recompute on resize (and after fonts/layout changes via resize)
    // Use debounce to prevent excessive recalculations
    let resizeTimeout
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 640)
      clearTimeout(resizeTimeout)
      resizeTimeout = setTimeout(compute, 100)
    }
    
    window.addEventListener('resize', handleResize)
    return () => {
      window.removeEventListener('resize', handleResize)
      clearTimeout(resizeTimeout)
    }
  }, [])

  return (
    <Window
      id="window-mint-info-exe"
      title="MINT_INFO.TXT"
      style={{
        ...(isMobile ? {} : {
          width: winWidth ? `${winWidth}px` : 'auto',
          maxWidth: 'min(1100px, calc(100vw - 80px))',
          minWidth: '420px',
        }),
        position: 'relative',
      }}
      onClose={onClose}
    >
      {/* Escape button in top right corner of title bar */}
      <button
        onClick={(e) => {
          e.stopPropagation()
          e.preventDefault()
          onClose()
        }}
        style={{
          position: 'absolute',
          top: '2px',
          right: '24px', /* Position before the close button (×) */
          zIndex: 1001,
          padding: '2px 6px',
          fontSize: '10px',
          fontFamily: 'MS Sans Serif, Tahoma, sans-serif',
          backgroundColor: 'var(--btn-face, #c0c0c0)',
          color: 'var(--btn-text, #000000)',
          border: '1px outset var(--border-light, #ffffff)',
          cursor: 'pointer',
          boxShadow: 'inset -1px -1px 0 var(--border-dark, #808080)',
          height: '16px',
          lineHeight: '12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
        onMouseDown={(e) => e.stopPropagation()}
        aria-label="Escape - Close window"
        className="title-bar-button"
      >
        Escape
      </button>
      <div
        ref={contentRef}
        className="readme-content"
        style={{
          display: 'block',
        }}
      >
        <p>
          <b>Launch Phase</b>
        </p>

        <p>
          🌶️{' '}<b>PHASE 1 — Free Mint Friday</b>
        </p>
        <ul>
          <li>
            <b>Free mint</b> for whitelisted collections: TangTalk, Drac, Chia
            Phunks, Necklords, TangBear, Chia Friends
          </li>
          <li>Goal: seed the culture + get Wojaks into the Grove</li>
        </ul>

        <p>
          🏀{' '}<b>PHASE 2 — Sucker Free Saturday</b>
        </p>
        <ul>
          <li>
            Early access minting with:{' '}
            <b>$PP, $SpellPower, $HOA, $BEPE, $CHIA, $NECKCOIN and XCH</b>
          </li>
        </ul>

        <p>
          🌱{' '}<b>PHASE 3 — Public Mint</b>
        </p>
        <ul>
          <li>
            <b>Mint price:</b> 0.3 XCH
          </li>
        </ul>

        <hr />

        <p>
          <b>Bringing it back to the Grove 🍊</b>
        </p>
        <ul>
          <li>
            150 Wojaks to TangBear NFT holders that also hold &lt;69,000 BEPE{' '}
            (<a
              href="https://x.com/MoJuiceX/status/2002063961378939094"
              target="_blank"
              rel="noopener noreferrer"
            >
              click here
            </a>
            )
          </li>
          <li>
            100 Wojaks to the Wizardxch Discord{' '}
            (<a
              href="https://x.com/MoJuiceX/status/2002216553605914952"
              target="_blank"
              rel="noopener noreferrer"
            >
              click here
            </a>
            )
          </li>
          <li>
            100 Wojaks to the{' '}
            <a href="https://go4.me/" target="_blank" rel="noreferrer">
              Go4.me
            </a>{' '}
            Badge + Shadow leaderboard{' '}
            (<a
              href="https://x.com/MoJuiceX/status/2001989285017473486"
              target="_blank"
              rel="noopener noreferrer"
            >
              click here
            </a>
            ){' '}
            (<a
              href="https://x.com/MoJuiceX/status/2001990410240176610"
              target="_blank"
              rel="noopener noreferrer"
            >
              click here
            </a>
            )
          </li>
          <li>
            <b>33% of the XCH</b> goes back to the Grove when the collection
            mints out
          </li>
        </ul>

        <FieldRow style={{ marginTop: '10px' }}>
          <Button
            onClick={() =>
              window.open(
                'https://crate.ink/#/collection-detail/WOJAKFARMERSPLOT',
                '_blank',
                'noopener,noreferrer'
              )
            }
          >
            Open Crate
          </Button>
          <Button
            onClick={() => window.open('https://x.com/MoJuiceX', '_blank', 'noopener,noreferrer')}
          >
            Follow Updates
          </Button>
          <Button onClick={onNotifyClick}>Notify me</Button>
        </FieldRow>
      </div>
    </Window>
  )
}

