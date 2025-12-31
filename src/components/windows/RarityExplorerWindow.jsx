import { useState, useEffect, useRef } from 'react'
import Window from './Window'
import WojakRarityExplorer from '../WojakRarityExplorer'
import BigPulpWindow from './BigPulpWindow'
import BigPulpIntelligenceWindow from './BigPulpIntelligenceWindow'

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
  // Each item: { nftId: string, nftData: array, currentVersion: 'A'|'B'|'C', currentImage: string, clickCount: number }
  
  // Track auto-rotation intervals per window
  const autoRotateIntervalsRef = useRef({})

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
        clickCount: 0, // Track clicks for auto-rotation
      }
    ])
  }

  // Rotate to next version AND pick new image
  const rotateBigPulpVersion = (nftId) => {
    let nextVersion
    let shouldStartAutoRotate = false
    
    setOpenBigPulpWindows(prev => prev.map(w => {
      if (w.nftId !== nftId) return w

      // Increment click count
      const newClickCount = (w.clickCount || 0) + 1
      
      // Check if we should start auto-rotation (after 10 clicks)
      if (newClickCount >= 10 && !autoRotateIntervalsRef.current[nftId]) {
        shouldStartAutoRotate = true
      }

      // Rotate version: A → B → C → A (only if not auto-rotating)
      let nextVersionToUse
      if (shouldStartAutoRotate) {
        // Random version for auto-rotation
        const versions = ['A', 'B', 'C']
        nextVersionToUse = versions[Math.floor(Math.random() * versions.length)]
      } else {
        // Sequential rotation: A → B → C → A
        const versionOrder = { 'A': 'B', 'B': 'C', 'C': 'A' }
        // Ensure currentVersion is valid, default to 'A' if not
        const currentVer = w.currentVersion && ['A', 'B', 'C'].includes(w.currentVersion) 
          ? w.currentVersion 
          : 'A'
        nextVersionToUse = versionOrder[currentVer] || 'A'
      }
      
      // Store for updating lastShownVersion
      nextVersion = nextVersionToUse
      
      // Pick new image (exclude current to guarantee change)
      const nextImage = pickRandomImage(w.currentImage)

      return {
        ...w,
        currentVersion: nextVersionToUse,
        currentImage: nextImage,
        clickCount: newClickCount,
      }
    }))
    
    if (nextVersion) setLastShownVersion(nextVersion)
    
    // Start auto-rotation if needed
    if (shouldStartAutoRotate) {
      startAutoRotation(nftId)
    }
  }
  
  // Start automatic random rotation (A, B, C) forever
  const startAutoRotation = (nftId) => {
    // Clear any existing interval for this window
    if (autoRotateIntervalsRef.current[nftId]) {
      clearInterval(autoRotateIntervalsRef.current[nftId])
    }
    
    // Start new interval - rotate randomly every 1.5 seconds
    autoRotateIntervalsRef.current[nftId] = setInterval(() => {
      setOpenBigPulpWindows(prev => prev.map(w => {
        if (w.nftId !== nftId) return w
        
        // Pick random version (A, B, or C)
        const versions = ['A', 'B', 'C']
        const randomVersion = versions[Math.floor(Math.random() * versions.length)]
        
        // Pick new image
        const nextImage = pickRandomImage(w.currentImage)
        
        // Preserve all window data including nftId, nftData, and clickCount
        return {
          ...w,
          nftId: w.nftId, // Explicitly preserve
          nftData: w.nftData, // Explicitly preserve
          currentVersion: randomVersion,
          currentImage: nextImage,
          clickCount: w.clickCount || 0, // Preserve click count
        }
      }))
    }, 1500) // Rotate every 1.5 seconds
  }

  const handleCloseBigPulp = (nftId) => {
    // Clear auto-rotation interval if it exists
    if (autoRotateIntervalsRef.current[nftId]) {
      clearInterval(autoRotateIntervalsRef.current[nftId])
      delete autoRotateIntervalsRef.current[nftId]
    }
    
    setOpenBigPulpWindows(prev => prev.filter(w => w.nftId !== nftId))
  }
  
  // Cleanup intervals on unmount
  useEffect(() => {
    return () => {
      Object.values(autoRotateIntervalsRef.current).forEach(interval => {
        clearInterval(interval)
      })
      autoRotateIntervalsRef.current = {}
    }
  }, [])

  // State for Big Pulp Question Tree window
  const [bigPulpQuestionTreeOpen, setBigPulpQuestionTreeOpen] = useState(false)

  // Check if commentary exists for a given NFT ID
  const hasCommentary = (nftId) => {
    if (!nftId || !bigPulpLoaded) return false
    const nftIdStr = String(nftId)
    // Check if any version (A, B, or C) has commentary for this NFT
    return !!(
      (bigPulpData.A && (bigPulpData.A[nftIdStr] || bigPulpData.A[String(parseInt(nftIdStr))])) ||
      (bigPulpData.B && (bigPulpData.B[nftIdStr] || bigPulpData.B[String(parseInt(nftIdStr))])) ||
      (bigPulpData.C && (bigPulpData.C[nftIdStr] || bigPulpData.C[String(parseInt(nftIdStr))]))
    )
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
        <WojakRarityExplorer 
          onClose={onClose} 
          onOpenBigPulp={handleOpenBigPulp}
          onOpenBigPulpQuestionTree={() => setBigPulpQuestionTreeOpen(true)}
          hasCommentary={hasCommentary}
        />
      </Window>
      
      {openBigPulpWindows.map(({ nftId, nftData, currentVersion, currentImage, clickCount }) => {
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

        // Get commentary for current version - ensure nftId is a string for lookup
        // JSON keys are strings, so convert nftId to string
        const nftIdStr = String(nftId)
        const versionData = bigPulpData[currentVersion] || {}
        let commentary = versionData[nftIdStr] || versionData[String(parseInt(nftIdStr))]
        
        // Fallback message if no commentary found
        if (!commentary) {
          commentary = 'No commentary available for this NFT.'
          // Debug: log when commentary is missing
          if (process.env.NODE_ENV === 'development') {
            console.warn('Big Pulp: No commentary found', { 
              nftId, 
              nftIdStr, 
              currentVersion, 
              hasVersionData: !!bigPulpData[currentVersion],
              sampleKeys: Object.keys(versionData).slice(0, 3)
            })
          }
        }

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

      {bigPulpQuestionTreeOpen && (
        <BigPulpIntelligenceWindow
          onClose={() => setBigPulpQuestionTreeOpen(false)}
        />
      )}
    </>
  )
}

