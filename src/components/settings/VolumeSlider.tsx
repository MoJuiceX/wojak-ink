/**
 * Volume Slider Component
 *
 * Audio control with toggle and volume slider.
 */

import { Volume2, VolumeX, Volume1 } from 'lucide-react';
import { Slider } from '@/components/ui/Slider';

interface VolumeSliderProps {
  id: string;
  label: string;
  description?: string;
  volume: number;
  enabled: boolean;
  onVolumeChange: (volume: number) => void;
  onToggle: (enabled: boolean) => void;
}

function getVolumeIcon(volume: number, enabled: boolean) {
  if (!enabled || volume === 0) {
    return <VolumeX size={18} />;
  }
  if (volume < 0.5) {
    return <Volume1 size={18} />;
  }
  return <Volume2 size={18} />;
}

export function VolumeSlider({
  id,
  label,
  description,
  volume,
  enabled,
  onVolumeChange,
  onToggle,
}: VolumeSliderProps) {
  const volumePercent = Math.round(volume * 100);

  return (
    <div
      className="p-4 rounded-xl"
      style={{
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
      }}
    >
      {/* Header with toggle */}
      <div className="flex items-start justify-between gap-4 mb-3">
        <div className="flex items-center gap-2">
          <span style={{ color: enabled ? 'var(--color-primary)' : 'var(--color-text-muted)' }}>
            {getVolumeIcon(volume, enabled)}
          </span>
          <div>
            <label
              htmlFor={`${id}-slider`}
              className="text-sm font-medium text-primary"
            >
              {label}
            </label>
            {description && (
              <p
                className="text-xs mt-0.5 text-muted"
              >
                {description}
              </p>
            )}
          </div>
        </div>

        {/* Pill toggle */}
        <div
          role="switch"
          aria-checked={enabled}
          aria-label={`Toggle ${label}`}
          onClick={() => onToggle(!enabled)}
          className="cursor-pointer"
          style={{
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            width: '52px',
            height: '24px',
            borderRadius: '9999px',
            background: enabled ? 'var(--color-primary)' : 'var(--color-text-muted)',
            flexShrink: 0,
            transition: 'background 0.2s ease',
          }}
        >
          <span
            style={{
              position: 'absolute',
              fontSize: '9px',
              fontWeight: 600,
              lineHeight: 1,
              color: enabled ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.4)',
              left: enabled ? '6px' : undefined,
              right: enabled ? undefined : '6px',
              userSelect: 'none',
              pointerEvents: 'none',
            }}
            aria-hidden="true"
          >
            {enabled ? 'ON' : 'OFF'}
          </span>
          <div
            style={{
              position: 'absolute',
              width: '18px',
              height: '18px',
              top: '3px',
              borderRadius: '9999px',
              background: 'white',
              left: enabled ? '31px' : '3px',
              transition: 'left 0.2s ease',
            }}
          />
        </div>
      </div>

      {/* Volume slider */}
      <div className={`${!enabled ? 'opacity-50 pointer-events-none' : ''}`}>
        <Slider
          id={`${id}-slider`}
          label={`${label} volume`}
          value={volumePercent}
          min={0}
          max={100}
          step={5}
          onChange={(v) => onVolumeChange(v / 100)}
          disabled={!enabled}
          valueFormatter={(v) => `${Math.round(v)}%`}
        />
      </div>
    </div>
  );
}

export default VolumeSlider;
