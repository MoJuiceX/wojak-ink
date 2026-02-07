/**
 * MongoDB Database Models
 *
 * - messages: Regular chat messages with 7-day TTL
 * - pinnedMessages: Admin-pinned messages (persistent)
 * - mutedUsers: Temporarily muted users
 */

import mongoose, { Schema, Document } from 'mongoose';

// ============ Message Schema ============

export interface IMessage extends Document {
  text: string;           // Encrypted message content
  senderId: string;       // Clerk user ID
  senderName: string;     // Display name
  senderAvatar?: string;  // Avatar URL
  nftCount: number;       // Sender's NFT count
  createdAt: Date;        // Used for TTL index
  isDeleted: boolean;     // Soft delete flag
}

const messageSchema = new Schema<IMessage>({
  text: { type: String, required: true },
  senderId: { type: String, required: true, index: true },
  senderName: { type: String, required: true },
  senderAvatar: { type: String },
  nftCount: { type: Number, required: true },
  createdAt: { type: Date, default: Date.now },
  isDeleted: { type: Boolean, default: false },
});

// TTL Index: Auto-delete messages after 7 days (604800 seconds)
messageSchema.index({ createdAt: 1 }, { expireAfterSeconds: 604800 });

export const Message = mongoose.model<IMessage>('Message', messageSchema);

// ============ Pinned Message Schema ============

export interface IPinnedMessage extends Document {
  originalMessageId?: string; // Reference to original message (optional)
  text: string;               // Message content (may be unencrypted for announcements)
  senderId: string;
  senderName: string;
  senderAvatar?: string;
  nftCount: number;
  pinnedAt: Date;
  pinnedBy: string;           // Admin who pinned it
  isAnnouncement: boolean;    // True for admin-created announcements
  createdAt: Date;
}

const pinnedMessageSchema = new Schema<IPinnedMessage>({
  originalMessageId: { type: String },
  text: { type: String, required: true },
  senderId: { type: String, required: true },
  senderName: { type: String, required: true },
  senderAvatar: { type: String },
  nftCount: { type: Number, required: true },
  pinnedAt: { type: Date, default: Date.now },
  pinnedBy: { type: String, required: true },
  isAnnouncement: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
});

// No TTL on pinned messages - they persist until manually unpinned
export const PinnedMessage = mongoose.model<IPinnedMessage>('PinnedMessage', pinnedMessageSchema);

// ============ Muted User Schema ============

export interface IMutedUser extends Document {
  userId: string;
  mutedBy: string;        // Admin who muted
  mutedUntil: Date;
  reason?: string;
  createdAt: Date;
}

const mutedUserSchema = new Schema<IMutedUser>({
  userId: { type: String, required: true, unique: true },
  mutedBy: { type: String, required: true },
  mutedUntil: { type: Date, required: true },
  reason: { type: String },
  createdAt: { type: Date, default: Date.now },
});

// TTL: Auto-remove mute records when they expire
mutedUserSchema.index({ mutedUntil: 1 }, { expireAfterSeconds: 0 });

export const MutedUser = mongoose.model<IMutedUser>('MutedUser', mutedUserSchema);

// ============ Database Connection ============

export async function connectDatabase(mongoUri: string): Promise<void> {
  try {
    await mongoose.connect(mongoUri, {
      // Connection options
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
    console.log('[DB] Connected to MongoDB');

    // Ensure indexes are created
    await Message.createIndexes();
    await PinnedMessage.createIndexes();
    await MutedUser.createIndexes();
    console.log('[DB] Indexes created');
  } catch (error) {
    console.error('[DB] Connection error:', error);
    throw error;
  }
}
