# BigPulp AI Enhancement — Complete Implementation

## Overview

BigPulp is the AI intelligence feature that analyzes the Wojak Farmer Plot NFT collection. This document provides a complete upgrade to make it feel like a premium AI assistant with Matrix-inspired aesthetics.

**Tagline:** "BigPulp sees what you cannot."

**Aesthetic:** Matrix terminal (green for AI responses) + Ghost in the Shell (scanning, data visualization)

---

## Current Issues

1. No streaming indicator when AI is thinking/responding
2. Plain text bubbles instead of structured response cards
3. Quick prompts are static, not contextual
4. Missing Matrix terminal aesthetic
5. Statistics always visible, cluttering the interface

---

## Architecture Changes

### Tab Structure Simplification

**Current:**
```
Market (tab)
  └── Heat Map (sub-tab)
  └── Chart (sub-tab)
Ask BigPulp (tab)
Attributes (tab)
```

**New:**
```
Explore (tab) - Data visualization
  └── Heat Map (default)
  └── Charts (toggle)
  └── Attributes (toggle)
Ask BigPulp (tab) - AI conversation
```

---

## 1. Streaming Response Indicator

### Types

```typescript
// src/types/bigpulp.ts

export type StreamingStage = 'analyzing' | 'searching' | 'generating' | null;

export interface StreamingState {
  isStreaming: boolean;
  currentText: string;
  stage: StreamingStage;
}

export type AIResponseType = 'text' | 'nft-list' | 'stats' | 'chart' | 'suggestion' | 'error';

export interface AIResponse {
  id: string;
  type: AIResponseType;
  content: unknown;
  timestamp: Date;
}

export interface NFTListResponse {
  nfts: Array<{
    id: string;
    name: string;
    image: string;
    price?: number;
    rarity: string;
  }>;
  title?: string;
}

export interface StatsResponse {
  stats: Array<{
    label: string;
    value: string | number;
    change?: number;
    trend?: 'up' | 'down' | 'neutral';
  }>;
}
```

### StreamingIndicator Component

**File:** `src/components/bigpulp/StreamingIndicator.tsx`

```tsx
import { motion } from 'framer-motion';

interface StreamingIndicatorProps {
  stage: 'analyzing' | 'searching' | 'generating' | null;
}

const STAGE_MESSAGES = {
  analyzing: 'Analyzing your question...',
  searching: 'Searching collection data...',
  generating: 'Generating response...',
};

export function StreamingIndicator({ stage }: StreamingIndicatorProps) {
  if (!stage) return null;

  return (
    <motion.div
      className="streaming-indicator"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
    >
      <div className="streaming-dots">
        <span></span>
        <span></span>
        <span></span>
      </div>
      <span className="streaming-text">{STAGE_MESSAGES[stage]}</span>
    </motion.div>
  );
}
```

### CSS for Streaming Indicator

```css
/* Streaming Indicator */
.streaming-indicator {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-3) var(--space-4);
  background: rgba(0, 255, 65, 0.05);
  border: 1px solid rgba(0, 255, 65, 0.2);
  border-radius: var(--radius-md);
  color: var(--matrix-green);
  font-family: var(--font-mono);
  font-size: var(--text-sm);
}

.streaming-dots {
  display: flex;
  gap: 4px;
}

.streaming-dots span {
  width: 6px;
  height: 6px;
  background: var(--matrix-green);
  border-radius: 50%;
  animation: dot-pulse 1.4s ease-in-out infinite;
}

.streaming-dots span:nth-child(2) {
  animation-delay: 0.2s;
}

.streaming-dots span:nth-child(3) {
  animation-delay: 0.4s;
}

@keyframes dot-pulse {
  0%, 80%, 100% {
    transform: scale(0.6);
    opacity: 0.5;
  }
  40% {
    transform: scale(1);
    opacity: 1;
  }
}

.streaming-text {
  letter-spacing: 0.02em;
}
```

---

## 2. AI Response Cards

### AIResponseCard Component

**File:** `src/components/bigpulp/AIResponseCard.tsx`

