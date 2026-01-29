/**
 * ChatRoom Component - Shared chat room component for HolderChat and WhaleChat
 *
 * This component contains all the shared logic for NFT-gated chat rooms:
 * - Entry verification via profile NFT count
 * - Real-time messaging with replies and reactions
 * - @mentions with autocomplete
 * - Admin moderation tools
 * - Boot sequence animation
 */

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { SignInButton } from '@clerk/clerk-react';
import { useAuthenticatedFetch } from '@/hooks/useAuthenticatedFetch';
import { useUserProfile } from '@/contexts/UserProfileContext';
import { useChatSocket } from '@/hooks/useChatSocket';
import { useRateLimitState } from '@/hooks/useRateLimitState';
import { PageSEO } from '@/components/seo';
import { CHAT_ROOMS, isEligibleForRoom } from '@/config/chatRooms';
import type { ChatMessage, ChatUser, ChatTokenResponse } from '@/types/chat';
import {
  formatTime,
  formatDateSeparator,
  shouldShowDateSeparator,
  shouldGroupWithPrevious,
  parseMentions,
  REACTION_EMOJIS,
  MINTGARDEN_URL,
  BOOT_MESSAGES,
} from './chatUtils';

// ============ Types ============

export type ChatType = 'holder' | 'whale';

export interface ChatRoomProps {
  chatType: ChatType;
  welcomeIcon: string;
  welcomeTitle: string;
  welcomeDescription: string;
}

// ============ Gated Entry Screen ============

interface GatedEntryProps {
  nftCount: number | null;
  isLoading: boolean;
  onEnter: () => void;
  isSignedIn: boolean;
  isEligible: boolean;
  roomConfig: typeof CHAT_ROOMS[ChatType];
  minNftsRequired: number;
}

