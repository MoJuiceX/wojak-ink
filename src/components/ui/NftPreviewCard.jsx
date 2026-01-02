import React from 'react'
import { useWindow } from '../../contexts/WindowContext'
import { useToast } from '../../contexts/ToastContext'

/**
 * NftPreviewCard - Reusable component for displaying NFT preview with image, ID, and action buttons
 * 
 * @param {Object} props
 * @param {string|number} props.nftId - NFT ID (edition number)
 * @param {string} props.imageUrl - Optional image URL (if not provided, will be generated)
 * @param {string} props.launcher - Optional MintGarden launcher ID
 * @param {string} props.collectionId - Optional collection ID for MintGarden fallback
 * @param {Object} props.style - Optional additional styles
 * @param {string} props.size - Size variant: 'small' (80px) | 'medium' (100px) | 'large' (120px), default: 'medium'
 */
export default function NftPreviewCard({
  nftId,
  imageUrl: providedImageUrl,
  launcher,
  collectionId,
  style = {},
  size = 'medium'
}) {
  const { getWindow, isWindowMinimized, restoreWindow, bringToFront } = useWindow()
  const { showToast } = useToast()
  
  // Generate image URL if not provided
  const getNftImageUrl = (id) => {
    if (providedImageUrl) return providedImageUrl
    const numericId = parseInt(String(id), 10)
    if (isNaN(numericId) || numericId < 1 || numericId > 4200) return null
    const paddedId = String(numericId).padStart(4, '0')
    return `https://bafybeigjkkonjzwwpopo4wn4gwrrvb7z3nwr2edj2554vx3avc5ietfjwq.ipfs.w3s.link/${paddedId}.png`
  }
  
  const imageUrl = getNftImageUrl(nftId)
  const sizeMap = {
    small: 80,
    medium: 100,
    large: 120
  }
  const imageSize = sizeMap[size] || 100
  
  // Handle Rarity Explorer click
  const handleRarityExplorer = (e) => {
    e.stopPropagation()
    const rarityExplorer = getWindow('rarity-explorer')
    if (rarityExplorer) {
      if (isWindowMinimized('rarity-explorer')) {
        restoreWindow('rarity-explorer')
      }
      bringToFront('rarity-explorer')
      window.dispatchEvent(new CustomEvent('navigateToNft', {
        detail: { nftId: String(nftId) }
      }))
    } else {
      showToast('Please open Rarity Explorer first', 'warning')
    }
  }
  
  // Handle MintGarden click
  const handleMintGarden = (e) => {
    e.stopPropagation()
    if (launcher) {
      window.open(`https://mintgarden.io/nfts/${launcher}`, '_blank', 'noopener,noreferrer')
    } else {
      const defaultCollectionId = collectionId || 'col10hfq4hml2z0z0wutu3a9hvt60qy9fcq4k4dznsfncey4lu6kpt3su7u9ah'
      const searchQuery = encodeURIComponent(`Wojak #${String(nftId).padStart(4, '0')}`)
      window.open(`https://mintgarden.io/collections/${defaultCollectionId}?search=${searchQuery}`, '_blank', 'noopener,noreferrer')
    }
  }
  
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        border: '2px inset var(--win-border-dark, #808080)',
        background: 'var(--win-surface-2, #d4d0c8)',
        padding: '6px',
        ...style
      }}
    >
      {/* NFT Image */}
      {imageUrl ? (
        <img
          src={imageUrl}
          alt={`NFT #${nftId}`}
          onClick={handleRarityExplorer}
          style={{
            width: `${imageSize}px`,
            height: `${imageSize}px`,
            objectFit: 'contain',
            cursor: 'pointer',
            border: '1px solid var(--win-border-dark, #808080)',
            backgroundColor: 'var(--win-bg, #c0c0c0)',
            marginBottom: '4px'
          }}
          onError={(e) => {
            e.target.style.display = 'none'
          }}
        />
      ) : (
        <div
          style={{
            width: `${imageSize}px`,
            height: `${imageSize}px`,
            border: '1px solid var(--win-border-dark, #808080)',
            backgroundColor: 'var(--win-bg, #c0c0c0)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '10px',
            color: '#666',
            marginBottom: '4px'
          }}
        >
          No Image
        </div>
      )}
      
      {/* NFT ID */}
      <div
        style={{
          fontSize: '11px',
          fontWeight: 'bold',
          marginBottom: '4px',
          cursor: 'pointer',
          color: 'var(--win-text, #000)',
          textAlign: 'center'
        }}
        onClick={handleRarityExplorer}
        title={`Click to open NFT #${nftId} in Rarity Explorer`}
      >
        #{nftId}
      </div>
      
      {/* Action Buttons */}
      <div style={{ display: 'flex', gap: '4px', width: '100%' }}>
        <button
          onClick={handleRarityExplorer}
          style={{
            flex: 1,
            padding: '2px 4px',
            fontSize: '9px',
            cursor: 'pointer',
            border: '1px solid var(--win-border-dark, #808080)',
            backgroundColor: 'var(--win-bg, #c0c0c0)',
            whiteSpace: 'nowrap'
          }}
          title="Open in Rarity Explorer"
        >
          Rarity
        </button>
        <button
          onClick={handleMintGarden}
          style={{
            flex: 1,
            padding: '2px 4px',
            fontSize: '9px',
            cursor: 'pointer',
            border: '1px solid var(--win-border-dark, #808080)',
            backgroundColor: 'var(--win-bg, #c0c0c0)',
            whiteSpace: 'nowrap'
          }}
          title="Open in MintGarden"
        >
          MintGarden
        </button>
      </div>
    </div>
  )
}


