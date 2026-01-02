import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import Window from './Window'
import { useToast } from '../../contexts/ToastContext'
import { playSound } from '../../utils/soundManager'
import { useWindow } from '../../contexts/WindowContext'
import { ensureOrangeAudioUnlocked, playOrangeClickSound } from '../../utils/orangeSound'
import './BigPulpQuestionTreeWindow.css'

// Big Pulp character images
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

export default function BigPulpQuestionTreeWindow({ onClose }) {
  const [questionTreeData, setQuestionTreeData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedCategory, setSelectedCategory] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [conversation, setConversation] = useState([]) // Array of { type: 'user'|'pulp', content, question, timestamp }
  const [isTyping, setIsTyping] = useState(false)
  const [currentBigPulpImage, setCurrentBigPulpImage] = useState(BIG_PULP_IMAGES[0])
  const { showToast } = useToast()
  const { getWindow } = useWindow()
  
  const searchInputRef = useRef(null)
  const conversationEndRef = useRef(null)
  const typingTimeoutRef = useRef(null)

  // Add welcome message on load
  const addWelcomeMessage = useCallback(() => {
    const welcomeMessage = {
      type: 'pulp',
      content: "Hey! I'm Big Pulp. Ask me anything about the collection. Want to know about the best NFTs, legendary combos, or collection stats? I've got the knowledge. 🍊",
      timestamp: Date.now(),
      isWelcome: true
    }
    setConversation([welcomeMessage])
  }, [])

  // Load question tree JSON
  useEffect(() => {
    fetch('/assets/Big%20Pulp/question%20tree/big_pulp_question_tree.json')
      .then(response => {
        if (!response.ok) {
          throw new Error(`Failed to load: ${response.status}`)
        }
        return response.json()
      })
      .then(data => {
        setQuestionTreeData(data)
        setLoading(false)
        if (data.categories && data.categories.length > 0) {
          setSelectedCategory(data.categories[0].id)
        }
      })
      .catch(err => {
        console.error('Failed to load Big Pulp Question Tree:', err)
        setError(err.message)
        setLoading(false)
      })

    playSound('menuPopup')
    
    // Pick random Big Pulp image
    setCurrentBigPulpImage(BIG_PULP_IMAGES[Math.floor(Math.random() * BIG_PULP_IMAGES.length)])

    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current)
      }
    }
  }, [])

  // Add welcome message after data loads
  useEffect(() => {
    if (questionTreeData && conversation.length === 0) {
      addWelcomeMessage()
    }
  }, [questionTreeData, conversation.length, addWelcomeMessage])

  // Scroll to bottom when conversation updates
  useEffect(() => {
    if (conversationEndRef.current) {
      conversationEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [conversation, isTyping])

  // Filter questions by category or search
  const availableQuestions = useMemo(() => {
    if (!questionTreeData?.questions) return []
    
    let questions = questionTreeData.questions
      .filter(q => q.id !== 'traits_that_almost_never_pair') // Exclude this question (replaced by combo explorer)

    if (selectedCategory && !searchQuery.trim()) {
      questions = questions.filter(q => q.category === selectedCategory)
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      questions = questions.filter(q => 
        q.question.toLowerCase().includes(query) ||
        q.short.toLowerCase().includes(query) ||
        q.answer.toLowerCase().includes(query)
      )
    }

    return questions.slice(0, 8) // Show max 8 suggestions at a time
  }, [questionTreeData, selectedCategory, searchQuery])

  // Handle question selection with typing animation
  const handleQuestionSelect = useCallback((question) => {
    // Add user message
    const userMessage = {
      type: 'user',
      content: question.question,
      question: question,
      timestamp: Date.now()
    }
    
    setConversation(prev => [...prev, userMessage])
    setIsTyping(true)
    
    // Play sound
    ensureOrangeAudioUnlocked().then(() => {
      playOrangeClickSound()
    })

    // Simulate typing delay based on answer length
    const typingDelay = Math.min(800, Math.max(400, question.answer.length * 15))
    
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
    }
    
    typingTimeoutRef.current = setTimeout(() => {
      // Add Big Pulp response
      const pulpMessage = {
        type: 'pulp',
        content: question.answer,
        question: question,
        timestamp: Date.now(),
        nftIds: question.nft_ids || []
      }
      
      setConversation(prev => [...prev, pulpMessage])
      setIsTyping(false)
      
      // Randomly change Big Pulp image occasionally (30% chance)
      if (Math.random() < 0.3) {
        const newImage = BIG_PULP_IMAGES[Math.floor(Math.random() * BIG_PULP_IMAGES.length)]
        if (newImage !== currentBigPulpImage) {
          setCurrentBigPulpImage(newImage)
        }
      }
      
      playSound('ding') // Subtle notification sound
    }, typingDelay)
  }, [currentBigPulpImage])

  // Handle NFT ID click
  const handleNftIdClick = useCallback((e, nftId) => {
    e.preventDefault()
    e.stopPropagation()

    const numericId = nftId.replace('#', '').trim()
    const parsedId = parseInt(numericId, 10)

    if (isNaN(parsedId) || parsedId < 1 || parsedId > 4200) {
      showToast('Invalid NFT ID', 'error')
      return
    }

    const rarityExplorerWindow = getWindow('rarity-explorer')
    
    if (rarityExplorerWindow) {
      window.dispatchEvent(new CustomEvent('navigateToNft', { 
        detail: { nftId: String(parsedId) }
      }))
      showToast(`Navigating to NFT #${parsedId}`, 'info', 2000)
    } else {
      navigator.clipboard.writeText(parsedId).then(() => {
        showToast(`NFT ID #${parsedId} copied! Open Rarity Explorer to paste.`, 'info', 3000)
      }).catch(() => {
        showToast(`NFT ID: #${parsedId}`, 'info', 3000)
      })
    }
  }, [showToast, getWindow])

  // Render answer with NFT ID links and formatting
  const renderMessageContent = useCallback((content) => {
    if (!content) return null

    const lines = content.split('\n')
    
    return lines.map((line, lineIndex) => {
      const nftIdPattern = /#(\d+)/g
      const parts = []
      let lastIndex = 0
      let match

      while ((match = nftIdPattern.exec(line)) !== null) {
        if (match.index > lastIndex) {
          parts.push(line.substring(lastIndex, match.index))
        }
        
        const nftId = match[0]
        parts.push(
          <a
            key={`nft-${match.index}-${lineIndex}`}
            href="#"
            onClick={(e) => handleNftIdClick(e, nftId)}
            className="nft-id-link"
            title={`View NFT ${nftId} in Rarity Explorer`}
          >
            {nftId}
          </a>
        )
        
        lastIndex = match.index + match[0].length
      }
      
      if (lastIndex < line.length) {
        parts.push(line.substring(lastIndex))
      }

      return (
        <div key={lineIndex} className={line.trim() ? 'message-line' : 'message-line-empty'}>
          {parts.length > 0 ? parts : line}
        </div>
      )
    })
  }, [handleNftIdClick])

  // Get category info
  const getCategoryInfo = useCallback((categoryId) => {
    return questionTreeData?.categories?.find(c => c.id === categoryId)
  }, [questionTreeData])

  // Handle category selection
  const handleCategorySelect = useCallback((categoryId) => {
    setSelectedCategory(categoryId)
    setSearchQuery('')
    
    // Add category message to conversation
    const category = getCategoryInfo(categoryId)
    if (category) {
      const categoryMessage = {
        type: 'pulp',
        content: `${category.name}\n\n${category.description}\n\nHere are some questions I can answer about this:`,
        timestamp: Date.now(),
        isSystem: true
      }
      setConversation(prev => [...prev, categoryMessage])
      
      // Scroll to bottom
      setTimeout(() => {
        if (conversationEndRef.current) {
          conversationEndRef.current.scrollIntoView({ behavior: 'smooth' })
        }
      }, 100)
    }
  }, [getCategoryInfo])

  return (
    <Window
      id="big-pulp-question-tree"
      title="HANG WITH BIG PULP 🍊"
      style={{
        width: '1000px',
        height: '750px',
        maxWidth: 'calc(100vw - 40px)',
        maxHeight: 'calc(100vh - 80px)',
        minWidth: '800px',
        minHeight: '600px'
      }}
      allowScroll={true}
      onClose={onClose}
    >
      <div className="big-pulp-conversation-container">
        {loading && (
          <div className="conversation-loading">
            <div className="pulp-avatar">
              <img src={`/images/BigPulp/${currentBigPulpImage}`} alt="Big Pulp" />
            </div>
            <div className="loading-text">Loading Big Pulp's knowledge...</div>
          </div>
        )}

        {error && (
          <div className="conversation-error">
            <p>Failed to load: {error}</p>
          </div>
        )}

        {questionTreeData && !loading && !error && (
          <>
            <div className="conversation-layout">
              {/* Left Sidebar - Big Pulp Character & Categories */}
              <div className="pulp-sidebar">
                <div className="pulp-character-container">
                  <img 
                    src={`/images/BigPulp/${currentBigPulpImage}`}
                    alt="Big Pulp"
                    className="pulp-character"
                  />
                </div>
                
                <div className="category-selector">
                  <div className="category-selector-header">Topics</div>
                  <div className="category-list">
                    {questionTreeData.categories.map(category => (
                      <button
                        key={category.id}
                        className={`category-card ${selectedCategory === category.id ? 'active' : ''}`}
                        onClick={() => handleCategorySelect(category.id)}
                        onMouseDown={(e) => e.stopPropagation()}
                        onPointerDown={(e) => e.stopPropagation()}
                        disabled={!!searchQuery.trim()}
                      >
                        <span className="category-icon">{category.icon}</span>
                        <div className="category-card-content">
                          <div className="category-card-name">{category.name}</div>
                          <div className="category-card-description">{category.description}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Main Conversation Area */}
              <div className="conversation-main">
                {/* Search Bar */}
                <div className="conversation-search">
                  <input
                    ref={searchInputRef}
                    type="text"
                    className="search-input"
                    placeholder="Search questions... (Press / to focus)"
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value)
                      if (e.target.value.trim()) {
                        setSelectedCategory(null)
                      }
                    }}
                    onMouseDown={(e) => e.stopPropagation()}
                    onPointerDown={(e) => e.stopPropagation()}
                  />
                  {searchQuery && (
                    <button
                      className="search-clear"
                      onClick={() => {
                        setSearchQuery('')
                        searchInputRef.current?.focus()
                      }}
                      onMouseDown={(e) => e.stopPropagation()}
                      onPointerDown={(e) => e.stopPropagation()}
                    >
                      ✕
                    </button>
                  )}
                </div>

                {/* Conversation Messages */}
                <div className="conversation-messages scroll-allowed">
                  {conversation.map((message, index) => (
                    <div
                      key={index}
                      className={`message message-${message.type} ${message.isWelcome ? 'welcome' : ''} ${message.isSystem ? 'system' : ''}`}
                    >
                      {message.type === 'pulp' && (
                        <div className="message-avatar">
                          <img src={`/images/BigPulp/${currentBigPulpImage}`} alt="Big Pulp" />
                        </div>
                      )}
                      <div className="message-bubble">
                        <div className="message-content">
                          {renderMessageContent(message.content)}
                        </div>
                        <div className="message-time">
                          {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {/* Typing Indicator */}
                  {isTyping && (
                    <div className="message message-pulp typing">
                      <div className="message-avatar">
                        <img src={`/images/BigPulp/${currentBigPulpImage}`} alt="Big Pulp" />
                      </div>
                      <div className="message-bubble typing-bubble">
                        <div className="typing-indicator">
                          <span></span>
                          <span></span>
                          <span></span>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  <div ref={conversationEndRef} />
                </div>

                {/* Question Suggestions */}
                <div className="question-suggestions">
                  <div className="suggestions-header">
                    {searchQuery.trim() 
                      ? `Search Results (${availableQuestions.length})`
                      : selectedCategory 
                        ? 'Suggested Questions'
                        : 'Ask Big Pulp Anything'}
                  </div>
                  <div className="suggestions-grid">
                    {availableQuestions.length === 0 ? (
                      <div className="no-suggestions">
                        {searchQuery.trim() 
                          ? `No questions found for "${searchQuery}"`
                          : 'Select a topic to see questions'}
                      </div>
                    ) : (
                      availableQuestions.map(question => (
                        <button
                          key={question.id}
                          className="question-card"
                          onClick={() => handleQuestionSelect(question)}
                          onMouseDown={(e) => e.stopPropagation()}
                          onPointerDown={(e) => e.stopPropagation()}
                        >
                          <div className="question-card-icon">❓</div>
                          <div className="question-card-text">{question.short}</div>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </Window>
  )
}
