/**
 * HolderChat Page - All Holders Chat
 *
 * Chat room for all NFT holders (>=1 Wojak Farmers Plot NFT).
 * This is a thin wrapper around the shared ChatRoom component.
 */

import ChatRoom from '@/components/chat/ChatRoom';
import '@/pages/GatedChat.css';

export default function HolderChat() {
  return (
    <ChatRoom
      chatType="holder"
      welcomeIcon="💬"
      welcomeTitle="Welcome to Holder Chat"
      welcomeDescription="Connect with fellow Wojak NFT holders."
    />
  );
}
