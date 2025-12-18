import Window from './Window'
import { Button, FieldRow } from '../ui'
import { useEffect, useRef, useState } from 'react'

export default function MintInfoWindow({ onNotifyClick, onClose }) {
  const contentRef = useRef(null)
  const [winWidth, setWinWidth] = useState(null)

  useEffect(() => {
    const el = contentRef.current
    if (!el) return

    const compute = () => {
      const contentW = el.scrollWidth
      const padding = 40 // window inner padding + borders buffer
      const maxW = Math.min(900, window.innerWidth - 80) // clamp for desktop
      const minW = 420

      const target = Math.max(minW, Math.min(maxW, contentW + padding))
      setWinWidth(target)
    }

    compute()

    // Recompute on resize (and after fonts/layout changes via resize)
    window.addEventListener('resize', compute)
    return () => window.removeEventListener('resize', compute)
  }, [])

  return (
    <Window
      id="window-mint-info-exe"
      title="MINT_INFO.EXE"
      style={{
        width: winWidth ? `${winWidth}px` : 'auto',
        maxWidth: 'min(900px, calc(100vw - 80px))',
        minWidth: '420px',
      }}
      onClose={onClose}
    >
      <div
        ref={contentRef}
        style={{
          display: 'inline-block',
        }}
      >
        <p>
          <b>Launch Phases</b>
        </p>

        <p>
          🌶️ <b>PHASE 1 — Free Mint Friday</b>
        </p>
        <ul>
          <li>
            <b>Free mint</b> for whitelisted collections: TangTalk, Chia
            Phunks, Necklords, TangBear, Chia Friends
          </li>
          <li>Goal: seed the culture + get Wojaks into the Grove</li>
        </ul>

        <p>
          🏀 <b>PHASE 2 — Sucker Free Saturday</b>
        </p>
        <ul>
          <li>Starts after Free Mint Friday ends (12:00 AM WET)</li>
          <li>
            Early access minting with:{' '}
            <b>$PP, $SpellPower, $HOA, $BEPE, $CHIA, $NECKCOIN</b>
          </li>
        </ul>

        <p>
          🌱 <b>PHASE 3 — Public Mint</b>
        </p>
        <ul>
          <li>Public mint opens after Phase 2</li>
          <li>
            <b>Mint price:</b> to be announced
          </li>
        </ul>

        <hr />

        <p>
          <b>Bringing it back to the Grove 🍊</b>
        </p>
        <ul>
          <li>150 Wojaks to the TangGang Discord</li>
          <li>100 Wojaks to the Wizardxch Discord</li>
          <li>
            100 Wojaks to the{' '}
            <a href="https://go4.me/" target="_blank" rel="noreferrer">
              Go4.me
            </a>{' '}
            Badge + Shadow leaderboard
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
                'https://wojakfarmersplot.crate.ink/#/collection-detail/WOJAKFARMERSPLOT',
                '_blank',
                'noopener,noreferrer'
              )
            }
          >
            Open Crate
          </Button>
          <Button
            onClick={() => window.open('https://x.com/MoJuiceX', '_blank')}
          >
            Follow Updates
          </Button>
          <Button onClick={onNotifyClick}>Notify me</Button>
        </FieldRow>
      </div>
    </Window>
  )
}

