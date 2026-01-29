/**
 * Wojak Chat Server - Multi-Room Support
 *
 * Supports multiple chat rooms:
 * - wojak-whale: Top 1% holders (42+ NFTs)
 * - wojak-holder: All holders (1+ NFT)
 *
 * Features:
 * - MongoDB persistence (last 50 messages per room, 3-day TTL)
 * - Per-room online users and typing indicators
 * - Profile name + avatar support
 * - Admin delete capability
 * - 20 msg/min rate limiting
 */

import express from 'express';
import http from 'http';
import cors from 'cors';
import { Server, Socket } from 'socket.io';
import { config } from 'dotenv';
import mongoose from 'mongoose';

// Load environment variables
config();

const PORT = process.env.PORT || 3001;
const MONGODB_URI = process.env.MONGODB_URI || '';
const CHAT_JWT_SECRET = process.env.CHAT_JWT_SECRET || '';
const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS?.split(',') || [
  'https://wojak.ink',
  'http://localhost:5173',
];

// Room configuration
const VALID_ROOMS = ['wojak-whale', 'wojak-holder'] as const;
type RoomName = typeof VALID_ROOMS[number];

// Legacy room name mapping for backwards compatibility
const LEGACY_ROOM_MAP: Record<string, RoomName> = {
  'wojak-1percent-gated': 'wojak-whale',
  'wojak-elite': 'wojak-whale',
};

const MAX_MESSAGES = 200;
const MAX_MESSAGE_LENGTH = 2000;
const RATE_LIMIT_MESSAGES = 20;
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const MESSAGE_TTL_DAYS = 3;

// ============ MongoDB Schemas ============

const reactionSchema = new mongoose.Schema({
  emoji: { type: String, required: true },
  users: [{
    id: { type: String, required: true },
    name: { type: String, required: true },
  }],
}, { _id: false });

const replySchema = new mongoose.Schema({
  id: { type: String, required: true },
  text: { type: String, required: true },
  senderName: { type: String, required: true },
}, { _id: false });

const messageSchema = new mongoose.Schema({
  text: { type: String, required: true },
  senderId: { type: String, required: true },
  senderName: { type: String, required: true },
  senderAvatar: { type: String },
  nftCount: { type: Number, required: true },
  replyTo: { type: replySchema, default: null },
  reactions: { type: [reactionSchema], default: [] },
  createdAt: { type: Date, default: Date.now, expires: MESSAGE_TTL_DAYS * 24 * 60 * 60 },
});

// Separate collections for each room
const WhaleMessage = mongoose.model('WhaleMessage', messageSchema);
const HolderMessage = mongoose.model('HolderMessage', messageSchema);

// Legacy Message model for migration (old single-room collection)
const LegacyMessage = mongoose.model('LegacyMessage', messageSchema, 'messages');

function getMessageModel(roomName: RoomName) {
  return roomName === 'wojak-whale' ? WhaleMessage : HolderMessage;
}

// ============ JWT Verification ============

interface ChatTokenPayload {
  userId: string;
  walletAddress: string;
  nftCount: number;
  isAdmin?: boolean;
  chatType?: 'whale' | 'holder';
  roomName?: string;
  exp: number;
}

function base64UrlDecode(input: string): string {
  const base64 = input.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64.padEnd(base64.length + (4 - (base64.length % 4)) % 4, '=');
  return Buffer.from(padded, 'base64').toString('utf-8');
}

function verifyChatToken(token: string, secret: string): ChatTokenPayload | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    // Verify signature using timing-safe comparison to prevent timing attacks
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const crypto = require('crypto');
    const [header, payload, signature] = parts;
    const message = `${header}.${payload}`;
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(message)
      .digest('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    // Use timing-safe comparison to prevent timing attacks
    const sigBuffer = Buffer.from(signature, 'utf-8');
    const expectedBuffer = Buffer.from(expectedSignature, 'utf-8');
    
    if (sigBuffer.length !== expectedBuffer.length || 
        !crypto.timingSafeEqual(sigBuffer, expectedBuffer)) {
      console.error('[Auth] Invalid signature');
      return null;
    }

    const decoded = JSON.parse(base64UrlDecode(payload)) as ChatTokenPayload;

    // Validate expiration
    if (decoded.exp < Math.floor(Date.now() / 1000)) {
      console.error('[Auth] Token expired');
      return null;
    }

    return decoded;
  } catch (error) {
    console.error('[Auth] Token verification error:', error);
    return null;
  }
}

