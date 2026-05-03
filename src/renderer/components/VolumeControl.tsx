import { useState, useCallback, useRef, type ChangeEvent } from 'react';
import { Volume2, VolumeX, Volume1 } from 'lucide-react';

interface VolumeControlProps {
  isMuted: boolean;
  toggleMute: () => void;
  setVolumeLevel: (vol: number) => void;
}

export function VolumeControl({ isMuted, toggleMute, setVolumeLevel }: VolumeControlProps) {
  const [showSlider, setShowSlider] = useState(false);
  const [volume, setVolume] = useState(1);
  const containerRef = useRef<HTMLDivElement>(null);

  // Derive effective volume (0 if muted, otherwise stored volume)
  const effectiveVolume = isMuted ? 0 : volume;

  const handleVolumeChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const vol = parseFloat(e.target.value);
      setVolume(vol);
      setVolumeLevel(vol);
    },
    [setVolumeLevel],
  );

  const handleToggleMute = useCallback(() => {
    toggleMute();
  }, [toggleMute]);

  const handleMouseLeave = useCallback(() => {
    setShowSlider(false);
  }, []);

  const VolumeIcon = isMuted || volume === 0 ? VolumeX : volume < 0.5 ? Volume1 : Volume2;

  return (
    <div
      ref={containerRef}
      className="relative flex items-center gap-1"
      onMouseEnter={() => setShowSlider(true)}
      onMouseLeave={handleMouseLeave}
    >
      <button
        onClick={handleToggleMute}
        className="text-foreground hover:bg-muted/50 rounded-md p-1.5 transition-colors"
        title={isMuted ? 'Unmute (M)' : 'Mute (M)'}
      >
        <VolumeIcon className="h-4 w-4" />
      </button>
      {showSlider && (
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={effectiveVolume}
          onChange={handleVolumeChange}
          className="accent-primary h-1 w-20"
        />
      )}
    </div>
  );
}
