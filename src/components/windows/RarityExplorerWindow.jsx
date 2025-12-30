import { useState, useEffect } from 'react'
import Window from './Window'
import WojakRarityExplorer from '../WojakRarityExplorer'
import BigPulpWindow from './BigPulpWindow'

export default function RarityExplorerWindow({ onClose }) {
  // Load all three Big Pulp JSON files
  const [bigPulpData, setBigPulpData] = useState({ A: {}, B: {}, C: {} })
  const [bigPulpLoaded, setBigPulpLoaded] = useState(false)

  useEffect(() => {
    Promise.all([
      fetch('/data/bigPulpA.json').then(r => r.json()),
      fetch('/data/bigPulpB.json').then(r => r.json()),
      fetch('/data/bigPulpC.json').then(r => r.json()),
    ])
      .then(([a, b, c]) => {
        setBigPulpData({ A: a, B: b, C: c })
        setBigPulpLoaded(true)
      })
      .catch(err => {
        console.error('Failed to load Big Pulp data:', err)
        setBigPulpLoaded(false)
      })
  }, [])

  // Track the last shown version globally (persists across window opens)
  const [lastShownVersion, setLastShownVersion] = useState(null)

  // Function to pick initial version - avoids the last shown version
  const pickInitialVersion = () => {
    const versions = ['A', 'B', 'C']
    if (lastShownVersion) {
      const available = versions.filter(v => v !== lastShownVersion)
      return available[Math.floor(Math.random() * available.length)]
    }
    return versions[Math.floor(Math.random() * versions.length)]
  }

  // Each open Big Pulp window tracks its own current version and image
  const [openBigPulpWindows, setOpenBigPulpWindows] = useState([])
  // Each item: { nftId: string, nftData: array, currentVersion: 'A'|'B'|'C', currentImage: string }

  // Big Pulp image variants
  const BIG_PULP_IMAGES = [
    'Big-Pulp_Crown.png',
    'Big-Pulp_Beret.png',
    'Big-Pulp_Fedora.png',
    'Big-Pulp_Wiz.png',
    'Big-Pulp_Clown.png',
    'Big-Pulp_Tin.png',
    'Big-Pulp_Cowboy.png',
    'Big-Pulp_Cap.png',
    'Big-Pulp_Propella.png',
  ]

  // Pick a random Big Pulp image
  const pickRandomImage = (excludeImage = null) => {
    let available = BIG_PULP_IMAGES
    if (excludeImage) {
      available = BIG_PULP_IMAGES.filter(img => img !== excludeImage)
    }
    return available[Math.floor(Math.random() * available.length)]
  }

  // Open a new Big Pulp window
  const handleOpenBigPulp = (nftId, nftData) => {
    // Don't open duplicate windows for same NFT
    if (openBigPulpWindows.some(w => w.nftId === nftId)) return

    const initialVersion = pickInitialVersion()
    const initialImage = pickRandomImage()
    
    setLastShownVersion(initialVersion)

    setOpenBigPulpWindows(prev => [
      ...prev,
      {
        nftId,
        nftData,
        currentVersion: initialVersion,
        currentImage: initialImage,
      }
    ])
  }

  // Rotate to next version AND pick new image
  const rotateBigPulpVersion = (nftId) => {
    let nextVersion
    setOpenBigPulpWindows(prev => prev.map(w => {
      if (w.nftId !== nftId) return w

      // Rotate version: A → B → C → A
      const versionOrder = { 'A': 'B', 'B': 'C', 'C': 'A' }
      nextVersion = versionOrder[w.currentVersion]
      
      // Pick new image (exclude current to guarantee change)
      const nextImage = pickRandomImage(w.currentImage)

      return {
        ...w,
        currentVersion: nextVersion,
        currentImage: nextImage,
      }
    }))
    if (nextVersion) setLastShownVersion(nextVersion)
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
      
      {openBigPulpWindows.map(({ nftId, nftData, currentVersion, currentImage }) => {
        // Extract NFT traits from nftData array for image selection
        // nftData structure: [rank, ?, tier, Base, Face, Mouth, Face Wear, Head, Clothes, Background]
        const nftTraits = nftData ? [
          nftData[3], // Base
          nftData[4], // Face
          nftData[5], // Mouth
          nftData[6], // Face Wear
          nftData[7], // Head
          nftData[8], // Clothes
          nftData[9], // Background
        ].filter(Boolean) : null

        // Get commentary for current version
        const commentary = bigPulpData[currentVersion]?.[nftId] || 'No commentary available for this NFT.'

        return (
          <BigPulpWindow
            key={`bigpulp-${nftId}`}
            isOpen={true}
            onClose={() => handleCloseBigPulp(nftId)}
            nftId={nftId}
            commentary={commentary}
            nftTraits={nftTraits}
            currentVersion={currentVersion}
            currentImage={currentImage}
            onRotate={() => rotateBigPulpVersion(nftId)}
          />
        )
      })}
    </>
  )
}

