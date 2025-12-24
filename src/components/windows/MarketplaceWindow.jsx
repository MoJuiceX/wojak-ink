import Window from './Window'
import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useMarketplace } from '../../contexts/MarketplaceContext'
import { useToast } from '../../contexts/ToastContext'
import { useIntersectionObserver } from '../../hooks/useIntersectionObserver'
import Button from '../ui/Button'
import { Skeleton, LoadingSpinner } from '../ui'
import { resolveNFTToMintGarden, resolveNFTFromOfferFile } from '../../utils/nftResolver'
import { fetchNFTDetails, getNFTThumbnailUrl, getOfferFromDexie, getIPFSThumbnailUrl } from '../../services/mintgardenApi'

function MarketplaceNFT({ nft, offerFile, onCopyOffer, onViewOffer }) {
  const { fetchNFTDetailsForId, nftDetails, nftDetailsLoading } = useMarketplace()
  const { showToast } = useToast()
  const [copied, setCopied] = useState(false)
  const cardRef = useRef(null)
  const { elementRef, hasIntersected } = useIntersectionObserver()
  
  // Lazy load NFT details when element is visible (only if not already fetched/loading)
  useEffect(() => {
    if (hasIntersected && nft.id && offerFile && !nftDetails[nft.id] && !nftDetailsLoading.has(nft.id)) {
      fetchNFTDetailsForId(nft.id).catch(err => {
        // Silently handle errors - they're already logged in fetchNFTDetailsForId
      })
    }
  }, [hasIntersected, nft.id, offerFile]) // Only depend on nft.id and offerFile, not on nftDetails/nftDetailsLoading to avoid re-triggering

  const handleCopy = () => {
    if (offerFile) {
      navigator.clipboard.writeText(offerFile).then(() => {
        setCopied(true)
        showToast('Offer file copied to clipboard!', 'success')
        setTimeout(() => setCopied(false), 2000)
        if (onCopyOffer) onCopyOffer()
      }).catch(() => {
        // Fallback for older browsers
        const textArea = document.createElement('textarea')
        textArea.value = offerFile
        textArea.style.position = 'fixed'
        textArea.style.opacity = '0'
        document.body.appendChild(textArea)
        textArea.select()
        try {
          document.execCommand('copy')
          setCopied(true)
          showToast('Offer file copied to clipboard!', 'success')
          setTimeout(() => setCopied(false), 2000)
          if (onCopyOffer) onCopyOffer()
        } catch (err) {
          showToast('Failed to copy. Please select and copy manually.', 'error')
        }
        document.body.removeChild(textArea)
      })
    }
  }

  const handleClick = (e) => {
    e.stopPropagation()
    e.preventDefault()
    if (offerFile && onViewOffer) {
      onViewOffer(nft, offerFile)
    }
  }

  const handleTouchStart = (e) => {
    e.stopPropagation()
    e.preventDefault()
    if (offerFile && onViewOffer) {
      onViewOffer(nft, offerFile)
    }
  }

  // Get enrichment data from API (optional)
  const nftDetail = nftDetails[nft.id]
  const isLoading = nftDetailsLoading.has(nft.id)
  
  // Use thumbnail from CSV ONLY (IPFS link) - no fallbacks, no tokenId, no BASE_URL
  const imgSrc = nft.thumbnail || null
  const displayName = nftDetail?.name || nft.name || nft.id
  const priceText = nftDetail?.priceText
  
  // Use nft.offerTaken (from getNFTsByGroup merge) as primary source
  // This ensures badge shows correct status even if nftDetail hasn't loaded yet
  const isOfferTaken = nft.offerTaken ?? nftDetail?.offerTaken ?? false
  
  // Dev-only: Warn if thumbnail missing
  if (import.meta.env.DEV && !imgSrc && nft.id) {
    console.warn(`[Marketplace] Missing thumbnail for NFT: id=${nft.id}, group=${nft.group}`)
  }

  return (
    <div
      ref={(el) => {
        cardRef.current = el
        if (elementRef) {
          elementRef.current = el
        }
      }}
      style={{
        position: 'relative',
        border: '1px solid var(--border-dark)',
        background: 'var(--input-face)',
        padding: '4px',
        cursor: offerFile ? 'pointer' : 'default',
      }}
      onClick={handleClick}
      onTouchStart={handleTouchStart}
      onMouseDown={(e) => e.stopPropagation()}
      onPointerDown={(e) => {
        // Prevent window dragging when clicking on NFT cards
        if (e.target.closest('.window-title') === null) {
          e.stopPropagation()
        }
      }}
    >
      <div style={{ position: 'relative', width: '100%', paddingTop: '100%' }}>
        {isLoading ? (
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
            }}
          >
            <Skeleton width="100%" height="100%" />
          </div>
        ) : imgSrc ? (
          <img
            src={hasIntersected ? imgSrc : undefined}
            alt={displayName}
            loading="lazy"
            decoding="async"
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
            }}
            onError={(e) => {
              // Hide image and show placeholder if image fails
              e.target.style.display = 'none'
              e.target.parentElement.style.background = '#d4d0c8'
            }}
          />
        ) : (
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              background: 'var(--btn-hover-face)',
              border: '1px inset var(--border-dark)',
            }}
          />
        )}
        {offerFile && (
          <div
            style={{
              position: 'absolute',
              top: '4px',
              right: '4px',
              background: isOfferTaken ? 'rgba(204, 0, 0, 0.8)' : 'rgba(0, 128, 0, 0.8)',
              color: 'white',
              padding: '2px 6px',
              borderRadius: '2px',
            }}
            className="item-label"
          >
            {isOfferTaken ? 'Sold' : 'Offer Available'}
          </div>
        )}
      </div>
      <div className="helper-text" style={{ marginTop: '4px', position: 'relative', minHeight: '20px' }}>
        <div style={{ textAlign: 'center', marginBottom: '2px' }}>{displayName}</div>
        {priceText && (
          <div style={{ textAlign: 'center', marginBottom: '4px' }}>
            Price: {priceText}
          </div>
        )}
        {offerFile && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              e.preventDefault()
              handleCopy()
            }}
            onMouseDown={(e) => {
              e.stopPropagation()
              e.preventDefault()
            }}
            onPointerDown={(e) => {
              e.stopPropagation()
              e.preventDefault()
            }}
            onTouchStart={(e) => {
              e.stopPropagation()
              e.preventDefault()
            }}
            style={{
              width: '100%',
              background: copied ? '#008000' : '#000080',
              color: 'white',
              border: '1px outset #c0c0c0',
              padding: '4px 8px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '4px',
              fontFamily: 'inherit',
            }}
            title="Copy offer file to clipboard"
          >
            {copied ? '✓ Copied!' : '📋 Copy Offer File'}
          </button>
        )}
      </div>
    </div>
  )
}

