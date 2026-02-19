/**
 * Notification Settings Component
 *
 * UI for managing push notification preferences.
 */

import React, { useState } from 'react';
import { useNotifications } from '../../contexts/NotificationContext';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { Toggle } from '../ui/Toggle';
import './NotificationSettings.css';

export const NotificationSettings: React.FC = () => {
  const {
    isSupported,
    permission,
    isSubscribed,
    preferences,
    isLoading,
    requestPermission,
    subscribe,
    unsubscribe,
    updatePreferences,
    sendTestNotification,
  } = useNotifications();

  const [isEnabling, setIsEnabling] = useState(false);
  const [isDisabling, setIsDisabling] = useState(false);

  const handleEnableNotifications = async () => {
    setIsEnabling(true);
    try {
      if (permission !== 'granted') {
        const granted = await requestPermission();
        if (!granted) {
          setIsEnabling(false);
          return;
        }
      }
      await subscribe();
    } finally {
      setIsEnabling(false);
    }
  };

  const handleDisableNotifications = async () => {
    setIsDisabling(true);
    try {
      await unsubscribe();
    } finally {
      setIsDisabling(false);
    }
  };

  if (isLoading) {
    return (
      <div className="notification-settings loading">
        <LoadingSpinner size={24} />
        <p>Loading notification settings...</p>
      </div>
    );
  }

  if (!isSupported) {
    return (
      <div className="notification-settings unsupported">
        <div className="unsupported-icon">🔕</div>
        <h3>Not Supported</h3>
        <p>Push notifications are not supported in this browser.</p>
        <p className="hint">Try using Chrome, Firefox, or Edge for the best experience.</p>
      </div>
    );
  }

  if (permission === 'denied') {
    return (
      <div className="notification-settings blocked">
        <div className="blocked-icon">🚫</div>
        <h3>Notifications Blocked</h3>
        <p>You have blocked notifications for this site.</p>
        <p className="hint">
          To enable notifications, click the lock icon in your browser's address bar and change the
          notification setting to "Allow".
        </p>
      </div>
    );
  }

  return (
    <div className="notification-settings">
      <div className="settings-header">
        <div className="header-content">
          <h3>Push Notifications</h3>
          <p className="header-description">
            Stay updated with game challenges, rewards, and guild activity.
          </p>
        </div>

        {!isSubscribed ? (
          <button
            type="button"
            onClick={handleEnableNotifications}
            disabled={isEnabling}
            className="btn btn-primary enable-button"
          >
            {isEnabling ? <LoadingSpinner size={18} /> : 'Enable Notifications'}
          </button>
        ) : (
          <div className="header-actions">
            <button
              type="button"
              onClick={sendTestNotification}
              className="btn btn-ghost test-button"
            >
              Test
            </button>
            <button
              type="button"
              onClick={handleDisableNotifications}
              disabled={isDisabling}
              className="btn btn-ghost disable-button"
            >
              {isDisabling ? <LoadingSpinner size={18} /> : 'Disable All'}
            </button>
          </div>
        )}
      </div>

      {isSubscribed && (
        <>
          <div className="preferences-section">
            <h4>Notification Types</h4>
            <p className="section-description">Choose which notifications you want to receive.</p>
          </div>

          <div className="preferences-list">
            <div className="preference-item">
              <div className="preference-info">
                <h5>Daily Rewards</h5>
                <p className="preference-note">Remind me to claim daily rewards</p>
              </div>
              <Toggle
                id="pref-daily-rewards"
                checked={preferences.dailyRewards}
                onChange={(checked) => updatePreferences({ dailyRewards: checked })}
                size="small"
              />
            </div>

            <div className="preference-item">
              <div className="preference-info">
                <h5>High Score Alerts</h5>
                <p className="preference-note">Notify when someone beats my score</p>
              </div>
              <Toggle
                id="pref-high-score"
                checked={preferences.highScoreBeaten}
                onChange={(checked) => updatePreferences({ highScoreBeaten: checked })}
                size="small"
              />
            </div>

            <div className="preference-item">
              <div className="preference-info">
                <h5>Guild Updates</h5>
                <p className="preference-note">Guild challenges, invites, and competitions</p>
              </div>
              <Toggle
                id="pref-guild"
                checked={preferences.guildUpdates}
                onChange={(checked) => updatePreferences({ guildUpdates: checked })}
                size="small"
              />
            </div>

            <div className="preference-item">
              <div className="preference-info">
                <h5>Achievements</h5>
                <p className="preference-note">New achievements unlocked</p>
              </div>
              <Toggle
                id="pref-achievements"
                checked={preferences.achievements}
                onChange={(checked) => updatePreferences({ achievements: checked })}
                size="small"
              />
            </div>

            <div className="preference-item">
              <div className="preference-info">
                <h5>Social</h5>
                <p className="preference-note">Friends joining and activity</p>
              </div>
              <Toggle
                id="pref-social"
                checked={preferences.social}
                onChange={(checked) => updatePreferences({ social: checked })}
                size="small"
              />
            </div>
          </div>

          <div className="notification-info">
            <p>
              Notifications are sent to all your subscribed devices. You can manage this separately
              on each device.
            </p>
          </div>
        </>
      )}
    </div>
  );
};

export default NotificationSettings;
