/**
 * HolderChat Page - All Holders Chat
 *
 * Chat room for all NFT holders (>=1 Wojak Farmers Plot NFT).
 * This is a thin wrapper around the shared ChatRoom component.
 */

import ChatRoom from '@/components/chat/ChatRoom';
import { PageSEO } from '@/components/seo';
import '@/pages/GatedChat.css';

export default function HolderChat() {
  return (
    <>
      <PageSEO
        title="Holder Chat"
        description="Exclusive chat for Wojak NFT holders. Connect with other Wojak owners."
        path="/chat"
        noIndex
      />
      <ChatRoom
        chatType="holder"
        welcomeIcon="💬"
        welcomeTitle="Welcome to Holder Chat"
        welcomeDescription="Connect with fellow Wojak NFT holders."
      />
    </>
  );
}
