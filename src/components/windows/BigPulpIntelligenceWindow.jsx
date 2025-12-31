import { useState, useEffect, useCallback, useMemo } from 'react'
import Window from './Window'
import { useWindow } from '../../contexts/WindowContext'
import './BigPulpIntelligenceWindow.css'

// ============================================
// DATA CACHE (Module-level singleton)
// ============================================
const DataCache = {
  manifest: null,
  questionTree: null,
  analysis: null,
  sentences: null,
  traitInsights: null,
  comboDatabase: null,
  loaded: {
    manifest: false,
    questionTree: false,
    analysis: false,
    sentences: false,
    traitInsights: false,
    comboDatabase: false
  },
  loadingPromises: {
    manifest: null,
    questionTree: null,
    analysis: null,
    sentences: null,
    traitInsights: null,
    comboDatabase: null
  },
  error: null
}

// Single shared promise pattern (no setInterval polling)
const loadManifest = async () => {
  if (DataCache.loaded.manifest) return DataCache.manifest
  if (DataCache.loadingPromises.manifest) return DataCache.loadingPromises.manifest
  
  DataCache.loadingPromises.manifest = (async () => {
    try {
      const response = await fetch('/assets/BigPulp/manifest.json')
      if (!response.ok) throw new Error(`Manifest fetch failed: ${response.status}`)
      const manifest = await response.json()
      
      // Validate manifest schema
      if (!manifest.schema_version || !manifest.required_files) {
        if (import.meta.env.DEV) {
          console.warn('[Big Pulp] Manifest schema mismatch:', manifest)
        }
        throw new Error('Invalid manifest schema')
      }
      
      DataCache.manifest = manifest
      DataCache.loaded.manifest = true
      DataCache.loadingPromises.manifest = null
      return manifest
    } catch (err) {
      DataCache.error = err
      DataCache.loadingPromises.manifest = null
      throw err
    }
  })()
  
  return DataCache.loadingPromises.manifest
}

// Lazy loading: Load only question tree + manifest for welcome/explore mode
const loadCoreData = async () => {
  const manifest = await loadManifest()
  
  if (DataCache.loaded.questionTree) {
    return { manifest, questionTree: DataCache.questionTree }
  }
  if (DataCache.loadingPromises.questionTree) {
    const questionTree = await DataCache.loadingPromises.questionTree
    return { manifest, questionTree }
  }
  
  DataCache.loadingPromises.questionTree = (async () => {
    try {
      const response = await fetch('/assets/BigPulp/question_tree_v2.json')
      if (!response.ok) throw new Error(`Question tree fetch failed: ${response.status}`)
      const questionTree = await response.json()
      DataCache.questionTree = questionTree
      DataCache.loaded.questionTree = true
      DataCache.loadingPromises.questionTree = null
      return questionTree
    } catch (err) {
      DataCache.error = err
      DataCache.loadingPromises.questionTree = null
      throw err
    }
  })()
  
  const questionTree = await DataCache.loadingPromises.questionTree
  return { manifest, questionTree }
}

// Lazy loading: Load analysis + sentences only when context mode needed
const loadContextData = async () => {
  const manifest = await loadManifest()
  
  // Load analysis, sentences, and combo database in parallel
  const loadAnalysis = DataCache.loaded.analysis
    ? Promise.resolve(DataCache.analysis)
    : (DataCache.loadingPromises.analysis || (DataCache.loadingPromises.analysis = (async () => {
        try {
          const response = await fetch('/assets/BigPulp/all_nft_analysis.json')
          if (!response.ok) throw new Error(`Analysis fetch failed: ${response.status}`)
          const data = await response.json()
          DataCache.analysis = data
          DataCache.loaded.analysis = true
          DataCache.loadingPromises.analysis = null
          return data
        } catch (err) {
          DataCache.error = err
          DataCache.loadingPromises.analysis = null
          throw err
        }
      })()))
  
  const loadSentences = DataCache.loaded.sentences
    ? Promise.resolve(DataCache.sentences)
    : (DataCache.loadingPromises.sentences || (DataCache.loadingPromises.sentences = (async () => {
        try {
          const response = await fetch('/assets/BigPulp/all_nft_sentences.json')
          if (!response.ok) throw new Error(`Sentences fetch failed: ${response.status}`)
          const data = await response.json()
          DataCache.sentences = data
          DataCache.loaded.sentences = true
          DataCache.loadingPromises.sentences = null
          return data
        } catch (err) {
          DataCache.error = err
          DataCache.loadingPromises.sentences = null
          throw err
        }
      })()))
  
  const loadComboDatabase = DataCache.loaded.comboDatabase
    ? Promise.resolve(DataCache.comboDatabase)
    : (DataCache.loadingPromises.comboDatabase || (DataCache.loadingPromises.comboDatabase = (async () => {
        try {
          const response = await fetch('/assets/BigPulp/combo_database.json')
          if (!response.ok) throw new Error(`Combo database fetch failed: ${response.status}`)
          const data = await response.json()
          DataCache.comboDatabase = data
          DataCache.loaded.comboDatabase = true
          DataCache.loadingPromises.comboDatabase = null
          return data
        } catch (err) {
          DataCache.error = err
          DataCache.loadingPromises.comboDatabase = null
          throw err
        }
      })()))
  
  const [analysis, sentences, comboDatabase] = await Promise.all([loadAnalysis, loadSentences, loadComboDatabase])
  return { manifest, analysis, sentences, comboDatabase }
}

