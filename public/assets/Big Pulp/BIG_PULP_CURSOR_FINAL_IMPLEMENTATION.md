# Big Pulp Intelligence System - Complete Cursor Implementation

## Quick Start

Copy these 5 data files to `/public/assets/BigPulp/`:
1. `all_nft_analysis.json` - Analysis for ALL 4,200 NFTs
2. `all_nft_sentences.json` - Big Pulp commentary for ALL 4,200 NFTs  
3. `question_tree_v2.json` - Dynamic + static questions
4. `trait_insights.json` - S-tier trait data
5. `combo_database.json` - Named combos + rare pairings

Then implement the component below.

---

## What This Delivers

| Metric | Coverage |
|--------|----------|
| NFTs with analysis | 4,200 / 4,200 (100%) |
| NFTs with personalized sentence | 4,200 / 4,200 (100%) |
| NFTs with 1-of-1 combos identified | 1,299 (31%) |
| NFTs with S-tier traits identified | 3,552 (85%) |
| NFTs with named combos | 600 (14%) |

**Every single NFT now has something specific and personalized.**

---

## Data Structure Examples

### `all_nft_analysis.json`
```json
{
  "41": {
    "rank": 59,
    "percentile": 1.4,
    "tier": "elite",
    "tier_label": "Top 100",
    "base": "Wojak",
    "base_rank": 1,
    "base_total": 1996,
    "is_heritage_base": false,
    "s_tier_traits": [
      {"trait": "Straitjacket", "category": "Clothes", "count": 86}
    ],
    "s_tier_count": 4,
    "named_combos": [{"name": "Asylum Patient", "lore": "..."}],
    "rare_pairings": [{"traits": ["Crazy Room", "Wizard Glasses"], "count": 1}],
    "unique_pairings": [["Crazy Room", "Wizard Glasses"]],
    "unique_count": 1,
    "highlight": "Only NFT with Crazy Room + Wizard Glasses",
    "story_hook": "Top 100. Crazy Room + Wizard Glasses exists once in 4,200."
  },
  "2500": {
    "rank": 1947,
    "percentile": 46.36,
    "tier": "uncommon",
    "tier_label": "Top 50%",
    "base": "Soyjak",
    "base_rank": 298,
    "base_total": 750,
    "s_tier_count": 1,
    "named_combos": [],
    "rare_pairings": [{"traits": ["Everythings Fine", "Sports Jacket"], "count": 2}],
    "unique_pairings": [],
    "unique_count": 0,
    "highlight": "One of 2 with Everythings Fine + Sports Jacket",
    "story_hook": "Upper half at #1947. One of 2 with Everythings Fine + Sports Jacket."
  }
}
```

### `all_nft_sentences.json`
```json
{
  "41": {
    "variants": [
      "Take a look. Rank #59. Better than 97%. Top Wojak...",
      "Assessment. #59. Better than 97%. Best Wojak of 1996...",
      "Some pieces carry weight. Rank #59..."
    ]
  },
  "2500": {
    "variants": [
      "There's more here. Rank #1947. One of 2 with Everythings Fine + Sports Jacket. 🍊"
    ],
    "generated": true
  }
}
```

---

## Component Implementation

### Main Component: `BigPulpIntelligenceWindow.jsx`

