import Window from './Window'
import WojakRarityExplorer from '../WojakRarityExplorer'

export default function RarityExplorerWindow({ onClose }) {
  return (
    <Window
      id="rarity-explorer"
      title="RARITY EXPLORER.EXE"
      allowScroll={true}
      style={{
        width: 'clamp(280px, 92vw, 900px)',
        height: 'clamp(575px, 88vh, 900px)',
        minWidth: '280px',
        minHeight: '500px',
      }}
      onClose={onClose}
    >
      <WojakRarityExplorer onClose={onClose} />
    </Window>
  )
}

