import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import type { WeatherType } from '../config';
import type { WeatherState, GameState, Pipe } from '../types';

interface DebugPanelProps {
  enabled: boolean;
  weatherRef: React.RefObject<WeatherState>;
  gameStateRef: React.RefObject<{
    score: number;
    gameState: GameState;
    pipes: Pipe[];
  }>;
  fogTimerRef: React.RefObject<number>;
  debugSetWeather: (type: WeatherType) => void;
  toggleFog: () => void;
  spawnBirdFlock: () => void;
  spawnFallingLeaf: () => void;
  triggerLightningBolt: () => void;
  generatePipeWithCoins: (isFirst: boolean, currentScore: number) => Pipe;
  setDebugTick: React.Dispatch<React.SetStateAction<number>>;
}

interface DebugState {
  currentWeather: WeatherType | 'clear';
  currentScore: number;
  currentState: GameState | 'idle';
  intensity: number;
  fogIntensity: number;
  hasFog: boolean;
}

export const DebugPanel: React.FC<DebugPanelProps> = ({
  enabled,
  weatherRef,
  gameStateRef,
  fogTimerRef,
  debugSetWeather,
  toggleFog,
  spawnBirdFlock,
  spawnFallingLeaf,
  triggerLightningBolt,
  generatePipeWithCoins,
  setDebugTick,
}) => {
  const [debugState, setDebugState] = useState<DebugState>({
    currentWeather: 'clear',
    currentScore: 0,
    currentState: 'idle',
    intensity: 0,
    fogIntensity: 0,
    hasFog: false,
  });

  // Update debug state from refs in an effect (runs after render)
  useEffect(() => {
    if (!enabled) return;

    const updateState = () => {
      const weather = weatherRef.current;
      const gameState = gameStateRef.current;
      const fogTimer = fogTimerRef.current;

      setDebugState({
        currentWeather: weather?.current || 'clear',
        currentScore: gameState?.score || 0,
        currentState: gameState?.gameState || 'idle',
        intensity: weather?.intensity || 0,
        fogIntensity: weather?.fogIntensity || 0,
        hasFog: (weather?.fogIntensity || 0) > 0 || (fogTimer || 0) > 0,
      });
    };

    // Initial update
    updateState();

    // Poll for updates (debug panel doesn't need to be super efficient)
    const interval = setInterval(updateState, 100);

    return () => clearInterval(interval);
  }, [enabled, weatherRef, gameStateRef, fogTimerRef]);

  const handleSetScore = useCallback((score: number) => {
    const gameState = gameStateRef.current;
    if (gameState) {
      gameState.score = score;
    }
    setDebugTick(t => t + 1);
  }, [gameStateRef, setDebugTick]);

  const handleAddMovingPipe = useCallback(() => {
    const gameState = gameStateRef.current;
    const pipe = generatePipeWithCoins(false, 100);
    pipe.isMoving = true;
    pipe.moveSpeed = 1.5;
    pipe.moveRange = 60;
    if (gameState) {
      gameState.pipes.push(pipe);
    }
  }, [gameStateRef, generatePipeWithCoins]);

  const handleSpawnLeaves = useCallback(() => {
    for (let i = 0; i < 10; i++) {
      spawnFallingLeaf();
    }
  }, [spawnFallingLeaf]);

  if (!enabled) return null;

  const { currentWeather, currentScore, currentState, intensity, fogIntensity, hasFog } = debugState;

  const getButtonStyle = (isActive: boolean) => ({
    padding: '6px 8px',
    fontSize: '11px',
    background: isActive ? '#ff6b00' : '#333',
    color: 'white',
    border: isActive ? '2px solid #fff' : '1px solid #666',
    borderRadius: '4px',
    cursor: 'pointer',
    width: '100%',
    textAlign: 'left' as const,
    fontWeight: isActive ? 'bold' : 'normal',
  });

  const sectionStyle = {
    marginBottom: '8px',
    borderBottom: '1px solid #444',
    paddingBottom: '6px',
  };

  const labelStyle = {
    fontSize: '9px',
    color: '#888',
    marginBottom: '4px',
    textTransform: 'uppercase' as const,
  };

  return createPortal(
    <div
      style={{
        position: 'fixed',
        top: '60px',
        left: '10px',
        width: '150px',
        maxHeight: 'calc(100vh - 80px)',
        overflowY: 'auto',
        background: 'rgba(0,0,0,0.95)',
        padding: '10px',
        borderRadius: '8px',
        zIndex: 999999,
        fontFamily: 'monospace',
        fontSize: '10px',
        color: 'white',
        border: '2px solid #ff6b00',
      }}
    >
      <div style={{ fontWeight: 'bold', marginBottom: '8px', fontSize: '12px', color: '#ff6b00' }}>Debug Panel</div>

      {/* Current Status */}
      <div style={{ ...sectionStyle, background: '#222', padding: '6px', borderRadius: '4px', marginBottom: '10px' }}>
        <div style={{ fontSize: '10px' }}>Score: <b>{currentScore}</b></div>
        <div style={{ fontSize: '10px' }}>Weather: <b style={{ color: '#ff6b00' }}>{currentWeather}</b></div>
        <div style={{ fontSize: '10px' }}>Intensity: <b style={{ color: '#4af' }}>{Math.round(intensity * 100)}%</b></div>
        <div style={{ fontSize: '10px' }}>Fog: <b style={{ color: '#aaa' }}>{Math.round(fogIntensity * 100)}%</b></div>
        <div style={{ fontSize: '10px' }}>State: <b>{currentState}</b></div>
      </div>

      {/* Weather Section */}
      <div style={sectionStyle}>
        <div style={labelStyle}>Weather (click to change)</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px' }}>
          {(['clear', 'rain', 'storm', 'snow'] as WeatherType[]).map((w) => (
            <button key={w} onClick={() => debugSetWeather(w)} style={getButtonStyle(currentWeather === w)}>
              {w === 'clear' ? 'Sun' : w === 'rain' ? 'Rain' : w === 'storm' ? 'Storm' : 'Snow'} {w}
            </button>
          ))}
        </div>
      </div>

      {/* Fog Overlay (separate from weather) */}
      <div style={sectionStyle}>
        <div style={labelStyle}>Fog Overlay</div>
        <button
          onClick={toggleFog}
          style={getButtonStyle(hasFog)}
        >
          {fogIntensity > 0 ? 'Fog ON' : 'Toggle Fog'}
        </button>
      </div>

      {/* Effects Section */}
      <div style={sectionStyle}>
        <div style={labelStyle}>Spawn Effects</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <button onClick={spawnBirdFlock} style={getButtonStyle(false)}>Spawn Birds</button>
          <button onClick={handleSpawnLeaves} style={getButtonStyle(false)}>Spawn Leaves</button>
          <button onClick={triggerLightningBolt} style={getButtonStyle(false)}>Lightning!</button>
        </div>
      </div>

      {/* Difficulty Section */}
      <div style={sectionStyle}>
        <div style={labelStyle}>Set Score (Difficulty)</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '4px' }}>
          {[0, 10, 25, 40, 60, 80].map((s) => (
            <button key={s} onClick={() => handleSetScore(s)} style={getButtonStyle(currentScore >= s && currentScore < (s + 10))}>
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Pipe Testing */}
      <div style={sectionStyle}>
        <div style={labelStyle}>Pipes</div>
        <button onClick={handleAddMovingPipe} style={getButtonStyle(false)}>Add Moving Pipe</button>
      </div>
    </div>,
    document.body
  );
};