```tsx
import { motion } from 'framer-motion';
import type { AIResponse, NFTListResponse, StatsResponse } from '@/types/bigpulp';

interface AIResponseCardProps {
  response: AIResponse;
}

export function AIResponseCard({ response }: AIResponseCardProps) {
  return (
    <motion.div
      className="ai-response-card"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
    >
      {renderContent(response)}
    </motion.div>
  );
}

function renderContent(response: AIResponse) {
  switch (response.type) {
    case 'nft-list':
      return <NFTListCard data={response.content as NFTListResponse} />;
    case 'stats':
      return <StatsCard data={response.content as StatsResponse} />;
    case 'suggestion':
      return <SuggestionCard suggestions={response.content as string[]} />;
    case 'error':
      return <ErrorCard message={response.content as string} />;
    default:
      return <TextCard text={response.content as string} />;
  }
}

// Text Card (default)
function TextCard({ text }: { text: string }) {
  return (
    <div className="response-text">
      <div className="response-avatar">
        <span className="avatar-icon">🧠</span>
      </div>
      <div className="response-content">
        <p>{text}</p>
      </div>
    </div>
  );
}

// NFT List Card
function NFTListCard({ data }: { data: NFTListResponse }) {
  return (
    <div className="response-nft-list">
      {data.title && <h4 className="nft-list-title">{data.title}</h4>}
      <div className="nft-mini-grid">
        {data.nfts.slice(0, 6).map(nft => (
          <div key={nft.id} className={`nft-mini-card rarity-${nft.rarity}`}>
            <img src={nft.image} alt={nft.name} loading="lazy" />
            <div className="nft-mini-info">
              <span className="nft-mini-name">{nft.name}</span>
              {nft.price && <span className="nft-mini-price">{nft.price} XCH</span>}
            </div>
          </div>
        ))}
      </div>
      {data.nfts.length > 6 && (
        <button className="btn btn-ghost btn-sm">
          View all {data.nfts.length} results →
        </button>
      )}
    </div>
  );
}

// Stats Card
function StatsCard({ data }: { data: StatsResponse }) {
  return (
    <div className="response-stats">
      <div className="stats-grid">
        {data.stats.map((stat, i) => (
          <div key={i} className="mini-stat">
            <span className="mini-stat-value">{stat.value}</span>
            <span className="mini-stat-label">{stat.label}</span>
            {stat.change !== undefined && (
              <span className={`mini-stat-change ${stat.trend}`}>
                {stat.trend === 'up' ? '↑' : stat.trend === 'down' ? '↓' : '–'}
                {Math.abs(stat.change)}%
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// Suggestion Card
function SuggestionCard({ suggestions }: { suggestions: string[] }) {
  return (
    <div className="response-suggestions">
      <span className="suggestions-label">You might also want to know:</span>
      <div className="suggestion-chips">
        {suggestions.map((suggestion, i) => (
          <button key={i} className="suggestion-chip">
            {suggestion}
          </button>
        ))}
      </div>
    </div>
  );
}

// Error Card
function ErrorCard({ message }: { message: string }) {
  return (
    <div className="response-error">
      <span className="error-icon">⚠️</span>
      <p>{message}</p>
      <button className="btn btn-ghost btn-sm">Try again</button>
    </div>
  );
}
```

### CSS for Response Cards

