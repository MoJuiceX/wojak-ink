import { useState } from 'react';
import { Music, Volume2, Sun, Moon, Palette, BarChart3 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Toggle } from '../components/ui/Toggle';
import { loadSettings, saveSettings, applyTheme, type AppSettings, type ThemeMode } from '../utils/settingsUtils';
import './SettingsPage.css';

const SettingsPage: React.FC = () => {
  const navigate = useNavigate();
  const [settings, setSettings] = useState<AppSettings>(loadSettings);

  const handleSettingChange = (key: keyof AppSettings, value: boolean | ThemeMode) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    saveSettings(newSettings);

    if (key === 'theme') {
      applyTheme(value as ThemeMode);
    }
  };

  const themes: { id: ThemeMode; label: string; icon: React.ReactNode; color: string }[] = [
    { id: 'light', label: 'Light', icon: <Sun size={20} />, color: '#f5f5f5' },
    { id: 'dark', label: 'Dark', icon: <Moon size={20} />, color: '#1a1a2e' },
    { id: 'orange', label: 'Orange', icon: <Palette size={20} />, color: '#ff8c00' },
    { id: 'green', label: 'Green', icon: <Palette size={20} />, color: '#2ecc71' },
  ];

  return (
    <div className="settings-page">
      <div className="settings-page-content">
        {/* Audio Section */}
        <div className="settings-section">
          <h3 className="settings-section-title">Audio</h3>
          <div className="settings-list">
            <div className="settings-item">
              <Music size={20} className="settings-icon" />
              <div className="settings-item-content">
                <h4>Background Music</h4>
                <p>Play music while browsing</p>
              </div>
              <Toggle
                id="background-music"
                checked={settings.backgroundMusic}
                onChange={(checked) => handleSettingChange('backgroundMusic', checked)}
              />
            </div>
            <div className="settings-item">
              <Volume2 size={20} className="settings-icon" />
              <div className="settings-item-content">
                <h4>Sound Effects</h4>
                <p>UI sounds and game audio</p>
              </div>
              <Toggle
                id="sound-effects"
                checked={settings.soundEffects}
                onChange={(checked) => handleSettingChange('soundEffects', checked)}
              />
            </div>
          </div>
        </div>

        {/* Theme Section */}
        <div className="settings-section">
          <h3 className="settings-section-title">Theme</h3>
          <div className="theme-grid">
            {themes.map(theme => (
              <div
                key={theme.id}
                className={`theme-option ${settings.theme === theme.id ? 'selected' : ''}`}
                data-theme={theme.id}
                onClick={() => handleSettingChange('theme', theme.id)}
              >
                <div
                  className="theme-preview"
                  style={{ backgroundColor: theme.color }}
                >
                  {theme.icon}
                </div>
                <span className="theme-label">{theme.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Admin Section */}
        <div className="settings-section admin-section">
          <button
            className="btn btn-secondary admin-button"
            onClick={() => navigate('/admin/stats')}
          >
            <BarChart3 size={18} />
            Generator Stats
          </button>
        </div>

        {/* App Info */}
        <div className="settings-footer">
          <p>Wojak.ink Mobile v1.0</p>
          <p>4200 Wojak Farmers Plot NFTs on Chia</p>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
