import Window from './Window'
import { Button, FieldRow } from '../ui'

export default function MintInfoWindow({ onNotifyClick }) {
  return (
    <Window
      title="MINT_INFO.EXE"
      style={{ width: '1200px', maxWidth: 'calc(100vw - 40px)', left: '20px', top: '320px' }}
    >
      <p>
        <b>Launch Phases</b>
      </p>

      <p>
        🌶️ <b>PHASE 1 — Free Mint Friday</b>
      </p>
      <ul>
        <li>
          <b>Free mint</b> for whitelisted collections: TangTalk, Chia Phunks,
          Necklords, TangBear, Chia Friends
        </li>
        <li>Goal: seed the culture + get Wojaks into the Grove</li>
      </ul>

      <p>
        🏀 <b>PHASE 2 — Sucker Free Saturday</b>
      </p>
      <ul>
        <li>
          Starts after Free Mint Friday ends (12:00 AM WET)
        </li>
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
              'https://wojakfarmersplot.crate.ink/#/',
              '_blank'
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
        <Button onClick={onNotifyClick}>
          Notify me
        </Button>
      </FieldRow>
    </Window>
  )
}