```css
/* AI Response Cards */
.ai-response-card {
  margin-bottom: var(--space-4);
}

.response-text {
  display: flex;
  gap: var(--space-3);
  padding: var(--space-4);
  background: rgba(0, 255, 65, 0.03);
  border: 1px solid rgba(0, 255, 65, 0.1);
  border-radius: var(--radius-lg);
}

.response-avatar {
  flex-shrink: 0;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: rgba(0, 255, 65, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
}

.response-content {
  flex: 1;
  color: var(--color-text);
  font-size: var(--text-sm);
  line-height: 1.6;
}

/* NFT Mini Grid */
.response-nft-list {
  padding: var(--space-4);
  background: var(--glass-bg);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-lg);
}

.nft-list-title {
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--color-text);
  margin-bottom: var(--space-3);
}

.nft-mini-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--space-2);
  margin-bottom: var(--space-3);
}

@media (max-width: 480px) {
  .nft-mini-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

.nft-mini-card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  overflow: hidden;
  transition: all 0.2s ease;
}

.nft-mini-card:hover {
  border-color: var(--glass-border-active);
  transform: translateY(-2px);
}

.nft-mini-card img {
  width: 100%;
  aspect-ratio: 1;
  object-fit: cover;
}

.nft-mini-info {
  padding: var(--space-2);
}

.nft-mini-name {
  display: block;
  font-size: 0.75rem;
  font-weight: 500;
  color: var(--color-text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.nft-mini-price {
  font-size: 0.6875rem;
  color: var(--color-primary);
  font-weight: 600;
}

/* Stats Grid */
.response-stats {
  padding: var(--space-4);
  background: var(--glass-bg);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-lg);
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
  gap: var(--space-3);
}

.mini-stat {
  text-align: center;
  padding: var(--space-2);
}

.mini-stat-value {
  display: block;
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--color-text);
}

.mini-stat-label {
  display: block;
  font-size: 0.6875rem;
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.mini-stat-change {
  display: inline-block;
  font-size: 0.6875rem;
  font-weight: 600;
  margin-top: 2px;
}

.mini-stat-change.up { color: var(--color-success); }
.mini-stat-change.down { color: var(--color-error); }
.mini-stat-change.neutral { color: var(--color-text-muted); }

/* Suggestions */
.response-suggestions {
  padding: var(--space-3);
  background: var(--glass-bg);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-lg);
}

.suggestions-label {
  display: block;
  font-size: 0.75rem;
  color: var(--color-text-muted);
  margin-bottom: var(--space-2);
}

.suggestion-chips {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
}

.suggestion-chip {
  padding: var(--space-1) var(--space-3);
  background: rgba(0, 255, 65, 0.1);
  border: 1px solid rgba(0, 255, 65, 0.2);
  border-radius: var(--radius-full);
  color: var(--matrix-green);
  font-size: 0.75rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.suggestion-chip:hover {
  background: rgba(0, 255, 65, 0.2);
  border-color: rgba(0, 255, 65, 0.4);
}

/* Error Card */
.response-error {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-4);
  background: rgba(239, 68, 68, 0.05);
  border: 1px solid rgba(239, 68, 68, 0.2);
  border-radius: var(--radius-lg);
  text-align: center;
}

.error-icon {
  font-size: 1.5rem;
}

.response-error p {
  color: var(--color-error);
  font-size: var(--text-sm);
}
```

---

## 3. Contextual Quick Prompts

### useContextualPrompts Hook

**File:** `src/hooks/useContextualPrompts.ts`

```typescript
import { useMemo } from 'react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const PROMPT_SETS = {
  initial: [
    "What's trending today?",
    "Find undervalued NFTs",
    "Show me the floor",
    "Which traits are rarest?",
  ],
  afterNFTView: [
    "Find similar to this",
    "What's this trait worth?",
    "Is this a good deal?",
    "Show price history",
  ],
  afterPriceQuery: [
    "Compare to similar",
    "Show sales history",
    "What affects this price?",
    "Alert me if it drops",
  ],
  afterTraitQuery: [
    "Show NFTs with this trait",
    "What pairs well with this?",
    "Rarest combos with this trait",
    "Price range for this trait",
  ],
  afterMarketQuery: [
    "Who's buying?",
    "Recent big sales",
    "Volume trends",
    "Whale activity",
  ],
};

export function useContextualPrompts(conversationHistory: Message[]): string[] {
  return useMemo(() => {
    if (conversationHistory.length === 0) {
      return PROMPT_SETS.initial;
    }

    const lastUserMessage = [...conversationHistory]
      .reverse()
      .find(m => m.role === 'user');

    if (!lastUserMessage) {
      return PROMPT_SETS.initial;
    }

    const content = lastUserMessage.content.toLowerCase();

    if (content.includes('nft #') || content.includes('wojak #')) {
      return PROMPT_SETS.afterNFTView;
    }

    if (content.includes('price') || content.includes('worth') || content.includes('value')) {
      return PROMPT_SETS.afterPriceQuery;
    }

    if (content.includes('trait') || content.includes('attribute')) {
      return PROMPT_SETS.afterTraitQuery;
    }

    if (content.includes('market') || content.includes('floor') || content.includes('volume')) {
      return PROMPT_SETS.afterMarketQuery;
    }

    return PROMPT_SETS.initial;
  }, [conversationHistory]);
}
```

