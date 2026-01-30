import { Pencil, Copy, Check } from 'lucide-react';
import { useState } from 'react';
import { motion } from 'framer-motion';

interface ProfileHeroProps {
  user: {
    username: string;
    avatar: string;
    walletAddress: string;
    joinedAt: string;
  };
  onEditAvatar: () => void;
}

export function ProfileHero({ user, onEditAvatar }: ProfileHeroProps) {
  const [copied, setCopied] = useState(false);

  const copyAddress = async () => {
    await navigator.clipboard.writeText(user.walletAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const truncateAddress = (addr: string) =>
    `${addr.slice(0, 6)}...${addr.slice(-4)}`;

  return (
    <div className="profile-hero">
      <motion.div
        className="avatar-container"
        whileHover={{ scale: 1.05 }}
        transition={{ type: 'spring', stiffness: 300 }}
      >
        <div className="avatar-wrapper">
          <img
            src={user.avatar}
            alt={user.username}
            className="avatar-image"
          />
          <button
            onClick={onEditAvatar}
            className="avatar-edit-btn"
            aria-label="Edit avatar"
          >
            <Pencil size={14} />
          </button>
        </div>
      </motion.div>

      <div className="user-info">
        <h1 className="username">{user.username}</h1>
        <button onClick={copyAddress} className="wallet-address">
          <span className="font-mono">{truncateAddress(user.walletAddress)}</span>
          {copied ? <Check size={14} /> : <Copy size={14} />}
        </button>
        <span className="join-date">
          Operator since {new Date(user.joinedAt).toLocaleDateString()}
        </span>
      </div>
    </div>
  );
}
