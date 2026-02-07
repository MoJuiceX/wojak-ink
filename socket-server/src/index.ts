/**
 * Wojak 1% Holder Chat - Socket.io Server
 *
 * Real-time chat server for holders of ≥42 Wojak Farmers Plot NFTs.
 * Designed to run on Railway/Render with MongoDB for persistence.
 *
 * Features:
 * - JWT authentication (tokens from /api/chat/token)
 * - End-to-end encrypted messages (client-side AES)
 * - Auto-delete messages after 7 days (MongoDB TTL)
 * - Admin: pin messages, mute users, delete messages
 * - Typing indicators and online user list
 */

import express from 'express';
import http from 'http';
import cors from 'cors';
import { Server, Socket } from 'socket.io';
import { config } from 'dotenv';
import { verifyChatToken, ChatTokenPayload } from './auth';
import { connectDatabase, Message, PinnedMessage, MutedUser } from './db';

// Load environment variables
config();

const PORT = process.env.PORT || 3001;
const MONGODB_URI = process.env.MONGODB_URI || '';
const CHAT_JWT_SECRET = process.env.CHAT_JWT_SECRET || '';
const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS?.split(',') || [
  'https://wojak.ink',
  'http://localhost:5173',
];

const ROOM_NAME = 'wojak-1percent-gated';
const MAX_MESSAGE_LENGTH = 2000;
const RATE_LIMIT_MESSAGES = 10; // Max messages per minute
const RATE_LIMIT_WINDOW = 60000; // 1 minute

// ============ Types ============

interface AuthenticatedSocket extends Socket {
  user?: ChatTokenPayload;
  rateLimitCount?: number;
  rateLimitReset?: number;
}

interface OnlineUser {
  id: string;
  name: string;
  avatar?: string;
  nftCount: number;
  isAdmin: boolean;
  isMuted: boolean;
  mutedUntil?: number;
  joinedAt: number;
}

// ============ Server Setup ============

const app = express();
const server = http.createServer(app);

// CORS for HTTP endpoints
app.use(cors({
  origin: ALLOWED_ORIGINS,
  credentials: true,
}));

app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', room: ROOM_NAME, uptime: process.uptime() });
});

// Socket.io server
const io = new Server(server, {
  cors: {
    origin: ALLOWED_ORIGINS,
    methods: ['GET', 'POST'],
    credentials: true,
  },
  pingTimeout: 60000,
  pingInterval: 25000,
});

// ============ Online Users Map ============

const onlineUsers = new Map<string, OnlineUser>();

// ============ Authentication Middleware ============

io.use(async (socket: AuthenticatedSocket, next) => {
  try {
    const token = socket.handshake.auth.token as string;

    if (!token) {
      return next(new Error('Authentication required'));
    }

    const payload = verifyChatToken(token, CHAT_JWT_SECRET);
    if (!payload) {
      return next(new Error('Invalid or expired token'));
    }

    // Store user info on socket
    socket.user = payload;
    next();
  } catch (error) {
    console.error('[Socket] Auth error:', error);
    next(new Error('Authentication failed'));
  }
});

// ============ Socket Event Handlers ============

