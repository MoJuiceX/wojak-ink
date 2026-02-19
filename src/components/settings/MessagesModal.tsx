/**
 * MessagesModal Component
 *
 * Modal displaying user's messages/notifications.
 */

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Mail, MailOpen, Loader2, Bell, Trophy, Info, AlertTriangle } from 'lucide-react';
import { useAuthenticatedFetch } from '@/hooks/useAuthenticatedFetch';
import { useUserProfile } from '@/contexts/UserProfileContext';

interface Message {
  id: string;
  title: string;
  content: string;
  type: 'info' | 'success' | 'warning';
  read: boolean;
  createdAt: string;
}

interface MessagesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

function getTypeIcon(type: string) {
  switch (type) {
    case 'success':
      return <Trophy size={18} style={{ color: '#22c55e' }} />;
    case 'warning':
      return <AlertTriangle size={18} style={{ color: '#f59e0b' }} />;
    default:
      return <Info size={18} className="text-accent" />;
  }
}

function getTypeBg(type: string) {
  switch (type) {
    case 'success':
      return 'rgba(34, 197, 94, 0.1)';
    case 'warning':
      return 'rgba(245, 158, 11, 0.1)';
    default:
      return 'rgba(234, 88, 12, 0.1)';
  }
}

function formatDate(dateString: string) {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return 'Today';
  } else if (diffDays === 1) {
    return 'Yesterday';
  } else if (diffDays < 7) {
    return `${diffDays} days ago`;
  } else {
    return date.toLocaleDateString();
  }
}

export function MessagesModal({ isOpen, onClose }: MessagesModalProps) {
  const { authenticatedFetch } = useAuthenticatedFetch();
  const { refreshProfile } = useUserProfile();
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);

  // Fetch messages when modal opens
  useEffect(() => {
    if (!isOpen) return;

    const fetchMessages = async () => {
      setIsLoading(true);
      try {
        const response = await authenticatedFetch('/api/messages');
        if (response.ok) {
          const data = await response.json();
          setMessages(data.messages || []);
        }
      } catch (error) {
        console.error('[Messages] Error fetching:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMessages();
  }, [isOpen, authenticatedFetch]);

  // Mark message as read
  const markAsRead = async (messageId: string) => {
    try {
      const response = await authenticatedFetch(`/api/messages/${messageId}/read`, {
        method: 'POST',
      });

      if (response.ok) {
        setMessages(prev =>
          prev.map(m => m.id === messageId ? { ...m, read: true } : m)
        );
        // Refresh profile to update unread count
        refreshProfile();
      }
    } catch (error) {
      console.error('[Messages] Error marking read:', error);
    }
  };

  const handleMessageClick = (message: Message) => {
    setSelectedMessage(message);
    if (!message.read) {
      markAsRead(message.id);
    }
  };

  const unreadCount = useMemo(() => messages.filter(m => !m.read).length, [messages]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: 'var(--color-black-80)' }}
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="relative rounded-xl max-w-lg w-full mx-4 max-h-[80vh] overflow-hidden flex flex-col"
            style={{
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
            }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="messages-modal-title"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div
              className="flex items-center justify-between p-4 border-b"
              style={{ borderColor: 'var(--color-border)' }}
            >
              <div className="flex items-center gap-2">
                <Bell size={20} className="text-accent" />
                <h2
                  id="messages-modal-title"
                  className="text-lg font-bold text-primary"
                >
                  Messages
                </h2>
                {unreadCount > 0 && (
                  <span
                    className="px-2 py-0.5 rounded-full text-xs font-medium"
                    style={{ background: 'var(--color-primary)', color: '#fff' }}
                  >
                    {unreadCount} new
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={onClose}
                className="p-1 rounded-full text-tertiary"
                aria-label="Close messages"
              >
                <X size={20} />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto">
              {isLoading ? (
                <div className="p-8 flex items-center justify-center" role="status" aria-label="Loading messages">
                  <Loader2 size={24} className="animate-spin text-accent" aria-hidden="true" />
                </div>
              ) : messages.length === 0 ? (
                <div className="p-8 text-center">
                  <div
                    className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center"
                    style={{ background: 'var(--color-elevated)' }}
                  >
                    <Mail size={32} className="text-muted" />
                  </div>
                  <p className="text-secondary">
                    No messages yet
                  </p>
                </div>
              ) : selectedMessage ? (
                /* Message Detail View */
                <div className="p-4">
                  <button
                    type="button"
                    onClick={() => setSelectedMessage(null)}
                    className="text-sm mb-4 text-accent"
                  >
                    &larr; Back to messages
                  </button>
                  <div
                    className="p-4 rounded-xl"
                    style={{ background: getTypeBg(selectedMessage.type) }}
                  >
                    <div className="flex items-start gap-3 mb-3">
                      {getTypeIcon(selectedMessage.type)}
                      <div>
                        <h3
                          className="font-medium text-primary"
                        >
                          {selectedMessage.title}
                        </h3>
                        <p
                          className="text-xs text-tertiary"
                        >
                          {formatDate(selectedMessage.createdAt)}
                        </p>
                      </div>
                    </div>
                    <p
                      className="text-sm whitespace-pre-wrap text-secondary"
                    >
                      {selectedMessage.content}
                    </p>
                  </div>
                </div>
              ) : (
                /* Messages List */
                <div className="divide-y" style={{ borderColor: 'var(--color-border)' }}>
                  {messages.map((message) => (
                    <button
                      key={message.id}
                      type="button"
                      onClick={() => handleMessageClick(message)}
                      className="w-full p-4 flex items-start gap-3 text-left transition-colors hover:bg-black/5"
                    >
                      <div className="mt-0.5">
                        {message.read ? (
                          <MailOpen size={18} className="text-muted" />
                        ) : (
                          <Mail size={18} className="text-accent" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p
                            className={`text-sm truncate text-primary ${!message.read ? 'font-medium' : ''}`}
                          >
                            {message.title}
                          </p>
                          {!message.read && (
                            <span
                              className="w-2 h-2 rounded-full flex-shrink-0"
                              style={{ background: 'var(--color-primary)' }}
                            />
                          )}
                        </div>
                        <p
                          className="text-xs truncate text-tertiary"
                        >
                          {formatDate(message.createdAt)}
                        </p>
                      </div>
                      {getTypeIcon(message.type)}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default MessagesModal;
