import { useState, useEffect, useMemo } from 'react';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { getNftImageUrl } from '../services/marketApi';
import './QuestionTree.css';

interface Category {
  id: string;
  name: string;
  icon: string;
  description: string;
}

interface Question {
  id: string;
  category: string;
  question: string;
  short: string;
  answer: string;
  nft_ids?: string[];
}

interface QuestionTreeData {
  categories: Category[];
  questions: Question[];
}

interface QuestionTreeProps {
  onNftClick?: (nftId: string) => void;
}

const QuestionTree: React.FC<QuestionTreeProps> = ({ onNftClick }) => {
  const [data, setData] = useState<QuestionTreeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedQuestion, setSelectedQuestion] = useState<Question | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [displayedAnswer, setDisplayedAnswer] = useState('');

  // Load question tree data
  useEffect(() => {
    const loadData = async () => {
      try {
        const response = await fetch('/assets/BigPulp/question tree/big_pulp_question_tree.json');
        const json = await response.json();
        setData(json);
      } catch (error) {
        console.error('Failed to load question tree:', error);
      }
      setLoading(false);
    };
    loadData();
  }, []);

  // Filter questions based on search or category
  const filteredQuestions = useMemo(() => {
    if (!data) return [];

    let questions = data.questions;

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      questions = questions.filter(q =>
        q.question.toLowerCase().includes(query) ||
        q.short.toLowerCase().includes(query) ||
        q.answer.toLowerCase().includes(query)
      );
    } else if (selectedCategory) {
      questions = questions.filter(q => q.category === selectedCategory);
    }

    return questions.slice(0, 10); // Limit for performance
  }, [data, searchQuery, selectedCategory]);

  // Typing animation for answer
  useEffect(() => {
    if (!selectedQuestion) {
      setDisplayedAnswer('');
      return;
    }

    setIsTyping(true);
    setDisplayedAnswer('');

    const answer = selectedQuestion.answer;
    let index = 0;
    const typingSpeed = 10; // Fast typing

    const timer = setInterval(() => {
      if (index < answer.length) {
        setDisplayedAnswer(answer.slice(0, index + 1));
        index++;
      } else {
        clearInterval(timer);
        setIsTyping(false);
      }
    }, typingSpeed);

    return () => clearInterval(timer);
  }, [selectedQuestion]);

  // Parse answer to make NFT IDs clickable
  const parseAnswer = (text: string) => {
    // Match #123 pattern
    const parts = text.split(/(#\d+)/g);
    return parts.map((part, idx) => {
      const match = part.match(/^#(\d+)$/);
      if (match) {
        const nftId = match[1];
        return (
          <span
            key={idx}
            className="nft-link"
            onClick={() => onNftClick?.(nftId)}
          >
            {part}
          </span>
        );
      }
      return part;
    });
  };

  const handleQuestionClick = (question: Question) => {
    setSelectedQuestion(question);
  };

  const handleBack = () => {
    setSelectedQuestion(null);
  };

  if (loading) {
    return (
      <div className="qt-loading">
        <LoadingSpinner />
        <p>Loading questions...</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="qt-error">
        <p>Failed to load questions</p>
      </div>
    );
  }

  // Show answer view
  if (selectedQuestion) {
    return (
      <div className="qt-answer-view">
        <button className="qt-back-btn" onClick={handleBack}>
          ← Back to questions
        </button>

        <div className="qt-question-header">
          <span className="qt-q-icon">❓</span>
          <span className="qt-q-text">{selectedQuestion.question}</span>
        </div>

        <div className="qt-answer-bubble">
          <div className="qt-pulp-avatar">🍊</div>
          <div className="qt-answer-content">
            {parseAnswer(displayedAnswer)}
            {isTyping && <span className="typing-cursor">|</span>}
          </div>
        </div>

        {selectedQuestion.nft_ids && selectedQuestion.nft_ids.length > 0 && !isTyping && (
          <div className="qt-nft-previews">
            <span className="qt-previews-label">Featured NFTs:</span>
            <div className="qt-previews-grid">
              {selectedQuestion.nft_ids.map(id => (
                <div
                  key={id}
                  className="qt-nft-preview-card"
                  onClick={() => onNftClick?.(id)}
                >
                  <img
                    src={getNftImageUrl(id)}
                    alt={`NFT #${id}`}
                    className="qt-nft-preview-img"
                  />
                  <span className="qt-nft-preview-id">#{id}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // Show question list view
  return (
    <div className="question-tree">
      {/* Search */}
      <input
        type="text"
        className="input qt-search"
        placeholder="Search questions..."
        value={searchQuery}
        onChange={(e) => {
          setSearchQuery(e.target.value);
          setSelectedCategory(null);
        }}
      />

      {/* Categories */}
      {!searchQuery && (
        <div className="qt-categories">
          {data.categories.map(cat => (
            <button
              key={cat.id}
              className={`qt-category ${selectedCategory === cat.id ? 'active' : ''}`}
              onClick={() => setSelectedCategory(
                selectedCategory === cat.id ? null : cat.id
              )}
            >
              <span className="qt-cat-icon">{cat.icon}</span>
              <span className="qt-cat-name">{cat.name.replace(cat.icon, '').trim()}</span>
            </button>
          ))}
        </div>
      )}

      {/* Questions List */}
      <div className="qt-questions">
        {searchQuery && (
          <div className="qt-search-header">
            Search Results ({filteredQuestions.length})
          </div>
        )}

        {filteredQuestions.length === 0 ? (
          <div className="qt-no-results">
            <p>No questions found. Try a different search.</p>
          </div>
        ) : (
          filteredQuestions.map(q => (
            <button
              key={q.id}
              className="qt-question-btn"
              onClick={() => handleQuestionClick(q)}
            >
              <span className="qt-q-short">{q.short}</span>
              <span className="qt-arrow">→</span>
            </button>
          ))
        )}
      </div>
    </div>
  );
};

export default QuestionTree;