function GatedEntry({
  nftCount,
  isLoading,
  onEnter,
  isSignedIn,
  isEligible,
  roomConfig,
  minNftsRequired,
}: GatedEntryProps) {
  const hasVerified = nftCount !== null && nftCount !== undefined;
  const needed = hasVerified ? Math.max(0, minNftsRequired - nftCount) : minNftsRequired;

  return (
    <div className="gc-terminal-entry">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="gc-terminal-entry-icon"
      >
        {isEligible ? roomConfig.icon : '🔒'}
      </motion.div>

      <h2 className="gc-terminal-entry-title">{roomConfig.label}</h2>

      {/* State 1: Not signed in */}
      {!isSignedIn && (
        <div className="gc-terminal-entry-content">
          <p className="gc-terminal-entry-message">
            {'>'} Sign in to access this channel
          </p>
          <SignInButton mode="modal">
            <button className="gc-terminal-entry-btn">
              [ SIGN IN ]
            </button>
          </SignInButton>
        </div>
      )}

      {/* State 2: Signed in but wallet not verified */}
      {isSignedIn && !hasVerified && (
        <div className="gc-terminal-entry-content">
          <p className="gc-terminal-entry-message">
            {'>'} Verify wallet to check eligibility
          </p>
          <p className="gc-terminal-entry-hint">
            Required: {minNftsRequired}+ NFTs
          </p>
          <Link to="/account" className="gc-terminal-entry-btn">
            [ VERIFY WALLET ]
          </Link>
        </div>
      )}

      {/* State 3: Verified but not enough NFTs */}
      {isSignedIn && hasVerified && !isEligible && (
        <div className="gc-terminal-entry-content">
          <p className="gc-terminal-entry-message">
            {'>'} ACCESS DENIED
          </p>
          <p className="gc-terminal-entry-status">
            Your NFTs: {nftCount} / {minNftsRequired}
          </p>
          <p className="gc-terminal-entry-hint">
            Need {needed} more NFT{needed !== 1 ? 's' : ''} to unlock
          </p>
          <a
            href={MINTGARDEN_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="gc-terminal-entry-btn"
          >
            [ BROWSE COLLECTION ]
          </a>
        </div>
      )}

      {/* State 4: Eligible */}
      {isSignedIn && hasVerified && isEligible && (
        <div className="gc-terminal-entry-content">
          <p className="gc-terminal-entry-message gc-terminal-entry-message--success">
            {'>'} ACCESS GRANTED
          </p>
          <p className="gc-terminal-entry-status">
            You hold {nftCount} Wojak Farmers Plot NFTs.
          </p>
          <p className="gc-terminal-entry-welcome">
            {roomConfig.minNfts >= 42 ? 'Welcome to the 1% club!' : 'Welcome, holder!'}
          </p>
          <button
            className="gc-terminal-entry-btn gc-terminal-entry-btn--enter"
            onClick={onEnter}
            disabled={isLoading}
          >
            {isLoading ? '[ CONNECTING... ]' : '[ ENTER CHAT ]'}
          </button>
        </div>
      )}
    </div>
  );
}

// ============ Message Component ============

interface MessageProps {
  message: ChatMessage;
  isGrouped: boolean;
  isNewGroup: boolean;
  isAdmin: boolean;
  userId: string | null;
  isActive: boolean;
  onToggleActive: () => void;
  onReply: (message: ChatMessage) => void;
  onReaction: (messageId: string, emoji: string) => void;
  onDelete: (messageId: string) => void;
  onJumpToMessage: (messageId: string) => void;
}

function Message({
  message,
  isGrouped,
  isNewGroup,
  isAdmin,
  userId,
  isActive,
  onToggleActive,
  onReply,
  onReaction,
  onDelete,
  onJumpToMessage,
}: MessageProps) {
  const isOwn = message.senderId === userId;

  const handleReactionClick = (emoji: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onReaction(message.id, emoji);
    onToggleActive();
  };

  const hasUserReacted = (emoji: string) => {
    if (!userId) return false;
    const reaction = message.reactions?.find((r) => r.emoji === emoji);
    return reaction?.users.some((u) => u.id === userId) || false;
  };

  const activeReactions = message.reactions?.filter(r => r.users.length > 0) || [];

  return (
    <motion.div
      className={`gc-message ${isGrouped ? 'gc-message-grouped' : ''} ${isNewGroup ? 'gc-message-new-group' : ''} ${isOwn ? 'gc-message-own' : ''} ${isActive ? 'gc-message-active' : ''}`}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      onClick={onToggleActive}
    >
      <div className="gc-message-avatar">
        {message.senderAvatar ? (
          <img src={message.senderAvatar} alt="" />
        ) : (
          message.senderName.charAt(0).toUpperCase()
        )}
      </div>

      <div className="gc-message-content">
        {!isGrouped && (
          <div className="gc-message-header">
            <span className={`gc-message-name ${isAdmin && message.senderId === userId ? 'admin' : ''}`}>
              {message.senderName}
            </span>
            <span className="gc-message-time">{formatTime(message.timestamp)}</span>
          </div>
        )}

        {message.replyTo && (
          <div
            className="gc-reply-preview"
            onClick={(e) => { e.stopPropagation(); onJumpToMessage(message.replyTo!.id); }}
          >
            <div className="gc-reply-content">
              <span className="gc-reply-name">{message.replyTo.senderName}</span>
              <span className="gc-reply-text">{message.replyTo.text}</span>
            </div>
          </div>
        )}

        <span className="gc-message-text">{parseMentions(message.text)}</span>
        {activeReactions.length > 0 && (
          <span className="gc-inline-reactions">
            {activeReactions.map(r => (
              <span
                key={r.emoji}
                className={`gc-inline-reaction ${hasUserReacted(r.emoji) ? 'user-reacted' : ''}`}
                title={r.users.map(u => u.name).join(', ')}
              >
                {r.emoji}{r.users.length > 1 && <sub>{r.users.length}</sub>}
              </span>
            ))}
          </span>
        )}

        <div className="gc-message-actions" onClick={(e) => e.stopPropagation()}>
          {REACTION_EMOJIS.map((emoji) => {
            const reaction = message.reactions?.find(r => r.emoji === emoji);
            const count = reaction?.users.length || 0;
            const userReacted = hasUserReacted(emoji);
            const hasReactions = count > 0;

            return (
              <button
                key={emoji}
                className={`gc-action-btn gc-reaction-btn ${userReacted ? 'user-reacted' : ''} ${hasReactions ? 'has-reactions' : ''}`}
                onClick={(e) => handleReactionClick(emoji, e)}
                title={reaction ? reaction.users.map(u => u.name).join(', ') : `React with ${emoji}`}
              >
                {emoji}
                {count > 0 && <span className="gc-reaction-count">{count}</span>}
              </button>
            );
          })}
          <button
            className="gc-action-btn gc-reply-btn"
            onClick={(e) => { e.stopPropagation(); onReply(message); }}
            title="Reply"
            aria-label="Reply to message"
          >
            ↩
          </button>
        </div>

        {isAdmin && (
          <button
            className="gc-admin-delete"
            onClick={(e) => { e.stopPropagation(); onDelete(message.id); }}
            title="Delete"
          >
            🗑
          </button>
        )}
      </div>
    </motion.div>
  );
}

// ============ Chat Interface ============

interface ChatInterfaceProps {
  chatToken: string;
  userName: string;
  userAvatar?: string;
  roomConfig: typeof CHAT_ROOMS[ChatType];
}

function ChatInterface({ chatToken, userName, userAvatar, roomConfig }: ChatInterfaceProps) {
  const [inputValue, setInputValue] = useState('');
  const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null);
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [mentionIndex, setMentionIndex] = useState(0);
  const [visibleDate, setVisibleDate] = useState<string>('');
  const [activeMessageId, setActiveMessageId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  const {
    status,
    error: chatError,
    isAdmin,
    userId,
    messages,
    onlineUsers,
    typingUsers,
    sendMessage,
    startTyping,
    stopTyping,
    addReaction,
    removeReaction,
    deleteMessage,
    reconnect,
  } = useChatSocket({ token: chatToken, userName, userAvatar });

  void chatError; // TODO: Display connection errors to user

  const filteredUsers = useMemo(() => {
    if (!mentionQuery) return [];
    const query = mentionQuery.toLowerCase();
    return onlineUsers.filter((u) =>
      u.name.toLowerCase().includes(query)
    );
  }, [mentionQuery, onlineUsers]);

  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    const isNearBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight < 150;

    if (isNearBottom) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container || messages.length === 0) return;

    const updateVisibleDate = () => {
      const containerRect = container.getBoundingClientRect();
      for (const msg of messages) {
        const el = container.querySelector(`[data-message-id="${msg.id}"]`);
        if (el) {
          const rect = el.getBoundingClientRect();
          if (rect.top >= containerRect.top - 50) {
            setVisibleDate(formatDateSeparator(msg.timestamp));
            return;
          }
        }
      }
      if (messages.length > 0) {
        setVisibleDate(formatDateSeparator(messages[0].timestamp));
      }
    };

    updateVisibleDate();

    container.addEventListener('scroll', updateVisibleDate);
    return () => container.removeEventListener('scroll', updateVisibleDate);
  }, [messages]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputValue(value);

    const lastAtIndex = value.lastIndexOf('@');
    if (lastAtIndex !== -1) {
      const afterAt = value.slice(lastAtIndex + 1);
      const spaceIndex = afterAt.indexOf(' ');
      if (spaceIndex === -1) {
        setMentionQuery(afterAt);
        setMentionIndex(0);
        return;
      }
    }
    setMentionQuery(null);

    if (value) {
      startTyping();
    } else {
      stopTyping();
    }
  };

  const selectMention = (user: ChatUser) => {
    const lastAtIndex = inputValue.lastIndexOf('@');
    const newValue = inputValue.slice(0, lastAtIndex) + `@${user.name} `;
    setInputValue(newValue);
    setMentionQuery(null);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (mentionQuery !== null && filteredUsers.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setMentionIndex((prev) =>
          prev < filteredUsers.length - 1 ? prev + 1 : 0
        );
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setMentionIndex((prev) =>
          prev > 0 ? prev - 1 : filteredUsers.length - 1
        );
      } else if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        selectMention(filteredUsers[mentionIndex]);
      } else if (e.key === 'Escape') {
        setMentionQuery(null);
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.trim()) {
      sendMessage(inputValue, replyingTo?.id);
      setInputValue('');
      setReplyingTo(null);
      setMentionQuery(null);
      stopTyping();
    }
  };

  const handleReply = (message: ChatMessage) => {
    setReplyingTo(message);
    inputRef.current?.focus();
  };

  const handleReaction = (messageId: string, emoji: string) => {
    const message = messages.find((m) => m.id === messageId);
    const reaction = message?.reactions?.find((r) => r.emoji === emoji);
    const hasReacted = reaction?.users.some((u) => u.id === userId);

    if (hasReacted) {
      removeReaction(messageId, emoji);
    } else {
      addReaction(messageId, emoji);
    }
  };

  const handleJumpToMessage = (messageId: string) => {
    const element = document.querySelector(`[data-message-id="${messageId}"]`);
    element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  return (
    <div className="gc-crt-frame">
      <div className="gc-terminal-header">
        <Link to="/chat" className="gc-header-back">
          ← Chat Rooms
        </Link>
        <span className="gc-header-date">
          {visibleDate || 'Today'}
        </span>
        <div className="gc-header-right">
          <span className="gc-header-pill">
            {roomConfig.icon} {roomConfig.label}
          </span>
          <span className={`gc-status-dot ${status}`} />
          {(status === 'error' || status === 'disconnected') && (
            <button className="gc-reconnect-btn" onClick={reconnect} aria-label="Reconnect">
              Retry
            </button>
          )}
        </div>
      </div>

      <div className="gc-messages" ref={messagesContainerRef}>
        {messages.length === 0 ? (
          <div className="gc-empty-messages">
            <p className="gc-empty-subtitle">
              No messages yet. Be the first to start the conversation.
            </p>
          </div>
        ) : (
          messages.map((msg, index) => {
            const prevMsg = messages[index - 1];
            const showDate = shouldShowDateSeparator(msg, prevMsg);
            const isGrouped = !showDate && shouldGroupWithPrevious(msg, prevMsg);
            const isNewGroup = !isGrouped && index > 0;

            return (
              <div key={msg.id} data-message-id={msg.id}>
                <Message
                  message={msg}
                  isGrouped={isGrouped}
                  isNewGroup={isNewGroup}
                  isAdmin={isAdmin}
                  userId={userId}
                  isActive={activeMessageId === msg.id}
                  onToggleActive={() => setActiveMessageId(activeMessageId === msg.id ? null : msg.id)}
                  onReply={handleReply}
                  onReaction={handleReaction}
                  onDelete={deleteMessage}
                  onJumpToMessage={handleJumpToMessage}
                />
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      <AnimatePresence>
        {typingUsers.length > 0 && (
          <motion.div
            className="gc-typing-indicator"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            <div className="gc-typing-dots">
              <span />
              <span />
              <span />
            </div>
            <span>
              {typingUsers.length === 1
                ? `${typingUsers[0]} is typing...`
                : `${typingUsers.length} people are typing...`}
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="gc-input-area">
        <AnimatePresence>
          {replyingTo && (
            <motion.div
              className="gc-input-reply"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
            >
              <div className="gc-input-reply-content">
                <div className="gc-input-reply-name">
                  Replying to {replyingTo.senderName}
                </div>
                <div className="gc-input-reply-text">{replyingTo.text}</div>
              </div>
              <button
                className="gc-input-reply-close"
                onClick={() => setReplyingTo(null)}
                aria-label="Cancel reply"
              >
                ✕
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {mentionQuery !== null && filteredUsers.length > 0 && (
            <motion.div
              className="gc-mention-dropdown"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
            >
              {filteredUsers.map((user, index) => (
                <div
                  key={user.id}
                  className={`gc-mention-item ${index === mentionIndex ? 'selected' : ''}`}
                  onClick={() => selectMention(user)}
                >
                  <div className="gc-mention-avatar">
                    {user.avatar ? (
                      <img src={user.avatar} alt="" />
                    ) : (
                      user.name.charAt(0).toUpperCase()
                    )}
                  </div>
                  <span className="gc-mention-name">{user.name}</span>
                  <span className="gc-mention-status" />
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        <form className="gc-input-wrapper" onSubmit={handleSubmit}>
          <input
            ref={inputRef}
            type="text"
            className="gc-input"
            placeholder="Type a message..."
            value={inputValue}
            onChange={handleInputChange}
            aria-label="Message input"
            onKeyDown={handleKeyDown}
            disabled={status !== 'connected'}
            maxLength={2000}
            autoComplete="off"
          />
          <button
            type="submit"
            className="gc-send-btn"
            disabled={!inputValue.trim() || status !== 'connected'}
            aria-label="Send message"
          >
            Send
          </button>
        </form>
      </div>
    </div>
  );
}

// ============ Main ChatRoom Component ============

export default function ChatRoom({
  chatType,
  welcomeIcon,
  welcomeTitle,
  welcomeDescription,
}: ChatRoomProps) {
  const { authenticatedFetch, isSignedIn, isLoaded } = useAuthenticatedFetch();
  const { profile, effectiveDisplayName, isAdmin } = useUserProfile();

  const roomConfig = CHAT_ROOMS[chatType];
  const minNftsRequired = roomConfig.minNfts;

  // State
  const [isVerifying, setIsVerifying] = useState(false);
  const [chatToken, setChatToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [bootPhase, setBootPhase] = useState(0);
  const [showWelcome, setShowWelcome] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const bootStartedRef = useRef(false);

  const { isRateLimited, secondsRemaining, handleRateLimitResponse } = useRateLimitState();

  const nftCount = profile?.nftCount ?? null;
  const walletAddress = profile?.walletAddress;
  const hasVerified = nftCount !== null;
  const isEligible = isAdmin || (hasVerified && isEligibleForRoom(nftCount, chatType));

  const userName = effectiveDisplayName || `Holder #${nftCount || 0}`;
  const userAvatar =
    profile?.avatar?.type === 'nft' ? profile.avatar.value : undefined;

  const handleEnterChat = useCallback(async () => {
    if (!isSignedIn) {
      setError('Please sign in first');
      return;
    }

    if (!isAdmin && (!hasVerified || !walletAddress)) {
      setError('Please verify your wallet on the Account page first');
      return;
    }

    setIsVerifying(true);
    setError(null);

    try {
      const verifyRes = await authenticatedFetch('/api/chat/verify-eligibility', {
        method: 'POST',
        body: JSON.stringify({ walletAddress: walletAddress || '', chatType }),
      });

      const verifyData = await verifyRes.json();

      const roomEligibility = verifyData.eligibility?.[chatType];
      if (!verifyData.isAdmin && !roomEligibility?.eligible) {
        setError(
          verifyData.message ||
            `Need ${minNftsRequired}+ NFTs for ${roomConfig.label}. You have ${verifyData.nftCount || 0}.`
        );
        setIsVerifying(false);
        return;
      }

      const tokenRes = await authenticatedFetch('/api/chat/token', {
        method: 'POST',
        body: JSON.stringify({ walletAddress: walletAddress || '', chatType }),
      });

      if (handleRateLimitResponse(tokenRes)) {
        setIsVerifying(false);
        return;
      }

      if (!tokenRes.ok) {
        const errorData = await tokenRes.json();
        throw new Error(errorData.error || 'Failed to get chat token');
      }

      const tokenData: ChatTokenResponse = await tokenRes.json();
      setChatToken(tokenData.token);
    } catch (err) {
      console.error(`[ChatRoom:${chatType}] Verification error:`, err);
      setError(err instanceof Error ? err.message : 'Verification failed');
    } finally {
      setIsVerifying(false);
    }
  }, [isSignedIn, isAdmin, hasVerified, walletAddress, authenticatedFetch, handleRateLimitResponse, chatType, minNftsRequired, roomConfig.label]);

  useEffect(() => {
    if (
      isLoaded &&
      isSignedIn &&
      isEligible &&
      (walletAddress || isAdmin) &&
      !chatToken &&
      !isVerifying &&
      !error &&
      !isRateLimited
    ) {
      handleEnterChat();
    }
  }, [isLoaded, isSignedIn, isEligible, walletAddress, isAdmin, chatToken, isVerifying, error, isRateLimited, handleEnterChat]);

  useEffect(() => {
    if (chatToken && !bootStartedRef.current) {
      bootStartedRef.current = true;

      setBootPhase(0);
      const timers: NodeJS.Timeout[] = [];

      BOOT_MESSAGES.forEach((msg, index) => {
        const timer = setTimeout(() => {
          setBootPhase(index + 1);
        }, msg.delay);
        timers.push(timer);
      });

      const welcomeTimer = setTimeout(() => {
        setShowWelcome(true);
      }, 1500);
      timers.push(welcomeTimer);

      const chatTimer = setTimeout(() => {
        setShowChat(true);
      }, 4500);
      timers.push(chatTimer);

      return () => timers.forEach(t => clearTimeout(t));
    }
  }, [chatToken]);

  if (!isLoaded) {
    return (
      <div className="gc-container">
        <div className="gc-content">
          <div className="gc-loading">
            <div className="gc-spinner" />
            <span>Loading...</span>
          </div>
        </div>
      </div>
    );
  }

  const seoTitle = chatType === 'whale' ? 'Whale Chat | Wojak.ink' : 'Holder Chat | Wojak.ink';
  const seoDescription = chatType === 'whale'
    ? 'Exclusive chat for top 1% Wojak Farmers Plot NFT holders (42+ NFTs)'
    : 'Chat room for all Wojak Farmers Plot NFT holders (1+ NFT)';
  const seoPath = `/chat/${chatType}`;

  return (
    <>
      <PageSEO
        title={seoTitle}
        description={seoDescription}
        path={seoPath}
      />

      <div className="gc-container">
        <div className="gc-content">
          <div className="gc-frame-wrapper">
            <div className="gc-frame-inner" />
            <div className="gc-chat-screen">
              <AnimatePresence>
                {(error || isRateLimited) && (
                  <motion.div
                    className="gc-error"
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                  >
                    {isRateLimited
                      ? `Too many requests. You can retry in ${secondsRemaining} second${secondsRemaining !== 1 ? 's' : ''}.`
                      : error}
                    {!isRateLimited && (
                      <button
                        className="gc-error-retry"
                        onClick={() => setError(null)}
                      >
                        Dismiss
                      </button>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>

              <AnimatePresence mode="wait">
                {chatToken && showChat ? (
                  <motion.div
                    key="chat"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.5 }}
                    style={{ position: 'absolute', inset: 0 }}
                  >
                    <ChatInterface
                      chatToken={chatToken}
                      userName={userName}
                      userAvatar={userAvatar}
                      roomConfig={roomConfig}
                    />
                  </motion.div>
                ) : chatToken && showWelcome ? (
                  <motion.div
                    key="welcome"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.5 }}
                    className="gc-welcome-screen"
                  >
                    <div className="gc-welcome-icon">{welcomeIcon}</div>
                    <h2 className="gc-welcome-title">{welcomeTitle}</h2>
                    <p className="gc-welcome-subtitle">{welcomeDescription}</p>
                    <p className="gc-welcome-hint">Entering chat...</p>
                  </motion.div>
                ) : chatToken ? (
                  <motion.div
                    key="boot"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="gc-boot-sequence"
                  >
                    {BOOT_MESSAGES.slice(0, bootPhase).map((msg, index) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`gc-boot-line ${msg.success ? 'gc-boot-line--success' : 'gc-boot-line--loading'}`}
                      >
                        {'>'} {msg.text}
                      </motion.div>
                    ))}
                    {bootPhase < BOOT_MESSAGES.length && (
                      <div className="gc-boot-cursor">_</div>
                    )}
                  </motion.div>
                ) : isVerifying && isEligible ? (
                  <motion.div
                    key="connecting"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="gc-boot-sequence"
                  >
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="gc-boot-line gc-boot-line--loading"
                    >
                      {'>'} ESTABLISHING CONNECTION...
                    </motion.div>
                    <div className="gc-boot-cursor">_</div>
                  </motion.div>
                ) : (
                  <motion.div
                    key="entry"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    style={{ position: 'absolute', inset: 0 }}
                  >
                    <GatedEntry
                      nftCount={nftCount}
                      isLoading={isVerifying}
                      onEnter={handleEnterChat}
                      isSignedIn={isSignedIn}
                      isEligible={isEligible}
                      roomConfig={roomConfig}
                      minNftsRequired={minNftsRequired}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