### QuickPrompts Component

**File:** `src/components/bigpulp/QuickPrompts.tsx`

```tsx
import { motion } from 'framer-motion';

interface QuickPromptsProps {
  prompts: string[];
  onSelect: (prompt: string) => void;
  disabled?: boolean;
}

export function QuickPrompts({ prompts, onSelect, disabled }: QuickPromptsProps) {
  return (
    <div className="quick-prompts">
      <span className="quick-prompts-label">Quick questions:</span>
      <motion.div
        className="prompt-chips"
        initial="hidden"
        animate="visible"
        variants={{
          visible: { transition: { staggerChildren: 0.05 } }
        }}
      >
        {prompts.map((prompt) => (
          <motion.button
            key={prompt}
            className="prompt-chip"
            onClick={() => onSelect(prompt)}
            disabled={disabled}
            variants={{
              hidden: { opacity: 0, scale: 0.8 },
              visible: { opacity: 1, scale: 1 }
            }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            {prompt}
          </motion.button>
        ))}
      </motion.div>
    </div>
  );
}
```

### CSS for Quick Prompts

```css
/* Quick Prompts */
.quick-prompts {
  padding: var(--space-3) var(--space-4);
  border-top: 1px solid var(--glass-border);
}

.quick-prompts-label {
  display: block;
  font-size: 0.6875rem;
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: var(--space-2);
}

.prompt-chips {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
}

.prompt-chip {
  padding: var(--space-2) var(--space-3);
  background: var(--glass-bg);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-full);
  color: var(--color-text-secondary);
  font-size: 0.75rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.prompt-chip:hover:not(:disabled) {
  background: var(--glass-bg-hover);
  border-color: var(--color-primary);
  color: var(--color-primary);
}

.prompt-chip:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
```

---

## 4. Matrix Terminal Aesthetic

### BigPulp Container Styles

```css
/* BigPulp Matrix Theme */
.bigpulp-container {
  position: relative;
  background: var(--color-bg);
}

/* Subtle scanline effect */
.bigpulp-container::before {
  content: '';
  position: absolute;
  inset: 0;
  background: repeating-linear-gradient(
    0deg,
    rgba(0, 255, 65, 0.02) 0px,
    rgba(0, 255, 65, 0.02) 1px,
    transparent 1px,
    transparent 3px
  );
  pointer-events: none;
  opacity: 0.5;
  z-index: 1;
}

/* Chat area */
.bigpulp-chat {
  position: relative;
  z-index: 2;
}

/* Input with Matrix styling */
.bigpulp-input-wrapper {
  position: relative;
  padding: var(--space-4);
  background: rgba(0, 0, 0, 0.3);
  border-top: 1px solid rgba(0, 255, 65, 0.1);
}

.bigpulp-input {
  width: 100%;
  padding: var(--space-3) var(--space-4);
  background: rgba(0, 255, 65, 0.03);
  border: 1px solid rgba(0, 255, 65, 0.2);
  border-radius: var(--radius-md);
  color: var(--matrix-green);
  font-family: var(--font-mono);
  font-size: var(--text-sm);
  caret-color: var(--matrix-green);
  transition: all 0.2s ease;
}

.bigpulp-input::placeholder {
  color: rgba(0, 255, 65, 0.4);
}

.bigpulp-input:focus {
  outline: none;
  border-color: rgba(0, 255, 65, 0.5);
  box-shadow: 0 0 20px rgba(0, 255, 65, 0.1);
}

/* Submit button */
.bigpulp-submit {
  position: absolute;
  right: calc(var(--space-4) + var(--space-2));
  top: 50%;
  transform: translateY(-50%);
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: var(--matrix-green);
  color: var(--color-bg);
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  cursor: pointer;
  transition: all 0.2s ease;
}

.bigpulp-submit:hover {
  background: #00ff41;
  box-shadow: 0 0 20px rgba(0, 255, 65, 0.5);
}

.bigpulp-submit:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Message history */
.bigpulp-messages {
  flex: 1;
  overflow-y: auto;
  padding: var(--space-4);
}

/* User messages */
.user-message {
  display: flex;
  justify-content: flex-end;
  margin-bottom: var(--space-3);
}

.user-message-content {
  max-width: 80%;
  padding: var(--space-3) var(--space-4);
  background: rgba(255, 107, 0, 0.1);
  border: 1px solid rgba(255, 107, 0, 0.2);
  border-radius: var(--radius-lg) var(--radius-lg) var(--radius-sm) var(--radius-lg);
  color: var(--color-text);
  font-size: var(--text-sm);
}
```

