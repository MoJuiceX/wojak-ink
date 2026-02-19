import { MUSIC_PLAYLIST } from '../audio';

interface DebugMusicButtonsProps {
  enabled: boolean;
  playTrack: (index: number) => void;
}

export const DebugMusicButtons: React.FC<DebugMusicButtonsProps> = ({
  enabled,
  playTrack,
}) => {
  if (!enabled) return null;

  return (
    <div className="fo-debug-music" style={{
      position: 'fixed',
      top: '50%',
      right: '10px',
      transform: 'translateY(-50%)',
      display: 'flex',
      flexDirection: 'column',
      gap: '8px',
      zIndex: 9999,
    }}>
      {MUSIC_PLAYLIST.map((_track, i) => (
        <button
          key={i}
          onClick={() => playTrack(i)}
          style={{
            padding: '10px 14px',
            fontSize: '14px',
            fontWeight: 'bold',
            background: '#ff6b00',
            color: 'white',
            border: '3px solid white',
            borderRadius: '10px',
            cursor: 'pointer',
            boxShadow: '0 2px 8px var(--color-black-50)',
          }}
        >
          {i + 1}
        </button>
      ))}
    </div>
  );
};