```jsx
import React, { useState, useEffect, useCallback } from 'react';
import { useWindow } from '../../context/WindowContext';
import './BigPulpIntelligenceWindow.css';

// Module-level cache (persists across unmounts)
const DataCache = {
  analysis: null,
  sentences: null,
  questionTree: null,
  traitInsights: null,
  comboDatabase: null,
  loaded: false,
  loading: false,
  error: null
};

const loadAllData = async () => {
  if (DataCache.loaded) return DataCache;
  if (DataCache.loading) {
    return new Promise((resolve) => {
      const check = setInterval(() => {
        if (DataCache.loaded || DataCache.error) {
          clearInterval(check);
          resolve(DataCache);
        }
      }, 100);
    });
  }
  
  DataCache.loading = true;
  
  try {
    const [analysis, sentences, questionTree, traitInsights, comboDatabase] = await Promise.all([
      fetch('/assets/BigPulp/all_nft_analysis.json').then(r => r.ok ? r.json() : Promise.reject('Analysis failed')),
      fetch('/assets/BigPulp/all_nft_sentences.json').then(r => r.ok ? r.json() : Promise.reject('Sentences failed')),
      fetch('/assets/BigPulp/question_tree_v2.json').then(r => r.ok ? r.json() : Promise.reject('Questions failed')),
      fetch('/assets/BigPulp/trait_insights.json').then(r => r.ok ? r.json() : Promise.reject('Traits failed')),
      fetch('/assets/BigPulp/combo_database.json').then(r => r.ok ? r.json() : Promise.reject('Combos failed'))
    ]);
    
    DataCache.analysis = analysis;
    DataCache.sentences = sentences;
    DataCache.questionTree = questionTree;
    DataCache.traitInsights = traitInsights;
    DataCache.comboDatabase = comboDatabase;
    DataCache.loaded = true;
  } catch (err) {
    DataCache.error = err;
    console.error('Big Pulp data load failed:', err);
  }
  
  DataCache.loading = false;
  return DataCache;
};

const BigPulpIntelligenceWindow = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [mode, setMode] = useState('welcome');
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [currentView, setCurrentView] = useState(null);
  const [viewHistory, setViewHistory] = useState([]);
  
  const [selectedNft, setSelectedNft] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [currentVariant, setCurrentVariant] = useState(0);
  const [lastVariant, setLastVariant] = useState(-1);
  
  const { bringToFront, restoreWindow, isWindowMinimized, getWindow } = useWindow();

  // Load data on mount
  useEffect(() => {
    const init = async () => {
      const result = await loadAllData();
      if (result.error) {
        setError(result.error);
      } else {
        setData(result);
      }
      setLoading(false);
    };
    init();
  }, []);

  // Listen for NFT selection from Rarity Explorer
  useEffect(() => {
    const handleNftSelected = (event) => {
      const { nftId } = event.detail;
      if (!data?.analysis) return;
      
      const nftAnalysis = data.analysis[String(nftId)];
      if (nftAnalysis) {
        setSelectedNft({ id: String(nftId), ...nftAnalysis });
        setAnalysis(nftAnalysis);
        setMode('context');
        setCurrentView(null);
        setCurrentVariant(0);
        setLastVariant(-1);
      }
    };
    
    window.addEventListener('nftSelected', handleNftSelected);
    return () => window.removeEventListener('nftSelected', handleNftSelected);
  }, [data]);

  // Navigate to NFT in Rarity Explorer
  const handleNftClick = useCallback((nftId) => {
    const rarityExplorer = getWindow('rarity-explorer');
    if (rarityExplorer) {
      if (isWindowMinimized('rarity-explorer')) restoreWindow('rarity-explorer');
      bringToFront('rarity-explorer');
      window.dispatchEvent(new CustomEvent('navigateToNft', { detail: { nftId: String(nftId) } }));
    } else {
      navigator.clipboard.writeText(String(nftId));
    }
  }, [getWindow, isWindowMinimized, restoreWindow, bringToFront]);

  // Rotate commentary variant
  const handleRotateVariant = useCallback(() => {
    if (!selectedNft || !data?.sentences) return;
    const sentences = data.sentences[selectedNft.id];
    if (!sentences?.variants || sentences.variants.length <= 1) return;
    
    let newVariant;
    do {
      newVariant = Math.floor(Math.random() * sentences.variants.length);
    } while (newVariant === lastVariant && sentences.variants.length > 1);
    
    setLastVariant(currentVariant);
    setCurrentVariant(newVariant);
  }, [selectedNft, data, currentVariant, lastVariant]);

  // Copy commentary
  const handleCopy = useCallback(() => {
    if (!selectedNft || !data?.sentences) return;
    const sentences = data.sentences[selectedNft.id];
    if (sentences?.variants?.[currentVariant]) {
      navigator.clipboard.writeText(sentences.variants[currentVariant]);
    }
  }, [selectedNft, data, currentVariant]);

  // Handle question selection
  const handleQuestionSelect = useCallback((question) => {
    if (question.type === 'dynamic' && selectedNft) {
      setCurrentView({ type: 'dynamic_answer', question, analysis });
    } else if (question.type === 'static') {
      setCurrentView({ type: 'static_answer', question });
    }
    setViewHistory(prev => [...prev, currentView]);
  }, [selectedNft, analysis, currentView]);

  // Navigate back
  const handleBack = useCallback(() => {
    if (viewHistory.length > 0) {
      const prev = viewHistory[viewHistory.length - 1];
      setViewHistory(h => h.slice(0, -1));
      setCurrentView(prev);
    } else {
      setCurrentView(null);
    }
  }, [viewHistory]);

  // Clear NFT selection
  const handleClearSelection = () => {
    setSelectedNft(null);
    setAnalysis(null);
    setMode('explore');
    setCurrentView(null);
  };

  if (loading) {
    return (
      <div className="bp-intelligence-window">
        <div className="bp-loading">
          <div className="bp-loading-spinner"></div>
          <div className="bp-loading-text">Loading Big Pulp Intelligence...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bp-intelligence-window">
        <div className="bp-error">
          <div className="bp-error-title">Failed to load Big Pulp data</div>
          <div className="bp-error-message">{String(error)}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="bp-intelligence-window">
      {/* Context Bar */}
      {selectedNft && (
        <div className="bp-context-bar">
          <div className="bp-context-icon">📍</div>
          <div className="bp-context-info">
            <div className="bp-context-title">Analyzing: NFT #{selectedNft.id}</div>
            <div className="bp-context-subtitle">
              <span className="bp-tier-badge" data-tier={selectedNft.tier}>{selectedNft.tier_label}</span>
              <span>{selectedNft.base}</span>
              <span>Rank #{selectedNft.rank}</span>
            </div>
          </div>
          <button className="bp-context-clear" onClick={handleClearSelection}>×</button>
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
            {/* Commentary Card */}
            <div className="bp-commentary-card">
              <div className="bp-commentary-header">
                <span>🍊</span>
                <span>Big Pulp Says</span>
                {data.sentences[selectedNft.id]?.variants?.length > 1 && (
                  <span className="bp-variant-indicator">
                    {currentVariant + 1}/{data.sentences[selectedNft.id].variants.length}
                  </span>
                )}
              </div>
              <div className="bp-commentary-text">
                {data.sentences[selectedNft.id]?.variants?.[currentVariant] || analysis.story_hook}
              </div>
              <div className="bp-commentary-actions">
                <button 
                  className="bp-btn bp-btn-rotate" 
                  onClick={handleRotateVariant}
                  disabled={!data.sentences[selectedNft.id]?.variants || data.sentences[selectedNft.id].variants.length <= 1}
                >
                  🔄 Another Take
                </button>
                <button className="bp-btn" onClick={handleCopy}>📋 Copy</button>
              </div>
            </div>

            {/* Smart Questions */}
            <div className="bp-smart-questions">
              <div className="bp-questions-header">💡 Ask about #{selectedNft.id}:</div>
              <div className="bp-questions-list">
                {data.questionTree.dynamic_questions.map(q => (
                  <button key={q.id} className="bp-question-btn" onClick={() => handleQuestionSelect(q)}>
                    {q.question} →
                  </button>
                ))}
              </div>
            </div>

            {/* Quick Stats */}
            <div className="bp-quick-stats">
              <div className="bp-stat-box">
                <div className="bp-stat-number">#{analysis.rank}</div>
                <div className="bp-stat-label">Overall</div>
              </div>
              <div className="bp-stat-box">
                <div className="bp-stat-number">#{analysis.base_rank}</div>
                <div className="bp-stat-label">In {analysis.base}</div>
              </div>
              <div className="bp-stat-box">
                <div className="bp-stat-number">{analysis.s_tier_count}</div>
                <div className="bp-stat-label">S-Tier</div>
              </div>
              <div className="bp-stat-box">
                <div className="bp-stat-number">{analysis.unique_count}</div>
                <div className="bp-stat-label">1-of-1</div>
              </div>
            </div>

            {/* Highlight */}
            <div className="bp-highlight-card">
              <div className="bp-highlight-label">✨ Highlight</div>
              <div className="bp-highlight-text">{analysis.highlight}</div>
            </div>

            <button className="bp-explore-btn" onClick={() => setMode('explore')}>
              📚 Explore the collection →
            </button>
          </div>
        )}

        {/* Explore Mode */}
        {mode === 'explore' && !currentView && (
          <div className="bp-explore-mode">
            <div className="bp-categories">
              {data.questionTree.categories
                .filter(cat => !cat.requires_context || selectedNft)
                .map(cat => (
                  <button
                    key={cat.id}
                    className={`bp-category-btn ${selectedCategory === cat.id ? 'active' : ''}`}
                    onClick={() => setSelectedCategory(cat.id)}
                  >
                    {cat.icon} {cat.name}
                  </button>
                ))}
            </div>

            {selectedCategory && (
              <div className="bp-question-list">
                {data.questionTree.dynamic_questions
                  .filter(q => q.category === selectedCategory)
                  .map(q => (
                    <button 
                      key={q.id} 
                      className="bp-question-btn"
                      onClick={() => handleQuestionSelect(q)}
                      disabled={!selectedNft}
                    >
                      {q.question}
                      {!selectedNft && <span className="bp-requires">(select NFT)</span>}
                    </button>
                  ))}
                {data.questionTree.static_questions
                  .filter(q => q.category === selectedCategory)
                  .map(q => (
                    <button key={q.id} className="bp-question-btn" onClick={() => handleQuestionSelect(q)}>
                      {q.question} →
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
                <h3>{currentView.question.question}</h3>
                <div className="bp-answer-content">
                  {currentView.question.answer.split('\n').map((line, i) => (
                    <p key={i}>{line}</p>
                  ))}
                </div>
                {currentView.question.nft_ids && (
                  <div className="bp-nft-links">
                    {currentView.question.nft_ids.map(id => (
                      <button key={id} className="bp-nft-link" onClick={() => handleNftClick(id)}>
                        #{id}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {currentView.type === 'dynamic_answer' && (
              <DynamicAnswer question={currentView.question} analysis={currentView.analysis} />
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// Dynamic Answer Component
const DynamicAnswer = ({ question, analysis }) => {
  const renderContent = () => {
    switch (question.answer_logic) {
      case 'full_analysis':
        return <FullAnalysis analysis={analysis} />;
      case 'rarest_feature':
        return <RarestFeature analysis={analysis} />;
      case 'base_comparison':
        return <BaseComparison analysis={analysis} />;
      case 'provenance_analysis':
        return <ProvenanceAnalysis analysis={analysis} />;
      case 'flex_line':
        return <div className="bp-flex-line">{analysis.story_hook}</div>;
      case 'hidden_gem':
        return <HiddenGem analysis={analysis} />;
      default:
        return <p>{analysis.highlight}</p>;
    }
  };

  return (
    <div className="bp-dynamic-answer">
      <h3>{question.question}</h3>
      {renderContent()}
    </div>
  );
};

const FullAnalysis = ({ analysis }) => (
  <div className="bp-full-analysis">
    <div className="bp-card">
      <div className="bp-card-header">🏆 Rank</div>
      <div className="bp-card-content">
        <div className="bp-stat-row"><span>Overall</span><strong>#{analysis.rank}</strong></div>
        <div className="bp-stat-row"><span>Percentile</span><strong>Top {analysis.percentile}%</strong></div>
        <div className="bp-stat-row"><span>In {analysis.base}</span><strong>#{analysis.base_rank} of {analysis.base_total}</strong></div>
      </div>
    </div>
    
    {analysis.s_tier_traits?.length > 0 && (
      <div className="bp-card">
        <div className="bp-card-header">⭐ S-Tier Traits</div>
        <div className="bp-card-content">
          {analysis.s_tier_traits.map(t => (
            <div key={t.trait} className="bp-trait-row">{t.trait} ({t.count})</div>
          ))}
        </div>
      </div>
    )}
    
    {analysis.named_combos?.length > 0 && (
      <div className="bp-card">
        <div className="bp-card-header">🔥 Named Combos</div>
        <div className="bp-card-content">
          {analysis.named_combos.map(c => (
            <div key={c.name} className="bp-combo-row">{c.name}</div>
          ))}
        </div>
      </div>
    )}
    
    {analysis.unique_pairings?.length > 0 && (
      <div className="bp-card">
        <div className="bp-card-header">💎 1-of-1 Pairings</div>
        <div className="bp-card-content">
          {analysis.unique_pairings.map((p, i) => (
            <div key={i} className="bp-unique-row">{p[0]} + {p[1]} <span className="bp-badge">Only one</span></div>
          ))}
        </div>
      </div>
    )}
  </div>
);

const RarestFeature = ({ analysis }) => {
  if (analysis.unique_pairings?.length > 0) {
    const p = analysis.unique_pairings[0];
    return (
      <div className="bp-rarest">
        <div className="bp-rarest-badge">💎 1-of-1</div>
        <p><strong>{p[0]}</strong> + <strong>{p[1]}</strong> exists on exactly ONE NFT out of 4,200.</p>
        <p className="bp-note">This isn't just rare—it's unique.</p>
      </div>
    );
  }
  if (analysis.rare_pairings?.length > 0) {
    const p = analysis.rare_pairings[0];
    return (
      <div className="bp-rarest">
        <div className="bp-rarest-badge">💜 Rare</div>
        <p><strong>{p.traits[0]}</strong> + <strong>{p.traits[1]}</strong> exists on only {p.count} NFTs.</p>
      </div>
    );
  }
  return <p>Rarest aspect: #{analysis.base_rank} among {analysis.base_total} {analysis.base}s.</p>;
};

const BaseComparison = ({ analysis }) => (
  <div className="bp-comparison">
    <table>
      <thead><tr><th>Metric</th><th>This NFT</th><th>Average</th></tr></thead>
      <tbody>
        <tr><td>Base Rank</td><td><strong>#{analysis.base_rank}</strong></td><td>#{Math.round(analysis.base_total / 2)}</td></tr>
        <tr><td>Overall</td><td><strong>#{analysis.rank}</strong></td><td>~#2100</td></tr>
        <tr><td>S-Tier</td><td><strong>{analysis.s_tier_count}</strong></td><td>~1</td></tr>
        <tr><td>1-of-1</td><td><strong>{analysis.unique_count}</strong></td><td>~0.3</td></tr>
      </tbody>
    </table>
    {analysis.base_rank === 1 && <p className="bp-note success">🏆 THE best {analysis.base}!</p>}
  </div>
);

const ProvenanceAnalysis = ({ analysis }) => (
  <div className="bp-provenance">
    {analysis.s_tier_traits?.length > 0 && (
      <div className="bp-section">
        <h4>⭐ S-Tier Traits</h4>
        <p>{analysis.s_tier_count} S-tier: {analysis.s_tier_traits.map(t => t.trait).join(', ')}</p>
      </div>
    )}
    {analysis.named_combos?.length > 0 && (
      <div className="bp-section">
        <h4>🔥 Named Combo</h4>
        <p>Carries the <strong>{analysis.named_combos[0].name}</strong> combo.</p>
      </div>
    )}
    {analysis.is_heritage_base && (
      <div className="bp-section">
        <h4>🏛️ Heritage</h4>
        <p><strong>{analysis.base}</strong> is an OG heritage base.</p>
      </div>
    )}
  </div>
);

const HiddenGem = ({ analysis }) => {
  const gems = [];
  
  if (analysis.unique_count > 0) {
    gems.push({ icon: '💎', text: `${analysis.unique_count} unique pairing(s) that exist nowhere else.` });
  }
  if (analysis.s_tier_count >= 2 && analysis.rank > 420) {
    gems.push({ icon: '⭐', text: `${analysis.s_tier_count} S-tier traits but ranked #${analysis.rank}. Provenance > rank.` });
  }
  if (analysis.is_heritage_base && analysis.rank > 500) {
    gems.push({ icon: '🏛️', text: `${analysis.base} carries OG heritage weight.` });
  }
  
  if (gems.length === 0) {
    return <p>This NFT's value is straightforward: {analysis.highlight}</p>;
  }
  
  return (
    <div className="bp-gems">
      {gems.map((g, i) => <div key={i} className="bp-gem">{g.icon} {g.text}</div>)}
    </div>
  );
};

