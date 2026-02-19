/**
 * About Section Component
 *
 * App information, social links, and admin access.
 */

import { motion, useReducedMotion } from 'framer-motion';
import { Info, ExternalLink, Shield, X } from 'lucide-react';
import { useState } from 'react';
import { linkCardVariants, settingsSectionVariants } from '@/config/settingsAnimations';

// App info (previously from settingsThemes.ts)
const APP_VERSION = '2.0.0';
const APP_BUILD_DATE = '2026-01-29';
const SOCIAL_LINKS = [
  { id: 'twitter', url: 'https://twitter.com/wojakink', icon: '𝕏', name: 'Twitter', handle: '@wojakink' },
  { id: 'discord', url: 'https://discord.gg/wojak', icon: '💬', name: 'Discord', handle: 'Join Server' },
  { id: 'website', url: 'https://tanggang.life/', icon: '🌐', name: 'Tang Gang Website', handle: 'tanggang.life' },
];

// Admin password
const ADMIN_PASSWORD = 'tanggang420';

export function AboutSection() {
  const prefersReducedMotion = useReducedMotion();
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const [passwordError, setPasswordError] = useState(false);

  const handleAdminLogin = () => {
    if (adminPassword === ADMIN_PASSWORD) {
      setIsAdminAuthenticated(true);
      setPasswordError(false);
    } else {
      setPasswordError(true);
      setTimeout(() => setPasswordError(false), 2000);
    }
  };

  const handleCloseAdmin = () => {
    setShowAdminModal(false);
    setAdminPassword('');
    setIsAdminAuthenticated(false);
    setPasswordError(false);
  };

  return (
    <motion.section
      variants={prefersReducedMotion ? undefined : settingsSectionVariants}
      initial="initial"
      animate="animate"
      className="space-y-4"
      aria-labelledby="about-section-heading"
    >
      {/* Section Header */}
      <div className="flex items-center gap-2">
        <Info size={20} className="text-accent" />
        <h2
          id="about-section-heading"
          className="text-lg font-bold text-primary"
        >
          About Wojak.ink
        </h2>
      </div>

      {/* Main Info Card */}
      <div
        className="p-6 rounded-xl text-center"
        style={{
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
        }}
      >
        {/* Version */}
        <div className="flex items-center justify-center gap-2 mb-4">
          <span
            className="text-sm font-medium text-primary"
          >
            Version {APP_VERSION}
          </span>
          <span
            className="px-2 py-0.5 text-xs font-semibold rounded"
            style={{
              background: 'var(--color-primary)',
              color: 'white',
            }}
          >
            BETA
          </span>
        </div>
        <p
          className="text-xs mb-4 text-muted"
        >
          Build {APP_BUILD_DATE}
        </p>

        {/* Description */}
        <p
          className="text-sm mb-2 text-secondary"
        >
          🍊 4,200 Wojak Farmers Plot NFTs on Chia 🌱
        </p>
        <p
          className="text-sm text-muted"
        >
          An Orange Labs production
        </p>

        {/* Divider */}
        <div
          className="h-px my-6"
          style={{ background: 'var(--color-border)' }}
        />

        {/* Social Links */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          {SOCIAL_LINKS.map((link) => (
            <motion.a
              key={link.id}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              variants={prefersReducedMotion ? undefined : linkCardVariants}
              whileHover={prefersReducedMotion ? undefined : 'hover'}
              whileTap={prefersReducedMotion ? undefined : 'tap'}
              className="p-3 rounded-xl flex flex-col items-center gap-1 transition-colors"
              style={{
                background: 'var(--color-border)',
                border: '1px solid var(--color-border)',
              }}
            >
              <span className="text-2xl" role="img" aria-hidden="true">
                {link.icon}
              </span>
              <span
                className="text-xs font-medium text-primary"
              >
                {link.name}
              </span>
              <span
                className="text-xs flex items-center gap-1 text-muted"
              >
                {link.handle}
                <ExternalLink size={10} />
              </span>
            </motion.a>
          ))}
        </div>

        {/* Divider */}
        <div
          className="h-px mb-6"
          style={{ background: 'var(--color-border)' }}
        />

        {/* Credits */}
        <p
          className="text-xs text-muted"
        >
          2026 Wojak.ink. All rights reserved.
        </p>

        {/* Admin Action */}
        <div className="flex justify-center mt-6">
          <button
            type="button"
            onClick={() => setShowAdminModal(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium transition-colors text-secondary"
            style={{
              background: 'var(--color-border)',
              border: '1px solid var(--color-border)',
            }}
          >
            <Shield size={14} />
            Admin
          </button>
        </div>
      </div>

      {/* Admin Modal */}
      {showAdminModal && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-50"
            style={{ background: 'rgba(0, 0, 0, 0.7)' }}
            onClick={handleCloseAdmin}
          />

          {/* Modal */}
          <div
            className="fixed inset-4 sm:inset-auto sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 z-50 sm:w-full sm:max-w-md rounded-2xl overflow-hidden flex flex-col"
            style={{
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              maxHeight: '80vh',
            }}
          >
            {/* Header */}
            <div
              className="flex items-center justify-between p-4"
              style={{ borderBottom: '1px solid var(--color-border)' }}
            >
              <div className="flex items-center gap-2">
                <Shield size={20} className="text-accent" />
                <h2
                  className="text-lg font-semibold text-primary"
                >
                  Admin Panel
                </h2>
              </div>
              <button
                type="button"
                className="p-2 rounded-lg transition-colors text-secondary"
                style={{
                  background: 'var(--color-surface)',
                }}
                onClick={handleCloseAdmin}
              >
                <X size={20} />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4">
              {!isAdminAuthenticated ? (
                /* Password Entry */
                <div className="space-y-4">
                  <p
                    className="text-sm text-center text-secondary"
                  >
                    Enter admin password to continue
                  </p>
                  <input
                    type="password"
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    placeholder="Password"
                    className="w-full px-4 py-3 rounded-lg text-sm text-primary"
                    style={{
                      background: 'var(--color-surface)',
                      border: passwordError
                        ? '2px solid #ef4444'
                        : '1px solid var(--color-border)',
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleAdminLogin();
                    }}
                    autoFocus
                  />
                  {passwordError && (
                    <p className="text-xs text-center" style={{ color: '#ef4444' }}>
                      Incorrect password
                    </p>
                  )}
                  <button
                    type="button"
                    onClick={handleAdminLogin}
                    className="w-full py-3 rounded-lg font-medium transition-colors"
                    style={{
                      background: 'var(--color-primary)',
                      color: 'white',
                    }}
                  >
                    Login
                  </button>
                </div>
              ) : (
                /* Admin Content */
                <div className="space-y-6">
                  <p
                    className="text-sm text-center text-secondary"
                  >
                    Welcome to the Admin Panel
                  </p>

                  {/* Developer Info */}
                  <div
                    className="p-4 rounded-xl text-center"
                    style={{
                      background: 'var(--color-border)',
                      border: '1px solid var(--color-border)',
                    }}
                  >
                    <p
                      className="text-xs text-muted"
                    >
                      Developer Tools
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </motion.section>
  );
}

export default AboutSection;