function OfferFileModal({ nft, offerFile, onClose, onCopy }) {
  const { showToast } = useToast()
  const [copied, setCopied] = useState(false)
  const [nftDetails, setNftDetails] = useState(null)
  const [offerData, setOfferData] = useState(null) // Add offer data state
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [loadingStage, setLoadingStage] = useState('Resolving NFT...')

  useEffect(() => {
    const fetchNFTData = async () => {
      setLoading(true)
      setError(null)
      setLoadingStage('Parsing offer file...')
      
      try {
        // Step 1: Get offer details from Dexie first (includes pricing)
        if (!offerFile || !offerFile.startsWith('offer1')) {
          setError('Invalid offer file format')
          setLoading(false)
          return
        }
        
        setLoadingStage('Fetching offer details...')
        const dexieOfferData = await getOfferFromDexie(offerFile)
        setOfferData(dexieOfferData)
        
        setLoadingStage('Resolving NFT from offer file...')
        
        // Step 2: Resolve NFT to MintGarden launcher_bech32 from offer file
        // Try resolveNFTFromOfferFile first (more reliable), then fallback to resolveNFTToMintGarden
        let launcherBech32 = null
        try {
          // First try: Use resolveNFTFromOfferFile (more direct)
          launcherBech32 = await resolveNFTFromOfferFile(offerFile)
          
          // If that fails, try resolveNFTToMintGarden as fallback
          if (!launcherBech32) {
            launcherBech32 = await resolveNFTToMintGarden(nft, offerFile)
          }
        } catch (err) {
          console.error('Error resolving NFT:', err)
          // Try fallback
          try {
            launcherBech32 = await resolveNFTToMintGarden(nft, offerFile)
          } catch (fallbackErr) {
            console.error('Fallback resolution also failed:', fallbackErr)
          }
        }
        
        if (!launcherBech32) {
          setError('NFT not found on MintGarden. Could not extract NFT ID from offer file.')
          setLoading(false)
          // Don't return - continue to show modal with error and fallback thumbnail
        }
        
        setLoadingStage('Fetching details...')
        
        // Step 3: Fetch NFT details from MintGarden
        const details = await fetchNFTDetails(launcherBech32)
        setNftDetails(details)
        setLoadingStage('Loading thumbnail...')
        
        // Details are now set, thumbnail URL will be computed below
        
      } catch (err) {
        console.error('Failed to fetch NFT details:', err)
        setError(err.message || 'Failed to fetch NFT details')
      } finally {
        setLoading(false)
      }
    }

    if (offerFile) {
      fetchNFTData()
    } else {
      setLoading(false)
      setError('No offer file provided')
    }
  }, [nft, offerFile])
  
  const handleCopy = () => {
    if (offerFile) {
      navigator.clipboard.writeText(offerFile).then(() => {
        setCopied(true)
        showToast('Offer file copied to clipboard!', 'success')
        setTimeout(() => setCopied(false), 2000)
        if (onCopy) onCopy()
      }).catch(() => {
        // Fallback for older browsers
        const textArea = document.createElement('textarea')
        textArea.value = offerFile
        textArea.style.position = 'fixed'
        textArea.style.opacity = '0'
        document.body.appendChild(textArea)
        textArea.select()
        try {
          document.execCommand('copy')
          setCopied(true)
          showToast('Offer file copied to clipboard!', 'success')
          setTimeout(() => setCopied(false), 2000)
          if (onCopy) onCopy()
        } catch (err) {
          showToast('Failed to copy. Please select and copy manually.', 'error')
        }
        document.body.removeChild(textArea)
      })
    }
  }

  // Helper function to get NFT status (updated to use offer data)
  const getNFTStatus = () => {
    // If we have offer data, check status first
    if (offerData) {
      // Check if offer is taken/completed
      // Dexie API status: 0 = pending/active, other values = completed/taken
      // Also check date_completed field
      const isTaken = offerData.status !== 0 || offerData.date_completed !== null
      
      if (isTaken) {
        return { 
          text: 'Offer Taken / Not Available', 
          type: 'taken' 
        }
      }
      
      // Offer is still active, show pricing
      const requested = offerData.requested || []
      const offered = offerData.offered || []
      
      // Build status from offer data
      // Only include tokens (items with amount and code), exclude NFTs
      if (requested.length > 0 || offered.length > 0) {
        const parts = []
        
        // Only include tokens (items with amount and code), exclude NFTs
        if (requested.length > 0) {
          requested.forEach(item => {
            // Only include if it has both amount and code (is a token, not an NFT)
            if (item.amount && item.code) {
              const amount = parseFloat(item.amount).toLocaleString()
              parts.push(`${amount} ${item.code}`)
            }
          })
        }
        if (offered.length > 0) {
          offered.forEach(item => {
            // Only include if it has both amount and code (is a token, not an NFT)
            if (item.amount && item.code) {
              const amount = parseFloat(item.amount).toLocaleString()
              parts.push(`${amount} ${item.code}`)
            }
          })
        }
        
        // Only return status if we have at least one token part
        if (parts.length > 0) {
          return { 
            text: `For Sale via Offer: ${parts.join(' / ')}`, 
            type: 'for-sale' 
          }
        }
      }
    }
    
    // Fallback to MintGarden data
    if (!nftDetails) {
      // If we have an offer file but no details yet, it's available via P2P
      if (offerFile) {
        return { text: 'Available via Offer File', type: 'for-sale' }
      }
      return null
    }
    
    if (nftDetails.xch_price > 0) {
      return { text: `For Sale at ${nftDetails.xch_price} XCH`, type: 'for-sale' }
    }
    if (nftDetails.auctions && nftDetails.auctions.length > 0) {
      return { text: 'In Auction', type: 'auction' }
    }
    
    // If we have an offer file, it's available via P2P
    if (offerFile) {
      return { text: 'Available via Offer File', type: 'for-sale' }
    }
    
    return { text: 'Not For Sale', type: 'not-for-sale' }
  }

  // Helper function to get mint date
  const getMintDate = () => {
    if (!nftDetails || !nftDetails.events) return null
    
    const mintEvent = nftDetails.events.find(e => e.type === 0)
    if (mintEvent) {
      return new Date(mintEvent.timestamp).toLocaleDateString()
    }
    return null
  }

  // Helper function to get latest activity date
  const getLatestActivityDate = () => {
    if (!nftDetails || !nftDetails.events || nftDetails.events.length === 0) return null
    return new Date(nftDetails.events[0].timestamp).toLocaleDateString()
  }

  // Generate thumbnail URL: Use IPFS URL from token ID (primary), then fallback to MintGarden thumbnail
  let thumbnailUrl = nft.thumbnail // Start with thumbnail from marketplace context (IPFS URL)
  
  // If we don't have a thumbnail yet but have MintGarden details, generate IPFS URL from token ID
  if (!thumbnailUrl && nftDetails) {
    thumbnailUrl = getIPFSThumbnailUrl(nftDetails)
  }
  
  // Fallback to MintGarden thumbnail API if IPFS URL not available
  if (!thumbnailUrl && nftDetails?.data?.thumbnail_uri) {
    thumbnailUrl = nftDetails?.data?.thumbnail_uri
  }
  
  // Final fallback: Use MintGarden thumbnail API URL (requires launcher ID, which we might not have here)

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10000,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#c0c0c0',
          border: '2px outset #c0c0c0',
          padding: '16px',
          width: '90%',
          maxWidth: 'min(600px, calc(100vw - 40px))',
          maxHeight: '80dvh', /* Use dynamic viewport height for mobile */
          overflow: 'auto',
          boxShadow: '4px 4px 8px rgba(0,0,0,0.5)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <h3 className="section-heading" style={{ fontWeight: 'bold', margin: 0 }}>{nft.name} - Offer File</h3>
          <button
            onClick={onClose}
            style={{
              background: '#c0c0c0',
              border: '1px outset #c0c0c0',
              padding: '2px 8px',
              cursor: 'pointer',
            }}
          >
            ✕ Close
          </button>
        </div>

        {/* Loading State */}
        {loading && (
          <div style={{ marginBottom: '12px', padding: '12px', background: 'var(--surface-3)', border: '1px inset var(--border-dark)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <LoadingSpinner size="small" />
            <div>
              <div className="status-text" style={{ marginBottom: '4px', color: 'var(--text-1)' }}>{loadingStage}</div>
              <div className="helper-text" style={{ color: 'var(--text-2)' }}>Please wait...</div>
            </div>
          </div>
        )}

        {/* Error State */}
        {error && !loading && (
          <div style={{ marginBottom: '12px', padding: '12px', background: 'var(--surface-3)', border: '1px inset var(--border-dark)' }}>
            <div className="error-message-text" style={{ fontWeight: 'bold', color: 'var(--state-error)', marginBottom: '4px' }}>
              Error loading NFT details
            </div>
            <div className="helper-text" style={{ color: 'var(--text-2)' }}>{error}</div>
            <div className="helper-text" style={{ color: 'var(--text-2)', marginTop: '4px' }}>
              Using marketplace NFT image as fallback.
            </div>
          </div>
        )}

        {/* NFT Details Section - Show if we have details OR if we have a thumbnail from marketplace */}
        {(nftDetails || thumbnailUrl) && !loading && (
          <div style={{ marginBottom: '12px', padding: '12px', background: 'var(--surface-3)', border: '1px inset var(--border-dark)' }}>
            <div className="panel-header" style={{ fontWeight: 'bold', marginBottom: '8px' }}>NFT Details</div>
            
            {/* Thumbnail */}
            <div style={{ marginBottom: '8px', textAlign: 'center' }}>
              {thumbnailUrl ? (
                <img
                  src={thumbnailUrl}
                  alt={nftDetails?.data?.metadata_json?.name || nft.name}
                  style={{
                    maxWidth: '200px',
                    maxHeight: '200px',
                    border: '1px solid var(--border-dark)',
                    background: 'var(--input-face)',
                  }}
                  onError={(e) => {
                    // Hide image if it fails to load
                    e.target.style.display = 'none'
                  }}
                />
              ) : (
                <div
                  style={{
                    width: '200px',
                    height: '200px',
                    background: 'var(--btn-hover-face)',
                    border: '1px inset var(--border-dark)',
                    display: 'inline-block',
                  }}
                />
              )}
            </div>

            {/* NFT Name & Description */}
            {(nftDetails?.data?.metadata_json?.name || nftDetails?.data?.metadata_json?.description) && (
              <div style={{ marginBottom: '8px' }}>
                {nftDetails?.data?.metadata_json?.name && (
                  <div className="panel-header" style={{ fontWeight: 'bold', marginBottom: '4px' }}>
                    {nftDetails?.data?.metadata_json?.name}
                  </div>
                )}
                {nftDetails?.data?.metadata_json?.description && (
                  <div className="helper-text" style={{ color: 'var(--text-2)', marginBottom: '4px' }}>
                    {nftDetails?.data?.metadata_json?.description}
                  </div>
                )}
              </div>
            )}

            {/* Price & Status */}
            {(() => {
              const status = getNFTStatus()
              if (status) {
                const isTaken = status.type === 'taken'
                return (
                  <div style={{ 
                    marginBottom: '8px', 
                    padding: '4px 8px', 
                    background: isTaken ? '#ffe0e0' : '#ffffff', 
                    border: '1px inset var(--border-dark)',
                    color: isTaken ? '#cc0000' : '#000000'
                  }}>
                    <div className="status-text" style={{ fontWeight: 'bold' }}>Status: {status.text}</div>
                  </div>
                )
              }
              return null
            })()}

            {/* Collection */}
            {nftDetails?.collection && (
              <div className="helper-text" style={{ marginBottom: '8px' }}>
                <span style={{ fontWeight: 'bold' }}>Collection: </span>
                {nftDetails?.collection?.name || nftDetails?.collection?.id}
              </div>
            )}

            {/* Dates */}
            <div className="helper-text" style={{ marginBottom: '8px' }}>
              {getMintDate() && (
                <div>
                  <span style={{ fontWeight: 'bold' }}>Minted: </span>
                  {getMintDate()}
                </div>
              )}
              {getLatestActivityDate() && (
                <div>
                  <span style={{ fontWeight: 'bold' }}>Latest Activity: </span>
                  {getLatestActivityDate()}
                </div>
              )}
            </div>

            {/* Auction Details */}
            {nftDetails?.auctions && nftDetails.auctions.length > 0 && (
              <div style={{ marginBottom: '8px', padding: '4px 8px', background: 'var(--input-face)', border: '1px inset var(--border-dark)' }}>
                <div className="status-text" style={{ fontWeight: 'bold', marginBottom: '4px' }}>Auction Details:</div>
                {nftDetails.auctions.map((auction, idx) => (
                  <div key={idx} className="item-label" style={{ marginBottom: '4px' }}>
                    {auction.reserve_xch_price > 0 && (
                      <div>Reserve: {auction.reserve_xch_price} XCH</div>
                    )}
                    {auction.highest_bid && (
                      <div>Highest Bid: {auction.highest_bid.xch_price} XCH</div>
                    )}
                    {auction.start && (
                      <div>Start: {new Date(auction.start).toLocaleDateString()}</div>
                    )}
                    {auction.end && (
                      <div>End: {new Date(auction.end).toLocaleDateString()}</div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Metadata Attributes */}
            {nftDetails?.data?.metadata_json?.attributes && Array.isArray(nftDetails?.data?.metadata_json?.attributes) && nftDetails?.data?.metadata_json?.attributes?.length > 0 && (
              <div className="helper-text" style={{ marginBottom: '8px' }}>
                <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>Attributes:</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                  {nftDetails?.data?.metadata_json?.attributes?.map((attr, idx) => (
                    <div key={idx} className="item-label" style={{ padding: '2px 6px', background: 'var(--input-face)', border: '1px solid var(--border-dark)' }}>
                      {attr.trait_type}: {attr.value}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Offer File Content Section */}
        <div style={{ marginBottom: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
            <label className="panel-header" style={{ fontWeight: 'bold', display: 'block' }}>
              Offer File Content:
            </label>
            <button
              onClick={handleCopy}
              style={{
                background: copied ? '#008000' : '#000080',
                color: 'white',
                border: '1px outset #c0c0c0',
                padding: '4px 10px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}
              title="Copy offer file to clipboard"
            >
              {copied ? '✓ Copied!' : '📋 Copy to Clipboard'}
            </button>
          </div>
          <textarea
            value={offerFile}
            readOnly
            className="error-stack-trace"
            style={{
              width: '100%',
              minHeight: '200px',
              padding: '8px',
              fontFamily: 'monospace',
              border: '1px inset var(--border-dark)',
              background: 'var(--input-face)',
              resize: 'vertical',
              wordBreak: 'break-all',
            }}
            onClick={(e) => {
              e.stopPropagation()
              e.target.select()
            }}
          />
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <Button onClick={onClose} style={{ flex: 1 }}>Close</Button>
        </div>
        <p className="helper-text" style={{ color: 'var(--text-2)', marginTop: '8px', marginBottom: 0 }}>
          Tip: You can also click in the text area above to select all text, then copy manually (Ctrl+C / Cmd+C)
        </p>
      </div>
    </div>
  )
}

export default function MarketplaceWindow({ onClose }) {
  const { getNFTsByGroup, getTokenGroups, getOfferFile, nftEntries, nftDetailsLoading, fetchNFTDetailsForId } = useMarketplace()
  const { showToast } = useToast()
  const tokenGroups = getTokenGroups()
  const [selectedGroup, setSelectedGroup] = useState(tokenGroups[0] || null)
  const [showOnlyWithOffers, setShowOnlyWithOffers] = useState(false)
  const [selectedOffer, setSelectedOffer] = useState(null)
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 1000 // Show all NFTs (no pagination limit)
  const windowRef = useRef(null)
  
  // Determine if we should show skeleton loading (initial load, no groups yet, or loading NFTs)
  const isLoadingInitial = nftEntries.length === 0 || (tokenGroups.length === 0 && nftEntries.length > 0)
  
  // Start fetching NFT details for all entries when component mounts or entries change
  // Use longer delays to avoid rate limits (each NFT fetch requires multiple API calls)
  useEffect(() => {
    if (nftEntries.length > 0) {
      // Fetch details for all NFTs with aggressive throttling to avoid rate limits
      // Each NFT requires: Dexie API call + MintGarden API call(s), so we need longer delays
      // Use 2 second delay = 0.5 NFTs/second = ~1-2 API calls/second max
      nftEntries.forEach((entry, index) => {
        // Stagger the requests with longer delay to respect rate limits
        setTimeout(() => {
          if (entry.offerFile) {
            fetchNFTDetailsForId(entry.id).catch(err => {
              // Silently handle errors - they're already logged in fetchNFTDetailsForId
              // Retry logic will handle rate-limited requests automatically
            })
          }
        }, index * 2000) // 2 second delay between each NFT (accounts for multiple API calls per NFT)
      })
    }
  }, [nftEntries.length]) // Only run when entries count changes, not when fetchNFTDetailsForId changes


  // Update selected group if current selection is not available
  useEffect(() => {
    if (tokenGroups.length > 0 && (!selectedGroup || !tokenGroups.includes(selectedGroup))) {
      setSelectedGroup(tokenGroups[0])
    }
  }, [tokenGroups, selectedGroup])

  // Reset page when group changes
  useEffect(() => {
    setCurrentPage(1)
  }, [selectedGroup, showOnlyWithOffers])

  const allNfts = selectedGroup ? getNFTsByGroup(selectedGroup) : []
  const filteredNfts = allNfts.filter((nft) => {
    if (showOnlyWithOffers && !getOfferFile(nft.id) && !nft.offerFile) {
      return false
    }
    const actualGroup = nft.group || nft.currency
    return actualGroup === selectedGroup
  })

  // Pagination
  const totalPages = Math.ceil(filteredNfts.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const nfts = filteredNfts.slice(startIndex, endIndex)

  const handleCopyOffer = () => {
    // Toast is handled in MarketplaceNFT component
  }

  const handleViewOffer = (nft, offerFile) => {
    // Ensure nft object has all required properties for the modal
    const nftForModal = {
      id: nft.id,
      name: nft.name || nft.id,
      tokenId: nft.tokenId || parseInt(nft.id.match(/-(\d+)$/)?.[1] || '1'),
      ...nft, // Include all other properties
    }
    setSelectedOffer({ nft: nftForModal, offerFile })
  }

  const handleCloseModal = () => {
    setSelectedOffer(null)
    // Bring the parent window to front when modal closes
    if (windowRef.current?.bringToFront) {
      windowRef.current.bringToFront()
    }
  }

  return (
    <Window
      ref={windowRef}
      id="window-marketplace"
      title="MARKETPLACE - P2P OFFERS"
      style={{ 
        width: 'var(--window-size-marketplace)', 
        maxWidth: 'var(--window-max-width)',
        minWidth: 'var(--window-min-width)'
      }}
      onClose={onClose}
    >
      <div style={{ padding: '8px' }}>
        <div style={{ marginBottom: '16px' }}>
          <p className="panel-header" style={{ marginBottom: '8px', fontWeight: 'bold' }}>
            Filter by Token Group:
          </p>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {tokenGroups.length > 0 ? (
              tokenGroups.map((group) => (
                <Button
                  key={group}
                  onClick={() => setSelectedGroup(group)}
                  style={{
                    background: selectedGroup === group ? '#000080' : '#c0c0c0',
                    color: selectedGroup === group ? '#ffffff' : '#000000',
                  }}
                >
                  {group}
                </Button>
              ))
            ) : (
              <div className="helper-text" style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-2)' }}>
                <LoadingSpinner size="small" />
                <span>Loading groups...</span>
              </div>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap', gap: '8px' }}>
          <div className="status-text">
            Showing {filteredNfts.length} NFT{filteredNfts.length !== 1 ? 's' : ''} from {selectedGroup} group
            {totalPages > 1 && (
              <span> (Page {currentPage} of {totalPages})</span>
            )}
          </div>
          <label className="panel-header" style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={showOnlyWithOffers}
              onChange={(e) => setShowOnlyWithOffers(e.target.checked)}
              style={{ cursor: 'pointer' }}
            />
            Show only NFTs with offers
          </label>
        </div>

        {/* Show skeleton loading grid initially */}
        {isLoadingInitial ? (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(max(120px, calc((100% - 60px) / 6)), 1fr))',
              gap: '12px',
              maxHeight: '600px',
              overflowY: 'auto',
              padding: '8px',
              background: 'var(--btn-hover-face)',
              border: '1px inset var(--border-dark)',
            }}
          >
            {Array.from({ length: 12 }).map((_, idx) => (
              <div
                key={`skeleton-${idx}`}
                style={{
                  position: 'relative',
                  border: '1px solid var(--border-dark)',
                  background: 'var(--input-face)',
                  padding: '4px',
                  aspectRatio: '1',
                }}
              >
                <Skeleton width="100%" height="100%" />
              </div>
            ))}
          </div>
        ) : nfts.length > 0 ? (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(max(120px, calc((100% - 60px) / 6)), 1fr))',
              gap: '12px',
              maxHeight: '600px',
              overflowY: 'auto',
              padding: '8px',
              background: 'var(--btn-hover-face)',
              border: '1px inset var(--border-dark)',
            }}
          >
            {nfts.map((nft) => {
              const offerFile = getOfferFile(nft.id) || nft.offerFile
              return (
                <MarketplaceNFT
                  key={nft.id}
                  nft={nft}
                  offerFile={offerFile}
                  onCopyOffer={handleCopyOffer}
                  onViewOffer={handleViewOffer}
                />
              )
            })}
          </div>
        ) : (
          <div style={{ padding: '20px', textAlign: 'center' }}>
            <p className="empty-state-text">No NFTs found in this group.</p>
          </div>
        )}

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', marginTop: '16px', flexWrap: 'wrap' }}>
            <Button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
            >
              Previous
            </Button>
            <span className="status-text">
              Page {currentPage} of {totalPages}
            </span>
            <Button
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
            >
              Next
            </Button>
          </div>
        )}

        <p className="fineprint" style={{ marginTop: '12px', color: '#666' }}>
          Click on NFTs with offers to view and copy offer files. Hover to see a quick preview. Only NFTs with saved offer files will show the offer option.
        </p>
      </div>

      {selectedOffer && createPortal(
        <OfferFileModal
          nft={selectedOffer.nft}
          offerFile={selectedOffer.offerFile}
          onClose={handleCloseModal}
          onCopy={handleCopyOffer}
        />,
        document.body
      )}
    </Window>
  )
}