// ============ Types ============

interface AuthenticatedSocket extends Socket {
  user?: ChatTokenPayload;
  roomName?: RoomName;
  userName?: string;
  userAvatar?: string;
  rateLimitCount?: number;
  rateLimitReset?: number;
}

interface OnlineUser {
  id: string;
  name: string;
  avatar?: string;
  nftCount: number;
  isAdmin: boolean;
}

// ============ Server Setup ============

const app = express();
const server = http.createServer(app);

app.use(cors({ origin: ALLOWED_ORIGINS, credentials: true }));
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    rooms: VALID_ROOMS,
    uptime: process.uptime(),
    onlineUsers: {
      whale: roomOnlineUsers.get('wojak-whale')?.size || 0,
      holder: roomOnlineUsers.get('wojak-holder')?.size || 0,
    },
  });
});

const io = new Server(server, {
  cors: {
    origin: ALLOWED_ORIGINS,
    methods: ['GET', 'POST'],
    credentials: true,
  },
  pingTimeout: 60000,
  pingInterval: 25000,
});

// ============ Per-Room State ============

const roomOnlineUsers = new Map<RoomName, Map<string, OnlineUser>>();
// Track socket count per user per room (for multi-tab support)
const userSocketCount = new Map<RoomName, Map<string, number>>();

// Initialize room maps
for (const room of VALID_ROOMS) {
  roomOnlineUsers.set(room, new Map());
  userSocketCount.set(room, new Map());
}

/**
 * Get the room name from token, with backwards compatibility
 */
function getRoomFromToken(payload: ChatTokenPayload): RoomName {
  // New tokens have roomName
  if (payload.roomName) {
    // Check if it's a valid room
    if (VALID_ROOMS.includes(payload.roomName as RoomName)) {
      return payload.roomName as RoomName;
    }
    // Check legacy mapping
    if (LEGACY_ROOM_MAP[payload.roomName]) {
      return LEGACY_ROOM_MAP[payload.roomName];
    }
  }
  
  // Legacy tokens without roomName default to whale (was the only room before)
  return 'wojak-whale';
}

// ============ Auth Middleware ============

io.use((socket: AuthenticatedSocket, next) => {
  const token = socket.handshake.auth.token as string;

  if (!token) {
    return next(new Error('Authentication required'));
  }

  const payload = verifyChatToken(token, CHAT_JWT_SECRET);
  if (!payload) {
    return next(new Error('Invalid or expired token'));
  }

  socket.user = payload;
  socket.roomName = getRoomFromToken(payload);
  next();
});

// ============ Socket Events ============

