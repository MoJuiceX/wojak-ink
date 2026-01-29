/**
 * GatedChat Page (Whale Chat) - Premium 1% Holder Chat
 *
 * Exclusive chat room for top 1% NFT holders (>=42 Wojak Farmers Plot NFTs).
 * This is a thin wrapper around the shared ChatRoom component.
 */

import ChatRoom from '@/components/chat/ChatRoom';
import './GatedChat.css';

export default function GatedChat() {
  return (
    <ChatRoom
      chatType="whale"
      welcomeIcon="🐋"
      welcomeTitle="Welcome to Whale Chat"
      welcomeDescription="You're among the top Wojak holders."
    />
  );
}