// Lazy loading: Load trait insights only when deep-dive opened
const loadTraitInsights = async () => {
  if (DataCache.loaded.traitInsights) return DataCache.traitInsights
  if (DataCache.loadingPromises.traitInsights) return DataCache.loadingPromises.traitInsights
  
  DataCache.loadingPromises.traitInsights = (async () => {
    try {
      const response = await fetch('/assets/BigPulp/trait_insights.json')
      if (!response.ok) throw new Error(`Trait insights fetch failed: ${response.status}`)
      const data = await response.json()
      DataCache.traitInsights = data
      DataCache.loaded.traitInsights = true
      DataCache.loadingPromises.traitInsights = null
      return data
    } catch (err) {
      DataCache.error = err
      DataCache.loadingPromises.traitInsights = null
      throw err
    }
  })()
  
  return DataCache.loadingPromises.traitInsights
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

const getNftImageUrl = (nftId) => {
  const numericId = parseInt(String(nftId), 10)
  if (isNaN(numericId) || numericId < 1 || numericId > 4200) return null
  const paddedId = String(numericId).padStart(4, '0')
  return `https://bafybeigjkkonjzwwpopo4wn4gwrrvb7z3nwr2edj2554vx3avc5ietfjwq.ipfs.w3s.link/${paddedId}.png`
}

const normalizeNftIds = (nftIds, max = 10) => {
  if (!Array.isArray(nftIds)) return []
  const out = []
  const seen = new Set()
  for (const id of nftIds) {
    const numericId = parseInt(String(id).trim(), 10)
    if (isNaN(numericId) || numericId < 1 || numericId > 4200) continue
    const norm = String(numericId)
    if (seen.has(norm)) continue
    seen.add(norm)
    out.push(norm)
    if (out.length >= max) break
  }
  return out
}

// ============================================
// PARSING GUARDS
// ============================================
const getNftAnalysis = (nftId, data) => {
  const analysis = data?.analysis?.[String(nftId)]
  if (!analysis && import.meta.env.DEV) {
    console.warn(`[Big Pulp] NFT #${nftId} not found in analysis`)
  }
  return analysis || null
}

// Parse answer text into base sections (for traits_that_almost_never_pair)
const parseAnswerByBase = (answerText) => {
  const lines = answerText.split('\n')
  const sections = []
  let currentBase = null
  let currentBullets = []
  const headerLines = []

  for (const line of lines) {
    const trimmed = line.trim()
    
    // Check if this is a base header (ends with ":")
    if (trimmed.endsWith(':')) {
      // Save previous section if exists
      if (currentBase) {
        sections.push({ base: currentBase, bullets: currentBullets })
      }
      // Start new section
      currentBase = trimmed.slice(0, -1) // Remove ":"
      currentBullets = []
    } else if (trimmed.startsWith('•')) {
      // This is a bullet point
      if (currentBase) {
        currentBullets.push(trimmed)
      }
    } else if (trimmed) {
      // This is header text (before any base sections)
      if (!currentBase) {
        headerLines.push(trimmed)
      }
    }
  }
  
  // Don't forget last section
  if (currentBase) {
    sections.push({ base: currentBase, bullets: currentBullets })
  }
  
  return { header: headerLines.join(' '), sections }
}

const getSentenceVariant = (nftId, variantIndex, data) => {
  const sentences = data?.sentences?.[String(nftId)]
  if (!sentences?.variants?.length) {
    if (import.meta.env.DEV && sentences) {
      console.warn(`[Big Pulp] NFT #${nftId} has no variants`)
    }
    return null
  }
  const variant = sentences.variants[variantIndex]
  return variant || sentences.variants[0] || null
}

const safeGet = (obj, path, fallback = '') => {
  const keys = path.split('.')
  let current = obj
  for (const key of keys) {
    if (current == null || typeof current !== 'object') return fallback
    current = current[key]
  }
  return current ?? fallback
}

// ============================================
// TRAIT CATEGORY COLORS
// ============================================
const TRAIT_CATEGORY_COLORS = {
  'Base': '#8B4513',        // Saddle brown
  'Face': '#FF6347',        // Tomato red
  'Mouth': '#FF1493',       // Deep pink
  'Face Wear': '#1E90FF',   // Dodger blue
  'Head': '#FF0000',        // Red (changed from green for better visibility on gray)
  'Clothes': '#FF8C00',     // Dark orange
  'Background': '#9370DB'   // Medium purple
}

// ============================================
// HELPER: Render bullet text with colored categories
// ============================================
const renderColoredBullet = (bulletText, onNftClick) => {
  // Extract NFT ID if present (format: "...(e.g. #123)")
  // Look for the pattern "(e.g. #123)" and extract the ID
  const idMatch = bulletText.match(/\(e\.g\.\s*#(\d+)\)/)
  const nftId = idMatch ? idMatch[1] : null
  
  // Get text before the ID (the trait information)
  const textBeforeId = idMatch ? bulletText.substring(0, idMatch.index).trim() : bulletText.trim()
  
  const parts = []
  
  // Add NFT ID button at the beginning if present
  if (nftId && onNftClick) {
    parts.push(
      <button
        key="nft-id"
        className="bp-bullet-nft-id"
        onClick={() => onNftClick(nftId)}
        title={`View NFT #${nftId} in Rarity Explorer`}
      >
        #{nftId}
      </button>
    )
    parts.push(' ')
  }
  
  // Parse category: trait patterns (e.g., "Head: Construction Helmet" or "Head: Construction Helmet | Mouth: Glossed Lips")
  // Split by " | " to handle multiple trait pairs
  const segments = textBeforeId.split(/\s*\|\s*/)
  
  segments.forEach((segment, segmentIdx) => {
    // Parse each segment (e.g., "Head: Construction Helmet")
    const colonMatch = segment.match(/^([A-Za-z\s]+?):\s*(.+)$/)
    
    if (colonMatch) {
      const category = colonMatch[1].trim()
      const trait = colonMatch[2].trim()
      const color = TRAIT_CATEGORY_COLORS[category] || '#000000'
      
      // Add separator between segments
      if (segmentIdx > 0) {
        parts.push(' | ')
      }
      
      // Add only trait name (no category word) in colored text
      parts.push(
        <span key={`segment-${segmentIdx}`} style={{ color, fontWeight: 'bold' }}>
          {trait}
        </span>
      )
    } else {
      // If no match, add the segment as-is
      if (segmentIdx > 0) parts.push(' | ')
      parts.push(segment)
    }
  })
  
  return parts.length > 0 ? parts : [bulletText]
}

// ============================================
// SKELETON COMPONENTS
// ============================================
const SkeletonCard = () => (
  <div className="bp-card bp-skeleton">
    <div className="bp-card-header bp-skeleton-shimmer"></div>
    <div className="bp-card-content">
      <div className="bp-skeleton-line"></div>
      <div className="bp-skeleton-line"></div>
      <div className="bp-skeleton-line short"></div>
    </div>
  </div>
)

// ============================================
// MAIN COMPONENT
// ============================================
export default function BigPulpIntelligenceWindow({ onClose }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  
  const [mode, setMode] = useState('welcome')
  const [selectedCategory, setSelectedCategory] = useState(null)
  const [currentView, setCurrentView] = useState(null)
  const [viewHistory, setViewHistory] = useState([])
  
  const [selectedNft, setSelectedNft] = useState(null)
  const [analysis, setAnalysis] = useState(null)
  const [currentVariant, setCurrentVariant] = useState(0)
  const [lastVariant, setLastVariant] = useState(-1)
  const [loadingContext, setLoadingContext] = useState(false)
  const [loadingTraitInsights, setLoadingTraitInsights] = useState(false)
  
  const { bringToFront, restoreWindow, isWindowMinimized, getWindow } = useWindow()

  // Load core data on mount (manifest + question tree)
  useEffect(() => {
    const init = async () => {
      try {
        const result = await loadCoreData()
        setData(result)
        setLoading(false)
      } catch (err) {
        setError(err.message || String(err))
        setLoading(false)
        if (import.meta.env.DEV) {
          console.warn('[Big Pulp] Core data load failed:', err)
        }
      }
    }
    init()
  }, [])

  // Listen for NFT selection from Rarity Explorer
  useEffect(() => {
    const handleNftSelected = (event) => {
      const { nftId } = event.detail
      if (!nftId) return
      
      // Trigger lazy loading of context data
      setLoadingContext(true)
      loadContextData()
        .then(contextData => {
          setData(prev => ({ ...prev, ...contextData }))
          DataCache.comboDatabase = contextData.comboDatabase
          const nftAnalysis = getNftAnalysis(nftId, contextData)
          
          if (nftAnalysis) {
            // Support forward-compatible value_signals placeholder
            const enrichedAnalysis = {
              ...nftAnalysis,
              value_signals: nftAnalysis.value_signals || {}
            }
            setSelectedNft({ id: String(nftId), ...enrichedAnalysis })
            setAnalysis(enrichedAnalysis)
            setMode('context')
            setCurrentView(null)
            setCurrentVariant(0)
            setLastVariant(-1)
          }
          setLoadingContext(false)
        })
        .catch(err => {
          setError(err.message || String(err))
          setLoadingContext(false)
        })
    }
    
    window.addEventListener('nftSelected', handleNftSelected)
    return () => window.removeEventListener('nftSelected', handleNftSelected)
  }, [])

  // Navigate to NFT in Rarity Explorer
  const handleNftClick = useCallback((nftId) => {
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
      navigator.clipboard.writeText(String(nftId)).catch(() => {})
    }
  }, [getWindow, isWindowMinimized, restoreWindow, bringToFront])

  // Rotate commentary variant
  const handleRotateVariant = useCallback(() => {
    if (!selectedNft || !data?.sentences) return
    const sentences = data.sentences[selectedNft.id]
    if (!sentences?.variants || sentences.variants.length <= 1) return
    
    let newVariant
    do {
      newVariant = Math.floor(Math.random() * sentences.variants.length)
    } while (newVariant === lastVariant && sentences.variants.length > 1)
    
    setLastVariant(currentVariant)
    setCurrentVariant(newVariant)
  }, [selectedNft, data, currentVariant, lastVariant])

  // Copy commentary
  const handleCopy = useCallback(() => {
    if (!selectedNft || !data?.sentences) return
    const sentences = data.sentences[selectedNft.id]
    const variant = getSentenceVariant(selectedNft.id, currentVariant, data)
    if (variant) {
      navigator.clipboard.writeText(variant).catch(() => {})
    }
  }, [selectedNft, data, currentVariant])

  // Handle question selection
  const handleQuestionSelect = useCallback((question) => {
    if (question.type === 'dynamic' && selectedNft && analysis) {
      setViewHistory(prev => [...prev, currentView])
      setCurrentView({ type: 'dynamic_answer', question, analysis })
    } else if (question.type === 'static') {
      setViewHistory(prev => [...prev, currentView])
      setCurrentView({ type: 'static_answer', question })
    }
  }, [selectedNft, analysis, currentView])

  // Navigate back
  const handleBack = useCallback(() => {
    if (viewHistory.length > 0) {
      const prev = viewHistory[viewHistory.length - 1]
      setViewHistory(h => h.slice(0, -1))
      setCurrentView(prev)
    } else {
      setCurrentView(null)
    }
  }, [viewHistory])

  // Clear NFT selection
  const handleClearSelection = useCallback(() => {
    setSelectedNft(null)
    setAnalysis(null)
    setMode('explore')
    setCurrentView(null)
    setViewHistory([])
  }, [])

  // Get commentary text with fallback chain
  const getCommentaryText = useMemo(() => {
    if (!selectedNft || !data?.sentences) {
      return safeGet(analysis, 'story_hook', safeGet(analysis, 'highlight', ''))
    }
    const variant = getSentenceVariant(selectedNft.id, currentVariant, data)
    if (variant) return variant
    return safeGet(analysis, 'story_hook', safeGet(analysis, 'highlight', ''))
  }, [selectedNft, data, currentVariant, analysis])

  // Get sentence variants count
  const variantsCount = useMemo(() => {
    if (!selectedNft || !data?.sentences) return 0
    return data.sentences[selectedNft.id]?.variants?.length || 0
  }, [selectedNft, data])

  // Render loading state
  if (loading) {
    return (
      <Window
        id="big-pulp-intelligence"
        title="BIG PULP INTELLIGENCE"
        onClose={onClose}
        style={{ width: '800px', maxWidth: 'calc(100vw - 40px)' }}
      >
        <div className="bp-intelligence-window">
          <div className="bp-loading">
            <div className="bp-loading-spinner"></div>
            <div className="bp-loading-text">Loading Big Pulp Intelligence...</div>
          </div>
        </div>
      </Window>
    )
  }

  // Render error state
  if (error) {
    return (
      <Window
        id="big-pulp-intelligence"
        title="BIG PULP INTELLIGENCE"
        onClose={onClose}
        style={{ width: '800px', maxWidth: 'calc(100vw - 40px)' }}
      >
        <div className="bp-intelligence-window">
          <div className="bp-error">
            <div className="bp-error-title">⚠ Failed to load Big Pulp data</div>
            <div className="bp-error-message">{String(error)}</div>
            <div className="bp-error-hint">Please check your connection and try again.</div>
          </div>
        </div>
      </Window>
    )
  }

  return (
    <Window
      id="big-pulp-intelligence"
      title="BIG PULP INTELLIGENCE"
      onClose={onClose}
      style={{ width: '1100px', maxWidth: 'calc(100vw - 40px)', height: '700px' }}
      allowScroll={true}
    >
      <div className="bp-intelligence-window">
          {/* Context Bar */}
          {selectedNft && (
            <div className="bp-context-bar">
              <div className="bp-context-icon">📍</div>
              <div className="bp-context-info">
                <div className="bp-context-title">Analyzing: NFT #{selectedNft.id}</div>
                <div className="bp-context-subtitle">
                  <span className="bp-tier-badge" data-tier={safeGet(selectedNft, 'tier', 'common')}>
                    {safeGet(selectedNft, 'tier_label', 'Unknown')}
                  </span>
                  <span>{safeGet(selectedNft, 'base', 'Unknown')}</span>
                  <span>Rank #{safeGet(selectedNft, 'rank', '?')}</span>
                </div>
              </div>
              <button className="bp-context-clear" onClick={handleClearSelection} title="Clear selection">×</button>
            </div>
          )}

          <div className="bp-main-content">
            {/* Welcome State */}
            {mode === 'welcome' && !selectedNft && (
              <div className="bp-welcome">
                <div className="bp-welcome-icon">🍊</div>
                <div className="bp-welcome-title">Big Pulp Intelligence</div>
                <div className="bp-welcome-subtitle">
                  Select an NFT in the Rarity Explorer, and I'll tell you what makes it special.
                </div>
                <button className="bp-welcome-cta" onClick={() => setMode('explore')}>
                  Or Explore the Collection →
                </button>
              </div>
            )}

            {/* Context Mode - NFT Selected */}
            {mode === 'context' && selectedNft && !currentView && (
              <div className="bp-context-mode">
                {loadingContext ? (
                  <>
                    <SkeletonCard />
                    <SkeletonCard />
                  </>
                ) : (
                  <>
                    {/* Commentary Card */}
                    <div className="bp-commentary-card">
                      <div className="bp-commentary-header">
                        <span>🍊</span>
                        <span>Big Pulp Says</span>
                        {variantsCount > 1 && (
                          <span className="bp-variant-indicator">
                            {currentVariant + 1}/{variantsCount}
                          </span>
                        )}
                      </div>
                      <div className="bp-commentary-text">
                        {getCommentaryText}
                      </div>
                      <div className="bp-commentary-actions">
                        <button
                          className="bp-btn bp-btn-rotate"
                          onClick={handleRotateVariant}
                          disabled={variantsCount <= 1}
                        >
                          🔄 Another Take
                        </button>
                        <button className="bp-btn" onClick={handleCopy}>📋 Copy</button>
                      </div>
                    </div>

                    {/* Smart Questions */}
                    {data?.questionTree?.dynamic_questions && (
                      <div className="bp-smart-questions">
                        <div className="bp-questions-header">💡 Ask about #{selectedNft.id}:</div>
                        <div className="bp-questions-list">
                          {data.questionTree.dynamic_questions
                            .filter(q => !q.requires_context || selectedNft)
                            .map(q => (
                              <button
                                key={q.id}
                                className="bp-question-btn"
                                onClick={() => handleQuestionSelect(q)}
                              >
                                {q.question} →
                              </button>
                            ))}
                        </div>
                      </div>
                    )}

                    {/* Quick Stats */}
                    {analysis && (
                      <>
                        <div className="bp-quick-stats">
                          <div className="bp-stat-box">
                            <div className="bp-stat-number">#{safeGet(analysis, 'rank', '?')}</div>
                            <div className="bp-stat-label">Overall</div>
                          </div>
                          <div className="bp-stat-box">
                            <div className="bp-stat-number">#{safeGet(analysis, 'base_rank', '?')}</div>
                            <div className="bp-stat-label">In {safeGet(analysis, 'base', 'Unknown')}</div>
                          </div>
                          <div className="bp-stat-box">
                            <div className="bp-stat-number">{safeGet(analysis, 's_tier_count', 0)}</div>
                            <div className="bp-stat-label">High Provenance</div>
                          </div>
                          <div className="bp-stat-box">
                            <div className="bp-stat-number">{safeGet(analysis, 'unique_count', 0)}</div>
                            <div className="bp-stat-label">1-of-1</div>
                          </div>
                        </div>

                        {/* Highlight */}
                        <div className="bp-highlight-card">
                          <div className="bp-highlight-label">✨ Highlight</div>
                          <div className="bp-highlight-text">{safeGet(analysis, 'highlight', 'No highlight available')}</div>
                        </div>
                      </>
                    )}

                    <button className="bp-explore-btn" onClick={() => setMode('explore')}>
                      📚 Explore the collection →
                    </button>
                  </>
                )}
              </div>
            )}

            {/* Explore Mode */}
            {mode === 'explore' && !currentView && (
              <div className="bp-explore-mode">
                {data?.questionTree?.categories && (
                  <div className="bp-categories">
                    {data.questionTree.categories
                      .filter(cat => !cat.requires_context || selectedNft)
                      .map(cat => {
                        // For traits category, show two stars; for others, duplicate the icon
                        const iconDisplay = cat.id === 'traits' ? '⭐⭐' : (cat.icon || '📁').repeat(2)
                        
                        // Split labels for better layout in single row
                        let firstRowLabel = ''
                        let secondRowLabel = ''
                        
                        if (cat.id === 'traits') {
                          firstRowLabel = 'High'
                          secondRowLabel = 'Provenance Traits'
                        } else if (cat.id === 'top_nfts') {
                          firstRowLabel = 'Top'
                          secondRowLabel = 'NFTs'
                        } else if (cat.id === 'stats') {
                          firstRowLabel = 'Collection'
                          secondRowLabel = 'Stats'
                        } else {
                          // For single-word labels, keep on second row only
                          firstRowLabel = ''
                          secondRowLabel = cat.name
                        }
                        
                        return (
                          <button
                            key={cat.id}
                            className={`bp-category-btn ${selectedCategory === cat.id ? 'active' : ''}`}
                            onClick={() => setSelectedCategory(cat.id)}
                          >
                            <div className="bp-category-icon-row">
                              <span className="bp-category-icon">{iconDisplay}</span>
                              {firstRowLabel && <span className="bp-category-label-inline">{firstRowLabel}</span>}
                            </div>
                            {secondRowLabel && (
                              <div className="bp-category-label">{secondRowLabel}</div>
                            )}
                          </button>
                        )
                      })}
                  </div>
                )}

                {selectedCategory && data?.questionTree && (
                  <div className="bp-question-list">
                    {data.questionTree.dynamic_questions
                      ?.filter(q => q.category === selectedCategory)
                      .map(q => (
                        <button
                          key={q.id}
                          className="bp-question-btn"
                          onClick={() => handleQuestionSelect(q)}
                          disabled={q.requires_context && !selectedNft}
                        >
                          {q.question}
                          {q.requires_context && !selectedNft && <span className="bp-requires"> (select NFT)</span>}
                          <span className="bp-question-arrow"> →</span>
                        </button>
                      ))}
                    {data.questionTree.static_questions
                      ?.filter(q => q.category === selectedCategory)
                      .map(q => (
                        <button
                          key={q.id}
                          className="bp-question-btn"
                          onClick={() => handleQuestionSelect(q)}
                        >
                          {q.question}
                          <span className="bp-question-arrow"> →</span>
                        </button>
                      ))}
                  </div>
                )}
              </div>
            )}

            {/* Answer View */}
            {currentView && (
              <div className="bp-answer-view">
                <button className="bp-back-btn" onClick={handleBack}>← Back</button>
                
                {currentView.type === 'static_answer' && (
                  <div className="bp-static-answer">
                    <h3 className="bp-answer-title">{currentView.question.question}</h3>
                    {currentView.question.id === 'traits_that_almost_never_pair' && currentView.question.base_to_nft_ids ? (
                      // Special rendering for traits_that_almost_never_pair: group by base
                      (() => {
                        const { header, sections } = parseAnswerByBase(currentView.question.answer || '')
                        return (
                          <div className="bp-answer-content-wrapper">
                            <div className="bp-trait-legend">
                              <div className="bp-legend-title">Legend:</div>
                              {Object.entries(TRAIT_CATEGORY_COLORS).map(([category, color]) => (
                                <div key={category} className="bp-legend-item">
                                  <span className="bp-legend-color-swatch" style={{ backgroundColor: color }}></span>
                                  <span>{category}</span>
                                </div>
                              ))}
                            </div>
                            <div className="bp-answer-content">
                              {header && <p>{header}</p>}
                            {sections.map((section, sectionIdx) => (
                              <div key={sectionIdx} className="bp-base-section">
                                <div className="bp-base-section-content">
                                  <div className="bp-base-section-left">
                                    <h4 className="bp-base-header">{section.base}:</h4>
                                    <div className="bp-bullets">
                                      {section.bullets.map((bullet, i) => {
                                        // Remove the bullet point marker (•) for rendering
                                        const bulletText = bullet.startsWith('• ') ? bullet.substring(2) : bullet
                                        const coloredParts = renderColoredBullet(bulletText, handleNftClick)
                                        return (
                                          <p key={i}>
                                            {coloredParts}
                                          </p>
                                        )
                                      })}
                                    </div>
                                  </div>
                                  {currentView.question.base_to_nft_ids[section.base] && (
                                    <div className="bp-nft-links-inline">
                                      {currentView.question.base_to_nft_ids[section.base].map(id => {
                                        const imageUrl = getNftImageUrl(id)
                                        return (
                                          <button
                                            key={id}
                                            className="bp-nft-link"
                                            onClick={() => handleNftClick(id)}
                                          >
                                            <div className="bp-nft-link-content">
                                              {imageUrl && (
                                                <img
                                                  src={imageUrl}
                                                  alt={`NFT #${id}`}
                                                  className="bp-nft-link-image"
                                                />
                                              )}
                                              <span className="bp-nft-link-text">#{id}</span>
                                            </div>
                                          </button>
                                        )
                                      })}
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))}
                            </div>
                          </div>
                        )
                      })()
                    ) : (
                      // Standard rendering for other static questions
                      <>
                        <div className="bp-answer-content">
                          {(currentView.question.answer || '').split('\n').map((line, i) => (
                            <p key={i}>{line}</p>
                          ))}
                        </div>
                        {(() => {
                          const previewIds = normalizeNftIds(currentView.question.nft_ids, 10)
                          if (previewIds.length === 0) return null
                          return (
                            <div className="bp-nft-links">
                              {previewIds.map(id => {
                                const imageUrl = getNftImageUrl(id)
                                return (
                                  <button
                                    key={id}
                                    className="bp-nft-link"
                                    onClick={() => handleNftClick(id)}
                                  >
                                    <div className="bp-nft-link-content">
                                      {imageUrl && (
                                        <img
                                          src={imageUrl}
                                          alt={`NFT #${id}`}
                                          className="bp-nft-link-image"
                                        />
                                      )}
                                      <span className="bp-nft-link-text">#{id}</span>
                                    </div>
                                  </button>
                                )
                              })}
                            </div>
                          )
                        })()}
                      </>
                    )}
                  </div>
                )}

                {currentView.type === 'dynamic_answer' && (
                  <DynamicAnswer question={currentView.question} analysis={currentView.analysis} onNftClick={handleNftClick} />
                )}
              </div>
            )}
          </div>
        </div>
    </Window>
  )
}

// ============================================
// DYNAMIC ANSWER COMPONENTS
// ============================================
const DynamicAnswer = ({ question, analysis, onNftClick }) => {
  const renderContent = () => {
    if (!analysis) return <p>Analysis not available</p>
    
    switch (question.answer_logic) {
      case 'full_analysis':
        return <FullAnalysis analysis={analysis} />
      case 'rarest_feature':
        return <RarestFeature analysis={analysis} />
      case 'base_comparison':
        return <BaseComparison analysis={analysis} />
      case 'provenance_analysis':
        return <ProvenanceAnalysis analysis={analysis} />
      case 'flex_line':
        return <div className="bp-flex-line">{safeGet(analysis, 'story_hook', safeGet(analysis, 'highlight', ''))}</div>
      case 'hidden_gem':
        return <HiddenGem analysis={analysis} />
      default:
        return <p>{safeGet(analysis, 'highlight', 'No analysis available')}</p>
    }
  }

  return (
    <div className="bp-dynamic-answer">
      <h3 className="bp-answer-title">{question.question}</h3>
      <div className="bp-answer-content">
        {renderContent()}
      </div>
    </div>
  )
}

const FullAnalysis = ({ analysis }) => (
  <div className="bp-full-analysis">
    <div className="bp-card">
      <div className="bp-card-header">🏆 Rank</div>
      <div className="bp-card-content">
        <div className="bp-stat-row">
          <span>Overall</span>
          <strong>#{safeGet(analysis, 'rank', '?')}</strong>
        </div>
        <div className="bp-stat-row">
          <span>Percentile</span>
          <strong>Top {safeGet(analysis, 'percentile', '?')}%</strong>
        </div>
        <div className="bp-stat-row">
          <span>In {safeGet(analysis, 'base', 'Unknown')}</span>
          <strong>#{safeGet(analysis, 'base_rank', '?')} of {safeGet(analysis, 'base_total', '?')}</strong>
        </div>
      </div>
    </div>
    
    {analysis?.s_tier_traits?.length > 0 && (
      <div className="bp-card">
        <div className="bp-card-header">⭐ High Provenance Traits</div>
        <div className="bp-card-content">
          {analysis.s_tier_traits.map(t => (
            <div key={t.trait} className="bp-trait-row">
              {safeGet(t, 'trait', 'Unknown')} ({safeGet(t, 'count', '?')})
            </div>
          ))}
        </div>
      </div>
    )}
    
    {analysis?.named_combos?.length > 0 && (
      <div className="bp-card">
        <div className="bp-card-header">🔥 Named Combos</div>
        <div className="bp-card-content">
          {analysis.named_combos.map(c => (
            <div key={c.name} className="bp-combo-row">
              {safeGet(c, 'name', 'Unknown')}
            </div>
          ))}
        </div>
      </div>
    )}
    
    {analysis?.unique_pairings?.length > 0 && (
      <div className="bp-card">
        <div className="bp-card-header">💎 1-of-1 Pairings</div>
        <div className="bp-card-content">
          {analysis.unique_pairings.map((p, i) => (
            <div key={i} className="bp-unique-row">
              {Array.isArray(p) ? p[0] : safeGet(p, 'traits.0', '')} + {Array.isArray(p) ? p[1] : safeGet(p, 'traits.1', '')}
              <span className="bp-badge">Only one</span>
            </div>
          ))}
        </div>
      </div>
    )}
  </div>
)

const RarestFeature = ({ analysis }) => {
  if (analysis?.unique_pairings?.length > 0) {
    const p = analysis.unique_pairings[0]
    const trait1 = Array.isArray(p) ? p[0] : safeGet(p, 'traits.0', 'Unknown')
    const trait2 = Array.isArray(p) ? p[1] : safeGet(p, 'traits.1', 'Unknown')
    return (
      <div className="bp-rarest">
        <div className="bp-rarest-badge">💎 1-of-1</div>
        <p><strong>{trait1}</strong> + <strong>{trait2}</strong> exists on exactly ONE NFT out of 4,200.</p>
        <p className="bp-note">This isn't just rare—it's unique.</p>
      </div>
    )
  }
  if (analysis?.rare_pairings?.length > 0) {
    const p = analysis.rare_pairings[0]
    return (
      <div className="bp-rarest">
        <div className="bp-rarest-badge">💜 Rare</div>
        <p>
          <strong>{safeGet(p, 'traits.0', 'Unknown')}</strong> + <strong>{safeGet(p, 'traits.1', 'Unknown')}</strong>
          {' '}exists on only {safeGet(p, 'count', '?')} NFTs.
        </p>
      </div>
    )
  }
  return (
    <p>
      Rarest aspect: #{safeGet(analysis, 'base_rank', '?')} among {safeGet(analysis, 'base_total', '?')}{' '}
      {safeGet(analysis, 'base', 'Unknown')}s.
    </p>
  )
}

const BaseComparison = ({ analysis }) => (
  <div className="bp-comparison">
    <table className="bp-comparison-table">
      <thead>
        <tr>
          <th>Metric</th>
          <th>This NFT</th>
          <th>Average</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>Base Rank</td>
          <td><strong>#{safeGet(analysis, 'base_rank', '?')}</strong></td>
          <td>#{Math.round(safeGet(analysis, 'base_total', 0) / 2)}</td>
        </tr>
        <tr>
          <td>Overall</td>
          <td><strong>#{safeGet(analysis, 'rank', '?')}</strong></td>
          <td>~#2100</td>
        </tr>
        <tr>
          <td>High Provenance</td>
          <td><strong>{safeGet(analysis, 's_tier_count', 0)}</strong></td>
          <td>~1</td>
        </tr>
        <tr>
          <td>1-of-1</td>
          <td><strong>{safeGet(analysis, 'unique_count', 0)}</strong></td>
          <td>~0.3</td>
        </tr>
      </tbody>
    </table>
    {safeGet(analysis, 'base_rank', 999) === 1 && (
      <p className="bp-note success">🏆 THE best {safeGet(analysis, 'base', 'Unknown')}!</p>
    )}
  </div>
)

const ProvenanceAnalysis = ({ analysis }) => (
  <div className="bp-provenance">
    {analysis?.s_tier_traits?.length > 0 && (
      <div className="bp-section">
        <h4>⭐ High Provenance Traits</h4>
        <p>
          {safeGet(analysis, 's_tier_count', 0)} High Provenance:{' '}
          {analysis.s_tier_traits.map(t => safeGet(t, 'trait', 'Unknown')).join(', ')}
        </p>
      </div>
    )}
    {analysis?.named_combos?.length > 0 && (
      <div className="bp-section">
        <h4>🔥 Named Combo</h4>
        <p>
          Carries the <strong>{safeGet(analysis.named_combos[0], 'name', 'Unknown')}</strong> combo.
        </p>
      </div>
    )}
    {safeGet(analysis, 'is_heritage_base', false) && (
      <div className="bp-section">
        <h4>🏛️ Heritage</h4>
        <p><strong>{safeGet(analysis, 'base', 'Unknown')}</strong> is an OG heritage base.</p>
      </div>
    )}
  </div>
)

const HiddenGem = ({ analysis }) => {
  const gems = []
  const uniqueCount = safeGet(analysis, 'unique_count', 0)
  const sTierCount = safeGet(analysis, 's_tier_count', 0)
  const rank = safeGet(analysis, 'rank', 9999)
  const base = safeGet(analysis, 'base', '')
  const isHeritage = safeGet(analysis, 'is_heritage_base', false)
  
  if (uniqueCount > 0) {
    gems.push({
      icon: '💎',
      text: `${uniqueCount} unique pairing(s) that exist nowhere else.`
    })
  }
  if (sTierCount >= 2 && rank > 420) {
    gems.push({
      icon: '⭐',
      text: `${sTierCount} High Provenance traits but ranked #${rank}. Provenance > rank.`
    })
  }
  if (isHeritage && rank > 500) {
    gems.push({
      icon: '🏛️',
      text: `${base} carries OG heritage weight.`
    })
  }
  
  if (gems.length === 0) {
    return <p>This NFT's value is straightforward: {safeGet(analysis, 'highlight', 'No special highlights')}</p>
  }
  
  return (
    <div className="bp-gems">
      {gems.map((g, i) => (
        <div key={i} className="bp-gem">
          {g.icon} {g.text}
        </div>
      ))}
    </div>
  )
}

