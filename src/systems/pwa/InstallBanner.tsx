import React from 'react';
import { usePWA } from './PWAContext';
import './pwa.css';

interface InstallBannerProps {
  position?: 'top' | 'bottom';
}

export const InstallBanner: React.FC<InstallBannerProps> = ({
  position = 'bottom'
}) => {
  const { showInstallBanner, promptInstall, dismissInstallPrompt } = usePWA();

  if (!showInstallBanner) return null;

  const handleInstall = async () => {
    await promptInstall();
  };

  return (
    <div className={`install-banner install-banner-${position}`}>
      <div className="install-banner-content">
        <div className="install-banner-icon">
          <img src="/assets/icons/Wojak_logo.png" alt="Wojak" width="32" height="32" />
        </div>
        <div className="install-banner-text">
          <strong>Install Wojak Games</strong>
          <span>Add to home screen for the best experience!</span>
        </div>
      </div>
      <div className="install-banner-actions">
        <button
          className="install-banner-dismiss"
          onClick={dismissInstallPrompt}
        >
          Later
        </button>
        <button
          className="btn btn-primary install-banner-install"
          onClick={handleInstall}
        >
          Install
        </button>
      </div>
    </div>
  );
};
