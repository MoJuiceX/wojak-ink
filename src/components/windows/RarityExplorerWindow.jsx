import { useState } from 'react'
import Window from './Window'
import WojakRarityExplorer from '../WojakRarityExplorer'
import BigPulpWindow from './BigPulpWindow'

export default function RarityExplorerWindow({ onClose }) {
  const [openBigPulpWindows, setOpenBigPulpWindows] = useState([])
  // Each item: { nftId: string, commentary: string, nftTraits: string[] }

  const handleOpenBigPulp = (nftId, commentary, nftTraits) => {
    // Check if already open for this NFT - bring to front instead of opening duplicate
    if (openBigPulpWindows.some(w => w.nftId === nftId)) {
      // Optionally: bring existing window to front
      // For now, we'll just not create duplicates
      return
    }
    
    setOpenBigPulpWindows(prev => [
      ...prev,
      { nftId, commentary, nftTraits }
    ])
  }

  const handleCloseBigPulp = (nftId) => {
    setOpenBigPulpWindows(prev => prev.filter(w => w.nftId !== nftId))
  }

  return (
    <>
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
        <WojakRarityExplorer onClose={onClose} onOpenBigPulp={handleOpenBigPulp} />
      </Window>
      
      {openBigPulpWindows.map(({ nftId, commentary, nftTraits }) => (
        <BigPulpWindow
          key={nftId}
          isOpen={true}
          onClose={() => handleCloseBigPulp(nftId)}
          nftId={nftId}
          commentary={commentary}
          nftTraits={nftTraits}
        />
      ))}
    </>
  )
}

