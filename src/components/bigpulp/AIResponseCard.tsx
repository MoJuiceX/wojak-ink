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

function TextCard({ text }: { text: string }) {
  return (
    <div className="response-text">
      <div className="response-avatar">
        <span className="avatar-icon">&#129504;</span>
      </div>
      <div className="response-content">
        <p>{text}</p>
      </div>
    </div>
  );
}

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
          View all {data.nfts.length} results
        </button>
      )}
    </div>
  );
}

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
                {stat.trend === 'up' ? '\u2191' : stat.trend === 'down' ? '\u2193' : '\u2013'}
                {Math.abs(stat.change)}%
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

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

function ErrorCard({ message }: { message: string }) {
  return (
    <div className="response-error">
      <span className="error-icon">&#9888;&#65039;</span>
      <p>{message}</p>
      <button className="btn btn-ghost btn-sm">Try again</button>
    </div>
  );
}
