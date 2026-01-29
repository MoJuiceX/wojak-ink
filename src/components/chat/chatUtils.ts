/**
 * Chat Utilities - Shared utility functions for chat rooms
 */

import React from 'react';
import type { ChatMessage } from '@/types/chat';

/**
 * Format timestamp to human-readable time (e.g., "2:30 PM")
 */
export function formatTime(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

/**
 * Format date for separator display (Today, Yesterday, or date)
 */
export function formatDateSeparator(timestamp: number): string {
  const date = new Date(timestamp);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (date.toDateString() === today.toDateString()) {
    return 'Today';
  } else if (date.toDateString() === yesterday.toDateString()) {
    return 'Yesterday';
  }
  return date.toLocaleDateString([], { month: 'long', day: 'numeric' });
}

/**
 * Determine if a date separator should be shown between messages
 */
export function shouldShowDateSeparator(
  currentMsg: ChatMessage,
  prevMsg: ChatMessage | undefined
): boolean {
  if (!prevMsg) return true;
  const currentDate = new Date(currentMsg.timestamp).toDateString();
  const prevDate = new Date(prevMsg.timestamp).toDateString();
  return currentDate !== prevDate;
}

/**
 * Determine if a message should be grouped with the previous one
 * Groups messages from the same sender within 5 minutes
 */
export function shouldGroupWithPrevious(
  currentMsg: ChatMessage,
  prevMsg: ChatMessage | undefined
): boolean {
  if (!prevMsg) return false;
  // Group if same sender and within 5 minutes
  const timeDiff = currentMsg.timestamp - prevMsg.timestamp;
  return currentMsg.senderId === prevMsg.senderId && timeDiff < 5 * 60 * 1000;
}

/**
 * Parse @mentions in message text and return React nodes
 */
export function parseMentions(text: string): React.ReactNode[] {
  const mentionRegex = /@(\w+)/g;
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match;

  while ((match = mentionRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    parts.push(
      React.createElement(
        'span',
        { key: match.index, className: 'gc-mention' },
        `@${match[1]}`
      )
    );
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts.length > 0 ? parts : [text];
}

// Reaction emoji options available in chat
export const REACTION_EMOJIS = ['👍', '👎', '🍊', '🌱', '😂', '😢'];

// MintGarden collection URL
export const MINTGARDEN_URL = 'https://mintgarden.io/collections/wojak-farmers-plot-col10hfq4hml2z0z0wutu3a9hvt60qy9fcq4k4dznsfncey4lu6kpt3su7u9ah';

// Boot sequence messages for chat entry animation
export const BOOT_MESSAGES = [
  { text: 'INITIALIZING SECURE CONNECTION...', delay: 0 },
  { text: 'VERIFYING NFT HOLDINGS...', delay: 300 },
  { text: 'AUTHENTICATING USER...', delay: 600 },
  { text: 'ESTABLISHING ENCRYPTED CHANNEL...', delay: 900 },
  { text: 'CONNECTION ESTABLISHED', delay: 1200, success: true },
];
