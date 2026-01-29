/**
 * useChatSocket Hook
 *
 * Manages Socket.io connection for Wojak chat rooms.
 * Supports multiple rooms (whale, holder) - room is determined by the JWT token.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import type {
  ChatMessage,
  PinnedMessage,
  ChatUser,
  ChatConnectionStatus,
  ServerToClientEvents,
  ClientToServerEvents,
} from '@/types/chat';

// Socket.io server URL - defaults to Fly.io deployment
const CHAT_SERVER_URL = import.meta.env.VITE_CHAT_SERVER_URL || 'https://wojak-chat.fly.dev';

// ============ Hook Types ============

interface UseChatSocketOptions {
  token: string;
  userName: string;
  userAvatar?: string;
}

interface UseChatSocketReturn {
  // Connection state
  status: ChatConnectionStatus;
  error: string | null;
  isAdmin: boolean;
  userId: string | null;
  roomName: string | null;

  // Data
  messages: ChatMessage[];
  pinnedMessages: PinnedMessage[];
  onlineUsers: ChatUser[];
  typingUsers: string[];

  // Actions
  sendMessage: (text: string, replyToId?: string) => void;
  startTyping: () => void;
  stopTyping: () => void;

  // Reaction actions
  addReaction: (messageId: string, emoji: string) => void;
  removeReaction: (messageId: string, emoji: string) => void;

  // Admin actions
  deleteMessage: (messageId: string) => void;

  // Utils
  disconnect: () => void;
  reconnect: () => void;
}

// ============ Hook Implementation ============

export function useChatSocket(options: UseChatSocketOptions | null): UseChatSocketReturn {
  const { token, userName, userAvatar } = options || { token: '', userName: '', userAvatar: undefined };

  // Connection state
  const [status, setStatus] = useState<ChatConnectionStatus>('disconnected');
  const [error, setError] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [roomName, setRoomName] = useState<string | null>(null);

  // Data state
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [pinnedMessages] = useState<PinnedMessage[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<ChatUser[]>([]);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);

  // Socket ref
  const socketRef = useRef<Socket<ServerToClientEvents, ClientToServerEvents> | null>(null);
  
  // Typing timeout tracking - prevent memory leaks from orphaned timeouts
  const typingTimeoutsRef = useRef<Map<string, NodeJS.Timeout>>(new Map());
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;

  // Connect to socket
  const connect = useCallback(() => {
    if (!token || socketRef.current?.connected) return;

    setStatus('connecting');
    setError(null);


    const socket = io(CHAT_SERVER_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: maxReconnectAttempts,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 10000,
    }) as Socket<ServerToClientEvents, ClientToServerEvents>;

    socketRef.current = socket;

    // ============ Connection Events ============

    socket.on('connect', () => {
      setStatus('connected');
      setError(null);
      reconnectAttempts.current = 0;
    });

    socket.on('connect_error', (err) => {
      console.error('[Chat] Connection error:', err.message);
      reconnectAttempts.current++;
      
      if (reconnectAttempts.current >= maxReconnectAttempts) {
        setStatus('error');
        setError(`Connection failed. Click Reconnect to try again.`);
      } else {
        setStatus('connecting');
        // Don't show attempt count - the status dot already shows connecting state
        setError(null);
      }
    });

    socket.on('disconnect', (reason) => {
      setStatus('disconnected');
      if (reason === 'io server disconnect') {
        setError('Disconnected by server');
      }
    });

    // ============ Chat Events ============

    socket.on('chat:connected', (data) => {
      setIsAdmin(data.isAdmin);
      setUserId(data.userId);
      setRoomName(data.roomName || null);
      
      // Send our identity (name/avatar) to the server
      socket.emit('chat:identify', {
        name: userName,
        avatar: userAvatar,
      });
    });

    socket.on('chat:error', (data) => {
      console.error('[Chat] Error:', data);
      setError(data.message);
      // Clear error after 5 seconds for non-critical errors
      if (data.code === 'RATE_LIMIT') {
        setTimeout(() => setError(null), 5000);
      }
    });

    socket.on('chat:message', (message) => {
      setMessages((prev) => [...prev, message]);
    });

    socket.on('chat:messages:history', (history) => {
      setMessages(history);
    });

    socket.on('chat:message:deleted', ({ messageId }) => {
      setMessages((prev) => prev.filter((m) => m.id !== messageId));
    });

    // ============ Reaction Events ============

    socket.on('chat:reaction:added', ({ messageId, emoji, userId, userName }) => {
      setMessages((prev) => prev.map((msg) => {
        if (msg.id !== messageId) return msg;
        
        const reactions = msg.reactions || [];
        const existingReaction = reactions.find((r) => r.emoji === emoji);
        
        if (existingReaction) {
          // Add user to existing reaction if not already there
          if (!existingReaction.users.find((u) => u.id === userId)) {
            return {
              ...msg,
              reactions: reactions.map((r) =>
                r.emoji === emoji
                  ? { ...r, users: [...r.users, { id: userId, name: userName }] }
                  : r
              ),
            };
          }
          return msg;
        }
        
        // Add new reaction
        return {
          ...msg,
          reactions: [...reactions, { emoji, users: [{ id: userId, name: userName }] }],
        };
      }));
    });

    socket.on('chat:reaction:removed', ({ messageId, emoji, userId }) => {
      setMessages((prev) => prev.map((msg) => {
        if (msg.id !== messageId) return msg;
        
        const reactions = msg.reactions || [];
        return {
          ...msg,
          reactions: reactions
            .map((r) =>
              r.emoji === emoji
                ? { ...r, users: r.users.filter((u) => u.id !== userId) }
                : r
            )
            .filter((r) => r.users.length > 0),
        };
      }));
    });

    // ============ User Events ============

    socket.on('chat:users:list', (users) => {
      // Ensure current user is in the list (server may not include self)
      // Use functional update to access currentUserId and set users atomically
      setUserId((currentUserId) => {
        let updatedUsers = users;
        if (currentUserId && userName) {
          const hasCurrentUser = users.some((u) => u.id === currentUserId);
          if (!hasCurrentUser) {
            updatedUsers = [...users, {
              id: currentUserId,
              name: userName,
              avatar: userAvatar,
              nftCount: 0,
              isAdmin: false,
              isMuted: false,
              joinedAt: Date.now(),
            }];
          }
        }
        // Set online users inside the functional update to ensure correct timing
        setOnlineUsers(updatedUsers);
        return currentUserId;
      });
    });

    socket.on('chat:user:joined', (user) => {
      setOnlineUsers((prev) => {
        if (prev.find((u) => u.id === user.id)) return prev;
        return [...prev, user];
      });
    });

    socket.on('chat:user:left', ({ userId }) => {
      setOnlineUsers((prev) => {
        const leavingUser = prev.find((u) => u.id === userId);
        if (leavingUser) {
          // Also remove from typing users
          setTypingUsers((typing) => typing.filter((name) => name !== leavingUser.name));
        }
        return prev.filter((u) => u.id !== userId);
      });
    });

    socket.on('chat:user:updated', (user) => {
      setOnlineUsers((prev) => {
        return prev.map((u) => (u.id === user.id ? user : u));
      });
    });

    // ============ Typing Events ============

    socket.on('chat:typing', ({ name }) => {
      // Clear existing timeout for this user to prevent duplicates
      const existingTimeout = typingTimeoutsRef.current.get(name);
      if (existingTimeout) {
        clearTimeout(existingTimeout);
      }
      
      setTypingUsers((prev) => {
        if (prev.includes(name)) return prev;
        return [...prev, name];
      });
      
      // Auto-remove after 4 seconds with tracked timeout
      const timeout = setTimeout(() => {
        setTypingUsers((prev) => prev.filter((n) => n !== name));
        typingTimeoutsRef.current.delete(name);
      }, 4000);
      
      typingTimeoutsRef.current.set(name, timeout);
    });

    socket.on('chat:stopped-typing', ({ userId }) => {
      // Use functional update to access current onlineUsers
      setOnlineUsers((currentUsers) => {
        const user = currentUsers.find((u) => u.id === userId);
        if (user) {
          // Clear timeout for this user
          const timeout = typingTimeoutsRef.current.get(user.name);
          if (timeout) {
            clearTimeout(timeout);
            typingTimeoutsRef.current.delete(user.name);
          }
          setTypingUsers((prev) => prev.filter((name) => name !== user.name));
        }
        return currentUsers; // Don't modify, just read
      });
    });

    return () => {
      // Clean up all typing timeouts to prevent memory leaks
      typingTimeoutsRef.current.forEach((timeout) => clearTimeout(timeout));
      typingTimeoutsRef.current.clear();
      
      socket.disconnect();
      socketRef.current = null;
    };
  }, [token, userName, userAvatar]); // Include userName/userAvatar for user list fallback

  // Connect on mount
  useEffect(() => {
    if (token) {
      let cleanup: (() => void) | undefined;
      queueMicrotask(() => {
        cleanup = connect();
      });
      return () => cleanup?.();
    }
  }, [token, connect]);

  // ============ Actions ============

  const sendMessage = useCallback(
    (text: string, replyToId?: string) => {
      if (!socketRef.current?.connected || !text.trim()) return;

      // Send plain text with optional reply
      socketRef.current.emit('chat:send', {
        text: text.trim(),
        name: userName,
        avatar: userAvatar,
        replyToId,
      });
    },
    [userName, userAvatar]
  );

  // ============ Reaction Actions ============

  const addReaction = useCallback((messageId: string, emoji: string) => {
    if (!socketRef.current?.connected) return;
    socketRef.current.emit('chat:react', { messageId, emoji });
  }, []);

  const removeReaction = useCallback((messageId: string, emoji: string) => {
    if (!socketRef.current?.connected) return;
    socketRef.current.emit('chat:unreact', { messageId, emoji });
  }, []);

  const startTyping = useCallback(() => {
    if (!socketRef.current?.connected) return;

    socketRef.current.emit('chat:typing');

    // Auto-stop typing after 3 seconds
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    typingTimeoutRef.current = setTimeout(() => {
      socketRef.current?.emit('chat:stopped-typing');
    }, 3000);
  }, []);

  const stopTyping = useCallback(() => {
    if (!socketRef.current?.connected) return;

    socketRef.current.emit('chat:stopped-typing');

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
  }, []);

  // ============ Admin Actions ============

  const deleteMessage = useCallback((messageId: string) => {
    if (!socketRef.current?.connected) return;
    socketRef.current.emit('admin:delete', { messageId });
  }, []);

  // ============ Utils ============

  const disconnect = useCallback(() => {
    socketRef.current?.disconnect();
    setStatus('disconnected');
  }, []);

  const reconnect = useCallback(() => {
    reconnectAttempts.current = 0;
    setError(null);
    if (socketRef.current) {
      socketRef.current.connect();
    } else {
      connect();
    }
  }, [connect]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      socketRef.current?.disconnect();
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  return {
    status,
    error,
    isAdmin,
    userId,
    roomName,
    messages,
    pinnedMessages,
    onlineUsers,
    typingUsers,
    sendMessage,
    startTyping,
    stopTyping,
    addReaction,
    removeReaction,
    deleteMessage,
    disconnect,
    reconnect,
  };
}

export default useChatSocket;