---

## 5. BigPulp Mascot Integration

**Important:** The BigPulp mascot stays prominent. It IS the hero of this feature.

### Layout Structure

```tsx
// src/pages/BigPulp.tsx - simplified structure
export function BigPulp() {
  const [activeTab, setActiveTab] = useState<'explore' | 'ask'>('ask');

  return (
    <div className="bigpulp-page">
      {/* Tab Navigation */}
      <div className="bigpulp-tabs">
        <button
          className={`tab ${activeTab === 'explore' ? 'tab-active' : ''}`}
          onClick={() => setActiveTab('explore')}
        >
          <BarChart size={16} />
          Explore
        </button>
        <button
          className={`tab ${activeTab === 'ask' ? 'tab-active' : ''}`}
          onClick={() => setActiveTab('ask')}
        >
          <MessageSquare size={16} />
          Ask BigPulp
        </button>
      </div>

      {/* Content */}
      <div className="bigpulp-content">
        {activeTab === 'explore' ? (
          <ExploreTab />
        ) : (
          <AskTab />
        )}
      </div>
    </div>
  );
}
```

### Ask Tab with Mascot

```tsx
// src/components/bigpulp/AskTab.tsx
export function AskTab() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [streamingState, setStreamingState] = useState<StreamingState>({
    isStreaming: false,
    currentText: '',
    stage: null,
  });

  const quickPrompts = useContextualPrompts(messages);

  const handleSubmit = async (text: string) => {
    // Add user message
    setMessages(prev => [...prev, { role: 'user', content: text }]);
    setInput('');

    // Start streaming
    setStreamingState({ isStreaming: true, currentText: '', stage: 'analyzing' });

    // ... API call with streaming ...
  };

  return (
    <div className="bigpulp-container">
      {/* Mascot Hero - stays prominent! */}
      <div className="bigpulp-hero">
        <div className="mascot-container">
          <img
            src="/images/bigpulp-mascot.png"
            alt="BigPulp"
            className="mascot-image"
          />
          <div className="mascot-speech-bubble">
            <p>"BigPulp sees what you cannot."</p>
          </div>
        </div>
      </div>

      {/* Chat Area */}
      <div className="bigpulp-chat">
        {/* Messages */}
        <div className="bigpulp-messages">
          {messages.length === 0 && (
            <div className="empty-chat">
              <p>Ask me anything about the Wojak Farmer Plot collection.</p>
            </div>
          )}

          {messages.map((msg, i) => (
            msg.role === 'user' ? (
              <div key={i} className="user-message">
                <div className="user-message-content">{msg.content}</div>
              </div>
            ) : (
              <AIResponseCard key={i} response={msg} />
            )
          ))}

          {streamingState.isStreaming && (
            <StreamingIndicator stage={streamingState.stage} />
          )}
        </div>

        {/* Quick Prompts */}
        <QuickPrompts
          prompts={quickPrompts}
          onSelect={handleSubmit}
          disabled={streamingState.isStreaming}
        />

        {/* Input */}
        <div className="bigpulp-input-wrapper">
          <input
            type="text"
            className="bigpulp-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSubmit(input)}
            placeholder="Ask BigPulp anything..."
            disabled={streamingState.isStreaming}
          />
          <button
            className="bigpulp-submit"
            onClick={() => handleSubmit(input)}
            disabled={!input.trim() || streamingState.isStreaming}
          >
            <Send size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
```