io.on('connection', async (socket: AuthenticatedSocket) => {
  const user = socket.user!;
  console.log(`[Socket] User connected: ${user.userId} (${user.nftCount} NFTs)`);

  // Check if user is muted
  const muteRecord = await MutedUser.findOne({ userId: user.userId });
  const isMuted = !!(muteRecord && muteRecord.mutedUntil > new Date());

  // Add to online users
  const onlineUser: OnlineUser = {
    id: user.userId,
    name: `Holder #${user.nftCount}`, // Default name, client can provide better
    avatar: undefined,
    nftCount: user.nftCount,
    isAdmin: user.isAdmin || false,
    isMuted,
    mutedUntil: muteRecord?.mutedUntil.getTime(),
    joinedAt: Date.now(),
  };
  onlineUsers.set(user.userId, onlineUser);

  // Join the gated room
  socket.join(ROOM_NAME);

  // Send connection confirmation
  socket.emit('chat:connected', {
    userId: user.userId,
    isAdmin: user.isAdmin || false,
  });

  // Send current online users
  socket.emit('chat:users:list', Array.from(onlineUsers.values()));

  // Send recent message history (last 50 messages)
  const recentMessages = await Message.find({ isDeleted: false })
    .sort({ createdAt: -1 })
    .limit(50)
    .lean();

  socket.emit('chat:messages:history', recentMessages.reverse().map(msg => ({
    id: msg._id.toString(),
    text: msg.text,
    senderId: msg.senderId,
    senderName: msg.senderName,
    senderAvatar: msg.senderAvatar,
    nftCount: msg.nftCount,
    timestamp: msg.createdAt.getTime(),
  })));

  // Send pinned messages
  const pinnedMessages = await PinnedMessage.find().sort({ pinnedAt: -1 }).lean();
  socket.emit('chat:pinned:list', pinnedMessages.map(msg => ({
    id: msg._id.toString(),
    text: msg.text,
    senderId: msg.senderId,
    senderName: msg.senderName,
    senderAvatar: msg.senderAvatar,
    nftCount: msg.nftCount,
    timestamp: msg.createdAt.getTime(),
    isPinned: true,
    pinnedAt: msg.pinnedAt.getTime(),
    pinnedBy: msg.pinnedBy,
  })));

  // Broadcast user joined to room
  socket.to(ROOM_NAME).emit('chat:user:joined', onlineUser);

  // ============ Message Events ============

  socket.on('chat:send', async (data: { text: string; name?: string; avatar?: string }) => {
    const now = Date.now();

    // Rate limiting
    if (!socket.rateLimitReset || now > socket.rateLimitReset) {
      socket.rateLimitCount = 0;
      socket.rateLimitReset = now + RATE_LIMIT_WINDOW;
    }
    socket.rateLimitCount = (socket.rateLimitCount || 0) + 1;

    if (socket.rateLimitCount > RATE_LIMIT_MESSAGES) {
      socket.emit('chat:error', {
        message: 'Rate limit exceeded. Please slow down.',
        code: 'RATE_LIMIT',
      });
      return;
    }

    // Check if muted
    const muteRecord = await MutedUser.findOne({ userId: user.userId });
    if (muteRecord && muteRecord.mutedUntil > new Date()) {
      socket.emit('chat:error', {
        message: `You are muted until ${muteRecord.mutedUntil.toLocaleString()}`,
        code: 'MUTED',
      });
      return;
    }

    // Validate message
    if (!data.text || typeof data.text !== 'string') {
      socket.emit('chat:error', { message: 'Invalid message', code: 'INVALID' });
      return;
    }

    const text = data.text.trim();
    if (text.length === 0 || text.length > MAX_MESSAGE_LENGTH) {
      socket.emit('chat:error', {
        message: `Message must be 1-${MAX_MESSAGE_LENGTH} characters`,
        code: 'INVALID_LENGTH',
      });
      return;
    }

    // Update user name/avatar if provided
    const currentUser = onlineUsers.get(user.userId);
    if (currentUser) {
      if (data.name) currentUser.name = data.name;
      if (data.avatar) currentUser.avatar = data.avatar;
    }

    // Save to database
    const message = new Message({
      text, // Already encrypted by client
      senderId: user.userId,
      senderName: data.name || currentUser?.name || `Holder #${user.nftCount}`,
      senderAvatar: data.avatar || currentUser?.avatar,
      nftCount: user.nftCount,
    });

    await message.save();

    // Broadcast to room
    const messagePayload = {
      id: message._id.toString(),
      text: message.text,
      senderId: message.senderId,
      senderName: message.senderName,
      senderAvatar: message.senderAvatar,
      nftCount: message.nftCount,
      timestamp: message.createdAt.getTime(),
    };

    io.to(ROOM_NAME).emit('chat:message', messagePayload);
  });

  // Typing indicators
  socket.on('chat:typing', () => {
    const currentUser = onlineUsers.get(user.userId);
    socket.to(ROOM_NAME).emit('chat:typing', {
      userId: user.userId,
      name: currentUser?.name || `Holder #${user.nftCount}`,
    });
  });

  socket.on('chat:stopped-typing', () => {
    socket.to(ROOM_NAME).emit('chat:stopped-typing', { userId: user.userId });
  });

  // ============ Admin Events ============

  socket.on('admin:delete', async (data: { messageId: string }) => {
    if (!user.isAdmin) {
      socket.emit('chat:error', { message: 'Admin access required', code: 'UNAUTHORIZED' });
      return;
    }

    await Message.updateOne({ _id: data.messageId }, { isDeleted: true });
    io.to(ROOM_NAME).emit('chat:message:deleted', { messageId: data.messageId });
    console.log(`[Admin] Message ${data.messageId} deleted by ${user.userId}`);
  });

  socket.on('admin:pin', async (data: { messageId: string }) => {
    if (!user.isAdmin) {
      socket.emit('chat:error', { message: 'Admin access required', code: 'UNAUTHORIZED' });
      return;
    }

    const originalMessage = await Message.findById(data.messageId);
    if (!originalMessage) {
      socket.emit('chat:error', { message: 'Message not found', code: 'NOT_FOUND' });
      return;
    }

    const pinnedMessage = new PinnedMessage({
      originalMessageId: data.messageId,
      text: originalMessage.text,
      senderId: originalMessage.senderId,
      senderName: originalMessage.senderName,
      senderAvatar: originalMessage.senderAvatar,
      nftCount: originalMessage.nftCount,
      pinnedBy: user.userId,
      createdAt: originalMessage.createdAt,
    });

    await pinnedMessage.save();
    io.to(ROOM_NAME).emit('chat:message:pinned', {
      messageId: data.messageId,
      pinnedBy: user.userId,
    });
    console.log(`[Admin] Message ${data.messageId} pinned by ${user.userId}`);
  });

  socket.on('admin:unpin', async (data: { messageId: string }) => {
    if (!user.isAdmin) {
      socket.emit('chat:error', { message: 'Admin access required', code: 'UNAUTHORIZED' });
      return;
    }

    await PinnedMessage.deleteOne({ _id: data.messageId });
    io.to(ROOM_NAME).emit('chat:message:unpinned', { messageId: data.messageId });
    console.log(`[Admin] Message ${data.messageId} unpinned by ${user.userId}`);
  });

  socket.on('admin:mute', async (data: { userId: string; durationMinutes: number }) => {
    if (!user.isAdmin) {
      socket.emit('chat:error', { message: 'Admin access required', code: 'UNAUTHORIZED' });
      return;
    }

    const mutedUntil = new Date(Date.now() + data.durationMinutes * 60 * 1000);

    await MutedUser.findOneAndUpdate(
      { userId: data.userId },
      { userId: data.userId, mutedBy: user.userId, mutedUntil },
      { upsert: true }
    );

    // Update online user state
    const targetUser = onlineUsers.get(data.userId);
    if (targetUser) {
      targetUser.isMuted = true;
      targetUser.mutedUntil = mutedUntil.getTime();
    }

    io.to(ROOM_NAME).emit('chat:user:muted', {
      userId: data.userId,
      mutedUntil: mutedUntil.getTime(),
    });
    console.log(`[Admin] User ${data.userId} muted for ${data.durationMinutes}min by ${user.userId}`);
  });

  socket.on('admin:unmute', async (data: { userId: string }) => {
    if (!user.isAdmin) {
      socket.emit('chat:error', { message: 'Admin access required', code: 'UNAUTHORIZED' });
      return;
    }

    await MutedUser.deleteOne({ userId: data.userId });

    const targetUser = onlineUsers.get(data.userId);
    if (targetUser) {
      targetUser.isMuted = false;
      targetUser.mutedUntil = undefined;
    }

    io.to(ROOM_NAME).emit('chat:user:unmuted', { userId: data.userId });
    console.log(`[Admin] User ${data.userId} unmuted by ${user.userId}`);
  });

  // Admin: Create announcement (persistent pinned message)
  socket.on('admin:announce', async (data: { text: string }) => {
    if (!user.isAdmin) {
      socket.emit('chat:error', { message: 'Admin access required', code: 'UNAUTHORIZED' });
      return;
    }

    const announcement = new PinnedMessage({
      text: data.text, // Not encrypted - it's a public announcement
      senderId: user.userId,
      senderName: 'Admin',
      nftCount: user.nftCount,
      pinnedBy: user.userId,
      isAnnouncement: true,
    });

    await announcement.save();

    io.to(ROOM_NAME).emit('chat:pinned:list', [
      {
        id: announcement._id.toString(),
        text: announcement.text,
        senderId: announcement.senderId,
        senderName: announcement.senderName,
        nftCount: announcement.nftCount,
        timestamp: announcement.createdAt.getTime(),
        isPinned: true,
        pinnedAt: announcement.pinnedAt.getTime(),
        pinnedBy: announcement.pinnedBy,
      },
      ...(await PinnedMessage.find().sort({ pinnedAt: -1 }).lean()).slice(1).map(msg => ({
        id: msg._id.toString(),
        text: msg.text,
        senderId: msg.senderId,
        senderName: msg.senderName,
        nftCount: msg.nftCount,
        timestamp: msg.createdAt.getTime(),
        isPinned: true,
        pinnedAt: msg.pinnedAt.getTime(),
        pinnedBy: msg.pinnedBy,
      })),
    ]);
  });

  // ============ Disconnect ============

  socket.on('disconnect', () => {
    console.log(`[Socket] User disconnected: ${user.userId}`);
    onlineUsers.delete(user.userId);
    socket.to(ROOM_NAME).emit('chat:user:left', { userId: user.userId });
  });
});

// ============ Start Server ============

async function start() {
  // Validate required environment variables
  if (!MONGODB_URI) {
    console.error('[Server] MONGODB_URI is required');
    process.exit(1);
  }

  if (!CHAT_JWT_SECRET) {
    console.error('[Server] CHAT_JWT_SECRET is required');
    process.exit(1);
  }

  // Connect to database
  await connectDatabase(MONGODB_URI);

  // Start server
  server.listen(PORT, () => {
    console.log(`[Server] Wojak Chat running on port ${PORT}`);
    console.log(`[Server] Allowed origins: ${ALLOWED_ORIGINS.join(', ')}`);
  });
}

start().catch((error) => {
  console.error('[Server] Startup error:', error);
  process.exit(1);
});
