import { useState, useCallback, useRef, type ChangeEvent, type MouseEvent } from 'react';
import { Volume2, VolumeX, Volume1 } from 'lucide-react';
import { cn } from '@renderer/lib/utils';

interface VolumeControlProps {
  isMuted: boolean;
  toggleMute: () => void;
  setVolumeLevel: (vol: number) => void;
}

export function VolumeControl({ isMuted, toggleMute, setVolumeLevel }: VolumeControlProps) {
  const [showSlider, setShowSlider] = useState(false);
  const [volume, setVolume] = useState(1);
  const containerRef = useRef<HTMLDivElement>(null);

  const effectiveVolume = isMuted ? 0 : volume;

  const handleVolumeChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const vol = parseFloat(e.target.value);
      setVolume(vol);
      setVolumeLevel(vol);
    },
    [setVolumeLevel],
  );

  const handleToggleMute = useCallback(
    (e: MouseEvent) => {
      e.stopPropagation();
      toggleMute();
    },
    [toggleMute],
  );

  const handleMouseEnter = useCallback(() => {
    setShowSlider(true);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setShowSlider(false);
  }, []);

  const VolumeIcon = isMuted || volume === 0 ? VolumeX : volume < 0.5 ? Volume1 : Volume2;

  return (
    <div
      ref={containerRef}
      className="relative flex items-center"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <button
        onClick={handleToggleMute}
        className="text-foreground hover:bg-muted/50 rounded-md p-2.5 transition-colors"
        title={isMuted ? 'Unmute (M)' : 'Mute (M)'}
      >
        <VolumeIcon className="h-5 w-5" />
      </button>
      <div
        className={cn(
          'absolute top-1/2 left-full translate-x-2 -translate-y-1/2 transition-all duration-150',
          showSlider ? 'opacity-100' : 'pointer-events-none opacity-0',
        )}
      >
        <div className="flex h-24 flex-col items-center gap-1">
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={effectiveVolume}
            onChange={handleVolumeChange}
            className="accent-primary h-20 w-1.5"
            style={{ WebkitAppearance: 'slider-vertical' }}
          />
        </div>
      </div>
    </div>
  );
}