### Mascot CSS

```css
/* BigPulp Hero */
.bigpulp-hero {
  padding: var(--space-6);
  text-align: center;
}

.mascot-container {
  position: relative;
  display: inline-block;
}

.mascot-image {
  width: 200px;
  height: auto;
  filter: drop-shadow(0 0 30px rgba(0, 255, 65, 0.3));
  transition: filter 0.3s ease;
}

.mascot-container:hover .mascot-image {
  filter: drop-shadow(0 0 40px rgba(0, 255, 65, 0.5));
}

.mascot-speech-bubble {
  position: absolute;
  top: 10%;
  right: -150px;
  background: rgba(0, 255, 65, 0.1);
  border: 1px solid rgba(0, 255, 65, 0.3);
  border-radius: var(--radius-lg);
  padding: var(--space-3) var(--space-4);
  max-width: 180px;
  font-family: var(--font-mono);
  font-size: var(--text-sm);
  color: var(--matrix-green);
}

.mascot-speech-bubble::before {
  content: '';
  position: absolute;
  left: -10px;
  top: 50%;
  transform: translateY(-50%);
  border: 6px solid transparent;
  border-right-color: rgba(0, 255, 65, 0.3);
}

@media (max-width: 768px) {
  .mascot-speech-bubble {
    position: static;
    margin-top: var(--space-3);
    max-width: 100%;
  }

  .mascot-speech-bubble::before {
    display: none;
  }
}
```

---

## 6. Collapsible Statistics

```tsx
// Wrap Collection Statistics in a Collapsible
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/Collapsible';

<Collapsible defaultOpen={false}>
  <CollapsibleTrigger className="stats-trigger">
    <BarChart size={16} />
    <span>Collection Statistics</span>
    <ChevronDown size={16} className="chevron" />
  </CollapsibleTrigger>
  <CollapsibleContent>
    <CollectionStats stats={stats} />
  </CollapsibleContent>
</Collapsible>
```

```css
.stats-trigger {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  width: 100%;
  padding: var(--space-3) var(--space-4);
  background: var(--glass-bg);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-md);
  color: var(--color-text-secondary);
  font-size: var(--text-sm);
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.stats-trigger:hover {
  background: var(--glass-bg-hover);
  color: var(--color-text);
}

.stats-trigger .chevron {
  margin-left: auto;
  transition: transform 0.2s ease;
}

.stats-trigger[data-state="open"] .chevron {
  transform: rotate(180deg);
}
```

---

## Implementation Checklist

- [ ] Create `src/types/bigpulp.ts` with type definitions
- [ ] Create `src/components/bigpulp/StreamingIndicator.tsx`
- [ ] Create `src/components/bigpulp/AIResponseCard.tsx`
- [ ] Create `src/components/bigpulp/QuickPrompts.tsx`
- [ ] Create `src/hooks/useContextualPrompts.ts`
- [ ] Add all BigPulp CSS to `src/styles/theme.css`
- [ ] Modify `src/pages/BigPulp.tsx` - simplify tabs (2 instead of 3)
- [ ] Modify `src/components/bigpulp/AskTab.tsx` - integrate new components
- [ ] Wrap statistics in Collapsible (default closed)
- [ ] Test streaming indicator stages
- [ ] Test quick prompts change based on conversation
- [ ] Verify mascot stays prominent
- [ ] Run `npm run build` — no errors

---

*BigPulp AI Enhancement Guide*
*Critical upgrade for premium feel*
*January 29, 2026*
