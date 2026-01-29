import React from 'react';
import { Smartphone, SlidersHorizontal } from 'lucide-react';
import { Toggle } from '../../components/ui/Toggle';
import { useHaptics } from './HapticContext';
import './haptics.css';

export const HapticSettings: React.FC = () => {
  const {
    isSupported,
    isEnabled,
    intensity,
    setEnabled,
    setIntensity,
    trigger
  } = useHaptics();

  // Test vibration on intensity change
  const handleIntensityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value) / 100;
    setIntensity(value);
    trigger('medium'); // Test vibration
  };

  if (!isSupported) {
    return (
      <div className="haptic-settings not-supported">
        <p>Haptic feedback is not supported on this device.</p>
      </div>
    );
  }

  return (
    <div className="haptic-settings">
      <div className="setting-row">
        <div className="setting-label">
          <Smartphone size={20} />
          <span>Vibration</span>
        </div>
        <Toggle
          id="haptic-toggle"
          checked={isEnabled}
          onChange={(checked) => setEnabled(checked)}
        />
      </div>

      {isEnabled && (
        <div className="setting-row">
          <div className="setting-label">
            <SlidersHorizontal size={20} />
            <span>Intensity</span>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            value={intensity * 100}
            onChange={handleIntensityChange}
            className="intensity-slider"
          />
        </div>
      )}

      {isEnabled && (
        <div className="haptic-test">
          <button
            className="test-button"
            onClick={() => trigger('high-score')}
          >
            Test Vibration
          </button>
        </div>
      )}
    </div>
  );
};
