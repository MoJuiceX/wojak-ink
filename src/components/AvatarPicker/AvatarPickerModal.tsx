/**
 * Avatar Picker Modal
 *
 * Simple modal for selecting emoji or NFT avatar.
 * Uses React Portal to ensure proper z-index stacking above all content.
 */

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, AlertCircle } from 'lucide-react';
import { useSageWallet } from '@/sage-wallet';
import { useUserProfile } from '@/contexts/UserProfileContext';
import { Avatar } from '../Avatar/Avatar';
import { EmojiPicker } from './EmojiPicker';
import { NFTPicker, type NFT } from './NFTPicker';
import { getRandomDefaultEmoji, type UserAvatar } from '@/types/avatar';
import './AvatarPicker.css';

interface AvatarPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AvatarPickerModal({ isOpen, onClose }: AvatarPickerModalProps) {
  const { profile, updateAvatar, updateProfile } = useUserProfile();
  const { status: walletStatus, address: walletAddress, connect: connectWallet } = useSageWallet();

  // Default to NFT tab if user already has an NFT avatar
  const [activeTab, setActiveTab] = useState<'emoji' | 'nft'>(
    profile?.avatar?.type === 'nft' ? 'nft' : 'emoji'
  );
  const [selectedEmoji, setSelectedEmoji] = useState(
    profile?.avatar?.type === 'emoji' ? profile.avatar.value : getRandomDefaultEmoji()
  );
  const [selectedNft, setSelectedNft] = useState<NFT | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Determine if wallet is connected
  const isWalletConnected = walletStatus === 'connected';

  // Handle emoji selection - auto-save
  const handleEmojiSelect = async (emoji: string) => {
    setSelectedEmoji(emoji);
    setIsSaving(true);
    setError(null);
    try {
      const newAvatar: UserAvatar = {
        type: 'emoji',
        value: emoji,
        source: 'user',
      };
      const success = await updateAvatar(newAvatar);
      if (success) {
        onClose();
      } else {
        setError('Failed to save avatar. Please try again.');
      }
    } catch (err) {
      console.error('[AvatarPicker] Failed to save emoji avatar:', err);
      setError('Failed to save avatar. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  // Handle NFT selection - auto-save with wallet address
  const handleNftSelect = async (nft: NFT) => {
    setSelectedNft(nft);
    setIsSaving(true);
    setError(null);
    
    if (!walletAddress) {
      setError('Wallet not connected. Please reconnect your wallet.');
      setIsSaving(false);
      return;
    }
    
    try {
      const newAvatar: UserAvatar = {
        type: 'nft',
        value: nft.imageUrl,
        source: 'wallet',
        nftId: nft.id,
        nftLauncherId: nft.launcherId,
      };
      
      
      // Save both avatar AND wallet address together
      // This ensures the API validation passes (NFT avatars require wallet_address)
      const success = await updateProfile({
        avatar: newAvatar,
        walletAddress: walletAddress,
      });
      
      if (success) {
        // NOTE: Don't call refreshProfile() here - it would fetch from API
        // and potentially overwrite local state if API save failed.
        // updateProfile already updates the state directly.
        onClose();
      } else {
        setError('Failed to save avatar. Please try again.');
      }
    } catch (err) {
      console.error('[AvatarPicker] Failed to save NFT avatar:', err);
      setError('Failed to save avatar. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  // Handle wallet connection
  const handleConnectWallet = async () => {
    try {
      await connectWallet();
      setActiveTab('nft');
    } catch (error) {
      console.error('Failed to connect wallet:', error);
    }
  };

  // Handle close
  const handleClose = () => {
    onClose();
  };

  // Handle backdrop click
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      handleClose();
    }
  };

  // Sync state with profile when it changes or modal opens
  useEffect(() => {
    if (isOpen) {
      // Clear error when modal opens
      setError(null);
    }
    
    if (profile?.avatar) {
      // Update tab to match current avatar type
      setActiveTab(profile.avatar.type === 'nft' ? 'nft' : 'emoji');

      if (profile.avatar.type === 'emoji') {
        setSelectedEmoji(profile.avatar.value);
        setSelectedNft(null);
      } else if (profile.avatar.type === 'nft') {
        // Create NFT object from profile avatar data
        setSelectedNft({
          id: profile.avatar.nftId || '',
          launcherId: profile.avatar.nftLauncherId || '',
          imageUrl: profile.avatar.value,
          name: `Wojak #${profile.avatar.nftId || ''}`,
        });
      }
    }
  }, [profile?.avatar, isOpen]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Determine preview avatar
  const previewType = activeTab === 'nft' && selectedNft ? 'nft' : 'emoji';
  const previewValue = activeTab === 'nft' && selectedNft ? selectedNft.imageUrl : selectedEmoji;

  // Use portal to render modal at document.body level
  // This ensures proper z-index stacking above all content
  const modalContent = (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="avatar-modal-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={handleBackdropClick}
        >
          <motion.div
            className="avatar-modal-container"
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', duration: 0.3 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="avatar-modal-header">
              <h2>Choose Your Avatar</h2>
              <button
                className="avatar-modal-close"
                onClick={handleClose}
                type="button"
              >
                <X size={20} />
              </button>
            </div>

            {/* Current Avatar Preview */}
            <div className="avatar-modal-preview">
              <Avatar
                type={previewType}
                value={previewValue}
                size="large"
                isNftHolder={previewType === 'nft'}
                showBadge={false}
              />
            </div>

            {/* Tab Selector */}
            <div className="avatar-modal-tabs">
              <button
                className={`avatar-tab ${activeTab === 'emoji' ? 'active' : ''}`}
                onClick={() => setActiveTab('emoji')}
                type="button"
              >
                Emoji
              </button>
              <button
                className={`avatar-tab ${activeTab === 'nft' ? 'active' : ''}`}
                onClick={() => setActiveTab('nft')}
                type="button"
              >
                NFT {!isWalletConnected && '🔒'}
              </button>
            </div>

            {/* Error message */}
            {error && (
              <div className="avatar-modal-error">
                <AlertCircle size={16} />
                <span>{error}</span>
              </div>
            )}

            {/* Tab Content */}
            <div className="avatar-modal-body">
              {activeTab === 'emoji' ? (
                <EmojiPicker
                  selectedEmoji={selectedEmoji}
                  onSelect={handleEmojiSelect}
                />
              ) : (
                <>
                  {!isWalletConnected ? (
                    <div className="connect-wallet-prompt">
                      <div className="wallet-icon">👛</div>
                      <h3>Unlock NFT Avatars</h3>
                      <p>Connect your wallet to use Wojak NFTs as your avatar!</p>
                      <button
                        className="connect-wallet-btn"
                        onClick={handleConnectWallet}
                        type="button"
                      >
                        Connect Wallet
                      </button>
                    </div>
                  ) : (
                    <NFTPicker
                      selectedNftId={selectedNft?.id}
                      onSelect={handleNftSelect}
                    />
                  )}
                </>
              )}
            </div>

            {/* Loading indicator */}
            {isSaving && (
              <div className="avatar-modal-saving">
                <span>Saving...</span>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  // Render to document.body via portal to escape stacking contexts
  return createPortal(modalContent, document.body);
}

export default AvatarPickerModal;