export default BigPulpIntelligenceWindow;
```

---

## Event Integration

In `WojakRarityExplorer.jsx`, add:

```jsx
// Emit NFT selection for Big Pulp
useEffect(() => {
  if (!selectedNftId) return;
  window.dispatchEvent(new CustomEvent('nftSelected', {
    detail: { nftId: String(selectedNftId) }
  }));
}, [selectedNftId]);
```

---

## Files Summary

| File | Location | Purpose |
|------|----------|---------|
| `all_nft_analysis.json` | `/public/assets/BigPulp/` | Pre-computed analysis for ALL 4,200 |
| `all_nft_sentences.json` | `/public/assets/BigPulp/` | Big Pulp sentences for ALL 4,200 |
| `question_tree_v2.json` | `/public/assets/BigPulp/` | 6 dynamic + 24 static questions |
| `trait_insights.json` | `/public/assets/BigPulp/` | S-tier trait deep-dive data |
| `combo_database.json` | `/public/assets/BigPulp/` | Named combos + rare pairings |

---

## Value Delivered

✅ **100% Coverage** - Every NFT from #1 to #4200 has personalized analysis
✅ **1,299 NFTs** with 1-of-1 combos identified (hidden gems found!)
✅ **3,552 NFTs** with S-tier traits highlighted
✅ **Context-Aware** - Questions adapt to what you're viewing
✅ **Big Pulp Personality** - Every response feels personal
✅ **Actionable** - Click any NFT ID to navigate

No user gets generic responses. Everyone gets value.
