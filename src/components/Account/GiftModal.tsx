/**
 * GiftModal Component
 *
 * Modal for sending gifts (items, oranges, or gems) to friends.
 * Friends-only restriction enforced by API.
 */

import { useState, useEffect } from 'react';
import { X, Gift, Loader2, Send, AlertCircle } from 'lucide-react';
import { useAuth } from '@clerk/clerk-react';
import { useCurrency } from '@/contexts/CurrencyContext';
import './GiftModal.css';

interface Friend {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
}

interface GiftItem {
  id: string;
  name: string;
  category: string;
  tier: string;
  emoji: string | null;
}

interface GiftModalProps {
  isOpen: boolean;
  onClose: () => void;
  preselectedItem?: GiftItem | null;
  onGiftSent?: () => void;
}

type GiftType = 'item' | 'oranges' | 'gems';

export function GiftModal({
  isOpen,
  onClose,
  preselectedItem,
  onGiftSent,
}: GiftModalProps) {
  const { getToken } = useAuth();
  const { currency, refreshBalance } = useCurrency();

  const [giftType, setGiftType] = useState<GiftType>(preselectedItem ? 'item' : 'oranges');
  const [selectedFriend, setSelectedFriend] = useState<string>('');
  const [selectedItem, setSelectedItem] = useState<GiftItem | null>(preselectedItem || null);
  const [amount, setAmount] = useState<number>(100);
  const [message, setMessage] = useState<string>('');

  const [friends, setFriends] = useState<Friend[]>([]);
  const [giftableItems, setGiftableItems] = useState<GiftItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Reset when modal opens
  useEffect(() => {
    if (!isOpen) return;
    // Use callback refs to avoid setting state synchronously in effect
    const timer = setTimeout(() => {
      setError(null);
      setSuccess(null);
      if (preselectedItem) {
        setGiftType('item');
        setSelectedItem(preselectedItem);
      }
    }, 0);
    return () => clearTimeout(timer);
  }, [isOpen, preselectedItem]);

  // Fetch friends list on open
  useEffect(() => {
    if (!isOpen) return;

    const fetchFriends = async () => {
      setIsLoading(true);
      try {
        const token = await getToken();
        const res = await fetch('/api/friends?status=accepted', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setFriends(data.friends || []);
        }
      } catch (err) {
        console.error('[GiftModal] Failed to fetch friends:', err);
      }
      setIsLoading(false);
    };

    fetchFriends();
  }, [isOpen, getToken]);

  // Fetch giftable items (owned, non-equipped)
  useEffect(() => {
    if (!isOpen || giftType !== 'item') return;

    const fetchItems = async () => {
      try {
        const token = await getToken();
        const res = await fetch('/api/inventory', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          // Filter to only owned items (not equipped, not consumables)
          const giftable = (data.items || []).filter(
            (item: { state: string; category: string }) =>
              item.state === 'owned' &&
              item.category !== 'consumable'
          );
          setGiftableItems(giftable);
        }
      } catch (err) {
        console.error('[GiftModal] Failed to fetch items:', err);
      }
    };

    fetchItems();
  }, [isOpen, giftType, getToken]);

  const handleSend = async () => {
    if (!selectedFriend) {
      setError('Please select a friend');
      return;
    }

    if (giftType === 'item' && !selectedItem) {
      setError('Please select an item to gift');
      return;
    }

    if (giftType !== 'item' && (!amount || amount <= 0)) {
      setError('Please enter a valid amount');
      return;
    }

    // Check balance
    if (giftType === 'oranges' && currency && amount > currency.oranges) {
      setError(`Not enough oranges. You have ${currency.oranges.toLocaleString()}`);
      return;
    }
    if (giftType === 'gems' && currency && amount > currency.gems) {
      setError(`Not enough gems. You have ${currency.gems}`);
      return;
    }

    setIsSending(true);
    setError(null);

    try {
      const token = await getToken();
      const body: { recipientId: string; type: GiftType; message?: string; itemId?: string; amount?: number } = {
        recipientId: selectedFriend,
        type: giftType,
        message: message.trim() || undefined,
      };

      if (giftType === 'item') {
        body.itemId = selectedItem?.id;
      } else {
        body.amount = amount;
      }

      const res = await fetch('/api/gift', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (res.ok) {
        setSuccess(data.toast?.message || 'Gift sent successfully!');
        await refreshBalance();
        onGiftSent?.();

        // Close after short delay
        setTimeout(() => {
          onClose();
        }, 2000);
      } else {
        setError(data.error || 'Failed to send gift');
      }
    } catch {
      setError('Network error. Please try again.');
    }

    setIsSending(false);
  };

  if (!isOpen) return null;

  const selectedFriendData = friends.find(f => f.id === selectedFriend);

  return (
    <div className="gift-modal-overlay" onClick={onClose}>
      <div className="gift-modal" onClick={e => e.stopPropagation()}>
        <button className="gift-modal-close" onClick={onClose}>
          <X size={20} />
        </button>

        <div className="gift-modal-header">
          <Gift size={24} />
          <h2>Send a Gift</h2>
        </div>

        {isLoading ? (
          <div className="gift-modal-loading">
            <Loader2 className="animate-spin" size={32} />
            <span>Loading...</span>
          </div>
        ) : friends.length === 0 ? (
          <div className="gift-modal-empty">
            <AlertCircle size={32} />
            <p>You need friends to send gifts!</p>
            <span>Add some friends first to start gifting.</span>
          </div>
        ) : (
          <div className="gift-modal-body">
            {/* Friend Selector */}
            <div className="gift-field">
              <label>Send to</label>
              <select
                value={selectedFriend}
                onChange={e => setSelectedFriend(e.target.value)}
                className="gift-select"
              >
                <option value="">Select a friend...</option>
                {friends.map(friend => (
                  <option key={friend.id} value={friend.id}>
                    {friend.display_name || 'Anonymous'}
                  </option>
                ))}
              </select>
            </div>

            {/* Gift Type Tabs */}
            <div className="gift-type-tabs">
              <button
                className={`gift-type-tab ${giftType === 'oranges' ? 'active' : ''}`}
                onClick={() => setGiftType('oranges')}
              >
                <span className="tab-emoji">🍊</span>
                Oranges
              </button>
              <button
                className={`gift-type-tab ${giftType === 'gems' ? 'active' : ''}`}
                onClick={() => setGiftType('gems')}
              >
                <span className="tab-emoji">💎</span>
                Gems
              </button>
              <button
                className={`gift-type-tab ${giftType === 'item' ? 'active' : ''}`}
                onClick={() => setGiftType('item')}
              >
                <span className="tab-emoji">🎁</span>
                Item
              </button>
            </div>

            {/* Currency Amount */}
            {giftType !== 'item' && (
              <div className="gift-field">
                <label>
                  Amount
                  {currency && (
                    <span className="balance-hint">
                      (Balance: {giftType === 'oranges'
                        ? `${currency.oranges.toLocaleString()} 🍊`
                        : `${currency.gems} 💎`
                      })
                    </span>
                  )}
                </label>
                <div className="amount-input-wrapper">
                  <input
                    type="number"
                    value={amount}
                    onChange={e => setAmount(Math.max(1, parseInt(e.target.value) || 0))}
                    min={1}
                    className="gift-input"
                  />
                  <div className="amount-presets">
                    {[100, 500, 1000].map(preset => (
                      <button
                        key={preset}
                        className="preset-btn"
                        onClick={() => setAmount(preset)}
                      >
                        {preset}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Item Selector */}
            {giftType === 'item' && (
              <div className="gift-field">
                <label>Select Item</label>
                {giftableItems.length === 0 ? (
                  <p className="no-items-hint">No items available to gift. Only owned (non-equipped) items can be gifted.</p>
                ) : (
                  <div className="gift-items-grid">
                    {giftableItems.map(item => (
                      <button
                        key={item.id}
                        className={`gift-item-option ${selectedItem?.id === item.id ? 'selected' : ''}`}
                        onClick={() => setSelectedItem(item)}
                      >
                        <span className="item-emoji">{item.emoji || '✨'}</span>
                        <span className="item-name">{item.name}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Optional Message */}
            <div className="gift-field">
              <label>Message (optional)</label>
              <input
                type="text"
                value={message}
                onChange={e => setMessage(e.target.value)}
                placeholder="Add a personal message..."
                maxLength={100}
                className="gift-input"
              />
            </div>

            {/* Error/Success Messages */}
            {error && (
              <div className="gift-message error">
                <AlertCircle size={16} />
                {error}
              </div>
            )}
            {success && (
              <div className="gift-message success">
                <Gift size={16} />
                {success}
              </div>
            )}

            {/* Preview */}
            {selectedFriend && (
              <div className="gift-preview">
                <span className="preview-label">Preview:</span>
                <p>
                  Sending{' '}
                  {giftType === 'item'
                    ? selectedItem?.name || 'item'
                    : `${amount.toLocaleString()} ${giftType === 'oranges' ? '🍊' : '💎'}`
                  }
                  {' '}to {selectedFriendData?.display_name || 'your friend'}
                </p>
              </div>
            )}

            {/* Send Button */}
            <button
              className="gift-send-btn"
              onClick={handleSend}
              disabled={isSending || !selectedFriend || (giftType === 'item' && !selectedItem)}
            >
              {isSending ? (
                <Loader2 className="animate-spin" size={18} />
              ) : (
                <>
                  <Send size={18} />
                  Send Gift
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default GiftModal;
