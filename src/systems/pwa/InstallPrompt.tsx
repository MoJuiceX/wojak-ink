import React, { useState } from 'react';
import { usePWA } from './PWAContext';
import './pwa.css';

interface InstallPromptProps {
  isOpen: boolean;
  onClose: () => void;
}

export const InstallPrompt: React.FC<InstallPromptProps> = ({
  isOpen,
  onClose
}) => {
  const { promptInstall, isInstallable } = usePWA();
  const [isInstalling, setIsInstalling] = useState(false);

  if (!isInstallable || !isOpen) return null;

  const handleInstall = async () => {
    setIsInstalling(true);
    const installed = await promptInstall();
    setIsInstalling(false);

    if (installed) {
      onClose();
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="install-prompt-modal" onClick={(e) => e.stopPropagation()}>
        <div className="install-prompt-content">
          {/* App Preview */}
          <div className="install-prompt-preview">
            <div className="app-icon-large">
              <img src="/assets/icons/Wojak_logo.png" alt="Wojak" width="80" height="80" />
            </div>
            <h2>Wojak Games</h2>
            <p className="app-tagline">Play. Compete. Win.</p>
          </div>

          {/* Benefits */}
          <div className="install-benefits">
            <div className="benefit-item">
              <span className="benefit-icon">⚡</span>
              <div className="benefit-text">
                <strong>Instant Launch</strong>
                <span>One tap from your home screen</span>
              </div>
            </div>

            <div className="benefit-item">
              <span className="benefit-icon">📱</span>
              <div className="benefit-text">
                <strong>Full Screen</strong>
                <span>No browser bar - pure gaming</span>
              </div>
            </div>

            <div className="benefit-item">
              <span className="benefit-icon">🚀</span>
              <div className="benefit-text">
                <strong>Faster Loading</strong>
                <span>Games load instantly</span>
              </div>
            </div>

            <div className="benefit-item">
              <span className="benefit-icon">🔔</span>
              <div className="benefit-text">
                <strong>Get Notified</strong>
                <span>Never miss a challenge</span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="install-prompt-actions">
            <button
              onClick={handleInstall}
              disabled={isInstalling}
              className="btn btn-primary install-button-primary"
            >
              {isInstalling ? 'Installing...' : 'Add to Home Screen'}
            </button>

            <button className="install-prompt-skip" onClick={onClose}>
              Maybe Later
            </button>
          </div>

          {/* Note */}
          <p className="install-note">
            Free - No download required - Works offline
          </p>
        </div>
      </div>
    </div>
  );
};
