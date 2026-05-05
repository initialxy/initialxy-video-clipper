import { useState, useCallback, useEffect } from 'react';
import { Volume2, VolumeX, Volume1 } from 'lucide-react';
import { Button } from '@renderer/components/ui/button';

interface VolumeControlProps {
  isMuted: boolean;
  toggleMute: () => void;
  setVolumeLevel: (vol: number) => void;
}

export function VolumeControl({ isMuted, toggleMute, setVolumeLevel }: VolumeControlProps) {
  const [volume, setVolume] = useState(1);
  const [isDragging, setIsDragging] = useState(false);

  const effectiveVolume = isMuted ? 0 : volume;

  const handleVolumeChange = useCallback(
    (newVol: number) => {
      const clamped = Math.max(0, Math.min(1, newVol));
      setVolume(clamped);
      setVolumeLevel(clamped);
    },
    [setVolumeLevel],
  );

  const handleToggleMute = useCallback(() => {
    toggleMute();
  }, [toggleMute]);

  const handleSliderInteraction = useCallback(
    (clientY: number) => {
      const slider = document.getElementById('volume-slider');
      if (!slider) return;
      const rect = slider.getBoundingClientRect();
      const ratio = 1 - (clientY - rect.top) / rect.height;
      handleVolumeChange(ratio);
    },
    [handleVolumeChange],
  );

  const handleMouseDown = useCallback(
    (e: { clientY: number; preventDefault: () => void }) => {
      e.preventDefault();
      setIsDragging(true);
      handleSliderInteraction(e.clientY);
    },
    [handleSliderInteraction],
  );

  useEffect(() => {
    if (!isDragging) return;

    const handleMove = (e: MouseEvent) => {
      handleSliderInteraction(e.clientY);
    };
    const handleUp = () => {
      setIsDragging(false);
    };

    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
    };
  }, [isDragging, handleSliderInteraction]);

  const VolumeIcon = isMuted || volume === 0 ? VolumeX : volume < 0.5 ? Volume1 : Volume2;

  return (
    <div className="flex items-center gap-1">
      <Button
        onClick={handleToggleMute}
        variant="ghost"
        size="icon"
        title={isMuted ? 'Unmute (M)' : 'Mute (M)'}
        className="h-8 w-8 shrink-0"
      >
        <VolumeIcon className="h-4 w-4" />
      </Button>
      <div
        id="volume-slider"
        className="bg-muted relative h-16 w-2 cursor-pointer rounded-full"
        onMouseDown={handleMouseDown}
      >
        <div
          className="bg-primary absolute right-0 bottom-0 left-0 rounded-full"
          style={{ height: `${effectiveVolume * 100}%` }}
        />
        <div
          className="absolute left-1/2 h-3 w-3 -translate-x-1/2 rounded-full bg-white shadow-sm"
          style={{ bottom: `calc(${effectiveVolume * 100}% - 6px)` }}
        />
      </div>
    </div>
  );
}
