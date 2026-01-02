import React from 'react'
import NftPreviewCard from '../ui/NftPreviewCard'

/**
 * TraitValueDetailView - Shows all trades that contributed to a trait's value
 * 
 * @param {Object} props
 * @param {string} props.traitKey - Trait key (e.g., "head::crown")
 * @param {Array} props.trades - All trades for this trait
 * @param {Array} props.filteredTrades - Trades used in calculation (after filtering)
 * @param {number} props.valueXch - Calculated trait value
 * @param {number} props.tradeCount - Total number of trades
 * @param {number} props.filteredCount - Number of trades after filtering
 * @param {Function} props.onClose - Close handler
 * @param {Object} props.launcherMap - Optional map of nftId -> launcher for MintGarden links
 */
export default function TraitValueDetailView({
  traitKey,
  trades,
  filteredTrades,
  valueXch,
  tradeCount,
  filteredCount,
  onClose,
  launcherMap = {}
}) {
  if (!traitKey || !trades || trades.length === 0) {
    return null
  }
  
  // Parse trait key
  const [category, trait] = traitKey.split('::')
  const categoryDisplay = category.charAt(0).toUpperCase() + category.slice(1)
  
  // Format date
  const formatDate = (timestamp) => {
    if (!timestamp) return 'Unknown date'
    try {
      const date = new Date(timestamp)
      return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    } catch {
      return timestamp
    }
  }
  
  // Format price
  const formatPrice = (price) => {
    if (price === null || price === undefined) return 'N/A'
    return `${price.toFixed(3)} XCH`
  }
  
  return (
    <div style={{
      padding: '12px',
      border: '2px solid var(--win-border-dark, #808080)',
      backgroundColor: 'var(--win-bg, #c0c0c0)',
      marginTop: '12px',
      maxHeight: '400px',
      overflowY: 'auto'
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '12px',
        paddingBottom: '8px',
        borderBottom: '2px solid var(--win-border-dark, #808080)'
      }}>
        <div>
          <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 'bold' }}>
            {categoryDisplay}: {trait}
          </h4>
          <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
            {valueXch !== null ? (
              <>Calculated Value: <strong>{formatPrice(valueXch)}</strong></>
            ) : (
              <>No value calculated</>
            )}
          </div>
          <div style={{ fontSize: '11px', color: '#666', marginTop: '2px' }}>
            Based on {filteredCount} of {tradeCount} trades
            {tradeCount > filteredCount && (
              <> ({tradeCount - filteredCount} filtered out)</>
            )}
          </div>
        </div>
        <button
          onClick={onClose}
          style={{
            padding: '4px 8px',
            fontSize: '12px',
            cursor: 'pointer',
            border: '1px solid var(--win-border-dark, #808080)',
            backgroundColor: 'var(--win-bg, #c0c0c0)'
          }}
        >
          Close
        </button>
      </div>
      
      <div style={{ fontSize: '12px', marginBottom: '8px', fontWeight: 'bold' }}>
        All Trades ({trades.length}):
      </div>
      
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '8px'
      }}>
        {trades.map((trade, index) => {
          const isFiltered = filteredTrades && filteredTrades.some(ft => 
            ft.nft_id === trade.nft_id && 
            ft.timestamp === trade.timestamp &&
            ft.price_xch === trade.price_xch
          )
          
          const launcher = launcherMap[trade.nft_id] || null
          
          return (
            <div
              key={`${trade.nft_id}-${trade.timestamp}-${index}`}
              style={{
                padding: '8px',
                border: '1px solid var(--win-border-dark, #808080)',
                backgroundColor: isFiltered ? 'var(--win-bg, #c0c0c0)' : '#f0f0f0',
                fontSize: '11px',
                opacity: isFiltered ? 1 : 0.6,
                display: 'flex',
                gap: '12px',
                alignItems: 'flex-start'
              }}
            >
              {/* NFT Preview Card */}
              <div style={{ flexShrink: 0 }}>
                <NftPreviewCard
                  nftId={trade.nft_id}
                  launcher={launcher}
                  size="small"
                />
              </div>
              
              {/* Trade Details */}
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', alignItems: 'flex-start' }}>
                  <div>
                    <strong>NFT #{trade.nft_id}</strong>
                    {!isFiltered && (
                      <span style={{ 
                        marginLeft: '8px', 
                        fontSize: '10px', 
                        color: '#d00',
                        fontStyle: 'italic'
                      }}>
                        (filtered out)
                      </span>
                    )}
                  </div>
                  <div style={{ fontWeight: 'bold', color: '#000080', fontSize: '12px' }}>
                    {formatPrice(trade.price_xch)}
                  </div>
                </div>
                <div style={{ fontSize: '10px', color: '#666' }}>
                  {formatDate(trade.timestamp)}
                  {trade.buyer_address && (
                    <> • Buyer: {trade.buyer_address.slice(0, 8)}...</>
                  )}
                  {trade.seller_address && (
                    <> • Seller: {trade.seller_address.slice(0, 8)}...</>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>
      
      {filteredCount < tradeCount && (
        <div style={{
          marginTop: '12px',
          padding: '8px',
          backgroundColor: '#fff4e1',
          border: '1px solid #d4a574',
          fontSize: '11px',
          color: '#8b4513'
        }}>
          <strong>Note:</strong> {tradeCount - filteredCount} trade(s) were filtered out due to:
          <ul style={{ margin: '4px 0 0 0', paddingLeft: '20px' }}>
            <li>Outlier detection (price too far from median)</li>
            <li>Flag downweighting (same_owner or extreme flags)</li>
            <li>Time decay (very old trades have lower weight)</li>
          </ul>
        </div>
      )}
    </div>
  )
}