io.on('connection', async (socket: AuthenticatedSocket) => {
  const user = socket.user!;
  const roomName = socket.roomName!;
  
  console.log(`[Socket] Connected: ${user.userId} to ${roomName} (${user.nftCount} NFTs, admin: ${user.isAdmin})`);

  // Join room
  socket.join(roomName);

  // Get room's online users map and socket count map
  const roomUsers = roomOnlineUsers.get(roomName)!;
  const socketCounts = userSocketCount.get(roomName)!;

  // Track socket count for multi-tab support
  const currentCount = socketCounts.get(user.userId) || 0;
  socketCounts.set(user.userId, currentCount + 1);
  const isFirstConnection = currentCount === 0;

  // Add to online users (only if first connection)
  const onlineUser: OnlineUser = {
    id: user.userId,
    name: `Holder #${user.nftCount}`,
    avatar: undefined,
    nftCount: user.nftCount,
    isAdmin: user.isAdmin || false,
  };
  
  if (isFirstConnection) {
    roomUsers.set(user.userId, onlineUser);
  }

  // Send connection confirmation
  socket.emit('chat:connected', {
    userId: user.userId,
    isAdmin: user.isAdmin || false,
    roomName,
  });

  // Send online users for this room
  socket.emit('chat:users:list', Array.from(roomUsers.values()));

  // Send last 50 messages from this room's collection
  try {
    const MessageModel = getMessageModel(roomName);
    const messages = await MessageModel.find()
      .sort({ createdAt: -1 })
      .limit(MAX_MESSAGES)
      .lean();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    socket.emit('chat:messages:history', messages.reverse().map((msg: any) => ({
      id: msg._id.toString(),
      text: msg.text,
      senderId: msg.senderId,
      senderName: msg.senderName,
      senderAvatar: msg.senderAvatar,
      nftCount: msg.nftCount,
      timestamp: msg.createdAt.getTime(),
      replyTo: msg.replyTo || null,
      reactions: msg.reactions || [],
    })));
  } catch (error) {
    console.error('[Socket] Error fetching messages:', error);
  }

  // Broadcast user joined to room (only if first connection)
  if (isFirstConnection) {
    socket.to(roomName).emit('chat:user:joined', onlineUser);
  }

  // ============ Identity Event ============

  socket.on('chat:identify', (data: { name: string; avatar?: string }) => {
    const { name, avatar } = data;
    
    // Update socket's stored name/avatar
    socket.userName = name || socket.userName;
    socket.userAvatar = avatar || socket.userAvatar;
    
    // Update online user info
    const currentUser = roomUsers.get(user.userId);
    if (currentUser) {
      currentUser.name = name || currentUser.name;
      currentUser.avatar = avatar;
      
      // Broadcast updated user info to room
      io.to(roomName).emit('chat:user:updated', currentUser);
    }
  });

  // ============ Message Events ============

  socket.on('chat:send', async (data: { text: string; name?: string; avatar?: string; replyToId?: string }) => {
    const now = Date.now();

    // Rate limiting
    if (!socket.rateLimitReset || now > socket.rateLimitReset) {
      socket.rateLimitCount = 0;
      socket.rateLimitReset = now + RATE_LIMIT_WINDOW;
    }
    socket.rateLimitCount = (socket.rateLimitCount || 0) + 1;

    if (socket.rateLimitCount > RATE_LIMIT_MESSAGES) {
      socket.emit('chat:error', { message: 'Slow down! Max 20 messages per minute.', code: 'RATE_LIMIT' });
      return;
    }

    // Validate message
    if (!data.text || typeof data.text !== 'string') {
      socket.emit('chat:error', { message: 'Invalid message', code: 'INVALID' });
      return;
    }

    const text = data.text.trim();
    if (text.length === 0 || text.length > MAX_MESSAGE_LENGTH) {
      socket.emit('chat:error', { message: `Message must be 1-${MAX_MESSAGE_LENGTH} characters`, code: 'INVALID_LENGTH' });
      return;
    }

    // Update user name/avatar
    const senderName = data.name || socket.userName || `Holder #${user.nftCount}`;
    const senderAvatar = data.avatar || socket.userAvatar;
    socket.userName = senderName;
    socket.userAvatar = senderAvatar;

    // Update online user info
    const currentUser = roomUsers.get(user.userId);
    if (currentUser) {
      currentUser.name = senderName;
      currentUser.avatar = senderAvatar;
    }

    // Handle reply - fetch the original message if replyToId provided
    let replyTo = null;
    if (data.replyToId) {
      try {
        const MessageModel = getMessageModel(roomName);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const originalMsg = await MessageModel.findById(data.replyToId).lean() as any;
        if (originalMsg) {
          replyTo = {
            id: originalMsg._id.toString(),
            text: originalMsg.text.slice(0, 100) + (originalMsg.text.length > 100 ? '...' : ''),
            senderName: originalMsg.senderName,
          };
        }
      } catch (err) {
        console.error('[Socket] Error fetching reply message:', err);
      }
    }

    // Save to room's collection
    try {
      const MessageModel = getMessageModel(roomName);
      const message = new MessageModel({
        text,
        senderId: user.userId,
        senderName,
        senderAvatar,
        nftCount: user.nftCount,
        replyTo,
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
        replyTo: message.replyTo,
        reactions: [],
      };

      io.to(roomName).emit('chat:message', messagePayload);
    } catch (error) {
      console.error('[Socket] Error saving message:', error);
      socket.emit('chat:error', { message: 'Failed to send message', code: 'SAVE_ERROR' });
    }
  });

  // Typing indicators
  socket.on('chat:typing', () => {
    const currentUser = roomUsers.get(user.userId);
    socket.to(roomName).emit('chat:typing', {
      userId: user.userId,
      name: currentUser?.name || `Holder #${user.nftCount}`,
    });
  });

  socket.on('chat:stopped-typing', () => {
    socket.to(roomName).emit('chat:stopped-typing', { userId: user.userId });
  });

  // ============ Reaction Events ============

  socket.on('chat:react', async (data: { messageId: string; emoji: string }) => {
    const { messageId, emoji } = data;
    const senderName = socket.userName || `Holder #${user.nftCount}`;

    // Validate messageId is a valid ObjectId
    if (!mongoose.Types.ObjectId.isValid(messageId)) {
      socket.emit('chat:error', { message: 'Invalid message ID', code: 'INVALID_ID' });
      return;
    }

    try {
      const MessageModel = getMessageModel(roomName);
      const userReaction = { id: user.userId, name: senderName };

      // Atomic update: Try to add user to existing reaction first
      let result = await MessageModel.findOneAndUpdate(
        { 
          _id: messageId, 
          'reactions.emoji': emoji,
          'reactions.users.id': { $ne: user.userId } // User hasn't reacted yet
        },
        { 
          $addToSet: { 'reactions.$.users': userReaction }
        },
        { new: true }
      );

      // If no matching reaction found, create a new one atomically
      if (!result) {
        result = await MessageModel.findOneAndUpdate(
          { 
            _id: messageId,
            'reactions.emoji': { $ne: emoji } // Emoji reaction doesn't exist yet
          },
          { 
            $push: { 
              reactions: { emoji, users: [userReaction] }
            }
          },
          { new: true }
        );
      }

      // If still no result, message doesn't exist or user already reacted
      if (!result) {
        // Check if message exists
        const exists = await MessageModel.exists({ _id: messageId });
        if (!exists) {
          socket.emit('chat:error', { message: 'Message not found', code: 'NOT_FOUND' });
        }
        // Otherwise user already reacted - silently ignore
        return;
      }

      // Broadcast to room
      io.to(roomName).emit('chat:reaction:added', {
        messageId,
        emoji,
        userId: user.userId,
        userName: senderName,
      });
    } catch (error) {
      console.error('[Socket] Error adding reaction:', error);
      socket.emit('chat:error', { message: 'Failed to add reaction', code: 'REACTION_ERROR' });
    }
  });

  socket.on('chat:unreact', async (data: { messageId: string; emoji: string }) => {
    const { messageId, emoji } = data;

    // Validate messageId is a valid ObjectId
    if (!mongoose.Types.ObjectId.isValid(messageId)) {
      socket.emit('chat:error', { message: 'Invalid message ID', code: 'INVALID_ID' });
      return;
    }

    try {
      const MessageModel = getMessageModel(roomName);

      // Atomic update: Remove user from the reaction
      const result = await MessageModel.findOneAndUpdate(
        { 
          _id: messageId,
          'reactions.emoji': emoji,
          'reactions.users.id': user.userId // User has reacted
        },
        { 
          $pull: { 'reactions.$.users': { id: user.userId } }
        },
        { new: true }
      );

      if (!result) {
        // Check if message exists
        const exists = await MessageModel.exists({ _id: messageId });
        if (!exists) {
          socket.emit('chat:error', { message: 'Message not found', code: 'NOT_FOUND' });
        }
        // Otherwise user hasn't reacted to this emoji - silently ignore
        return;
      }

      // Clean up empty reactions (remove reactions with no users)
      await MessageModel.updateOne(
        { _id: messageId },
        { $pull: { reactions: { users: { $size: 0 } } } }
      );

      // Broadcast to room
      io.to(roomName).emit('chat:reaction:removed', {
        messageId,
        emoji,
        userId: user.userId,
      });
    } catch (error) {
      console.error('[Socket] Error removing reaction:', error);
      socket.emit('chat:error', { message: 'Failed to remove reaction', code: 'REACTION_ERROR' });
    }
  });

  // ============ Admin Events ============

  socket.on('admin:delete', async (data: { messageId: string }) => {
    if (!user.isAdmin) {
      socket.emit('chat:error', { message: 'Admin access required', code: 'UNAUTHORIZED' });
      return;
    }

    try {
      const MessageModel = getMessageModel(roomName);
      await MessageModel.deleteOne({ _id: data.messageId });
      io.to(roomName).emit('chat:message:deleted', { messageId: data.messageId });
      console.log(`[Admin] Message ${data.messageId} deleted by ${user.userId} in ${roomName}`);
    } catch (error) {
      console.error('[Admin] Error deleting message:', error);
    }
  });

  // ============ Disconnect ============

  socket.on('disconnect', () => {
    try {
      // Decrement socket count for multi-tab support
      const currentCount = socketCounts.get(user.userId) || 1;
      const newCount = currentCount - 1;
      
      console.log(`[Socket] Disconnected: ${user.userId} from ${roomName} (remaining sockets: ${newCount})`);
      
      if (newCount <= 0) {
        // Last socket disconnected - remove user from online list
        socketCounts.delete(user.userId);
        roomUsers.delete(user.userId);
        socket.to(roomName).emit('chat:user:left', { userId: user.userId });
      } else {
        // User still has other connections - just update count
        socketCounts.set(user.userId, newCount);
      }
    } catch (error) {
      console.error('[Socket] Error in disconnect handler:', error);
    }
  });
});

// ============ Start Server ============

/**
 * Migrate legacy messages from old 'messages' collection to 'whalemessages'
 * This runs once on startup and is idempotent (safe to run multiple times)
 */
async function migrateMessages() {
  try {
    const legacyCount = await LegacyMessage.countDocuments();
    if (legacyCount === 0) {
      console.log('[Migration] No legacy messages to migrate');
      return;
    }

    const whaleCount = await WhaleMessage.countDocuments();
    console.log(`[Migration] Found ${legacyCount} legacy messages, ${whaleCount} whale messages`);

    // Get IDs of existing whale messages to avoid duplicates
    const existingIds = new Set(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (await WhaleMessage.find({}, { _id: 1 }).lean()).map((m: any) => m._id.toString())
    );

    // Get legacy messages that haven't been migrated
    const legacyMessages = await LegacyMessage.find({}).lean();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const newMessages = legacyMessages.filter((m: any) => !existingIds.has(m._id.toString()));

    if (newMessages.length === 0) {
      console.log('[Migration] All legacy messages already migrated');
      return;
    }

    // Insert new messages
    await WhaleMessage.insertMany(newMessages, { ordered: false });
    console.log(`[Migration] Successfully migrated ${newMessages.length} messages to WhaleMessage`);
  } catch (error) {
    console.error('[Migration] Error during message migration:', error);
    // Don't fail startup on migration error
  }
}

async function start() {
  if (!CHAT_JWT_SECRET) {
    console.error('[Server] CHAT_JWT_SECRET is required');
    process.exit(1);
  }

  // Connect to MongoDB
  if (MONGODB_URI) {
    try {
      await mongoose.connect(MONGODB_URI);
      console.log('[DB] Connected to MongoDB');
      
      // Run message migration on startup
      await migrateMessages();
    } catch (error) {
      console.error('[DB] MongoDB connection error:', error);
      console.log('[DB] Running without persistence (in-memory only)');
    }
  } else {
    console.log('[DB] No MONGODB_URI - running without persistence');
  }

  server.listen(PORT, () => {
    console.log(`[Server] Wojak Chat running on port ${PORT}`);
    console.log(`[Server] Rooms: ${VALID_ROOMS.join(', ')}`);
    console.log(`[Server] Allowed origins: ${ALLOWED_ORIGINS.join(', ')}`);
  });
}

start().catch((error) => {
  console.error('[Server] Startup error:', error);
  process.exit(1);
});
